/**
 * Word 文件解析器
 * 支持 .docx 格式，使用 mammoth 提取文本
 */

import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { FileParser, ParseResult, FileFormat, FileMetadata, TextPosition } from './types';

export class WordParser implements FileParser {
  readonly name = 'WordParser';
  readonly extensions = ['.docx'];

  /**
   * 判断是否可以解析该文件
   */
  canParse(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return this.extensions.includes(ext);
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

    // 使用 mammoth 提取纯文本
    const textResult = await mammoth.extractRawText({ buffer });

    // 获取带样式的 HTML（用于保留结构，但这里我们用纯文本）
    const styleResult = await mammoth.convertToHtml({ buffer });

    const textContent = textResult.value;
    const messages = textResult.messages;
    const warnings = styleResult.messages;

    // 构建位置映射（按行记录位置）
    const positionMap: TextPosition[] = [];
    const lines = textContent.split('\n');
    let offset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().length > 0) {
        positionMap.push({
          start: offset,
          end: offset + line.length,
          text: line,
          context: `paragraph:${i}`,
        });
      }
      offset += line.length + 1; // +1 换行符
    }

    // 构建元数据
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

    // 元数据通过 mammoth.extract.text 已覆盖，无需额外读取

    return {
      content: textContent,
      format: 'docx',
      metadata,
      raw: buffer,
      positionMap,
      structuredData: {
        paragraphs: lines.filter(l => l.trim().length > 0),
        messages,
        warnings,
      },
    };
  }

  /**
   * 脱敏处理
   * 生成脱敏后的纯文本 Word 文档
   * 注意：由于 mammoth 的限制，mask 操作会输出纯文本而非完整 docx 结构
   * 如需保留 Word 样式，建议使用 docx 库进行高级处理
   *
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

    // 按长度降序排列，避免短匹配覆盖长匹配
    const sortedMatches = [...matches].sort(
      (a, b) => b.original.length - a.original.length
    );

    // 执行替换
    let maskedContent = parseResult.content;
    for (const match of sortedMatches) {
      maskedContent = maskedContent.split(match.original).join(match.replacement);
    }

    // 构建新的位置映射
    const newPositionMap: TextPosition[] = [];
    const lines = maskedContent.split('\n');
    let offset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().length > 0) {
        newPositionMap.push({
          start: offset,
          end: offset + line.length,
          text: line,
          context: `paragraph:${i}`,
        });
      }
      offset += line.length + 1;
    }

    return {
      ...parseResult,
      content: maskedContent,
      positionMap: newPositionMap,
      // 纯文本格式，直接用 Buffer 存储
      raw: Buffer.from(maskedContent, 'utf-8'),
    };
  }

  /**
   * 导出文件
   * 当前实现为纯文本导出（基础版）
   * 如需保留 docx 格式，请使用 docx 库重新构建文档
   */
  async export(data: string, outputPath: string, format: FileFormat): Promise<void> {
    // UTF-8 BOM 确保 Windows 兼容性
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const contentBuffer = Buffer.from(data, 'utf-8');
    fs.writeFileSync(outputPath, Buffer.concat([bom, contentBuffer]));
  }
}

export default new WordParser();
