# DataMaskStudio - 开发计划

## 技术栈
- **桌面框架**: Electron 33 + React 19 + TypeScript
- **UI框架**: Ant Design 5 + Tailwind CSS
- **核心引擎**: TypeScript (Node.js)
- **文件处理**: xlsx, mammoth, pdf-parse, pdf-lib, sharp, tesseract.js
- **加密**: Node.js crypto (AES-256-GCM for reversible masking)
- **构建**: electron-builder

## V1.0 开发优先级 (Phase 1)

### P0 - 核心引擎 (最高优先级)
1. 敏感字段识别规则库 (正则匹配)
2. 不可逆脱敏 (掩码/哈希/假数据替换)
3. 可逆脱敏 (AES-256-GCM 加密/解密)
4. 脱敏强度选择 (轻度/中度/重度)

### P0 - 文件解析器 (最高优先级)
1. TXT/MD 解析
2. CSV 解析
3. JSON 解析
4. XML 解析
5. Excel (.xlsx) 解析
6. Word (.docx) 解析

### P1 - GUI 主界面 (高优先级)
1. Electron 主进程骨架
2. React 主界面布局
3. 文件拖拽上传区
4. 脱敏设置面板
5. 预览对比区 (左右分屏)

### P1 - 功能模块 (高优先级)
1. 一键脱敏流程
2. AI友好适配 (一键复制/格式优化)
3. 导出脱敏文件

### P2 - 辅助功能 (中优先级)
1. 设置界面
2. 历史记录
3. 快捷键支持
4. 深色模式

## 项目结构
```
DataMaskStudio/
├── electron/           # Electron 主进程
│   ├── main.ts         # 入口
│   ├── preload.ts      # 预加载
│   └── ipc/            # IPC 通信
├── src/                # React 渲染进程
│   ├── App.tsx
│   ├── engine/         # 核心脱敏引擎
│   │   ├── detector.ts    # 敏感字段检测
│   │   ├── masker.ts      # 脱敏处理
│   │   ├── encryptor.ts   # 可逆加密
│   │   ├── fakeData.ts    # 假数据生成
│   │   └── rules.ts       # 内置规则库
│   ├── parsers/        # 文件解析器
│   │   ├── textParser.ts
│   │   ├── csvParser.ts
│   │   ├── jsonParser.ts
│   │   ├── xmlParser.ts
│   │   ├── excelParser.ts
│   │   └── wordParser.ts
│   ├── components/     # UI组件
│   ├── pages/          # 页面
│   ├── utils/          # 工具函数
│   ├── i18n/           # 国际化
│   └── assets/         # 静态资源
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── electron-builder.yml
```
