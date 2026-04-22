/**
 * DataMaskStudio - Electron 预加载脚本 v1.1.0
 * 通过 contextBridge 安全地暴露 API 给渲染进程
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {

  maskFile: (params: { filePath: string; intensity: string; strategy: string; hashAlgorithm?: string }) =>
    ipcRenderer.invoke('mask-file', params),

  maskBuffer: (params: { fileName: string; bufferBase64: string; intensity: string; strategy: string; hashAlgorithm?: string }) =>
    ipcRenderer.invoke('mask-buffer', params),

  encryptContent: (params: { content: string; password?: string }) =>
    ipcRenderer.invoke('encrypt-content', params),

  decryptContent: (params: { cipherText: string; password?: string }) =>
    ipcRenderer.invoke('decrypt-content', params),

  getFileContent: (params: { filePath: string }) =>
    ipcRenderer.invoke('get-file-content', params),

  saveFile: (params: { filePath: string; content: string }) =>
    ipcRenderer.invoke('save-file', params),

  openFileDialog: (params?: { filters?: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke('open-file-dialog', params || {}),
});

console.log('[Preload] DataMask Studio v1.1.0 ready');
