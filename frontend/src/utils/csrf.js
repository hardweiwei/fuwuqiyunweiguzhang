import axios from 'axios';

// 创建axios实例（简化版本，因为后端已禁用CSRF）
export const createAxiosInstance = () => {
  return axios.create({
    baseURL: 'https://weidx.cyou',
    withCredentials: true,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// 创建用于文件上传的axios实例
export const createFormDataAxiosInstance = () => {
  return axios.create({
    baseURL: 'https://weidx.cyou',
    withCredentials: true,
    timeout: 30000,  // 文件上传需要更长的超时时间
  });
};

// 为了兼容性，保留getCsrfToken函数（但返回null）
export const getCsrfToken = async () => {
  return null;
}; 