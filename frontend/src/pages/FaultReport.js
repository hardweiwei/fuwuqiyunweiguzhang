import React, { useState } from 'react';
import { Form, Input, Button, Select, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { createAxiosInstance } from '../utils/csrf';

const { Option } = Select;

const FaultReport = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 过滤掉undefined的值
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([_, value]) => value !== undefined && value !== '')
      );
      
      console.log('上报内容:', filteredValues);
      
      const axiosInstance = await createAxiosInstance();
      const response = await axiosInstance.post('/api/faults/', filteredValues);
      
      if (response.status === 201) {
        message.success('故障上报成功！');
        form.resetFields();
        // 跳转到故障列表页面
        navigate('/faults');
      } else {
        message.error('上报失败，请重试');
      }
    } catch (error) {
      console.error('故障上报错误:', error);
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          message.error('请先登录');
          navigate('/login');
        } else if (error.response.data && error.response.data.detail) {
          message.error(`上报失败: ${error.response.data.detail}`);
        } else {
          message.error(`上报失败: ${error.response.status}`);
        }
      } else {
        message.error('网络错误，请检查连接');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="故障报修" style={{ maxWidth: 600, margin: '32px auto' }}>
      <Form 
        layout="vertical" 
        onFinish={onFinish}
        form={form}
        initialValues={{
          urgency: 'general'
        }}
      >
        <Form.Item 
          name="equipment_name" 
          label="设备名称" 
          rules={[{ required: true, message: '请输入设备名称' }]}
        >
          <Input placeholder="请输入故障设备名称" />
        </Form.Item>
        
        <Form.Item 
          name="center_stake_number" 
          label="桩号"
        >
          <Input placeholder="请输入中心桩号（可选）" />
        </Form.Item>
        
        <Form.Item 
          name="specific_location" 
          label="设备具体位置" 
          rules={[{ required: true, message: '请输入设备具体位置' }]}
        >
          <Input placeholder="请输入设备具体位置" />
        </Form.Item>
        
        <Form.Item 
          name="description" 
          label="故障描述" 
          rules={[{ required: true, message: '请输入故障描述' }]}
        >
          <Input.TextArea 
            rows={4} 
            placeholder="请详细描述故障现象、影响范围等信息"
          />
        </Form.Item>
        
        <Form.Item 
          name="urgency" 
          label="紧急程度"
        >
          <Select>
            <Option value="general">一般</Option>
            <Option value="urgent">紧急</Option>
            <Option value="very_urgent">非常紧急</Option>
          </Select>
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            style={{ marginRight: 8 }}
          >
            提交报修
          </Button>
          <Button 
            onClick={() => navigate('/faults')}
          >
            返回列表
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default FaultReport; 