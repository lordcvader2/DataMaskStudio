/**
 * 解析器入口
 * 根据文件扩展名自动选择合适的解析器
 */

export { CsvParser } from './csvParser';
export { TextParser } from './textParser';
export { JsonParser } from './jsonParser';
export { XmlParser } from './xmlParser';
export { ExcelParser } from './excelParser';
export { WordParser } from './wordParser';

// 类型导出
export type { FileParser, ParseResult, FileFormat, FileMetadata, TextPosition } from './types';


import { CsvParser } from './csvParser';
import { TextParser } from './textParser';
import { JsonParser } from './jsonParser';
import { XmlParser } from './xmlParser';
import { ExcelParser } from './excelParser';
import { WordParser } from './wordParser';
import { FileParser } from './types';

/**
 * 所有已注册的解析器列表
 */
const parsers: FileParser[] = [
  new CsvParser(),
  new TextParser(),
  new JsonParser(),
  new XmlParser(),
  new ExcelParser(),
  new WordParser(),
];

/**
 * 根据文件扩展名自动选择合适的解析器
 * @param fileName 文件名
 * @returns 对应的解析器实例，如果找不到则返回 null
 */
export function getParser(fileName: string): FileParser | null {
  for (const parser of parsers) {
    if (parser.canParse(fileName)) {
      return parser;
    }
  }
  return null;
}

/**
 * 获取所有支持的扩展名
 * @returns 扩展名数组，如 ['.csv', '.json', '.xml', ...]
 */
export function getSupportedExtensions(): string[] {
  const extensions = new Set<string>();
  for (const parser of parsers) {
    for (const ext of parser.extensions) {
      extensions.add(ext);
    }
  }
  return Array.from(extensions);
}

/**
 * 获取所有解析器
 * @returns 所有解析器实例数组
 */
export function getAllParsers(): FileParser[] {
  return [...parsers];
}

/**
 * 检查文件是否被支持
 * @param fileName 文件名
 * @returns 是否支持
 */
export function isSupported(fileName: string): boolean {
  return getParser(fileName) !== null;
}

// 默认导出：获取解析器函数
export default getParser;
