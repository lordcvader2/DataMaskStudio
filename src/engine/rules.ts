/**
 * 敏感字段识别规则库
 * 定义所有内置的敏感字段识别规则（正则表达式）
 * 皮卡皮卡哔～
 */

import type { SensitiveRule } from './types';

/**
 * 敏感数据类别枚举
 */
export const SensitiveCategory = {
  PERSONAL: 'personal',
  FINANCIAL: 'financial',
  DEVICE_NETWORK: 'device_network',
  BUSINESS_GOVERNMENT: 'business_government',
  CUSTOM: 'custom',
} as const;

/**
 * 内置敏感字段识别规则列表
 */
export const builtInRules: SensitiveRule[] = [
  // ==================== 个人隐私类 ====================

  {
    id: 'phone_mobile',
    name: '手机号',
    category: 'personal',
    pattern: /(?<!\d)(1[3-9]\d{9})(?!\d)/g,
    description: '中国大陆手机号（11位，13x-19x开头）',
    replacePattern: 'phone',
  },
  {
    id: 'phone_landline',
    name: '固定电话',
    category: 'personal',
    pattern: /(?<!\d)(0\d{2,3}[-\s]?\d{7,8})(?!\d)/g,
    description: '中国大陆固定电话（带区号，如010-12345678）',
    replacePattern: 'phone',
  },
  {
    id: 'id_card',
    name: '身份证号',
    category: 'personal',
    pattern: /(?<!\d)([1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx])/g,
    description: '中国大陆居民身份证号（18位，含校验位）',
    replacePattern: 'id_card',
  },
  {
    id: 'passport',
    name: '护照号',
    category: 'personal',
    pattern: /(?<!\d)([EeGg]\d{8}|[PpSs]\d{7})(?!\d)/g,
    description: '中国护照号（E/G开头，9位）',
    replacePattern: 'passport',
  },
  {
    id: 'military_id',
    name: '军官证号',
    category: 'personal',
    pattern: /(?<!\d)([军海陆空][\u4e00-\u9fa5]{1,4}[-]?\d{6,8})(?!\d)/g,
    description: '军官证号（军/海/陆/空+汉字+数字）',
    replacePattern: 'military_id',
  },
  {
    id: 'name_chinese',
    name: '中文姓名',
    category: 'personal',
    pattern: /(?<![a-zA-Z])([\u4e00-\u9fa5]{2,4})(先生|女士|小姐|太太|同志|经理|总监|总|总工程师)/g,
    description: '中文姓名（2-4字后接称谓词，避免常见词误判）',
    replacePattern: 'name',
  },
  {
    id: 'name_english',
    name: '英文姓名',
    category: 'personal',
    pattern: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g,
    description: '英文姓名（Firstname Lastname格式）',
    replacePattern: 'name',
  },
  {
    id: 'birthday',
    name: '生日',
    category: 'personal',
    pattern: /(?<!\d)(?:出生(?:日期|年月)|生日)[\s:：]*(?:19|20)\d{2}[年/\-](?:0[1-9]|1[0-2])[月/\-](?:0[1-9]|[12]\d|3[01])日?(?!\d)/g,
    description: '生日日期（多种中文格式）',
    replacePattern: 'birthday',
  },
  {
    id: 'birthday_date',
    name: '生日日期',
    category: 'personal',
    pattern: /(?<!\d)(?:19|20)\d{2}[年/\-](?:0[1-9]|1[0-2])[月/\-](?:0[1-9]|[12]\d|3[01])日?(?!\d)/g,
    description: '纯日期格式生日',
    replacePattern: 'birthday',
  },
  {
    id: 'address',
    name: '住址',
    category: 'personal',
    pattern: /(?:住址|地址|家庭住址|户籍地址|现住址)[\s:：]*(.+?)(?=\n|,|，|$)/g,
    description: '住址信息（提取冒号/冒号后的内容）',
    replacePattern: 'address',
  },
  {
    id: 'zipcode',
    name: '邮编',
    category: 'personal',
    pattern: /(?<!\d)([1-9]\d{5})(?!\d)/g,
    description: '中国大陆邮政编码（6位，1-9开头）',
    replacePattern: 'zipcode',
  },
  {
    id: 'qq',
    name: 'QQ号',
    category: 'personal',
    pattern: /(?<!\d)([1-9]\d{4,9})(?!\d)/g,
    description: 'QQ号（5-10位，首位非0）',
    replacePattern: 'qq',
  },
  {
    id: 'wechat',
    name: '微信号',
    category: 'personal',
    pattern: /(?<!\w)(微信号[码]?[\s:：]*[@]?)([a-zA-Z][a-zA-Z0-9_\-]{5,19})(?!\w)/gi,
    description: '微信号（字母开头，6-20字符）',
    replacePattern: 'wechat',
  },
  {
    id: 'email',
    name: '邮箱',
    category: 'personal',
    pattern: /(?<!\w)([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})(?!\w)/g,
    description: '电子邮箱地址',
    replacePattern: 'email',
  },

  // ==================== 金融类 ====================

  {
    id: 'bank_card',
    name: '银行卡号',
    category: 'financial',
    pattern: /(?<!\d)([1-9]\d{15,18})(?!\d)/g,
    description: '银行卡号（16-19位，首位非0）',
    replacePattern: 'bank_card',
  },
  {
    id: 'credit_card_cvv',
    name: '信用卡CVV',
    category: 'financial',
    pattern: /(?<!\d)(?:cvv|安全码|校验码)[\s:：]*(\d{3,4})(?!\d)/gi,
    description: '信用卡CVV安全码（3-4位）',
    replacePattern: 'cvv',
  },
  {
    id: 'bank_branch',
    name: '开户行',
    category: 'financial',
    pattern: /(?:开户行|开户银行|所属银行)[\s:：]*(.+?)(?=\n|,|，|;|；|$)/gi,
    description: '银行开户行名称',
    replacePattern: 'bank_branch',
  },
  {
    id: 'bank_reserve_phone',
    name: '银行卡预留手机号',
    category: 'financial',
    pattern: /(?<!\d)(?:预留手机|绑定手机|银行卡手机)[\s:：]*(1[3-9]\d{9})(?!\d)/gi,
    description: '银行卡绑定的手机号',
    replacePattern: 'phone',
  },

  // ==================== 设备/网络类 ====================

  {
    id: 'ipv4',
    name: 'IP地址',
    category: 'device_network',
    pattern: /(?<!\d)(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?!\d)/g,
    description: 'IPv4地址',
    replacePattern: 'ip',
  },
  {
    id: 'mac_address',
    name: 'MAC地址',
    category: 'device_network',
    pattern: /(?<!\w)([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}(?!\w)/g,
    description: 'MAC地址（形如AA:BB:CC:DD:EE:FF）',
    replacePattern: 'mac',
  },
  {
    id: 'device_sn',
    name: '设备序列号',
    category: 'device_network',
    pattern: /(?<!\d)(?:序列号|设备号|SN[:：\s]*)([A-Z0-9]{8,20})(?!\w)/gi,
    description: '设备序列号（字母+数字，8-20位）',
    replacePattern: 'device_sn',
  },

  // ==================== 商业/政务类 ====================

  {
    id: 'business_license',
    name: '营业执照号',
    category: 'business_government',
    pattern: /(?<!\d)((?:11|12|13|21|22|23|31|32|33|34|35|36|37|41|42|43|44|45|46|50|51|52|53|61|62|63|64|65)\d{14})(?!\d)/g,
    description: '营业执照号（15位，注册号格式）',
    replacePattern: 'business_license',
  },
  {
    id: 'unified_social_credit',
    name: '统一社会信用代码',
    category: 'business_government',
    pattern: /(?<!\d)([1-9A-GY]{1}[1-9A-NP-Z0-9]{17})(?!\d)/g,
    description: '统一社会信用代码（18位）',
    replacePattern: 'credit_code',
  },
  {
    id: 'company_name',
    name: '公司名称',
    category: 'business_government',
    pattern: /(?:公司|企业|集团|有限公司|股份有限公司|有限责任公司)[\s:：]*(.+?)(?=\n|,|，|$)/g,
    description: '公司名称（提取关键词后的内容）',
    replacePattern: 'company',
  },
];

/**
 * 根据类别获取规则
 */
export function getRulesByCategory(category: string): SensitiveRule[] {
  return builtInRules.filter(rule => rule.category === category);
}

/**
 * 根据ID获取单条规则
 */
export function getRuleById(id: string): SensitiveRule | undefined {
  return builtInRules.find(rule => rule.id === id);
}
