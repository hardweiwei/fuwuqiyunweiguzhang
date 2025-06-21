import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown } from 'antd';
import {
  DesktopOutlined,
  PieChartOutlined,
  FileOutlined,
  UserOutlined,
  BarChartOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import 'antd/dist/reset.css';
import axios from 'axios';

// 引入各页面
import Login from './pages/Login';
import FaultReport from './pages/FaultReport';
import FaultList from './pages/FaultList';
import FaultDetail from './pages/FaultDetail';
import MaintenanceRecords from './pages/MaintenanceRecords';
import MaintenanceDetail from './pages/MaintenanceDetail';
import AdminUsers from './pages/AdminUsers';
import AdminDepartments from './pages/AdminDepartments';
import Stats from './pages/Stats';

const { Header, Content, Footer, Sider } = Layout;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 检查登录状态
  const checkLoginStatus = async () => {
    // 检查URL参数，如果有force_logout参数，强制清除状态
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('force_logout') === 'true') {
      clearAllLoginState();
      // 移除URL参数
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    // 检查是否正在退出登录
    const isLoggingOut = localStorage.getItem('isLoggingOut');
    if (isLoggingOut === 'true') {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setLoading(false);
      localStorage.removeItem('isLoggingOut');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get('https://weidx.cyou/api/current-user/', { 
        withCredentials: true,
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',  // 防止缓存
          'Pragma': 'no-cache'
        }
      });
      
      if (response.data && response.data.user) {
        setIsLoggedIn(true);
        setCurrentUser(response.data.user);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.log('检查登录状态失败:', error);
      setIsLoggedIn(false);
      setCurrentUser(null);
      
      // 如果是网络错误或服务器错误，清除可能存在的无效状态
      if (error.code === 'ECONNABORTED' || error.response?.status >= 500) {
        clearAllLoginState();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // 完全清除登录状态
  const clearAllLoginState = () => {
    // 设置退出登录标记到localStorage
    localStorage.setItem('isLoggingOut', 'true');
    
    // 清除本地状态
    setIsLoggedIn(false);
    setCurrentUser(null);
    
    // 清除localStorage和sessionStorage（除了退出标记）
    const logoutFlag = localStorage.getItem('isLoggingOut');
    localStorage.clear();
    sessionStorage.clear();
    if (logoutFlag) {
      localStorage.setItem('isLoggingOut', logoutFlag);
    }
    
    // 清除所有cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      await axios.post('https://weidx.cyou/api/logout/', {}, { withCredentials: true });
    } catch (error) {
      console.log('退出登录失败:', error);
    }
    
    // 完全清除所有状态
    clearAllLoginState();
    
    // 使用URL参数强制跳转到登录页面
    window.location.href = '/login?force_logout=true';
  };

  // 根据登录状态和用户角色生成菜单项
  const getMenuItems = () => {
    const items = [];
    
    if (!isLoggedIn) {
      items.push({ key: '1', icon: <UserOutlined />, label: <Link to="/login">登录</Link> });
    } else {
      // 所有登录用户都可以看到的功能
      items.push({ key: '2', icon: <FileOutlined />, label: <Link to="/report">故障上报</Link> });
      items.push({ key: '3', icon: <DesktopOutlined />, label: <Link to="/faults">故障列表</Link> });
      items.push({ key: '4', icon: <BarChartOutlined />, label: <Link to="/maintenance">维修记录</Link> });
      
      // 只有管理员和运维可以看到统计报表
      if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'maintainer')) {
        items.push({ key: '5', icon: <PieChartOutlined />, label: <Link to="/stats">统计报表</Link> });
      }
      // 只有管理员可以看到的功能
      if (currentUser && currentUser.role === 'admin') {
        items.push({ key: '6', icon: <UserOutlined />, label: <Link to="/admin/users">用户管理</Link> });
        items.push({ key: '7', icon: <UserOutlined />, label: <Link to="/admin/departments">部门管理</Link> });
      }
    }
    
    return items;
  };

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 获取用户角色显示名称
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'maintainer':
        return '运维人员';
      case 'reporter':
        return '收费站工作人员';
      default:
        return '未知角色';
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      加载中...
    </div>;
  }

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible>
          <div style={{ height: 32, margin: 16, color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
            运维故障管理
          </div>
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" items={getMenuItems().map(item => item.key === '4' ? { ...item, label: <Link to="/maintenance">维修记录</Link> } : item)} />
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>运维故障管理</div>
            {isLoggedIn && currentUser && (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button type="text" style={{ color: '#333' }}>
                  <UserOutlined /> {currentUser.username} ({getRoleDisplayName(currentUser.role)})
                </Button>
              </Dropdown>
            )}
          </Header>
          <Content style={{ margin: '16px' }}>
            <Routes>
              <Route path="/login" element={
                isLoggedIn 
                  ? <Navigate to={currentUser?.role === 'admin' ? '/admin/users' : '/faults'} /> 
                  : <Login onLoginSuccess={checkLoginStatus} />
              } />
              <Route path="/report" element={isLoggedIn ? <FaultReport /> : <Navigate to="/login" />} />
              <Route path="/faults" element={isLoggedIn ? <FaultList /> : <Navigate to="/login" />} />
              <Route path="/faults/:id" element={isLoggedIn ? <FaultDetail /> : <Navigate to="/login" />} />
              <Route path="/maintenance" element={isLoggedIn ? <MaintenanceRecords /> : <Navigate to="/login" />} />
              <Route path="/maintenance/:id" element={isLoggedIn ? <MaintenanceDetail /> : <Navigate to="/login" />} />
              <Route path="/admin/users" element={
                isLoggedIn && currentUser && currentUser.role === 'admin' 
                  ? <AdminUsers /> 
                  : <Navigate to="/login" />
              } />
              <Route path="/admin/departments" element={
                isLoggedIn && currentUser && currentUser.role === 'admin' 
                  ? <AdminDepartments /> 
                  : <Navigate to="/login" />
              } />
              <Route path="/stats" element={<Stats />} />
              <Route path="/" element={
                isLoggedIn 
                  ? <Navigate to={currentUser?.role === 'admin' ? '/admin/users' : '/faults'} /> 
                  : <Navigate to="/login" />
              } />
            </Routes>
          </Content>
          <Footer style={{ textAlign: 'center' }}>运维故障管理 created by weiwei</Footer>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App; 