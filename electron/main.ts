/**
 * DataMaskStudio - Electron 主进程入口
 * 职责：创建窗口、注册 IPC handlers、处理文件操作
 */
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import mammoth from 'mammoth';

// 是否为开发模式
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function log(level: string, message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`, ...args);
}

// ==================== 统一文件解析器 ====================

/**
 * 解析任意格式文件，返回纯文本内容（异步）
 */
async function parseFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);
  return parseBuffer(buffer, ext);
}

/**
 * 解析 Buffer，根据扩展名调用不同解析器（异步）
 * 用于拖拽文件场景（渲染进程传 ArrayBuffer → base64 → Buffer）
 */
async function parseBuffer(
  buffer: Buffer,
  ext: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    if (['.xlsx', '.xls', '.et'].includes(ext)) {
      // Excel 格式
      const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });
      const lines: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws['!ref']) continue;
        const range = xlsx.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; R++) {
          const rowTexts: string[] = [];
          for (let C = range.s.c; C <= range.e.c; C++) {
            const cellAddr = xlsx.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellAddr];
            if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
              rowTexts.push(String(cell.v));
            }
          }
          if (rowTexts.length > 0) lines.push(rowTexts.join('\t'));
        }
      }
      return { success: true, content: lines.join('\n') };

    } else if (ext === '.docx') {
      // Word 格式（异步）
      const result = await mammoth.extractRawText({ buffer });
      if (result.messages && result.messages.length > 0) {
        log('warn', 'Word 解析警告:', result.messages.map((m: { message: string }) => m.message).join('; '));
      }
      return { success: true, content: result.value };

    } else if (ext === '.csv') {
      // CSV — 尝试分号分隔或逗号分隔
      let text = buffer.toString('utf-8');
      const firstLine = text.split('\n')[0];
      if (firstLine.includes(';') && !firstLine.includes(',')) {
        text = text.replace(/;/g, '\t'); // 分号分隔转制表符
      }
      return { success: true, content: text };

    } else if (ext === '.json') {
      // JSON
      const text = buffer.toString('utf-8');
      try {
        const data = JSON.parse(text);
        return { success: true, content: JSON.stringify(data) };
      } catch {
        return { success: true, content: text };
      }

    } else if (ext === '.jsonl') {
      return { success: true, content: buffer.toString('utf-8') };

    } else if (ext === '.xml') {
      return { success: true, content: buffer.toString('utf-8') };

    } else {
      // 纯文本
      return { success: true, content: buffer.toString('utf-8') };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '解析失败' };
  }
}

// ==================== 脱敏引擎 ====================

/**
 * 脱敏引擎 - 根据脱敏策略处理敏感数据
 */
function maskEngine(
  content: string,
  intensity: 'light' | 'medium' | 'heavy',
  strategy: 'mask' | 'hash' | 'fake' | 'reversible'
): string {
  const patterns: Record<string, RegExp> = {
    phone: /1[3-9]\d{9}/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    idCard: /\d{17}[\dXx]/g,
    ip: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
    bankCard: /\d{16,19}/g,
    name: /[\u4e00-\u9fa5]{2,4}(?:先生|女士|小姐|总|经理|董事|长)/g,
  };

  let result = content;

  const getMask = (type: string, value: string): string => {
    if (strategy === 'hash') {
      let hash = 0;
      for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36).toUpperCase();
    }

    if (strategy === 'fake') {
      if (type === 'phone') return '138' + Math.floor(Math.random() * 90000000 + 10000000).toString();
      if (type === 'email') return 'user' + Math.floor(Math.random() * 10000) + '@example.com';
      if (type === 'idCard') return value.substring(0, 6) + 'XXXXXXXXXX';
      if (type === 'ip') return '10.0.0.' + Math.floor(Math.random() * 255 + 1);
      if (type === 'bankCard') return '6222' + Math.floor(Math.random() * 1e12).toString().padStart(12, '0');
      if (type === 'name') return '**' + value.slice(-1);
    }

    if (strategy === 'reversible') {
      return Buffer.from(value.split('').reverse().join('')).toString('base64');
    }

    // 默认掩码
    if (type === 'phone') {
      const level = intensity === 'heavy' ? 7 : intensity === 'medium' ? 4 : 2;
      return value.slice(0, level) + '*'.repeat(value.length - level - 4) + value.slice(-4);
    }
    if (type === 'email') {
      const [user, domain] = value.split('@');
      return user.slice(0, 2) + '*'.repeat(Math.max(0, user.length - 2)) + '@' + domain;
    }
    if (type === 'idCard') {
      const level = intensity === 'heavy' ? 14 : intensity === 'medium' ? 10 : 6;
      return value.slice(0, level) + '*'.repeat(value.length - level);
    }
    if (type === 'ip') {
      const parts = value.split('.');
      const maskCount = intensity === 'heavy' ? 3 : intensity === 'medium' ? 2 : 1;
      return parts.map((p, i) => i >= 4 - maskCount ? '*' : p).join('.');
    }
    if (type === 'bankCard') {
      const level = intensity === 'heavy' ? 14 : intensity === 'medium' ? 10 : 6;
      return value.slice(0, 4) + '*'.repeat(level) + value.slice(-4);
    }
    if (type === 'name') return intensity === 'heavy' ? '***' : '*' + value.slice(-2);

    return '*'.repeat(value.length);
  };

  for (const [type, regex] of Object.entries(patterns)) {
    result = result.replace(regex, (match) => getMask(type, match));
  }

  return result;
}

// ==================== 检测规则（用于统计） ====================

const DETECTION_PATTERNS = [
  { name: '手机号', pattern: /1[3-9]\d{9}/g },
  { name: '邮箱', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: '身份证', pattern: /\d{17}[\dXx]/g },
  { name: 'IP地址', pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g },
  { name: '银行卡', pattern: /\d{16,19}/g },
];

function detectSensitive(content: string): Array<{ type: string; value: string }> {
  const results: Array<{ type: string; value: string }> = [];
  for (const { name, pattern } of DETECTION_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.push({ type: name, value: match[0] });
    }
  }
  return results;
}

// ==================== 窗口管理 ====================

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  log('info', '正在创建主窗口...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'DataMask Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log('info', '主窗口已显示');
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'file:' && !url.startsWith('http://localhost:5173')) {
      log('warn', '拒绝非法导航:', url);
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

// ==================== IPC Handlers ====================

/**
 * mask-file: 对文件进行脱敏处理（支持所有格式）
 */
ipcMain.handle('mask-file', async (_event, { filePath, intensity, strategy }) => {
  const startTime = Date.now();
  log('info', '开始脱敏文件:', filePath, '强度:', intensity, '策略:', strategy);

  try {
    // 1. 解析文件（异步，支持所有格式）
    const parseResult = await parseFile(filePath);
    if (!parseResult.success) {
      return { success: false, error: parseResult.error, duration: 0 };
    }

    const originalContent = parseResult.content || '';
    if (!originalContent.trim()) {
      return { success: false, error: '文件内容为空或无法解析', duration: 0 };
    }

    // 2. 检测敏感数据
    const sensitiveMatches = detectSensitive(originalContent);
    const maskedFields = sensitiveMatches.map(m => m.value);

    // 3. 应用脱敏
    const maskedContent = maskEngine(
      originalContent,
      intensity as 'light' | 'medium' | 'heavy',
      strategy as 'mask' | 'hash' | 'fake' | 'reversible'
    );

    const duration = (Date.now() - startTime) / 1000;
    log('info', '脱敏完成，耗时:', duration + 's', '脱敏字段数:', maskedFields.length);

    return {
      success: true,
      originalContent,
      maskedContent,
      maskedFields,
      duration,
    };
  } catch (error) {
    log('error', '脱敏失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      duration: (Date.now() - startTime) / 1000,
    };
  }
});

/**
 * mask-buffer: 对拖拽文件进行脱敏处理（通过 Buffer，支持所有格式）
 */
ipcMain.handle('mask-buffer', async (_event, { fileName, bufferBase64, intensity, strategy }) => {
  const startTime = Date.now();
  log('info', '开始脱敏拖拽文件:', fileName, '强度:', intensity, '策略:', strategy);

  try {
    // 1. 将 base64 解码为 Buffer
    const buffer = Buffer.from(bufferBase64, 'base64');
    const ext = path.extname(fileName).toLowerCase();

    // 2. 解析 Buffer
    const parseResult = await parseBuffer(buffer, ext);
    if (!parseResult.success) {
      return { success: false, error: parseResult.error, duration: 0 };
    }

    const originalContent = parseResult.content || '';
    if (!originalContent.trim()) {
      return { success: false, error: '文件内容为空或无法解析', duration: 0 };
    }

    // 3. 检测敏感数据
    const sensitiveMatches = detectSensitive(originalContent);
    const maskedFields = sensitiveMatches.map(m => m.value);

    // 4. 应用脱敏
    const maskedContent = maskEngine(
      originalContent,
      intensity as 'light' | 'medium' | 'heavy',
      strategy as 'mask' | 'hash' | 'fake' | 'reversible'
    );

    const duration = (Date.now() - startTime) / 1000;
    log('info', '拖拽文件脱敏完成，耗时:', duration + 's', '脱敏字段数:', maskedFields.length);

    return {
      success: true,
      originalContent,
      maskedContent,
      maskedFields,
      duration,
    };
  } catch (error) {
    log('error', '拖拽文件脱敏失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      duration: (Date.now() - startTime) / 1000,
    };
  }
});

/**
 * get-file-content: 读取文件内容（支持所有格式）
 */
ipcMain.handle('get-file-content', async (_event, { filePath }) => {
  try {
    const result = await parseFile(filePath);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, content: result.content };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
});

/**
 * save-file: 保存文件
 */
ipcMain.handle('save-file', async (_event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    log('info', '文件保存成功:', filePath);
    return { success: true, filePath };
  } catch (error) {
    log('error', '保存文件失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
});

/**
 * open-file-dialog: 打开文件选择对话框
 */
ipcMain.handle('open-file-dialog', async (_event, { filters }) => {
  const defaultFilters = [
    { name: '支持的格式', extensions: ['txt', 'csv', 'json', 'xml', 'xlsx', 'xls', 'docx'] },
    { name: 'Excel', extensions: ['xlsx', 'xls'] },
    { name: 'Word', extensions: ['docx', 'doc'] },
    { name: '所有文件', extensions: ['*'] },
  ];

  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择要脱敏的文件',
      properties: ['openFile', 'multiSelections'],
      filters: filters || defaultFilters,
    });

    log('info', '文件选择结果:', result.filePaths);
    return { success: !result.canceled, filePaths: result.filePaths };
  } catch (error) {
    log('error', '打开文件对话框失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误', filePaths: [] };
  }
});

// ==================== 应用生命周期 ====================

app.whenReady().then(() => {
  log('info', 'Electron 应用启动');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log('info', '应用即将退出');
});

process.on('uncaughtException', (error) => {
  log('error', '未捕获的异常:', error);
});

process.on('unhandledRejection', (reason) => {
  log('error', '未处理的 Promise 拒绝:', reason);
});
