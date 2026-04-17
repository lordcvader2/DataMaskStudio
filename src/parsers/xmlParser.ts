/**
 * XML 文件解析器
 * 使用正则匹配解析 XML，不依赖外部 XML 库
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileParser, ParseResult, FileFormat, FileMetadata, TextPosition } from './types';

export class XmlParser implements FileParser {
  readonly name = 'XmlParser';
  readonly extensions = ['.xml'];

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

    // 解码（处理 BOM）
    let content: string;
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      content = buffer.slice(3).toString('utf-8');
    } else {
      content = buffer.toString('utf-8');
    }
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

    // 构建位置映射：遍历所有文本节点和属性值
    const positionMap: TextPosition[] = [];

    // 匹配标签名和属性
    // 例如: <tag attr="value">text</tag>
    // 捕获: 标签名、属性名=属性值、文本内容

    // 匹配注释: <!-- ... -->
    const commentRegex = /<!--[\s\S]*?-->/g;
    let match: RegExpExecArray | null;

    while ((match = commentRegex.exec(content)) !== null) {
      // 注释内容跳过，不作为敏感信息检测范围
    }

    // 匹配 CDATA: <![CDATA[ ... ]]>
    const cdataRegex = /<!\[CDATA\[[\s\S]*?\]\]>/g;
    while ((match = cdataRegex.exec(content)) !== null) {
      // CDATA 区域跳过
    }

    // 匹配处理指令: <?xml ... ?>
    const piRegex = /<\?[\s\S]*?\?>/g;
    while ((match = piRegex.exec(content)) !== null) {
      // 处理指令跳过
    }

    // 匹配属性值: attr="value" 或 attr='value'
    const attrRegex = /([\w:]+)=(?:"([^"]*)"|'([^']*)')/g;
    while ((match = attrRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const attrValue = match[2] !== undefined ? match[2] : match[3];
      const start = match.index + fullMatch.indexOf(attrValue);
      positionMap.push({
        start,
        end: start + attrValue.length,
        text: attrValue,
        context: `attr:${match[1]}`,
      });
    }

    // 匹配文本内容: >text< (标签之间的文本)
    // 排除注释、CDATA、处理指令区域后，匹配普通文本
    // 策略：匹配 <tag...>...</tag> 中的文本内容
    const tagContentRegex = /<([\w:][\w:.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
    while ((match = tagContentRegex.exec(content)) !== null) {
      const tagName = match[1];
      const textContent = match[2];
      const tagStart = match.index;
      const openTagEnd = tagStart + match[0].indexOf('>') + 1;
      const textStart = openTagEnd;
      const textEnd = textStart + textContent.length;

      if (textContent.trim().length > 0) {
        positionMap.push({
          start: textStart,
          end: textEnd,
          text: textContent,
          context: `text:${tagName}`,
        });
      }
    }

    // 匹配自闭合标签中的文本: <tag.../>
    // 自闭合标签没有文本内容

    // 构建纯文本内容（合并所有文本节点）
    const textContent = positionMap
      .filter(p => p.context && p.context.startsWith('text:'))
      .map(p => p.text)
      .join('\n');

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

    return {
      content: textContent,
      format: 'xml',
      metadata,
      raw: buffer,
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

    // 获取原始 XML 字符串
    let xmlString: string;
    if (originalBuffer.length >= 3 && originalBuffer[0] === 0xef && originalBuffer[1] === 0xbb && originalBuffer[2] === 0xbf) {
      xmlString = originalBuffer.slice(3).toString('utf-8');
    } else {
      xmlString = originalBuffer.toString('utf-8');
    }
    if (xmlString.charCodeAt(0) === 0xfeff) xmlString = xmlString.slice(1);

    // 按长度降序排列，避免短匹配覆盖长匹配
    const sortedMatches = [...matches].sort(
      (a, b) => b.original.length - a.original.length
    );

    // 逐个替换
    let maskedXmlString = xmlString;
    for (const match of sortedMatches) {
      maskedXmlString = maskedXmlString.split(match.original).join(match.replacement);
    }

    // 重新解析，获取新的位置映射
    const newPositionMap: TextPosition[] = [];

    // 属性值替换后更新位置
    const attrRegex = /([\w:]+)=(?:"([^"]*)"|'([^']*)')/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(maskedXmlString)) !== null) {
      const fullMatch = attrMatch[0];
      const attrValue = attrMatch[2] !== undefined ? attrMatch[2] : attrMatch[3];
      const start = attrMatch.index + fullMatch.indexOf(attrValue);
      newPositionMap.push({
        start,
        end: start + attrValue.length,
        text: attrValue,
        context: `attr:${attrMatch[1]}`,
      });
    }

    // 文本内容替换后更新位置
    const tagContentRegex = /<([\w:][\w:.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagContentRegex.exec(maskedXmlString)) !== null) {
      const tagName = tagMatch[1];
      const textContent = tagMatch[2];
      const tagStart = tagMatch.index;
      const openTagEnd = tagStart + tagMatch[0].indexOf('>') + 1;
      const textStart = openTagEnd;
      const textEnd = textStart + textContent.length;

      if (textContent.trim().length > 0) {
        newPositionMap.push({
          start: textStart,
          end: textEnd,
          text: textContent,
          context: `text:${tagName}`,
        });
      }
    }

    const maskedTextContent = newPositionMap
      .filter(p => p.context && p.context.startsWith('text:'))
      .map(p => p.text)
      .join('\n');

    return {
      ...parseResult,
      content: maskedTextContent,
      positionMap: newPositionMap,
      raw: Buffer.from(
        maskedXmlString.charCodeAt(0) === 0xfeff
          ? '\ufeff' + maskedXmlString
          : maskedXmlString,
        'utf-8'
      ),
    };
  }

  /**
   * 导出文件
   */
  async export(data: string, outputPath: string, format: FileFormat): Promise<void> {
    // UTF-8 BOM 确保 Windows 兼容性
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const contentBuffer = Buffer.from(data, 'utf-8');
    fs.writeFileSync(outputPath, Buffer.concat([bom, contentBuffer]));
  }
}

export default new XmlParser();
