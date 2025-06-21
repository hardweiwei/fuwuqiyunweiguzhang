import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm } from 'antd';
import { createAxiosInstance } from '../utils/csrf';

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form] = Form.useForm();

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const axiosInstance = await createAxiosInstance();
      const res = await axiosInstance.get('/api/departments/');
      setDepartments(res.data);
    } catch (e) {
      message.error('获取部门列表失败');
    }
    setLoading(false);
  };

  useEffect(() => { fetchDepartments(); }, []);

  const openAdd = () => {
    setEditingDept(null);
    setModalOpen(true);
    setTimeout(() => form.resetFields(), 0);
  };

  const openEdit = (dept) => {
    setEditingDept(dept);
    setModalOpen(true);
    setTimeout(() => form.setFieldsValue(dept), 0);
  };

  const handleDelete = async (id) => {
    try {
      const axiosInstance = await createAxiosInstance();
      await axiosInstance.delete(`/api/departments/${id}/`);
      message.success('删除成功');
      fetchDepartments();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      values.name = values.name ? values.name.trim() : '';
      const axiosInstance = await createAxiosInstance();
      if (editingDept) {
        await axiosInstance.put(`/api/departments/${editingDept.id}/`, values, {
          headers: { 'Content-Type': 'application/json' }
        });
        message.success('修改成功');
      } else {
        await axiosInstance.post('/api/departments/', values, {
          headers: { 'Content-Type': 'application/json' }
        });
        message.success('添加成功');
      }
      setModalOpen(false);
      fetchDepartments();
    } catch (e) {
      if (e.response && e.response.data && e.response.data.name) {
        message.error(`部门名称：${e.response.data.name}`);
      } else {
        message.error('操作失败');
      }
    }
  };

  const columns = [
    { title: '部门名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description' },
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
      <Button type="primary" onClick={openAdd} style={{ marginBottom: 16 }}>添加部门</Button>
      <Table columns={columns} dataSource={departments} rowKey="id" loading={loading} />
      <Modal open={modalOpen} title={editingDept ? '编辑部门' : '添加部门'} onOk={handleOk} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="部门名称"
            rules={[
              { required: true, message: '请输入部门名称' },
              {
                validator: (_, value) =>
                  value && value.trim() !== ''
                    ? Promise.resolve()
                    : Promise.reject(new Error('不能只输入空格'))
              }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述"> <Input.TextArea rows={2} /> </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default AdminDepartments; 