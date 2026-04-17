/**
 * DataMaskStudio - Electron 预加载脚本
 * 通过 contextBridge 将安全的 API 暴露给渲染进程
 * 渲染进程通过 window.electronAPI 访问这些方法
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * 使用 contextBridge.exposeInMainWorld 将 API 暴露给 window 对象
 * 这是安全的做法，因为它在独立的上下文中运行，不直接暴露 Node.js API
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 对文件进行脱敏处理（通过文件路径）
   */
  maskFile: (params: {
    filePath: string;
    intensity: string;
    strategy: string;
  }): Promise<{
    success: boolean;
    originalContent?: string;
    maskedContent?: string;
    maskedFields?: string[];
    duration?: number;
    error?: string;
  }> => {
    return ipcRenderer.invoke('mask-file', params);
  },

  /**
   * 对文件进行脱敏处理（通过 Buffer，用于拖拽文件）
   * 渲染进程通过 FileReader 读取文件为 ArrayBuffer，转成 base64 传给 main
   */
  maskBuffer: (params: {
    fileName: string;
    bufferBase64: string;
    intensity: string;
    strategy: string;
  }): Promise<{
    success: boolean;
    originalContent?: string;
    maskedContent?: string;
    maskedFields?: string[];
    duration?: number;
    error?: string;
  }> => {
    return ipcRenderer.invoke('mask-buffer', params);
  },

  /**
   * 读取文件内容
   */
  getFileContent: (params: {
    filePath: string;
  }): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> => {
    return ipcRenderer.invoke('get-file-content', params);
  },

  /**
   * 保存文件
   */
  saveFile: (params: {
    filePath: string;
    content: string;
  }): Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }> => {
    return ipcRenderer.invoke('save-file', params);
  },

  /**
   * 打开文件选择对话框
   */
  openFileDialog: (params?: {
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<{
    success: boolean;
    filePaths?: string[];
    error?: string;
  }> => {
    return ipcRenderer.invoke('open-file-dialog', params || {});
  },
});

console.log('[Preload] electronAPI 已成功注入到渲染进程');
