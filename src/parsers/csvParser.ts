/**
 * CSV 文件解析器
 * 支持逗号、制表符、分号分隔，支持带引号的字段
 */

import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import { FileParser, ParseResult, FileFormat, FileMetadata, TextPosition } from './types';

export class CsvParser implements FileParser {
  readonly name = 'CsvParser';
  readonly extensions = ['.csv', '.tsv'];

  /**
   * 判断是否可以解析该文件
   */
  canParse(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return this.extensions.includes(ext);
  }

  /**
   * 检测分隔符
   */
  private detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0];
    
    // 统计各种分隔符的出现次数
    const counts = {
      ',': (firstLine.match(/,/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
    };

    // 返回出现次数最多的分隔符
    let maxCount = 0;
    let delimiter = ',';
    for (const [char, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        delimiter = char;
      }
    }

    return delimiter;
  }

  /**
   * 检测文件编码
   */
  private detectEncoding(buffer: Buffer): string {
    // 检查 BOM
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return 'utf-8';
    }
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return 'utf-16-le';
    }

    // 默认 UTF-8
    return 'utf-8';
  }

  /**
   * 解析CSV行，支持带引号的字段
   */
  private parseLine(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          // 检查是否是转义的引号
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i += 2;
          } else {
            inQuotes = false;
            i++;
          }
        } else {
          current += char;
          i++;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
          i++;
        } else if (char === delimiter) {
          fields.push(current);
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
    }

    fields.push(current);
    return fields;
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
    if (encoding === 'utf-8' && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      content = buffer.slice(3).toString('utf-8');
    } else if (encoding === 'utf-8') {
      content = buffer.toString('utf-8');
    } else {
      content = iconv.decode(buffer, encoding);
    }

    // 移除 BOM
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }

    // 检测分隔符
    const delimiter = this.detectDelimiter(content);

    // 解析CSV
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    const rows: string[][] = [];
    const positionMap: TextPosition[] = [];

    let offset = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fields = this.parseLine(line, delimiter);
      rows.push(fields);

      // 构建位置映射
      for (let j = 0; j < fields.length; j++) {
        const field = fields[j];
        if (field.trim().length > 0) {
          positionMap.push({
            start: offset,
            end: offset + field.length,
            text: field,
            context: `cell:${i}:${j}`,
          });
        }
      }

      offset += line.length + 1;
    }

    // 构建元数据
    const metadata: FileMetadata = {
      fileName: filePath ? path.basename(filePath) : 'unknown',
      fileSize: buffer.length,
      encoding: encoding,
      lineCount: rows.length,
    };

    if (filePath) {
      const stats = fs.statSync(filePath);
      metadata.createdAt = stats.birthtime;
      metadata.modifiedAt = stats.mtime;
    }

    // 确定格式
    const ext = filePath ? path.extname(filePath).toLowerCase() : '.csv';
    const format: FileFormat = ext === '.tsv' ? 'csv' : 'csv';

    return {
      content,
      format,
      metadata,
      raw: buffer,
      structuredData: rows,
      positionMap,
    };
  }

  /**
   * 导出文件
   */
  async export(data: string, outputPath: string, format: FileFormat): Promise<void> {
    // 如果传入的是结构化数据，重新构建CSV
    let content = data;

    // 写入文件，添加 BOM 以保证 Windows Excel 兼容性
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const contentBuffer = Buffer.from(content, 'utf-8');
    const buffer = Buffer.concat([bom, contentBuffer]);

    fs.writeFileSync(outputPath, buffer);
  }

  /**
   * 将二维数组导出为CSV
   */
  async exportRows(rows: string[][], outputPath: string, delimiter: string = ','): Promise<void> {
    const lines = rows.map(row => {
      return row.map(field => {
        // 如果字段包含分隔符、引号或换行符，需要用引号包裹
        if (field.includes(delimiter) || field.includes('"') || field.includes('\n')) {
          return '"' + field.replace(/"/g, '""') + '"';
        }
        return field;
      }).join(delimiter);
    });

    const content = lines.join('\n');
    await this.export(content, outputPath, 'csv');
  }
}

// 默认导出
export default new CsvParser();
