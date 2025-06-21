import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import { createAxiosInstance } from '../utils/csrf';
import ReactToPrint from 'react-to-print';

console.log('ReactToPrint:', ReactToPrint);

const { Option } = Select;

const roleMap = {
  reporter: '收费站工作人员',
  maintainer: '运维人员',
  admin: '系统管理员',
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const axiosInstance = await createAxiosInstance();
      const res = await axiosInstance.get('/api/users/');
      setUsers(res.data);
    } catch (e) {
      if (e.response && (e.response.status === 401 || e.response.status === 403)) {
        message.error('请先登录');
        navigate('/login');
      } else {
        message.error('获取用户列表失败');
      }
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const axiosInstance = await createAxiosInstance();
      const res = await axiosInstance.get('/api/departments/');
      setDepartments(res.data);
    } catch (e) {
      message.error('获取部门列表失败');
    }
  };

  useEffect(() => { fetchUsers(); fetchDepartments(); }, []);

  const openAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };
  
  const openEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue({ ...user, password: '' });
    setModalOpen(true);
  };
  
  const handleDelete = async (id) => {
    try {
      const axiosInstance = await createAxiosInstance();
      await axiosInstance.delete(`/api/users/${id}/`);
      message.success('删除成功');
      fetchUsers();
    } catch (e) {
      if (e.response && (e.response.status === 401 || e.response.status === 403)) {
        message.error('请先登录');
        navigate('/login');
      } else {
        message.error('删除失败');
      }
    }
  };
  
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const axiosInstance = await createAxiosInstance();
      
      if (editingUser) {
        await axiosInstance.put(`/api/users/${editingUser.id}/`, values);
        message.success('修改成功');
      } else {
        await axiosInstance.post('/api/users/', values);
        message.success('添加成功');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (e) {
      if (e.response && (e.response.status === 401 || e.response.status === 403)) {
        message.error('请先登录');
        navigate('/login');
      } else {
        message.error('操作失败');
      }
    }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '角色', dataIndex: 'role', render: (v) => roleMap[v] },
    { title: '部门', dataIndex: 'department_name', render: (v) => v || '-' },
    { title: '操作', render: (_, record) => (
      <>
        <Button type="link" onClick={() => openEdit(record)}>编辑</Button>
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </>
    ) },
  ];

  return (
    <div style={{ margin: 16 }}>
      <Button type="primary" onClick={openAdd} style={{ marginBottom: 16 }}>添加用户</Button>
      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} />
      <Modal open={modalOpen} title={editingUser ? '编辑用户' : '添加用户'} onOk={handleOk} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: !editingUser, min: 4, message: '密码至少4位' }]}>
            <Input.Password placeholder={editingUser ? '如需修改请填写' : ''} />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              <Option value="reporter">收费站工作人员</Option>
              <Option value="maintainer">运维人员</Option>
              <Option value="admin">系统管理员</Option>
            </Select>
          </Form.Item>
          <Form.Item name="department" label="归属部门">
            <Select allowClear placeholder="请选择部门">
              {departments.map(dep => <Option key={dep.id} value={dep.id}>{dep.name}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers; 