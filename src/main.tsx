/**
 * DataMaskStudio - React 应用入口
 * 挂载根组件到 #root DOM 节点
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 导入 Ant Design 全局样式重置
import 'antd/dist/reset.css';

// 导入全局样式（包含 Tailwind CSS）
import './index.css';

// 创建 React 18 的并发根节点
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// 渲染主应用组件
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
