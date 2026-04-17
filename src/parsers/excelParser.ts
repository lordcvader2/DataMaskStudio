/**
 * Excel 文件解析器
 * 支持 .xlsx, .xls, .et 格式
 */

import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { FileParser, ParseResult, FileFormat, FileMetadata, TextPosition } from './types';

export class ExcelParser implements FileParser {
  readonly name = 'ExcelParser';
  readonly extensions = ['.xlsx', '.xls', '.et'];

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

    // 使用 xlsx 库读取 Excel 文件
    const workbook = xlsx.read(buffer, {
      type: 'buffer',
      cellFormula: false,    // 不保留公式
      cellNF: true,          // 保留数字格式
      cellDates: true,       // 解析日期
    });

    // 收集所有工作表数据
    const allTexts: string[] = [];
    const positionMap: TextPosition[] = [];
    const sheets: string[] = workbook.SheetNames;

    let globalOffset = 0;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',          // 默认值为空字符串
        raw: false,          // 转换单元格值
        header: 1,           // 返回数组格式
      });

      // 遍历所有单元格
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];

          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
            const cellText = String(cell.v);
            const cellType = cell.t || 's'; // t: type (s=string, n=number, b=boolean, d=date)

            // 只记录字符串类型的单元格（数字类型的文本内容也检测）
            if (cellText.trim().length > 0) {
              positionMap.push({
                start: globalOffset,
                end: globalOffset + cellText.length,
                text: cellText,
                context: `sheet:${sheetName}|cell:${cellAddress}|type:${cellType}`,
              });

              allTexts.push(cellText);
              globalOffset += cellText.length + 1; // +1 换行符
            }
          }
        }
      }
    }

    // 构建元数据
    const metadata: FileMetadata = {
      fileName: filePath ? path.basename(filePath) : 'unknown',
      fileSize: buffer.length,
      encoding: 'utf-8',
      sheets,
      sheetName: sheets[0],
    };

    if (filePath) {
      const stats = fs.statSync(filePath);
      metadata.createdAt = stats.birthtime;
      metadata.modifiedAt = stats.mtime;
    }

    return {
      content: allTexts.join('\n'),
      format: 'xlsx',
      metadata,
      raw: buffer,
      structuredData: {
        sheetNames: workbook.SheetNames,
        sheets: workbook.Sheets,
      },
      positionMap,
    };
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

    // 读取 Excel 文件
    const workbook = xlsx.read(originalBuffer, {
      type: 'buffer',
      cellFormula: false,
      cellNF: true,
      cellDates: true,
    });

    // 按长度降序排列，避免短匹配覆盖长匹配
    const sortedMatches = [...matches].sort(
      (a, b) => b.original.length - a.original.length
    );

    // 遍历所有工作表和单元格，替换敏感信息
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet['!ref']) continue;

      const range = xlsx.utils.decode_range(worksheet['!ref']);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];

          if (cell && cell.v !== undefined && cell.v !== null && typeof cell.v === 'string') {
            let cellValue = cell.v;

            // 执行替换
            for (const match of sortedMatches) {
              if (cellValue.includes(match.original)) {
                cellValue = cellValue.split(match.original).join(match.replacement);
              }
            }

            // 更新单元格
            worksheet[cellAddress] = {
              ...cell,
              v: cellValue,
              w: cellValue, // 更新显示文本
            };
          }
        }
      }
    }

    // 写出新的 Excel 文件
    const maskedBuffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // 构建脱敏后的文本内容
    const maskedTexts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
            const text = String(cell.v);
            if (text.trim().length > 0) {
              maskedTexts.push(text);
            }
          }
        }
      }
    }

    return {
      ...parseResult,
      content: maskedTexts.join('\n'),
      raw: maskedBuffer,
      structuredData: {
        sheetNames: workbook.SheetNames,
        sheets: workbook.Sheets,
      },
    };
  }

  /**
   * 导出文件
   */
  async export(data: string, outputPath: string, format: FileFormat): Promise<void> {
    // 如果 data 是 JSON 字符串（structuredData），先解析
    let rows: unknown[][];

    try {
      rows = JSON.parse(data);
    } catch {
      // 如果不是 JSON，按换行符分割成行，再按制表符分割成单元格
      rows = data.split('\n').map(line => line.split('\t'));
    }

    // 创建工作表
    const worksheet = xlsx.utils.aoa_to_sheet(rows);

    // 创建工作簿
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // 写出文件
    const ext = path.extname(outputPath).toLowerCase();
    const bookType: xlsx.BookType = ext === '.xls' ? 'xls' : ext === '.et' ? 'xls' : 'xlsx';

    const buffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType,
    });

    fs.writeFileSync(outputPath, buffer);
  }
}

export default new ExcelParser();
