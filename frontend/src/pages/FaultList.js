import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { createAxiosInstance } from '../utils/csrf';

const statusMap = {
  pending: <Tag color="orange">待处理</Tag>,
  in_progress: <Tag color="blue">处理中</Tag>,
  resolved: <Tag color="green">已解决</Tag>,
  cannot_resolve: <Tag color="red">无法解决</Tag>,
};

const urgencyMap = {
  general: <Tag color="default">一般</Tag>,
  urgent: <Tag color="orange">紧急</Tag>,
  very_urgent: <Tag color="red">非常紧急</Tag>,
};

const FaultList = () => {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchFaults = async () => {
    setLoading(true);
    try {
      const axiosInstance = await createAxiosInstance();
      const response = await axiosInstance.get('/api/faults/');
      setFaults(response.data);
    } catch (error) {
      console.error('获取故障列表错误:', error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        message.error('请先登录');
        navigate('/login');
      } else {
        message.error('获取故障列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaults();
  }, []);

  const columns = [
    { 
      title: '设备名称', 
      dataIndex: 'equipment_name',
      key: 'equipment_name'
    },
    { 
      title: '位置', 
      dataIndex: 'specific_location',
      key: 'specific_location',
      ellipsis: true
    },
    { 
      title: '报修人', 
      dataIndex: 'reporter_name',
      key: 'reporter_name',
      ellipsis: true
    },
    { 
      title: '紧急程度', 
      dataIndex: 'urgency', 
      key: 'urgency',
      render: (urgency) => urgencyMap[urgency] || <Tag>未知</Tag>
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => statusMap[status] || <Tag>未知</Tag>
    },
    { 
      title: '上报时间', 
      dataIndex: 'reported_at',
      key: 'reported_at',
      render: (date) => new Date(date).toLocaleString('zh-CN')
    },
    { 
      title: '操作', 
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/faults/${record.id}`)}
        >
          详情
        </Button>
      )
    },
  ];

  return (
    <Card 
      title="故障列表" 
      style={{ margin: 16 }}
      extra={
        <Button type="primary" onClick={() => navigate('/report')}>
          上报故障
        </Button>
      }
    >
      <Table 
        columns={columns} 
        dataSource={faults} 
        rowKey="id" 
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
        }}
      />
    </Card>
  );
};

export default FaultList; 