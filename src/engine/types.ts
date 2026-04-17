/**
 * DataMaskStudio 核心引擎类型定义
 */

// ==================== 敏感数据类别 ====================

export const SensitiveCategory = {
  PERSONAL: 'personal',
  FINANCIAL: 'financial',
  DEVICE_NETWORK: 'device_network',
  BUSINESS_GOVERNMENT: 'business_government',
  CUSTOM: 'custom',
} as const;

export type SensitiveCategoryValue = typeof SensitiveCategory[keyof typeof SensitiveCategory];

// ==================== 敏感字段规则 ====================

export interface SensitiveRule {
  id: string;                      // 规则唯一标识
  name: string;                    // 规则名称（中文）
  category: SensitiveCategoryValue | string; // 所属类别
  pattern: RegExp;                 // 匹配正则表达式
  description: string;             // 规则描述
  replacePattern: string;          // 替换类型标识
}

// ==================== 检测结果 ====================

export interface DetectionResult {
  start: number;                   // 匹配起始位置
  end: number;                     // 匹配结束位置
  value: string;                   // 原始匹配值
  ruleId: string;                  // 匹配的规则ID
  ruleName: string;                // 匹配的规则名称
  category: string;                // 所属类别
  confidence: number;              // 置信度 (0-1)
}

// ==================== 脱敏强度 ====================

export const MaskLevel = {
  LIGHT: 'light',    // 轻度：仅掩码中间部分
  MEDIUM: 'medium',  // 中度：掩码+哈希
  HEAVY: 'heavy',    // 重度：完全替换为假数据
} as const;

export type MaskLevelValue = typeof MaskLevel[keyof typeof MaskLevel];

// ==================== 脱敏配置 ====================

export interface MaskConfig {
  level: MaskLevelValue;           // 脱敏强度
  customRules?: SensitiveRule[];   // 自定义规则
  categories?: string[];           // 指定类别（为空则全部）
  hashAlgorithm?: 'md5' | 'sha256'; // 哈希算法
}

// ==================== 加密结果 ====================

export interface EncryptionResult {
  cipherText: string;              // Base64编码的密文
  salt: string;                    // 盐值（Base64）
  iv: string;                      // 初始向量（Base64）
}

// ==================== 引擎统计 ====================

export interface EngineStats {
  totalRules: number;              // 总规则数
  rulesByCategory: Record<string, number>; // 按类别统计
  builtInRulesCount: number;       // 内置规则数
  customRulesCount: number;        // 自定义规则数
}
