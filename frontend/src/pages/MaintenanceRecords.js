import React, { useEffect, useState } from 'react';
import { Table, Button, Card, message, Input, Space, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import { createAxiosInstance } from '../utils/csrf';

const { Search } = Input;

const MaintenanceRecords = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ equipment_name: '', specific_location: '', reporter_name: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const fetchCurrentUser = async () => {
    try {
      const axiosInstance = await createAxiosInstance();
      const res = await axiosInstance.get('/api/current-user/');
      setCurrentUser(res.data.user);
    } catch (e) {}
  };

  const fetchData = async (page = 1, pageSize = 10, filterParams = filters) => {
    setLoading(true);
    try {
      const axiosInstance = await createAxiosInstance();
      const res = await axiosInstance.get('/api/maintenance-records/', {
        params: { page, page_size: pageSize },
      });
      let records = res.data.results || res.data;
      // 前端筛选
      if (filterParams.equipment_name) {
        records = records.filter(r => (r.equipment_name || '').includes(filterParams.equipment_name));
      }
      if (filterParams.specific_location) {
        records = records.filter(r => (r.specific_location || '').includes(filterParams.specific_location));
      }
      if (filterParams.reporter_name) {
        records = records.filter(r => (r.reporter_name || '').includes(filterParams.reporter_name));
      }
      setData(records);
      setPagination({
        current: page,
        pageSize,
        total: records.length,
      });
    } catch (e) {
      message.error('获取维修记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchData(pagination.current, pagination.pageSize, filters);
    // eslint-disable-next-line
  }, []);

  const handleSearch = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchData(1, pagination.pageSize, newFilters);
  };

  const handleDelete = async (id) => {
    try {
      const axiosInstance = await createAxiosInstance();
      await axiosInstance.delete(`/api/maintenance-records/${id}/`);
      message.success('删除成功');
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (e) {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '设备名称', dataIndex: 'equipment_name', key: 'equipment_name',
      render: (_, record) => record.equipment_name || '-' },
    { title: '设备位置', dataIndex: 'specific_location', key: 'specific_location',
      render: (_, record) => record.specific_location || '-' },
    { title: '报修人员', dataIndex: 'reporter_name', key: 'reporter_name',
      render: (_, record) => record.reporter_name || '-' },
    { title: '维修人员', dataIndex: 'maintainer_name', key: 'maintainer_name' },
    { title: '完成时间', dataIndex: 'completed_at', key: 'completed_at', render: (t) => t ? new Date(t).toLocaleString('zh-CN') : '-' },
    { title: '操作', key: 'action', render: (_, record) => (
      <Space>
        <Button type="link" onClick={() => navigate(`/maintenance/${record.id}`)}>
          详情
        </Button>
        {currentUser && currentUser.role === 'admin' && (
          <Popconfirm title="确定要删除该维修记录吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        )}
      </Space>
    ) },
  ];

  return (
    <Card title="维修记录列表" style={{ margin: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="按设备名称筛选"
          allowClear
          onSearch={value => handleSearch('equipment_name', value)}
          style={{ width: 180 }}
        />
        <Search
          placeholder="按设备位置筛选"
          allowClear
          onSearch={value => handleSearch('specific_location', value)}
          style={{ width: 180 }}
        />
        <Search
          placeholder="按报修人员筛选"
          allowClear
          onSearch={value => handleSearch('reporter_name', value)}
          style={{ width: 180 }}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          onChange: (page, pageSize) => fetchData(page, pageSize, filters),
        }}
      />
    </Card>
  );
};
export default MaintenanceRecords; 