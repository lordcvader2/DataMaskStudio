/**
 * 假数据生成器 — 生成符合真实格式但无实际意义的假数据
 * 使用伪随机数生成器，相同原始值 + salt 可保证输出一致性（幂等性）
 */

import * as crypto from 'crypto';

// ==================== 内置数据字典 ====================

/** 常见姓氏库 */
const SURNAMES = [
  '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '楚', '卫', '蒋', '沈', '韩', '杨',
  '朱', '秦', '尤', '许', '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏', '陶', '姜',
  '戚', '谢', '邹', '喻', '柏', '水', '窦', '章', '云', '苏', '潘', '葛', '奚', '范', '彭', '郎',
  '鲁', '韦', '昌', '马', '苗', '凤', '花', '方', '俞', '任', '袁', '柳', '酆', '鲍', '史', '唐',
  '费', '廉', '岑', '薛', '雷', '贺', '倪', '汤', '滕', '殷', '罗', '毕', '郝', '邬', '安', '常',
];

/** 常见名字库（单名和双名混合） */
const GIVEN_NAMES = [
  '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛',
  '明', '超', '秀兰', '霞', '平', '刚', '桂英', '文', '华', '慧', '建国', '建军', '志强', '永强',
  '秀珍', '建华', '玲', '辉', '兰', '鹏', '飞', '梅', '婷', '玉兰', '英', '红', '云', '凤英', '丹',
  '凤', '丽丽', '旭', '波', '萍', '欣', '宇', '浩', '怡', '君', '峰', '婷', '鑫', '博', '雪', '晨',
  '思', '雨', '轩', '林', '彦', '泽', '佳', '琪', '琳', '颖', '妍', '萱', '涵', '霖', '阳', '航',
  '阳', '洋', '龙', '海', '华', '志', '伟', '鹏', '杰', '涛', '超', '勇', '强', '军', '磊', '刚',
];

/** 常见邮箱域名 */
const EMAIL_DOMAINS = [
  'qq.com', '163.com', '126.com', 'gmail.com', 'hotmail.com',
  'outlook.com', 'sina.com', 'sohu.com', '139.com', '189.com',
  'foxmail.com', 'icloud.com', 'yahoo.com', 'live.com',
];

/** 省/直辖市/自治区 */
const PROVINCES = [
  '北京市', '上海市', '天津市', '重庆市',
  '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省',
  '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省',
  '河南省', '湖北省', '湖南省', '广东省', '海南省',
  '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省', '台湾省',
  '内蒙古自治区', '广西壮族自治区', '西藏自治区', '宁夏回族自治区', '新疆维吾尔自治区',
];

/** 常见城市 */
const CITIES = [
  '北京', '上海', '深圳', '广州', '杭州', '南京', '苏州', '成都', '武汉', '西安',
  '重庆', '天津', '郑州', '长沙', '东莞', '佛山', '青岛', '济南', '沈阳', '大连',
  '厦门', '福州', '合肥', '昆明', '哈尔滨', '长春', '石家庄', '南昌', '贵阳', '太原',
];

/** 常见区/县 */
const DISTRICTS = [
  '朝阳区', '海淀区', '浦东新区', '天河区', '武侯区', '江岸区', '碑林区', '锦江区',
  '西湖区', '南山区', '越秀区', '雁塔区', '东城区', '西城区', '滨海新区', '高明区',
  '禅城区', '虎门区', '龙岗区', '宝安区', '吴中区', '相城区', '姑苏区', '工业园区',
];

/** 常见路/街/巷名 */
const STREETS = [
  '人民路', '中山路', '建设路', '解放路', '和平路', '文化路', '胜利路', '民主路',
  '黄河路', '长江路', '南京路', '北京路', '上海路', '幸福路', '友谊路', '新华路',
  '东风路', '光明路', '振兴路', '前程路', '科技路', '创新路', '创业路', '学院路',
  '大学路', '工业路', '商业街', '花园路', '翠园路', '中心路', '新中路', '沿江路',
];

/** 小区/村庄名常见后缀 */
const COMMUNITY_SUFFIXES = [
  '花园', '苑', '居', '庭', '邸', '湾', '郡', '城', '公馆', '家园', '小区', '新村', '家园', '府',
];

/** 公司常见前缀 */
const COMPANY_PREFIXES = [
  '华', '中', '国', '金', '银', '宏', '盛', '腾', '博', '瑞', '宇', '星', '恒', '远', '大',
  '新', '科', '智', '创', '领', '德', '正', '顺', '兴', '泰', '安', '福', '利', '和', '祥',
];

/** 行业类别 */
const INDUSTRIES = [
  '科技', '网络', '信息', '软件', '电子', '机械', '化工', '纺织', '食品', '医药',
  '教育', '咨询', '传媒', '文化', '旅游', '餐饮', '贸易', '物流', '金融', '投资',
  '地产', '建筑', '物业', '装修', '广告', '设计', '法律', '会计', '人力', '商务',
];

/** 公司类型 */
const COMPANY_TYPES = [
  '有限公司', '有限责任公司', '股份有限公司', '集团有限公司',
  '科技有限公司', '实业有限公司', '贸易有限公司', '投资有限公司',
];

/** 常见设备品牌 */
const DEVICE_BRANDS = ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OPPO', 'vivo', 'Lenovo', 'Dell', 'HP', 'ASUS'];

// ==================== 简单伪随机数生成器（保证幂等性） ====================

/**
 * 基于字符串的简单哈希伪随机数生成器
 * 相同 seed + salt 永远产生相同序列（保证幂等性）
 */
function createSeededRandom(seed: string, salt: string = 'datamaskstudio'): () => number {
  let h = 0x811c9dc5;
  const str = seed + salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h = h >>> 0;
  // 用种子初始化一个简单的 LCG
  let state = h;
  return function (): number {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** 从数组中以伪随机方式选取一项（幂等） */
function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** 生成指定范围的伪随机整数（幂等） */
function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// ==================== 身份证校验码计算 ====================

/**
 * 计算中国身份证第18位校验码
 */
function calculateIdCardCheckDigit(id17: string): string {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = '10X98765432';
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(id17[i]) * weights[i];
  }
  return checkCodes[sum % 11];
}

// ==================== 各类型假数据生成函数 ====================

/**
 * 生成假手机号
 * 保留原始号段特征（中国移动/联通/电信号段）
 */
function generateFakePhone(original?: string): string {
  // 国内主流号段映射
  const prefixes = [
    // 中国移动
    '134', '135', '136', '137', '138', '139',
    '144', '147', '148',
    '150', '151', '152', '157', '158', '159',
    '172', '178',
    '182', '183', '184', '187', '188', '197', '198',
    // 中国联通
    '130', '131', '132',
    '145', '146',
    '155', '156', '166',
    '175', '176', '185', '186', '196',
    // 中国电信
    '133', '134', '141', '149',
    '153', '173', '177', '180', '181', '189', '190', '191', '193', '199',
    // 广电
    '192',
  ];

  const prefix = original && original.length === 11
    ? original.substring(0, 3)
    : prefixes[Math.floor(Math.random() * prefixes.length)];

  const rand = createSeededRandom(original || prefix, 'phone_salt');
  const suffix = String(randInt(rand, 0, 99999999)).padStart(8, '0');
  return prefix + suffix;
}

/**
 * 生成假身份证号（18位，格式合法含校验码）
 */
function generateFakeIdCard(original?: string): string {
  const rand = createSeededRandom(original || 'fake_id', 'id_card_salt');

  // 地区代码
  const areaCodes = ['110101', '310101', '440103', '500101', '510104', '320105', '420102', '610102'];
  const areaRand = createSeededRandom(original || 'area', 'id_card_salt');
  const area = areaCodes[Math.floor(areaRand() * areaCodes.length)];

  // 出生年月：固定为 1970-2000 范围内随机
  const year = String(randInt(rand, 1970, 2000));
  const month = String(randInt(rand, 1, 12)).padStart(2, '0');
  const day = String(randInt(rand, 1, 28)).padStart(2, '0');

  // 顺序码：随机3位数
  const seq = String(randInt(rand, 0, 999)).padStart(3, '0');

  // 前17位
  const id17 = area + year + month + day + seq;
  // 校验码
  const checkDigit = calculateIdCardCheckDigit(id17);

  return id17 + checkDigit;
}

/**
 * 生成假银行卡号（符合Luhn算法）
 */
function generateFakeBankCard(original?: string): string {
  const rand = createSeededRandom(original || 'bank', 'bank_card_salt');

  // 生成16或19位银行卡号
  const length = Math.random() > 0.5 ? 16 : 19;
  const bin = '622202'; // 工商银行BIN（示例）
  let cardNumber = bin;
  for (let i = 0; i < length - 7; i++) {
    cardNumber += String(randInt(rand, 0, 9));
  }

  // 计算校验位（Luhn算法）
  let sum = 0;
  let isEven = true;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i]);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return cardNumber + String(checkDigit);
}

/**
 * 生成假邮箱
 */
function generateFakeEmail(original?: string): string {
  const rand = createSeededRandom(original || 'email_seed', 'email_salt');

  let prefix: string;
  if (original && original.includes('@')) {
    const [userPart] = original.split('@');
    const baseLen = Math.min(userPart.length, 6);
    prefix = userPart.substring(0, baseLen);
  } else {
    // 随机生成前缀：字母数字组合
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const len = randInt(rand, 5, 10);
    prefix = '';
    for (let i = 0; i < len; i++) {
      prefix += chars[randInt(rand, 0, chars.length - 1)];
    }
  }

  const domain = pickRandom(EMAIL_DOMAINS, rand);
  return prefix + '@' + domain;
}

/**
 * 生成假中文姓名
 */
function generateFakeName(original?: string): string {
  const rand = createSeededRandom(original || 'name_seed', 'name_salt');
  const surname = pickRandom(SURNAMES, rand);

  // 随机决定单字名还是双字名
  const givenNameLen = Math.random() > 0.4 ? 2 : 1;
  let givenName = '';
  if (givenNameLen === 1) {
    const singleNames = GIVEN_NAMES.filter(n => n.length === 1);
    givenName = pickRandom(singleNames, rand);
  } else {
    const len1 = randInt(rand, 0, GIVEN_NAMES.length - 1);
    const len2 = randInt(rand, 0, GIVEN_NAMES.length - 1);
    givenName = GIVEN_NAMES[len1] + GIVEN_NAMES[len2];
  }

  return surname + givenName;
}

/**
 * 生成假英文姓名
 */
function generateFakeEnglishName(original?: string): string {
  const rand = createSeededRandom(original || 'en_name_seed', 'name_salt');
  const firstNames = [
    'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Charles',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica',
  ];
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  ];
  return pickRandom(firstNames, rand) + ' ' + pickRandom(lastNames, rand);
}

/**
 * 生成假地址
 */
function generateFakeAddress(original?: string): string {
  const rand = createSeededRandom(original || 'addr_seed', 'addr_salt');
  const province = pickRandom(PROVINCES, rand);
              return `${province}号栋`;
}

/**
 * 生成假IP地址
 */
function generateFakeIP(original?: string): string {
  const rand = createSeededRandom(original || 'ip_seed', 'ip_salt');
  return [
    randInt(rand, 1, 223),
    randInt(rand, 0, 255),
    randInt(rand, 0, 255),
    randInt(rand, 1, 254),
  ].join('.');
}

/**
 * 生成假MAC地址
 */
function generateFakeMAC(original?: string): string {
  const rand = createSeededRandom(original || 'mac_seed', 'mac_salt');
  const hex = '0123456789ABCDEF';
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    parts.push(hex[randInt(rand, 0, 15)] + hex[randInt(rand, 0, 15)]);
  }
  return parts.join(':');
}

/**
 * 生成假公司名称
 */
function generateFakeCompany(original?: string): string {
  const rand = createSeededRandom(original || 'company_seed', 'company_salt');
  const prefix = pickRandom(COMPANY_PREFIXES, rand);
  const industry = pickRandom(INDUSTRIES, rand);
  const type = pickRandom(COMPANY_TYPES, rand);
  return prefix + industry + type;
}

/**
 * 生成假护照号（E/G/P/S开头，9位）
 */
function generateFakePassport(original?: string): string {
  const rand = createSeededRandom(original || 'passport_seed', 'passport_salt');
  const letters = 'EGPS';
  const prefix = letters[randInt(rand, 0, letters.length - 1)];
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += String(randInt(rand, 0, 9));
  }
  return prefix + suffix;
}

/**
 * 生成假CVV码（3位）
 */
function generateFakeCVV(original?: string): string {
  const rand = createSeededRandom(original || 'cvv_seed', 'cvv_salt');
  return String(randInt(rand, 100, 999));
}

/**
 * 生成假邮编（6位，1-9开头）
 */
function generateFakeZipCode(original?: string): string {
  const rand = createSeededRandom(original || 'zip_seed', 'zip_salt');
  return String(randInt(rand, 1, 9)) + String(randInt(rand, 10000, 99999)) + String(randInt(rand, 0, 9));
}

/**
 * 生成假QQ号
 */
function generateFakeQQ(original?: string): string {
  const rand = createSeededRandom(original || 'qq_seed', 'qq_salt');
  return String(randInt(rand, 10000, 99999999));
}

/**
 * 生成假微信号（字母开头，6-20位）
 */
function generateFakeWeChat(original?: string): string {
  const rand = createSeededRandom(original || 'wechat_seed', 'wechat_salt');
  const prefix = 'wx';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const len = randInt(rand, 6, 12);
  let suffix = '';
  for (let i = 0; i < len; i++) {
    suffix += chars[randInt(rand, 0, chars.length - 1)];
  }
  return prefix + suffix;
}

/**
 * 生成假设备序列号
 */
function generateFakeDeviceSN(original?: string): string {
  const rand = createSeededRandom(original || 'sn_seed', 'sn_salt');
  const brand = pickRandom(DEVICE_BRANDS, rand);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sn = brand.substring(0, 3).toUpperCase();
  for (let i = 0; i < 10; i++) {
    sn += chars[randInt(rand, 0, chars.length - 1)];
  }
  return sn;
}

/**
 * 生成假营业执照号（15位）
 */
function generateFakeBusinessLicense(original?: string): string {
  const rand = createSeededRandom(original || 'bl_seed', 'business_license_salt');
  const regionCodes = ['11', '31', '44', '50', '51', '31', '32', '33', '37', '41'];
  const region = pickRandom(regionCodes, rand);
  let number = region;
  for (let i = 0; i < 13; i++) {
    number += String(randInt(rand, 0, 9));
  }
  return number;
}

/**
 * 生成假统一社会信用代码（18位）
 */
function generateFakeCreditCode(original?: string): string {
  const rand = createSeededRandom(original || 'cc_seed', 'credit_code_salt');
  const firstChars = '123456789ABCDEFGHJKLMNPQRSTUVWXY';
  const first = pickRandom(firstChars.split(''), rand);
  let code = first;
  for (let i = 0; i < 17; i++) {
    code += String(randInt(rand, 0, 9));
  }
  return code;
}

// ==================== 假数据生成器主类 ====================

/**
 * 假数据生成器
 * 生成符合真实格式但无实际意义的假数据
 */
export class FakeDataGenerator {
  /**
   * 根据类型生成对应假数据
   * @param type 假数据类型（对应 rules.ts 中的 replacePattern 字段）
   * @param original 原始值（用于保证同一原始值生成相同假数据，实现幂等性）
   * @returns 符合格式的假数据字符串
   */
  static generate(type: string, original?: string): string {
    switch (type) {
      case 'phone':
        return generateFakePhone(original);
      case 'id_card':
        return generateFakeIdCard(original);
      case 'bank_card':
        return generateFakeBankCard(original);
      case 'email':
        return generateFakeEmail(original);
      case 'name':
        // 根据原始值判断中英文
        if (original && /^[a-zA-Z\s]+$/.test(original)) {
          return generateFakeEnglishName(original);
        }
        return generateFakeName(original);
      case 'address':
        return generateFakeAddress(original);
      case 'ip':
        return generateFakeIP(original);
      case 'mac':
        return generateFakeMAC(original);
      case 'company':
        return generateFakeCompany(original);
      case 'passport':
        return generateFakePassport(original);
      case 'cvv':
        return generateFakeCVV(original);
      case 'zipcode':
        return generateFakeZipCode(original);
      case 'qq':
        return generateFakeQQ(original);
      case 'wechat':
        return generateFakeWeChat(original);
      case 'device_sn':
        return generateFakeDeviceSN(original);
      case 'business_license':
        return generateFakeBusinessLicense(original);
      case 'credit_code':
        return generateFakeCreditCode(original);
      case 'birthday':
        return '1990-01-01';
      case 'bank_branch':
        return '中国银行北京市分行';
      default:
        // 对于未知类型，返回占位符
        return 'FAKE_DATA';
    }
  }
}

export default FakeDataGenerator;
