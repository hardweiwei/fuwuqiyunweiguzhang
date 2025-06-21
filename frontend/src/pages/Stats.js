import React, { useEffect, useState } from 'react';
import { DatePicker, Button, message } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/es/date-picker/locale/zh_CN';
import './Stats.css';

const { RangePicker } = DatePicker;

const Stats = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dates, setDates] = useState([null, null]);

  const fetchStats = async (start, end) => {
    setLoading(true);
    setError(null);
    let url = '/api/stats/faults/';
    const params = [];
    if (start) params.push(`start_date=${start}`);
    if (end) params.push(`end_date=${end}`);
    if (params.length) url += '?' + params.join('&');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('网络错误');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e);
      message.error('加载失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRangeChange = (values) => {
    setDates(values);
  };

  const handleSearch = () => {
    const [start, end] = dates;
    fetchStats(
      start ? dayjs(start).format('YYYY-MM-DD') : undefined,
      end ? dayjs(end).format('YYYY-MM-DD') : undefined
    );
  };

  return (
    <div className="stats-container">
      <h2>统计报表</h2>
      <div className="stats-toolbar">
        <RangePicker
          locale={locale}
          value={dates}
          onChange={handleRangeChange}
          allowClear
          style={{ marginRight: 12 }}
        />
        <Button type="primary" onClick={handleSearch} loading={loading}>查询</Button>
      </div>
      {loading && <div className="stats-loading">加载中...</div>}
      {error && <div className="stats-error">加载失败: {error.message}</div>}
      {data && (
        <div>
          <h3>平均维修处理时长：<span className="stats-highlight">{data.average_processing_time_hours}</span> 小时</h3>

          <h4>按日期统计</h4>
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>总故障</th>
                  <th>待处理</th>
                  <th>处理中</th>
                  <th>已解决</th>
                  <th>无法解决</th>
                </tr>
              </thead>
              <tbody>
                {data.faults_by_date.map(row => (
                  <tr key={row.date_group}>
                    <td>{row.date_group}</td>
                    <td>{row.total_faults}</td>
                    <td>{row.pending_faults}</td>
                    <td>{row.in_progress_faults}</td>
                    <td>{row.resolved_faults}</td>
                    <td>{row.cannot_resolve_faults}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4>按设备统计</h4>
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>设备名称</th>
                  <th>总故障</th>
                  <th>待处理</th>
                  <th>处理中</th>
                  <th>已解决</th>
                  <th>无法解决</th>
                </tr>
              </thead>
              <tbody>
                {data.faults_by_equipment.map(row => (
                  <tr key={row.equipment_name}>
                    <td>{row.equipment_name}</td>
                    <td>{row.total_faults}</td>
                    <td>{row.pending_faults}</td>
                    <td>{row.in_progress_faults}</td>
                    <td>{row.resolved_faults}</td>
                    <td>{row.cannot_resolve_faults}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats; 