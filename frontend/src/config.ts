// API配置
export const API_CONFIG = {
  // 开发环境使用宿主机端口，生产环境使用相对路径
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  
  // API端点
  ENDPOINTS: {
    UPLOAD: '/api/upload',
    UPLOAD_STREAM: '/api/upload_stream',
  }
};

// 构建完整的API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
