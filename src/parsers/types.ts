/**
 * 文件解析器类型定义
 * DataMaskStudio - 统一的解析器接口
 */

/**
 * 支持的文件格式
 */
export type FileFormat = 
  | 'txt' 
  | 'md' 
  | 'csv' 
  | 'json' 
  | 'xml' 
  | 'xlsx' 
  | 'xls' 
  | 'docx' 
  | 'py' 
  | 'java' 
  | 'js' 
  | 'cpp';

/**
 * 文件元信息
 */
export interface FileMetadata {
  /** 文件名 */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** Excel工作表名 */
  sheetName?: string;
  /** PDF页数 */
  pageCount?: number;
  /** 文件编码 */
  encoding?: string;
  /** 创建时间 */
  createdAt?: Date;
  /** 修改时间 */
  modifiedAt?: Date;
  /** 工作表列表（Excel多工作表） */
  sheets?: string[];
  /** 行数 */
  lineCount?: number;
}

/**
 * 解析结果
 */
export interface ParseResult {
  /** 提取的文本内容 */
  content: string;
  /** 文件格式 */
  format: FileFormat;
  /** 文件元信息 */
  metadata: FileMetadata;
  /** 原始数据（用于还原格式） */
  raw?: Buffer;
  /** 解析后的结构化数据（JSON对象、表格数据等） */
  structuredData?: unknown;
  /** 文本位置映射（用于脱敏后还原） */
  positionMap?: TextPosition[];
}

/**
 * 文本位置信息
 */
export interface TextPosition {
  /** 起始位置 */
  start: number;
  /** 结束位置 */
  end: number;
  /** 文本内容 */
  text: string;
  /** 上下文类型（如：单元格、段落、属性值等） */
  context?: string;
}

/**
 * 文件解析器接口
 */
export interface FileParser {
  /** 解析器名称 */
  readonly name: string;
  
  /** 支持的文件扩展名 */
  readonly extensions: string[];
  
  /**
   * 判断是否可以解析该文件
   * @param fileName 文件名
   */
  canParse(fileName: string): boolean;
  
  /**
   * 解析文件
   * @param input 文件路径或Buffer
   */
  parse(input: string | Buffer): Promise<ParseResult>;
  
  /**
   * 导出数据到文件
   * @param data 要导出的文本内容
   * @param outputPath 输出文件路径
   * @param format 目标格式
   */
  export(data: string, outputPath: string, format: FileFormat): Promise<void>;
}

/**
 * 解析器选项
 */
export interface ParserOptions {
  /** 编码检测 */
  detectEncoding?: boolean;
  /** 保留原始数据 */
  keepRaw?: boolean;
  /** 最大文件大小（字节） */
  maxFileSize?: number;
  /** 工作表名称（Excel） */
  sheetName?: string;
  /** 是否包含隐藏内容 */
  includeHidden?: boolean;
}

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 编码格式 */
  encoding?: string;
  /** 是否美化输出 */
  pretty?: boolean;
  /** 缩进大小 */
  indentSize?: number;
  /** 是否添加BOM（Windows兼容） */
  addBOM?: boolean;
}
