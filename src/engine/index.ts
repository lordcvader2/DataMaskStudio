/**
 * DataMaskStudio 脱敏引擎入口
 * 统一导出所有引擎模块
 */

// 从 rules.ts 导出
export { builtInRules, SensitiveCategory, getRulesByCategory, getRuleById } from './rules';

// 从 types.ts 导出
export type {
  SensitiveRule,
  SensitiveCategoryValue,
  DetectionResult,
  MaskConfig,
  MaskLevelValue,
  EncryptionResult,
  EngineStats,
} from './types';
export { MaskLevel } from './types';

// 从 masker.ts 导出
export { MaskEngine, generateReversibleKey, encryptReversible, decryptReversible } from './masker';
export type { MaskStrategy, MaskStrength, MatchDetail, MaskResult, ReversibleKey, DecryptOptions } from './masker';

// 从 fakeDataGenerator.ts 导出
export { FakeDataGenerator } from './fakeDataGenerator';
