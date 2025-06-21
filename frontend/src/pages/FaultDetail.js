import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Form, Input, Button, Upload, Select, message, Popconfirm, Tag, Space, Modal } from 'antd';
import { UploadOutlined, DeleteOutlined, PrinterOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { createAxiosInstance, createFormDataAxiosInstance } from '../utils/csrf';
import { saveAs } from 'file-saver';

const { Option } = Select;

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

const FaultDetail = () => {
  const [fault, setFault] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);

  // 获取当前用户信息
  const getCurrentUser = async () => {
    try {
      const axiosInstance = await createAxiosInstance();
      const response = await axiosInstance.get('/api/current-user/');
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  // 获取故障详情
  const fetchFaultDetail = async () => {
    setLoading(true);
    try {
      const axiosInstance = await createAxiosInstance();
      const response = await axiosInstance.get(`/api/faults/${id}/`);
      setFault(response.data);
    } catch (error) {
      console.error('获取故障详情失败:', error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        message.error('请先登录');
        navigate('/login');
      } else {
        message.error('获取故障详情失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
    fetchFaultDetail();
  }, [id]);

  // 撤销故障上报（只有上报人自己可以撤销）
  const handleCancelFault = async () => {
    try {
      const axiosInstance = await createAxiosInstance();
      await axiosInstance.delete(`/api/faults/${id}/`);
      message.success('故障已撤销');
      navigate('/faults');
    } catch (error) {
      console.error('撤销故障失败:', error);
      if (error.response && error.response.status === 403) {
        message.error('无权限撤销：只能撤销自己上报且未处理的故障');
      } else if (error.response && error.response.data && error.response.data.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('撤销故障失败');
      }
    }
  };

  // 接受故障（运维人员）
  const handleAcceptFault = async () => {
    try {
      const axiosInstance = await createAxiosInstance();
      await axiosInstance.post(`/api/faults/${id}/accept_fault/`);
      message.success('已接受故障');
      fetchFaultDetail(); // 刷新数据
    } catch (error) {
      console.error('接受故障失败:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('接受故障失败');
      }
    }
  };

  // 上传照片
  const handlePhotoUpload = async (file, photoType, maintenanceRecordId) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('photo_type', photoType);
      formData.append('maintenance_record', maintenanceRecordId);

      const axiosInstance = await createFormDataAxiosInstance();
      await axiosInstance.post('/api/maintenance-photos/', formData);
      message.success('照片上传成功');
      return true;
    } catch (error) {
      console.error('照片上传失败:', error);
      message.error('照片上传失败');
      return false;
    }
  };

  // 完成维修（运维人员）
  const handleResolveFault = async (values) => {
    try {
      const axiosInstance = await createAxiosInstance();
      // 直接将所有表单字段传递给后端
      const maintenanceData = {
        ...values,
        completed_at: new Date().toISOString(),
      };
      console.log('发送的维修数据:', maintenanceData);
      const response = await axiosInstance.post(`/api/faults/${id}/resolve_fault/`, maintenanceData);
      
      if (response.status === 200) {
        message.success('维修完成');
        
        // 上传照片
        const maintenanceRecordId = response.data.maintenance_record;
        if (maintenanceRecordId) {
          // 上传维修前照片
          if (values.photo_before && values.photo_before.fileList) {
            for (const fileInfo of values.photo_before.fileList) {
              // antd Upload组件的文件对象
              if (fileInfo.originFileObj) {
                await handlePhotoUpload(fileInfo.originFileObj, 'before', maintenanceRecordId);
              }
            }
          }
          
          // 上传维修后照片
          if (values.photo_after && values.photo_after.fileList) {
            for (const fileInfo of values.photo_after.fileList) {
              // antd Upload组件的文件对象
              if (fileInfo.originFileObj) {
                await handlePhotoUpload(fileInfo.originFileObj, 'after', maintenanceRecordId);
              }
            }
          }
        }
        
        navigate('/faults'); // 跳转到故障列表页面
      }
    } catch (error) {
      console.error('完成维修失败:', error);
      if (error.response && error.response.data) {
        console.log('服务器返回的错误:', error.response.data);
        
        if (error.response.data.detail) {
          message.error(error.response.data.detail);
        } else if (error.response.data.non_field_errors) {
          message.error(error.response.data.non_field_errors[0]);
        } else if (typeof error.response.data === 'object') {
          // 处理字段错误
          const fieldErrors = Object.values(error.response.data).flat();
          message.error(fieldErrors.join(', '));
        } else {
          message.error('完成维修失败');
        }
      } else {
        message.error('完成维修失败');
      }
    }
  };

  // 标记无法解决（运维人员）
  const handleCannotResolve = async () => {
    try {
      const axiosInstance = await createAxiosInstance();
      await axiosInstance.post(`/api/faults/${id}/cannot_resolve_fault/`);
      message.success('已标记为无法解决');
      fetchFaultDetail(); // 刷新数据
    } catch (error) {
      console.error('标记无法解决失败:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('标记无法解决失败');
      }
    }
  };

  const exportToDocx = () => {
    import('docx').then(docx => {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } = docx;
      const rows = [];
      // 表头合并
      rows.push(new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: '设备维修原始记录表', bold: true, size: 32 })],
                alignment: 'center'
              })
            ],
            columnSpan: 8
          })
        ]
      }));
      // 第一行 位置/报修时间/报修人/现场位置/到场时间/维修人员/维修日期/车辆/型号
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('故障设备具体位置')] }),
          new TableCell({ children: [new Paragraph(fault ? fault.specific_location : '')] }),
          new TableCell({ children: [new Paragraph('故障报修时间')] }),
          new TableCell({ children: [new Paragraph(fault ? new Date(fault.reported_at).toLocaleString('zh-CN') : '')] }),
          new TableCell({ children: [new Paragraph('报修人')] }),
          new TableCell({ children: [new Paragraph(fault ? fault.reporter_name : '')] }),
          new TableCell({ children: [new Paragraph('现场位置/监控点')] }),
          new TableCell({ children: [new Paragraph(fault && fault.monitor_location ? fault.monitor_location : '')] }),
        ]
      }));
      // 第二行 运维人员到达现场时间/维修人员/维修日期/车辆/型号
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('运维人员到达现场时间')] }),
          new TableCell({ children: [new Paragraph(fault && fault.maintenance_record_detail && fault.maintenance_record_detail.arrived_at ? new Date(fault.maintenance_record_detail.arrived_at).toLocaleString('zh-CN') : '')] }),
          new TableCell({ children: [new Paragraph('维修人员')] }),
          new TableCell({ children: [new Paragraph(fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.maintainer_name || '') : '')] }),
          new TableCell({ children: [new Paragraph('维修日期')] }),
          new TableCell({ children: [new Paragraph(fault && fault.maintenance_record_detail && fault.maintenance_record_detail.completed_at ? new Date(fault.maintenance_record_detail.completed_at).toLocaleDateString('zh-CN') : '')] }),
          new TableCell({ children: [new Paragraph('维修车辆')] }),
          new TableCell({ children: [new Paragraph(fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.maintenance_vehicle || '') : '')] }),
        ]
      }));
      // 第三行 设备名称/设备类别/设备型号/维修及处理所需专用工具、仪器、器材、备件等
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('设备名称')] }),
          new TableCell({ children: [new Paragraph(fault ? fault.equipment_name : '')] }),
          new TableCell({ children: [new Paragraph('设备类别')] }),
          new TableCell({ children: [new Paragraph(fault && fault.equipment_category ? fault.equipment_category : '')] }),
          new TableCell({ children: [new Paragraph('设备型号')] }),
          new TableCell({ children: [new Paragraph(fault && fault.equipment_model ? fault.equipment_model : '')] }),
          new TableCell({ children: [new Paragraph('维修及处理所需专用工具、仪器、器材、备件等')] }),
          new TableCell({ children: [new Paragraph(fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.required_tools_materials || '') : '')] }),
        ]
      }));
      // 故障现象类别/现象详情
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('故障现象类别')] }),
          new TableCell({ children: [new Paragraph(fault && fault.fault_category ? fault.fault_category : '')] }),
          new TableCell({ children: [new Paragraph('现象详情')] }),
          new TableCell({ children: [new Paragraph(fault && fault.description ? fault.description : '')], columnSpan: 5 }),
        ]
      }));
      // 故障原因分析
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('故障原因分析')] }),
          new TableCell({ children: [new Paragraph(fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.fault_reason_analysis || '') : '')], columnSpan: 7 }),
        ]
      }));
      // 维修过程及结果
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('维修过程及结果')] }),
          new TableCell({ children: [new Paragraph(fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.maintenance_process_result || '') : '')], columnSpan: 7 }),
        ]
      }));
      // 维修前后照片
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('维修前照片')] }),
          new TableCell({ children: [
            ...(fault && fault.maintenance_record_detail && fault.maintenance_record_detail.photos ?
              fault.maintenance_record_detail.photos.filter(photo => photo.photo_type === 'before').map((photo, idx) =>
                new Paragraph(`[维修前照片${idx + 1}]`)
              ) : [new Paragraph('无')])
          ], columnSpan: 3 }),
          new TableCell({ children: [new Paragraph('维修后照片')] }),
          new TableCell({ children: [
            ...(fault && fault.maintenance_record_detail && fault.maintenance_record_detail.photos ?
              fault.maintenance_record_detail.photos.filter(photo => photo.photo_type === 'after').map((photo, idx) =>
                new Paragraph(`[维修后照片${idx + 1}]`)
              ) : [new Paragraph('无')])
          ], columnSpan: 3 }),
        ]
      }));
      // 备注事项
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('备注事项')] }),
          new TableCell({ children: [new Paragraph(fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.remarks || '') : '')], columnSpan: 7 }),
        ]
      }));
      const doc = new Document({
        sections: [{
          children: [
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            })
          ]
        }]
      });
      Packer.toBlob(doc).then(blob => {
        saveAs(blob, `设备维修原始记录表_${fault.id}.docx`);
      });
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  if (!fault) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>故障不存在</div>;
  }

  const canCancel = currentUser && fault.reporter === currentUser.id && fault.status === 'pending';
  const canAccept = currentUser && currentUser.role === 'maintainer' && fault.status === 'pending';
  const canResolve = currentUser && currentUser.role === 'maintainer' && fault.status === 'in_progress';
  const canMarkCannotResolve = currentUser && currentUser.role === 'maintainer' && fault.status === 'in_progress';

  return (
    <Card 
      title="故障详情" 
      style={{ maxWidth: 800, margin: '32px auto' }}
      extra={
        <Space>
          <Button onClick={() => navigate('/faults')}>返回列表</Button>
          {canCancel && (
            <Popconfirm
              title="确定要撤销这个故障吗？"
              onConfirm={handleCancelFault}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>撤销上报</Button>
            </Popconfirm>
          )}
          <Button onClick={() => setModalVisible(true)} icon={<PrinterOutlined />}>查看原始记录表</Button>
        </Space>
      }
    >
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="设备名称">{fault.equipment_name}</Descriptions.Item>
        <Descriptions.Item label="规格型号">{fault.equipment_model || '无'}</Descriptions.Item>
        <Descriptions.Item label="桩号">{fault.center_stake_number || '无'}</Descriptions.Item>
        <Descriptions.Item label="具体位置">{fault.specific_location}</Descriptions.Item>
        <Descriptions.Item label="上报时间">{new Date(fault.reported_at).toLocaleString('zh-CN')}</Descriptions.Item>
        <Descriptions.Item label="状态">{statusMap[fault.status]}</Descriptions.Item>
        <Descriptions.Item label="紧急程度">{urgencyMap[fault.urgency]}</Descriptions.Item>
        <Descriptions.Item label="报修人">{fault.reporter_name}</Descriptions.Item>
        <Descriptions.Item label="报修内容" span={2}>
          <Input.TextArea 
            value={fault.description}
            readOnly
            rows={3}
            style={{ maxWidth: 600, background: '#f5f5f5' }}
          />
        </Descriptions.Item>
      </Descriptions>

      {/* 维修记录详情 */}
      {fault.maintenance_record_detail && (
        <Card title="维修记录" style={{ marginTop: 16 }}>
          <Descriptions bordered column={2} size="small">
            {/* 仅在有completed_at时显示设备名称、规格型号、维修车辆、故障原因分析 */}
            {fault.maintenance_record_detail.completed_at && (
              <>
                <Descriptions.Item label="设备名称">{fault.equipment_name}</Descriptions.Item>
                <Descriptions.Item label="规格型号">{fault.equipment_model || '无'}</Descriptions.Item>
                <Descriptions.Item label="维修车辆">{fault.maintenance_record_detail.maintenance_vehicle || '无'}</Descriptions.Item>
                <Descriptions.Item label="完成时间">{new Date(fault.maintenance_record_detail.completed_at).toLocaleString('zh-CN')}</Descriptions.Item>
                <Descriptions.Item label="维修及处理所需专用工具、仪器、器材、备件等" span={2}>{fault.maintenance_record_detail.required_tools_materials || '无'}</Descriptions.Item>
                <Descriptions.Item label="故障原因分析" span={2}>{fault.maintenance_record_detail.fault_reason_analysis || '无'}</Descriptions.Item>
                {fault.maintenance_record_detail.maintenance_process_result && (
                  <Descriptions.Item label="维修过程及结果" span={2}>{fault.maintenance_record_detail.maintenance_process_result}</Descriptions.Item>
                )}
              </>
            )}
            {fault.maintenance_record_detail.remarks && (
              <Descriptions.Item label="备注" span={2}>
                {fault.maintenance_record_detail.remarks}
              </Descriptions.Item>
            )}
          </Descriptions>
          
          {/* 维修照片 */}
          {fault.maintenance_record_detail.photos && fault.maintenance_record_detail.photos.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4>维修照片</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {fault.maintenance_record_detail.photos.map((photo, index) => (
                  <div key={photo.id} style={{ border: '1px solid #d9d9d9', padding: 8, borderRadius: 4 }}>
                    <img 
                      src={photo.image_url} 
                      alt={`维修照片 ${index + 1}`}
                      style={{ width: 150, height: 150, objectFit: 'cover' }}
                    />
                    <div style={{ textAlign: 'center', marginTop: 4, fontSize: 12 }}>
                      {photo.photo_type === 'before' ? '维修前' : 
                       photo.photo_type === 'after' ? '维修后' : 
                       photo.photo_type === 'during' ? '维修中' : '其他'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 运维人员的操作区域 */}
      {currentUser && currentUser.role === 'maintainer' && (fault.status === 'pending' || fault.status === 'in_progress') && (
        <div style={{ marginTop: 24 }}>
          <Card title="运维操作" size="small">
            <Space direction="vertical" style={{ width: '100%', gap: 12 }}>
              {canAccept && (
                <Button type="primary" onClick={handleAcceptFault}>
                  接受故障
                </Button>
              )}
              
              {canResolve && (
                <Form layout="vertical" onFinish={handleResolveFault} form={form}>
                  <Form.Item name="maintainer" label="维修人员" rules={[{ required: true, message: '请填写维修人员' }]}> 
                    <Input placeholder="请输入维修人员姓名" style={{ maxWidth: 300 }} />
                  </Form.Item>
                  <Form.Item name="maintenance_vehicle" label="维修车辆">
                    <Input placeholder="请输入维修车辆车牌号（可选）" style={{ maxWidth: 300 }} />
                  </Form.Item>
                  <Form.Item name="equipment_name" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}> 
                    <Input placeholder="请输入设备名称" style={{ maxWidth: 300 }} />
                  </Form.Item>
                  <Form.Item name="equipment_model" label="规格型号">
                    <Input placeholder="请输入规格型号（可选）" style={{ maxWidth: 300 }} />
                  </Form.Item>
                  <Form.Item name="fault_reason_analysis" label="故障原因分析">
                    <Input.TextArea rows={2} placeholder="请分析故障原因（可选）" defaultValue={fault.description} />
                  </Form.Item>
                  <Form.Item name="maintenance_process_result" label="维修过程及结果" rules={[{ required: true, message: '请填写维修过程及结果' }]}>
                    <Input.TextArea rows={3} placeholder="请详细描述维修过程及结果（必填）" />
                  </Form.Item>
                  <Form.Item name="remarks" label="备注">
                    <Input.TextArea rows={2} placeholder="其他备注信息（可选）" />
                  </Form.Item>
                  <Form.Item name="required_tools_materials" label="维修及处理所需专用工具、仪器、器材、备件等">
                    <Input.TextArea rows={2} placeholder="请输入所需工具、仪器、器材、备件等（可选）" style={{ maxWidth: 600 }} />
                  </Form.Item>
                  
                  {/* 照片上传区域 - 可选 */}
                  <Form.Item name="photo_before" label="维修前照片（可选）">
                    <Upload 
                      listType="picture" 
                      maxCount={3}
                      beforeUpload={() => false} // 阻止自动上传
                      accept="image/*"
                    >
                      <Button icon={<UploadOutlined />}>上传照片</Button>
                    </Upload>
                  </Form.Item>
                  <Form.Item name="photo_after" label="维修后照片（可选）">
                    <Upload 
                      listType="picture" 
                      maxCount={3}
                      beforeUpload={() => false} // 阻止自动上传
                      accept="image/*"
                    >
                      <Button icon={<UploadOutlined />}>上传照片</Button>
                    </Upload>
                  </Form.Item>
                  
                  <Space>
                    <Button type="primary" htmlType="submit">
                      完成维修
                    </Button>
                    {canMarkCannotResolve && (
                      <Popconfirm
                        title="确定要标记为无法解决吗？"
                        onConfirm={handleCannotResolve}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button danger>标记无法解决</Button>
                      </Popconfirm>
                    )}
                  </Space>
                </Form>
              )}
            </Space>
          </Card>
        </div>
      )}

      <Modal
        open={modalVisible}
        title="设备维修原始记录表"
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="docx" onClick={exportToDocx} icon={<PrinterOutlined />}>导出为Word</Button>,
          <Button key="close" onClick={() => setModalVisible(false)}>关闭</Button>
        ]}
        width={1100}
      >
        <div style={{ background: '#fff', padding: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }} border="1">
            <tbody>
              {/* 表头合并 */}
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, padding: 12 }}>设备维修原始记录表</td>
              </tr>
              {/* 故障设备具体位置、故障报修时间、报修人、现场位置/监控点 */}
              <tr>
                <td rowSpan="2">故障设备具体位置</td>
                <td rowSpan="2">{fault ? fault.specific_location : ''}</td>
                <td>故障报修时间</td>
                <td>{fault ? new Date(fault.reported_at).toLocaleString('zh-CN') : ''}</td>
                <td>报修人</td>
                <td>{fault ? fault.reporter_name : ''}</td>
                <td>现场位置/监控点</td>
                <td>{fault && fault.monitor_location ? fault.monitor_location : ''}</td>
              </tr>
              {/* 运维人员到达现场时间、维修人员、维修日期、维修车辆、设备型号 */}
              <tr>
                <td>运维人员到达现场时间</td>
                <td>{fault && fault.maintenance_record_detail && fault.maintenance_record_detail.arrived_at ? new Date(fault.maintenance_record_detail.arrived_at).toLocaleString('zh-CN') : ''}</td>
                <td>维修人员</td>
                <td>{fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.maintainer_name || '') : ''}</td>
                <td>维修日期</td>
                <td>{fault && fault.maintenance_record_detail && fault.maintenance_record_detail.completed_at ? new Date(fault.maintenance_record_detail.completed_at).toLocaleDateString('zh-CN') : ''}</td>
              </tr>
              {/* 设备名称、类别、型号、工具等 */}
              <tr>
                <td>设备名称</td>
                <td>{fault ? fault.equipment_name : ''}</td>
                <td>设备类别</td>
                <td>{fault && fault.equipment_category ? fault.equipment_category : ''}</td>
                <td>设备型号</td>
                <td>{fault && fault.equipment_model ? fault.equipment_model : ''}</td>
                <td>维修及处理所需专用工具、仪器、器材、备件等</td>
                <td>{fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.required_tools_materials || '') : ''}</td>
              </tr>
              {/* 故障现象类别、现象详情 */}
              <tr>
                <td>故障现象类别</td>
                <td>{fault && fault.fault_category ? fault.fault_category : ''}</td>
                <td>现象详情</td>
                <td colSpan="5">{fault && fault.description ? fault.description : ''}</td>
              </tr>
              {/* 故障原因分析 */}
              <tr>
                <td>故障原因分析</td>
                <td colSpan="7">{fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.fault_reason_analysis || '') : ''}</td>
              </tr>
              {/* 维修过程及结果 */}
              <tr>
                <td>维修过程及结果</td>
                <td colSpan="7">{fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.maintenance_process_result || '') : ''}</td>
              </tr>
              {/* 维修前/后照片 */}
              <tr>
                <td>维修前照片</td>
                <td colSpan="3">
                  {fault && fault.maintenance_record_detail && fault.maintenance_record_detail.photos && fault.maintenance_record_detail.photos.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {fault.maintenance_record_detail.photos.filter(photo => photo.photo_type === 'before').map((photo, idx) => (
                        <img key={photo.id} src={photo.image_url} alt={`维修前照片${idx + 1}`} style={{ width: 120, height: 120, objectFit: 'cover', border: '1px solid #ccc', marginRight: 8, marginBottom: 8 }} />
                      ))}
                    </div>
                  ) : '无'}
                </td>
                <td>维修后照片</td>
                <td colSpan="3">
                  {fault && fault.maintenance_record_detail && fault.maintenance_record_detail.photos && fault.maintenance_record_detail.photos.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {fault.maintenance_record_detail.photos.filter(photo => photo.photo_type === 'after').map((photo, idx) => (
                        <img key={photo.id} src={photo.image_url} alt={`维修后照片${idx + 1}`} style={{ width: 120, height: 120, objectFit: 'cover', border: '1px solid #ccc', marginRight: 8, marginBottom: 8 }} />
                      ))}
                    </div>
                  ) : '无'}
                </td>
              </tr>
              {/* 备注事项 */}
              <tr>
                <td>备注事项</td>
                <td colSpan="7">{fault && fault.maintenance_record_detail ? (fault.maintenance_record_detail.remarks || '') : ''}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </Card>
  );
};

export default FaultDetail; 