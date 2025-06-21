import React, { useEffect, useState, useRef } from 'react';
import { Card, Descriptions, Button, Image, Spin, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { createAxiosInstance } from '../utils/csrf';
import { saveAs } from 'file-saver';

const MaintenanceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const axiosInstance = await createAxiosInstance();
        const res = await axiosInstance.get(`/api/maintenance-records/${id}/`);
        setRecord(res.data);
      } catch (e) {
        message.error('获取维修记录详情失败');
        navigate('/maintenance');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
    // eslint-disable-next-line
  }, [id]);

  // 导出为Word
  const exportToDocx = () => {
    import('docx').then(docx => {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } = docx;
      const rows = [];
      // 表头
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
      // 主要信息
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('设备名称')] }),
          new TableCell({ children: [new Paragraph(record?.equipment_name || '-')], columnSpan: 3 }),
          new TableCell({ children: [new Paragraph('维修人员')] }),
          new TableCell({ children: [new Paragraph(record?.maintainer_name || '-')], columnSpan: 3 }),
        ]
      }));
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('桩号')] }),
          new TableCell({ children: [new Paragraph(record?.center_stake_number || '-')], columnSpan: 3 }),
          new TableCell({ children: [new Paragraph('完成时间')] }),
          new TableCell({ children: [new Paragraph(record?.completed_at ? new Date(record.completed_at).toLocaleString('zh-CN') : '-')], columnSpan: 3 }),
        ]
      }));
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('具体位置')] }),
          new TableCell({ children: [new Paragraph(record?.specific_location || '-')], columnSpan: 3 }),
          new TableCell({ children: [new Paragraph('维修车辆')] }),
          new TableCell({ children: [new Paragraph(record?.maintenance_vehicle || '-')], columnSpan: 3 }),
        ]
      }));
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('到场时间')] }),
          new TableCell({ children: [new Paragraph(record?.arrived_at ? new Date(record.arrived_at).toLocaleString('zh-CN') : '-')], columnSpan: 3 }),
          new TableCell({ children: [new Paragraph('维修工具')] }),
          new TableCell({ children: [new Paragraph(record?.required_tools_materials || '-')], columnSpan: 3 }),
        ]
      }));
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('故障原因分析')] }),
          new TableCell({ children: [new Paragraph(record?.fault_reason_analysis || '-')], columnSpan: 7 }),
        ]
      }));
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('维修过程及结果')] }),
          new TableCell({ children: [new Paragraph(record?.maintenance_process_result || '-')], columnSpan: 7 }),
        ]
      }));
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('备注')] }),
          new TableCell({ children: [new Paragraph(record?.remarks || '-')], columnSpan: 7 }),
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
        saveAs(blob, `设备维修原始记录表_${record?.id || ''}.docx`);
      });
    });
  };

  if (loading) {
    return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  }
  if (!record) {
    return <div style={{ textAlign: 'center', padding: 50 }}>未找到该维修记录</div>;
  }

  return (
    <Card title="维修记录详情" style={{ maxWidth: 800, margin: '32px auto' }}>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="设备名称">{record.equipment_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="桩号">{record.center_stake_number || '-'}</Descriptions.Item>
        <Descriptions.Item label="具体位置">{record.specific_location || '-'}</Descriptions.Item>
        <Descriptions.Item label="维修人员">{record.maintainer_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="到场时间">{record.arrived_at ? new Date(record.arrived_at).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
        <Descriptions.Item label="完成时间">{record.completed_at ? new Date(record.completed_at).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
        <Descriptions.Item label="维修车辆">{record.maintenance_vehicle || '-'}</Descriptions.Item>
        <Descriptions.Item label="维修工具">{record.required_tools_materials || '-'}</Descriptions.Item>
        <Descriptions.Item label="故障原因分析" span={2}>{record.fault_reason_analysis || '-'}</Descriptions.Item>
        <Descriptions.Item label="维修过程及结果" span={2}>{record.maintenance_process_result || '-'}</Descriptions.Item>
        <Descriptions.Item label="维修前照片" span={2}>
          {record.photos?.filter(p => p.photo_type === 'before').length > 0 ? (
            record.photos.filter(p => p.photo_type === 'before').map(photo => (
              <Image key={photo.id} width={100} src={photo.image_url || photo.image} style={{ marginRight: 8 }} />
            ))
          ) : '无'}
        </Descriptions.Item>
        <Descriptions.Item label="维修后照片" span={2}>
          {record.photos?.filter(p => p.photo_type === 'after').length > 0 ? (
            record.photos.filter(p => p.photo_type === 'after').map(photo => (
              <Image key={photo.id} width={100} src={photo.image_url || photo.image} style={{ marginRight: 8 }} />
            ))
          ) : '无'}
        </Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>{record.remarks || '-'}</Descriptions.Item>
      </Descriptions>
      <Button icon={<PrinterOutlined />} style={{ marginTop: 16 }} onClick={exportToDocx}>
        导出为Word
      </Button>
      <Button style={{ marginTop: 16, marginLeft: 16 }} onClick={() => navigate('/maintenance')}>返回列表</Button>
    </Card>
  );
};
export default MaintenanceDetail; 