/**
 * JSON 文件解析器
 * 支持标准JSON格式，支持嵌套对象和数组
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileParser, ParseResult, FileFormat, FileMetadata, TextPosition } from './types';

export class JsonParser implements FileParser {
  readonly name = 'JsonParser';
  readonly extensions = ['.json'];

  /**
   * 判断是否可以解析该文件
   */
  canParse(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return this.extensions.includes(ext);
  }

  /**
   * 递归遍历JSON对象，提取所有字符串值及其位置
   */
  private traverseValue(
    value: unknown,
    positionMap: TextPosition[],
    jsonPath: string,
    startOffset: number
  ): { endOffset: number; stringCount: number } {
    if (typeof value === 'string') {
      // 记录字符串值的位置（不含外层引号）
      positionMap.push({
        start: startOffset,
        end: startOffset + value.length,
        text: value,
        context: jsonPath,
      });
      return {
        endOffset: startOffset + value.length,
        stringCount: 1,
      };
    }

    if (Array.isArray(value)) {
      let offset = startOffset;
      offset++; // '['
      let stringCount = 0;

      for (let i = 0; i < value.length; i++) {
        if (i > 0) offset++; // ','
        const result = this.traverseValue(value[i], positionMap, `${jsonPath}[${i}]`, offset);
        offset = result.endOffset;
        stringCount += result.stringCount;
      }

      offset++; // ']'
      return { endOffset: offset, stringCount };
    }

    if (typeof value === 'object' && value !== null) {
      let offset = startOffset;
      offset++; // '{'
      let stringCount = 0;
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);

      for (let i = 0; i < keys.length; i++) {
        if (i > 0) offset++; // ','
        const key = keys[i];
        // "key":
        offset += JSON.stringify(key).length + 1; // +1 for ':'
        const result = this.traverseValue(obj[key], positionMap, `${jsonPath}.${key}`, offset);
        offset = result.endOffset;
        stringCount += result.stringCount;
      }

      offset++; // '}'
      return { endOffset: offset, stringCount };
    }

    // number, boolean, null — no strings here
    return { endOffset: startOffset, stringCount: 0 };
  }

  /**
   * 解析文件
   */
  async parse(input: string | Buffer): Promise<ParseResult> {
    let buffer: Buffer;
    let filePath: string | undefined;

    if (typeof input === 'string') {
      filePath = input;
      buffer = fs.readFileSync(input);
    } else {
      buffer = input;
    }

    // 解码（处理 BOM）
    let content: string;
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      content = buffer.slice(3).toString('utf-8');
    } else {
      content = buffer.toString('utf-8');
    }
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

    // 解析 JSON
    let structuredData: unknown;
    try {
      structuredData = JSON.parse(content);
    } catch (err) {
      throw new Error(`JSON 解析失败: ${(err as Error).message}`);
    }

    // 构建位置映射
    const positionMap: TextPosition[] = [];
    if (content.length > 0) {
      this.traverseValue(structuredData, positionMap, 'root', 0);
    }

    const metadata: FileMetadata = {
      fileName: filePath ? path.basename(filePath) : 'unknown',
      fileSize: buffer.length,
      encoding: 'utf-8',
    };
    if (filePath) {
      const stats = fs.statSync(filePath);
      metadata.createdAt = stats.birthtime;
      metadata.modifiedAt = stats.mtime;
    }

    // 纯文本内容（用于敏感信息检测）
    const textContent = this.extractTextFromValue(structuredData);

    return {
      content: textContent,
      format: 'json',
      metadata,
      raw: buffer,
      structuredData,
      positionMap,
    };
  }

  /**
   * 递归提取 JSON 中所有文本值
   */
  private extractTextFromValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(v => this.extractTextFromValue(v)).join('\n');
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value as Record<string, unknown>)
        .map(k => this.extractTextFromValue((value as Record<string, unknown>)[k]))
        .join('\n');
    }
    return '';
  }

  /**
   * 递归替换 JSON 中的敏感值
   */
  private maskValue(value: unknown, maskFn: (text: string) => string): unknown {
    if (typeof value === 'string') return maskFn(value);
    if (Array.isArray(value)) return value.map(v => this.maskValue(v, maskFn));
    if (typeof value === 'object' && value !== null) {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>)) {
        result[key] = this.maskValue((value as Record<string, unknown>)[key], maskFn);
      }
      return result;
    }
    return value;
  }

  /**
   * 脱敏处理
   * @param input 文件路径、Buffer 或 ParseResult
   * @param matches 敏感信息匹配结果 [{original, replacement}]
   */
  async mask(
    input: string | Buffer | ParseResult,
    matches: Array<{ original: string; replacement: string }>
  ): Promise<ParseResult> {
    let parseResult: ParseResult;
    let originalBuffer: Buffer;

    if (typeof input === 'string') {
      originalBuffer = fs.readFileSync(input);
      parseResult = await this.parse(input);
    } else if (Buffer.isBuffer(input)) {
      originalBuffer = input;
      parseResult = await this.parse(input);
    } else {
      parseResult = input;
      originalBuffer = input.raw || Buffer.from(input.content, 'utf-8');
    }

    // 获取原始 JSON 字符串
    let jsonString: string;
    if (originalBuffer.length >= 3 && originalBuffer[0] === 0xef && originalBuffer[1] === 0xbb && originalBuffer[2] === 0xbf) {
      jsonString = originalBuffer.slice(3).toString('utf-8');
    } else {
      jsonString = originalBuffer.toString('utf-8');
    }
    if (jsonString.charCodeAt(0) === 0xfeff) jsonString = jsonString.slice(1);

    // 按长度降序排列，避免短匹配覆盖长匹配
    const sortedMatches = [...matches].sort(
      (a, b) => b.original.length - a.original.length
    );

    // 逐个替换
    let maskedJsonString = jsonString;
    for (const match of sortedMatches) {
      maskedJsonString = maskedJsonString.split(match.original).join(match.replacement);
    }

    // 更新结果
    const maskedStructuredData = JSON.parse(maskedJsonString);
    const maskedTextContent = this.extractTextFromValue(maskedStructuredData);

    return {
      ...parseResult,
      content: maskedTextContent,
      structuredData: maskedStructuredData,
      raw: Buffer.from(
        jsonString.charCodeAt(0) === 0xfeff
          ? '\ufeff' + maskedJsonString
          : maskedJsonString,
        'utf-8'
      ),
    };
  }

  /**
   * 导出文件
   */
  async export(data: string, outputPath: string, format: FileFormat): Promise<void> {
    let content: string;
    try {
      const parsed = JSON.parse(data);
      content = JSON.stringify(parsed, null, 2);
    } catch {
      content = data;
    }

    // UTF-8 BOM 确保 Windows 兼容性
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const contentBuffer = Buffer.from(content, 'utf-8');
    fs.writeFileSync(outputPath, Buffer.concat([bom, contentBuffer]));
  }
}

export default new JsonParser();
