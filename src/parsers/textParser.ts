/**
 * TXT/MD 文件解析器
 * 支持纯文本和Markdown文件，自动检测编码
 */

import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import { FileParser, ParseResult, FileFormat, FileMetadata, TextPosition } from './types';

export class TextParser implements FileParser {
  readonly name = 'TextParser';
  readonly extensions = ['.txt', '.md', '.markdown'];

  /**
   * 判断是否可以解析该文件
   */
  canParse(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return this.extensions.includes(ext);
  }

  /**
   * 检测文件编码
   * 支持 UTF-8, GBK, GB2312, GB18030
   */
  private detectEncoding(buffer: Buffer): string {
    // 检查 BOM
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return 'utf-8';
    }
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return 'utf-16-le';
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      return 'utf-16-be';
    }

    // 尝试 UTF-8 解码
    try {
      const utf8Text = buffer.toString('utf-8');
      // 检查是否有无效的 UTF-8 序列
      const reEncoded = Buffer.from(utf8Text, 'utf-8');
      if (reEncoded.equals(buffer)) {
        return 'utf-8';
      }
    } catch {
      // 忽略错误
    }

    // 检查是否为 GBK/GB2312/GB18030
    // 简单启发式：检查常见中文字符范围
    const sample = buffer.slice(0, Math.min(buffer.length, 1024));
    let gbkLikelihood = 0;
    for (let i = 0; i < sample.length - 1; i++) {
      const b1 = sample[i];
      const b2 = sample[i + 1];
      // GBK 高位字节范围
      if (b1 >= 0x81 && b1 <= 0xfe && b2 >= 0x40 && b2 <= 0xfe) {
        gbkLikelihood++;
      }
    }

    if (gbkLikelihood > 5) {
      return 'gbk';
    }

    // 默认使用 UTF-8
    return 'utf-8';
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

    // 检测编码
    const encoding = this.detectEncoding(buffer);
    
    // 解码内容
    let content: string;
    if (encoding === 'utf-8') {
      // 移除 BOM 如果存在
      if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        content = buffer.slice(3).toString('utf-8');
      } else {
        content = buffer.toString('utf-8');
      }
    } else {
      content = iconv.decode(buffer, encoding);
    }

    // 构建元数据
    const metadata: FileMetadata = {
      fileName: filePath ? path.basename(filePath) : 'unknown',
      fileSize: buffer.length,
      encoding: encoding,
      lineCount: content.split('\n').length,
    };

    if (filePath) {
      const stats = fs.statSync(filePath);
      metadata.createdAt = stats.birthtime;
      metadata.modifiedAt = stats.mtime;
    }

    // 构建位置映射
    const positionMap = this.buildPositionMap(content);

    // 确定格式
    const ext = filePath ? path.extname(filePath).toLowerCase() : '.txt';
    const format: FileFormat = ext === '.md' || ext === '.markdown' ? 'md' : 'txt';

    return {
      content,
      format,
      metadata,
      raw: buffer,
      positionMap,
    };
  }

  /**
   * 构建文本位置映射
   */
  private buildPositionMap(content: string): TextPosition[] {
    const positions: TextPosition[] = [];
    const lines = content.split('\n');
    let offset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().length > 0) {
        positions.push({
          start: offset,
          end: offset + line.length,
          text: line,
          context: `line:${i + 1}`,
        });
      }
      offset += line.length + 1; // +1 for newline
    }

    return positions;
  }

  /**
   * 导出文件
   */
  async export(data: string, outputPath: string, format: FileFormat): Promise<void> {
    const ext = path.extname(outputPath).toLowerCase();
    let encoding = 'utf-8';
    
    // Windows 平台默认使用 UTF-8 with BOM 以保证兼容性
    if (process.platform === 'win32') {
      encoding = 'utf-8-sig';
    }

    let buffer: Buffer;
    if (encoding === 'utf-8-sig') {
      buffer = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(data, 'utf-8'),
      ]);
    } else {
      buffer = Buffer.from(data, 'utf-8');
    }

    fs.writeFileSync(outputPath, buffer);
  }
}

// 默认导出
export default new TextParser();
