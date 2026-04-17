/**
 * DataMaskStudio - 渲染进程 TypeScript 类型声明
 * 定义 window.electronAPI 的类型，供 TypeScript 编译器检查
 */

/** 脱敏强度枚举 */
type MaskIntensity = 'light' | 'medium' | 'heavy';

/** 脱敏策略枚举 */
type MaskStrategy = 'mask' | 'hash' | 'fake' | 'reversible';

/**
 * mask-file 接口参数
 * @param filePath 文件绝对路径
 * @param intensity 脱敏强度
 * @param strategy 脱敏策略
 */
interface MaskFileParams {
  filePath: string;
  intensity: MaskIntensity;
  strategy: MaskStrategy;
}

/**
 * mask-file 接口返回结果
 */
interface MaskFileResult {
  /** 操作是否成功 */
  success: boolean;
  /** 原始文件内容 */
  originalContent?: string;
  /** 脱敏后的内容 */
  maskedContent?: string;
  /** 被脱敏的字段列表 */
  maskedFields?: string[];
  /** 处理耗时（秒） */
  duration?: number;
  /** 错误信息（失败时返回） */
  error?: string;
}

/**
 * get-file-content 接口参数
 */
interface GetFileContentParams {
  /** 文件绝对路径 */
  filePath: string;
}

/**
 * get-file-content 接口返回结果
 */
interface GetFileContentResult {
  /** 操作是否成功 */
  success: boolean;
  /** 文件内容 */
  content?: string;
  /** 错误信息（失败时返回） */
  error?: string;
}

/**
 * save-file 接口参数
 */
interface SaveFileParams {
  /** 文件保存路径 */
  filePath: string;
  /** 要保存的内容 */
  content: string;
}

/**
 * save-file 接口返回结果
 */
interface SaveFileResult {
  /** 操作是否成功 */
  success: boolean;
  /** 保存后的文件路径 */
  filePath?: string;
  /** 错误信息（失败时返回） */
  error?: string;
}

/**
 * open-file-dialog 接口参数
 */
interface OpenFileDialogParams {
  /** 文件过滤器配置 */
  filters?: Array<{
    /** 过滤器名称 */
    name: string;
    /** 支持的文件扩展名 */
    extensions: string[];
  }>;
}

/**
 * open-file-dialog 接口返回结果
 */
interface OpenFileDialogResult {
  /** 操作是否成功 */
  success: boolean;
  /** 选择的文件路径数组 */
  filePaths?: string[];
  /** 错误信息（失败时返回） */
  error?: string;
}

/**
 * mask-buffer 接口参数（用于拖拽文件）
 */
interface MaskBufferParams {
  /** 文件名（含扩展名，用于判断格式） */
  fileName: string;
  /** 文件内容的 base64 编码 */
  bufferBase64: string;
  intensity: MaskIntensity;
  strategy: MaskStrategy;
}

/**
 * mask-buffer 接口返回结果
 */
interface MaskBufferResult {
  success: boolean;
  originalContent?: string;
  maskedContent?: string;
  maskedFields?: string[];
  duration?: number;
  error?: string;
}

/**
 * Electron 预加载脚本暴露给渲染进程的 API
 * 通过 window.electronAPI 访问
 */
interface ElectronAPI {
  /**
   * 对文件进行脱敏处理
   * @param params 包含文件路径、脱敏强度和策略
   * @returns Promise<MaskFileResult> 脱敏结果
   */
  maskFile(params: MaskFileParams): Promise<MaskFileResult>;

  /**
   * 对拖拽文件进行脱敏处理（通过 Buffer）
   * @param params 包含文件名、base64 编码内容、脱敏强度和策略
   * @returns Promise<MaskBufferResult> 脱敏结果
   */
  maskBuffer(params: MaskBufferParams): Promise<MaskBufferResult>;

  /**
   * 读取文件内容
   * @param params 包含文件路径
   * @returns Promise<GetFileContentResult> 文件内容
   */
  getFileContent(params: GetFileContentParams): Promise<GetFileContentResult>;

  /**
   * 保存文件到指定路径
   * @param params 包含文件路径和内容
   * @returns Promise<SaveFileResult> 保存结果
   */
  saveFile(params: SaveFileParams): Promise<SaveFileResult>;

  /**
   * 打开系统文件选择对话框
   * @param params 可选的过滤器配置
   * @returns Promise<OpenFileDialogResult> 选择结果
   */
  openFileDialog(params?: OpenFileDialogParams): Promise<OpenFileDialogResult>;
}

/**
 * 扩展 Window 接口，声明 electronAPI 属性
 */
declare global {
  interface Window {
    /**
     * Electron 预加载脚本暴露的 API
     * 仅在 Electron 环境中可用
     */
    electronAPI: ElectronAPI;
  }
}

/**
 * 空导出，保持此文件作为模块
 * 否则会成为全局声明文件
 */
export {};
