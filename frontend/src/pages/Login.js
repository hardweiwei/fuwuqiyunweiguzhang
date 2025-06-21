import React from 'react';
import { Form, Input, Button, Card, message, Space, Typography } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  
  const onFinish = async (values) => {
    try {
      // 使用自定义登录API，发送JSON格式数据
      const res = await axios.post('https://weidx.cyou/api/login/', values, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000  // 添加超时设置
      });
      
      if (res.status === 200 && res.data && res.data.user) {
        message.success('登录成功');
        
        // 清除退出登录标记
        localStorage.removeItem('isLoggingOut');
        
        // 调用父组件的回调函数更新登录状态
        if (onLoginSuccess) {
          await onLoginSuccess(); // 等待登录状态更新完成
        }
        
        // 让App.js根据用户角色处理跳转，这里不需要手动跳转
        // 登录状态更新后，App.js会自动处理路由跳转
      } else {
        message.error('登录失败：服务器响应异常');
      }
    } catch (e) {
      console.log('登录错误:', e);
      if (e.response) {
        if (e.response.status === 403) {
          message.error('登录失败：CSRF验证失败，请刷新页面重试');
        } else if (e.response.data && e.response.data.detail) {
          message.error(e.response.data.detail);
        } else {
          message.error(`登录失败：服务器错误 (${e.response.status})`);
        }
      } else if (e.code === 'ECONNABORTED') {
        message.error('登录失败：请求超时，请检查网络连接');
      } else {
        message.error('登录失败：网络错误，请检查服务器是否运行');
      }
    }
  };

  // 强制退出登录
  const forceLogout = async () => {
    try {
      await axios.post('https://weidx.cyou/api/logout/', {}, { withCredentials: true });
    } catch (error) {
      console.log('退出登录失败:', error);
    }
    
    // 清除所有存储
    localStorage.clear();
    sessionStorage.clear();
    
    // 清除所有cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    message.success('已强制退出登录');
    window.location.reload();
  };
  
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '-120px',
        left: '-120px',
        width: 260,
        height: 260,
        background: 'radial-gradient(circle, #a5b4fc 60%, #f0fdfa 100%)',
        filter: 'blur(16px)',
        zIndex: 0,
        opacity: 0.5,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        right: '-100px',
        width: 200,
        height: 200,
        background: 'radial-gradient(circle, #6ee7b7 60%, #e0e7ff 100%)',
        filter: 'blur(18px)',
        zIndex: 0,
        opacity: 0.4,
      }} />
      <Card
        style={{
          width: 380,
          borderRadius: 18,
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
          padding: '32px 0',
          marginTop: '8vh',
          zIndex: 1,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(2px)',
        }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <LoginOutlined style={{ fontSize: 38, color: '#1677ff', marginBottom: 8 }} />
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: 2 }}>
            用户登录
          </Typography.Title>
        </div>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          onValuesChange={() => {}}
          initialValues={{ username: '', password: '' }}
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
            validateTrigger={['onChange', 'onBlur']}
            style={{ marginBottom: 18 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
              autoComplete="new-password"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
            validateTrigger={['onChange', 'onBlur']}
            style={{ marginBottom: 18 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
              autoComplete="new-password"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
              >
                登录
              </Button>
              <Button
                type="default"
                onClick={forceLogout}
                size="large"
                style={{ borderRadius: 8, marginLeft: 12 }}
              >
                强制退出
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login; 