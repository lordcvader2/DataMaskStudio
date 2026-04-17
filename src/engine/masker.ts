/**
 * 脱敏执行器 — 核心模块
 * 支持不可逆脱敏（掩码、哈希、假数据替换）和可逆脱敏（AES-256-GCM加密）
 */

import * as crypto from 'crypto';
import { SensitiveRule, SensitiveCategory, SensitiveCategoryValue } from './types';
import { FakeDataGenerator } from './fakeDataGenerator';

// ==================== 重新导出类型 ====================

export { SensitiveCategory } from './types';

// 兼容旧版 MaskLevel（部分代码可能使用此名称）
export const MaskLevel = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
} as const;
export type MaskLevelValue = typeof MaskLevel[keyof typeof MaskLevel];

// 脱敏策略类型
export type MaskStrategy = 'mask' | 'hash' | 'fake' | 'reversible';

// 兼容旧版 MaskStrength 别名
export type MaskStrength = MaskLevelValue;

// ==================== 匹配详情 ====================

export interface MatchDetail {
  ruleId: string;           // 匹配的规则ID
  ruleName: string;         // 匹配的规则名称
  category: string;         // 所属类别
  original: string;         // 原始匹配值
  replacement: string;       // 替换后的值
  position: {
    start: number;           // 在原文中的起始位置
    end: number;             // 在原文中的结束位置
  };
}

// ==================== 脱敏结果 ====================

export interface MaskResult {
  maskedContent: string;          // 脱敏后的完整文本
  matchDetails: MatchDetail[];     // 所有匹配替换的详细记录
  stats: {
    totalMatches: number;          // 总匹配数
    byCategory: Record<string, number>;  // 按类别统计
    byRule: Record<string, number>;     // 按规则统计
  };
}

// ==================== 可逆加密相关类型 ====================

export interface ReversibleKey {
  key: string;    // Base64 编码的 AES 密钥
  iv: string;     // Base64 编码的 IV
  salt: string;   // Base64 编码的 Salt
}

export interface DecryptOptions {
  key: string;
  iv: string;
  salt: string;
}

// ==================== 强度与类别的过滤映射 ====================

/**
 * 各类别在不同强度下是否启用
 * light: 仅 personal
 * medium: personal + financial
 * heavy: 全部类别
 */
const STRENGTH_CATEGORIES: Record<MaskStrength, SensitiveCategoryValue[]> = {
  light: ['personal'],
  medium: ['personal', 'financial'],
  heavy: ['personal', 'financial', 'device_network', 'business_government', 'custom'],
};

// ==================== 掩码替换规则 ====================

/**
 * 根据数据类型执行掩码替换
 */
function applyMask(original: string, type: string): string {
  switch (type) {
    case 'phone':
      // 手机号：保留前3后4，中间4位用*掩码
      if (original.length === 11) {
        return original.substring(0, 3) + '****' + original.substring(7);
      }
      return original.substring(0, 3) + '*'.repeat(original.length - 7) + original.substring(original.length - 4);

    case 'id_card':
      // 身份证：保留前4后4，中间10位用*掩码
      if (original.length === 18) {
        return original.substring(0, 4) + '**********' + original.substring(14);
      }
      return original.substring(0, 4) + '*'.repeat(original.length - 8) + original.substring(original.length - 4);

    case 'bank_card':
      // 银行卡：保留前4后4，中间掩码
      if (original.length >= 16) {
        const prefix = original.substring(0, 4);
        const suffix = original.substring(original.length - 4);
        const maskLen = original.length - 8;
        return prefix + '*'.repeat(maskLen) + suffix;
      }
      return '*'.repeat(original.length);

    case 'email':
      // 邮箱：@前保留首尾字符，中间掩码
      if (original.includes('@')) {
        const [local, domain] = original.split('@');
        if (local.length <= 2) {
          return local + '@' + domain;
        }
        return local[0] + '*'.repeat(Math.max(local.length - 2, 2)) + local[local.length - 1] + '@' + domain;
      }
      return '*'.repeat(original.length);

    case 'name':
      // 姓名：保留首字，其余掩码
      if (original.length >= 2) {
        return original[0] + '*'.repeat(original.length - 1);
      }
      return '*'.repeat(original.length);

    case 'ip':
      // IP地址：保留第一段，其余掩码
      const parts = original.split('.');
      if (parts.length === 4) {
        return parts[0] + '.*.*.*';
      }
      return '*.*.*.*';

    case 'mac':
      // MAC地址：保留前8位（前3段）
      if (original.length >= 8) {
        return original.substring(0, 8) + '*'.repeat(original.length - 8);
      }
      return '*'.repeat(original.length);

    case 'address':
      // 地址：保留前10字符或前20%，其余掩码
      if (original.length <= 5) {
        return '*'.repeat(original.length);
      }
      return original.substring(0, Math.ceil(original.length * 0.2)) + '*'.repeat(Math.floor(original.length * 0.8));

    case 'device_sn':
      // 设备序列号：保留前4后2
      if (original.length > 6) {
        return original.substring(0, 4) + '*'.repeat(original.length - 6) + original.substring(original.length - 2);
      }
      return '*'.repeat(original.length);

    case 'qq':
      // QQ号：保留首尾
      if (original.length > 2) {
        return original[0] + '*'.repeat(original.length - 2) + original[original.length - 1];
      }
      return '*'.repeat(original.length);

    case 'wechat':
      // 微信号：保留前3后1
      if (original.length > 4) {
        return original.substring(0, 3) + '*'.repeat(original.length - 4) + original[original.length - 1];
      }
      return '*'.repeat(original.length);

    case 'cvv':
      // CVV：完全掩码
      return '***';

    case 'zipcode':
      // 邮编：保留前3后2
      if (original.length >= 5) {
        return original.substring(0, 3) + '*'.repeat(original.length - 3);
      }
      return '*'.repeat(original.length);

    case 'passport':
      // 护照：保留首字母，其余掩码
      if (original.length > 1) {
        return original[0] + '*'.repeat(original.length - 1);
      }
      return '*';

    case 'birthday':
      // 生日：年保留，月日掩码
      if (/^\d{4}[-/\.年]?\d{2}[-/\.月]?\d{2}/.test(original)) {
        const yearMatch = original.match(/^(\d{4})/);
        return yearMatch ? yearMatch[1] + '-**-**' : '****-**-**';
      }
      return '****-**-**';

    case 'business_license':
      // 营业执照：保留前4后3
      if (original.length > 7) {
        return original.substring(0, 4) + '*'.repeat(original.length - 7) + original.substring(original.length - 3);
      }
      return '*'.repeat(original.length);

    case 'credit_code':
      // 统一社会信用代码：保留前4后4
      if (original.length > 8) {
        return original.substring(0, 4) + '*'.repeat(original.length - 8) + original.substring(original.length - 4);
      }
      return '*'.repeat(original.length);

    case 'bank_branch':
      // 开户行：保留前8字符
      if (original.length > 8) {
        return original.substring(0, 8) + '*'.repeat(original.length - 8);
      }
      return '*'.repeat(original.length);

    default:
      // 通用掩码：保留首尾各1位
      if (original.length <= 2) {
        return '*'.repeat(original.length);
      }
      return original[0] + '*'.repeat(Math.max(original.length - 2, 1)) + original[original.length - 1];
  }
}

// ==================== 哈希处理 ====================

/**
 * 对原始值进行哈希处理
 */
function applyHash(original: string, algorithm: 'md5' | 'sha256'): string {
  const hash = crypto.createHash(algorithm);
  hash.update(original, 'utf8');
  return hash.digest('hex');
}

// ==================== 可逆加密（AES-256-GCM） ====================

/**
 * 生成随机盐值
 */
function generateSalt(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * 生成随机 IV
 */
function generateIV(): string {
  return crypto.randomBytes(12).toString('base64');
}

/**
 * 从密码派生 AES-256-GCM 密钥
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * 生成可逆脱敏加密密钥（需要用户保管）
 */
export function generateReversibleKey(password: string): ReversibleKey {
  const salt = generateSalt();
  const iv = generateIV();
  const key = deriveKey(password, Buffer.from(salt, 'base64'));
  return {
    key: key.toString('base64'),
    iv,
    salt,
  };
}

/**
 * 用可逆密钥加密原文
 */
export function encryptReversible(
  original: string,
  reversibleKey: ReversibleKey
): string {
  const key = Buffer.from(reversibleKey.key, 'base64');
  const iv = Buffer.from(reversibleKey.iv, 'base64');
  const salt = Buffer.from(reversibleKey.salt, 'base64');
  const derivedKey = deriveKey(reversibleKey.key + reversibleKey.salt, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  let encrypted = cipher.update(original, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // 格式：authTag:ciphertext（均为 base64）
  return authTag.toString('base64') + ':' + encrypted;
}

/**
 * 用可逆密钥解密密文（解密时还原原文）
 */
export function decryptReversible(
  cipherText: string,
  reversibleKey: ReversibleKey
): string {
  const [authTagB64, encrypted] = cipherText.split(':');
  const authTag = Buffer.from(authTagB64, 'base64');
  const derivedKey = deriveKey(reversibleKey.key + reversibleKey.salt, Buffer.from(reversibleKey.salt, 'base64'));
  const iv = Buffer.from(reversibleKey.iv, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ==================== 脱敏执行器核心 ====================

/**
 * 脱敏执行器 — 遍历文本内容，根据规则匹配并执行脱敏替换
 */
export class MaskEngine {
  /**
   * 执行内容脱敏
   * @param content 原始文本内容
   * @param rules 敏感字段规则列表
   * @param strategy 脱敏策略
   * @param strength 脱敏强度（决定哪些类别被处理）
   * @param hashAlgorithm 哈希算法（仅 strategy='hash' 时生效）
   * @returns 脱敏结果
   */
  static mask(
    content: string,
    rules: SensitiveRule[],
    strategy: MaskStrategy,
    strength: MaskStrength = 'light',
    hashAlgorithm: 'md5' | 'sha256' = 'sha256'
  ): MaskResult {
    // 根据强度过滤规则类别
    const allowedCategories = STRENGTH_CATEGORIES[strength] || STRENGTH_CATEGORIES.light;
    const filteredRules = rules.filter(
      rule => allowedCategories.includes(rule.category as SensitiveCategoryValue)
    );

    // 收集所有匹配结果
    const allMatches: Array<{
      rule: SensitiveRule;
      value: string;
      start: number;
      end: number;
    }> = [];

    for (const rule of filteredRules) {
      // 重置正则状态
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        // 获取完整匹配值（取第一个捕获组或整个匹配）
        const matchedValue = match[1] ?? match[0];
        allMatches.push({
          rule,
          value: matchedValue,
          start: match.index + (match[0].indexOf(matchedValue)),
          end: match.index + (match[0].indexOf(matchedValue)) + matchedValue.length,
        });
      }
    }

    // 按起始位置从大到小排序（方便后续从后向前替换，保持位置不变）
    allMatches.sort((a, b) => b.start - a.start);

    // 去重：同一起止范围内只保留第一个匹配（避免交叉覆盖）
    const uniqueMatches: typeof allMatches = [];
    const seenRanges = new Set<string>();
    for (const m of allMatches) {
      const rangeKey = `${m.start}-`;
      if (!seenRanges.has(rangeKey)) {
        seenRanges.add(rangeKey);
        uniqueMatches.push(m);
      }
    }
    // 恢复正向顺序
    uniqueMatches.sort((a, b) => a.start - b.start);

    // 执行替换
    const matchDetails: MatchDetail[] = [];
    let maskedContent = content;

    for (const m of uniqueMatches) {
      const { rule, value, start, end } = m;
      let replacement: string;

      switch (strategy) {
        case 'mask':
          replacement = applyMask(value, rule.replacePattern);
          break;
        case 'hash':
          replacement = applyHash(value, hashAlgorithm);
          break;
        case 'fake':
          replacement = FakeDataGenerator.generate(rule.replacePattern, value);
          break;
        case 'reversible':
          // 可逆模式下，生成临时占位符（实际加密由单独接口处理）
          replacement = `[ENCRYPTED:${rule.id}:${Date.now()}]`;
          break;
        default:
          replacement = applyMask(value, rule.replacePattern);
      }

      // 从后向前替换，不影响前面的位置
      maskedContent = maskedContent.substring(0, start) + replacement + maskedContent.substring(end);

      matchDetails.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        original: value,
        replacement,
        position: { start, end },
      });
    }

    // 统计
    const stats = {
      totalMatches: matchDetails.length,
      byCategory: {} as Record<string, number>,
      byRule: {} as Record<string, number>,
    };

    for (const detail of matchDetails) {
      stats.byCategory[detail.category] = (stats.byCategory[detail.category] || 0) + 1;
      stats.byRule[detail.ruleId] = (stats.byRule[detail.ruleId] || 0) + 1;
    }

    return {
      maskedContent,
      matchDetails,
      stats,
    };
  }

  /**
   * 便捷方法：仅掩码（不可逆，轻度）
   */
  static maskOnly(content: string, rules: SensitiveRule[], strength: MaskStrength = 'light'): MaskResult {
    return this.mask(content, rules, 'mask', strength);
  }

  /**
   * 便捷方法：哈希脱敏（不可逆）
   */
  static hashOnly(
    content: string,
    rules: SensitiveRule[],
    algorithm: 'md5' | 'sha256' = 'sha256',
    strength: MaskStrength = 'medium'
  ): MaskResult {
    return this.mask(content, rules, 'hash', strength, algorithm);
  }

  /**
   * 便捷方法：假数据替换（不可逆，重度）
   */
  static fakeOnly(content: string, rules: SensitiveRule[]): MaskResult {
    return this.mask(content, rules, 'fake', 'heavy');
  }
}

export default MaskEngine;
