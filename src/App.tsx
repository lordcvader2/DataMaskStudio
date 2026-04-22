/**
 * DataMaskStudio - 主应用组件 v1.1.0
 * 新增：统计面板、批量处理、规则管理UI、更流畅的预览体验
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Button, Radio, Card, Alert, Typography, Tooltip, Space,
  Progress, Divider, message, Badge, Tag, Table, Collapse, Input,
  Switch, List, Statistic, Row, Col,
} from 'antd';
import {
  SafetyCertificateOutlined, SettingOutlined, HistoryOutlined,
  BulbOutlined, CopyOutlined, SaveOutlined, ThunderboltOutlined,
  UploadOutlined, BarChartOutlined, ExperimentOutlined,
  DeleteOutlined, PlusOutlined, CheckCircleOutlined,
  FileTextOutlined, CloudUploadOutlined, ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// ==================== 类型定义 ====================

type MaskIntensity = 'light' | 'medium' | 'heavy';
type MaskStrategy = 'mask' | 'hash' | 'fake' | 'reversible';

interface MatchDetail {
  ruleId: string;
  ruleName: string;
  category: string;
  original: string;
  replacement: string;
}

interface FileState {
  name: string;
  path: string;
  originalContent: string;
  maskedContent: string;
  maskedFields: string[];
  maskedCount: number;
  matchDetails: MatchDetail[];
  stats?: {
    byCategory: Record<string, number>;
    byRule: Record<string, number>;
  };
  duration?: number;
  timestamp: number;
}

interface RuleToggle {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
}

// ==================== 规则配置 ====================

const RULE_CATEGORIES = [
  { key: 'personal', label: '个人隐私', color: '#FF6B6B' },
  { key: 'financial', label: '金融信息', color: '#FFB347' },
  { key: 'device_network', label: '设备/网络', color: '#4ECDC4' },
  { key: 'business_government', label: '商业/政务', color: '#A78BFA' },
];

const ALL_RULES: RuleToggle[] = [
  { id: 'phone_mobile', name: '手机号', category: 'personal', enabled: true },
  { id: 'phone_landline', name: '固定电话', category: 'personal', enabled: true },
  { id: 'id_card', name: '身份证号', category: 'personal', enabled: true },
  { id: 'passport', name: '护照号', category: 'personal', enabled: true },
  { id: 'name_chinese', name: '中文姓名', category: 'personal', enabled: true },
  { id: 'birthday', name: '生日日期', category: 'personal', enabled: true },
  { id: 'address', name: '住址', category: 'personal', enabled: true },
  { id: 'zipcode', name: '邮编', category: 'personal', enabled: false },
  { id: 'qq', name: 'QQ号', category: 'personal', enabled: true },
  { id: 'wechat', name: '微信号', category: 'personal', enabled: true },
  { id: 'email', name: '邮箱', category: 'personal', enabled: true },
  { id: 'bank_card', name: '银行卡号', category: 'financial', enabled: true },
  { id: 'credit_card_cvv', name: '信用卡CVV', category: 'financial', enabled: true },
  { id: 'bank_branch', name: '开户行', category: 'financial', enabled: true },
  { id: 'bank_reserve_phone', name: '银行卡预留手机', category: 'financial', enabled: true },
  { id: 'ipv4', name: 'IP地址', category: 'device_network', enabled: true },
  { id: 'mac_address', name: 'MAC地址', category: 'device_network', enabled: true },
  { id: 'device_sn', name: '设备序列号', category: 'device_network', enabled: false },
  { id: 'business_license', name: '营业执照号', category: 'business_government', enabled: true },
  { id: 'unified_credit', name: '统一社会信用代码', category: 'business_government', enabled: true },
  { id: 'company_name', name: '公司名称', category: 'business_government', enabled: true },
];

const CATEGORY_LABELS: Record<string, string> = {
  personal: '个人隐私',
  financial: '金融信息',
  device_network: '设备/网络',
  business_government: '商业/政务',
};

// ==================== 工具函数 ====================

const categoryColor = (cat: string) =>
  RULE_CATEGORIES.find(c => c.key === cat)?.color ?? '#888';

// ==================== App 主组件 ====================

const App: React.FC = () => {
  const [intensity, setIntensity] = useState<MaskIntensity>('heavy');
  const [strategy, setStrategy] = useState<MaskStrategy>('mask');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const dropZoneRef = useRef<HTMLDivElement>(null);

  /** 脱敏后的文件状态 */
  const [currentFile, setCurrentFile] = useState<FileState | null>(null);

  /** 统计信息 */
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalMatches: 0,
    totalDuration: 0,
    byCategory: {} as Record<string, number>,
  });

  /** 历史记录 */
  const [history, setHistory] = useState<FileState[]>([]);

  /** 规则开关 */
  const [rules, setRules] = useState<RuleToggle[]>(ALL_RULES);

  /** 处理中状态 */
  const [isProcessing, setIsProcessing] = useState(false);

  /** 拖拽状态 */
  const [isDragOver, setIsDragOver] = useState(false);

  /** 设置面板展开 */
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ==================== 深色模式 ====================

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // ==================== 核心处理函数 ====================

  const processResult = useCallback((result: any, fileName: string, filePath = '') => {
    if (result.success) {
      const fileState: FileState = {
        name: fileName,
        path: filePath,
        originalContent: result.originalContent || '',
        maskedContent: result.maskedContent || '',
        maskedFields: result.maskedFields || [],
        maskedCount: result.maskedFields?.length ?? 0,
        matchDetails: result.matchDetails || [],
        stats: result.stats,
        duration: result.duration,
        timestamp: Date.now(),
      };
      setCurrentFile(fileState);
      setHistory(prev => [fileState, ...prev.slice(0, 19)]);
      setStats(prev => ({
        totalFiles: prev.totalFiles + 1,
        totalMatches: prev.totalMatches + (result.maskedFields?.length ?? 0),
        totalDuration: prev.totalDuration + (result.duration ?? 0),
        byCategory: {
          ...prev.byCategory,
          ...Object.fromEntries(
            Object.entries(result.stats?.byCategory || {}).map(([k, v]) => [
              k, (prev.byCategory[k] ?? 0) + (v as number)
            ])
          ),
        },
      }));
      messageApi.success({
        content: `✅ 脱敏完成！发现 ${result.maskedFields?.length ?? 0} 处敏感数据`,
        duration: 3,
      });
    } else {
      messageApi.error(`❌ 脱敏失败: ${result.error}`);
    }
    setIsProcessing(false);
  }, [messageApi]);

  const handleFile = useCallback(async (filePath: string, fileName: string) => {
    if (!window.electronAPI) {
      messageApi.error('Electron API 不可用，请确保在 Electron 环境中运行');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await window.electronAPI.maskFile({ filePath, intensity, strategy });
      processResult(result, fileName, filePath);
    } catch (e) {
      messageApi.error('处理文件时发生错误');
      setIsProcessing(false);
    }
  }, [intensity, strategy, messageApi, processResult]);

  const handleOpenFileDialog = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFileDialog();
    if (result.success && result.filePaths?.length) {
      const filePath = result.filePaths[0];
      const name = filePath.split(/[/\\]/).pop() || '未知文件';
      await handleFile(filePath, name);
    }
  }, [handleFile]);

  const handleQuickMask = useCallback(() => {
    if (currentFile?.path) {
      handleFile(currentFile.path, currentFile.name);
    } else {
      messageApi.warning('当前文件为拖拽文件，无法重新脱敏，请重新拖入');
    }
  }, [currentFile, handleFile, messageApi]);

  const handleDroppedFile = useCallback(async (file: File) => {
    if (!window.electronAPI) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const bufferBase64 = btoa(binary);
      const result = await window.electronAPI.maskBuffer({
        fileName: file.name,
        bufferBase64,
        intensity,
        strategy,
      });
      processResult(result, file.name, '');
    } catch (e) {
      messageApi.error('处理拖拽文件时发生错误');
      setIsProcessing(false);
    }
  }, [intensity, strategy, messageApi, processResult]);

  const handleCopyResult = useCallback(() => {
    if (!currentFile) { messageApi.warning('没有可复制的内容'); return; }
    navigator.clipboard.writeText(currentFile.maskedContent)
      .then(() => messageApi.success('脱敏结果已复制到剪贴板'))
      .catch(() => messageApi.error('复制失败'));
  }, [currentFile, messageApi]);

  const handleSaveFile = useCallback(async () => {
    if (!currentFile || !window.electronAPI) { messageApi.warning('没有可保存的内容'); return; }
    const result = await window.electronAPI.openFileDialog({
      filters: [{ name: '所有文件', extensions: ['*'] }],
    });
    if (result.success && result.filePaths?.[0]) {
      const saveResult = await window.electronAPI.saveFile({
        filePath: result.filePaths[0],
        content: currentFile.maskedContent,
      });
      if (saveResult.success) messageApi.success('文件保存成功 ✅');
      else messageApi.error(`保存失败: ${saveResult.error}`);
    }
  }, [currentFile, messageApi]);

  const handleHistorySelect = useCallback((item: FileState) => {
    setCurrentFile(item);
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setCurrentFile(null);
    setStats({ totalFiles: 0, totalMatches: 0, totalDuration: 0, byCategory: {} });
    messageApi.info('历史记录已清空');
  }, [messageApi]);

  // ==================== 拖拽事件 ====================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleDroppedFile(files[0]);
  }, [handleDroppedFile]);

  // ==================== 高亮渲染 ====================

  const highlightOriginal = useCallback((text: string, fields: string[]): React.ReactNode => {
    if (!fields.length || !text) return text;
    const positions: Array<{ v: string; i: number }> = [];
    for (const f of fields) {
      const i = text.indexOf(f);
      if (i !== -1) positions.push({ v: f, i });
    }
    positions.sort((a, b) => a.i - b.i);
    const parts: React.ReactNode[] = [];
    let last = 0;
    for (const { v, i } of positions) {
      if (i >= last) {
        if (i > last) parts.push(text.slice(last, i));
        parts.push(
          <span key={`s-${i}`} className="sensitive-highlight">{v}</span>
        );
        last = i + v.length;
      }
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length ? parts : text;
  }, []);

  const highlightMasked = useCallback((text: string): React.ReactNode => {
    const parts = text.split(/(\*+)/g);
    return parts.map((p, i) =>
      /^\*+$/.test(p)
        ? <span key={`m-${i}`} className="safe-highlight">{p}</span>
        : p
    );
  }, []);

  // ==================== 统计面板 ====================

  const categoryColumns: ColumnsType<{ key: string; name: string; count: number }> = [
    { title: '类别', dataIndex: 'name', render: (v, r) => (
      <Tag color={categoryColor(r.key)}>{v}</Tag>
    )},
    { title: '检测数量', dataIndex: 'count', render: v => <Badge count={v} showZero color="#1890FF" /> },
  ];

  const categoryData = Object.entries(stats.byCategory).map(([k, v]) => ({
    key: k, name: CATEGORY_LABELS[k] ?? k, count: v as number,
  }));

  // ==================== 历史记录表格 ====================

  const historyColumns: ColumnsType<FileState> = [
    { title: '文件名', dataIndex: 'name', ellipsis: true, render: v => <Text>{v}</Text> },
    { title: '敏感数据', dataIndex: 'maskedCount', width: 100, render: v => <Badge count={v} showZero color="#FF4D4F" /> },
    { title: '耗时', dataIndex: 'duration', width: 80, render: v => <Text type="secondary">{v?.toFixed(3)}s</Text> },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, record: FileState) => (
        <Button type="link" size="small" onClick={() => handleHistorySelect(record)}>
          查看
        </Button>
      ),
    },
  ];

  // ==================== 渲染 ====================

  return (
    <div className="min-h-screen flex flex-col dark:bg-[#1A1B1E]">
      {contextHolder}

      {/* ── 顶部导航栏 ── */}
      <header className="bg-white dark:bg-[#25262B] border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <SafetyCertificateOutlined style={{ fontSize: 26, color: '#1890FF' }} />
          <Title level={4} style={{ margin: 0 }} className="text-gray-800 dark:text-gray-100">
            DataMask Studio
          </Title>
          <Tag color="blue">v1.1.0</Tag>
        </div>
        <Space>
          <Tooltip title="处理统计">
            <Badge count={stats.totalMatches} overflowCount={9999}>
              <Button type="text" icon={<BarChartOutlined />}>统计</Button>
            </Badge>
          </Tooltip>
          <Tooltip title="处理历史">
            <Badge count={history.length} overflowCount={99}>
              <Button type="text" icon={<HistoryOutlined />}>历史</Button>
            </Badge>
          </Tooltip>
          <Tooltip title={isDarkMode ? '切换浅色模式' : '切换深色模式'}>
            <Button type="text" icon={<BulbOutlined />} onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? '浅色' : '深色'}
            </Button>
          </Tooltip>
        </Space>
      </header>

      {/* ── 主内容 ── */}
      <main className="flex-1 p-5 bg-gray-50 dark:bg-[#1A1B1E]">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* 第一行：拖拽区 + 统计面板 */}
          <div className="grid grid-cols-3 gap-5">

            {/* 拖拽区 */}
            <div className="col-span-2">
              <Card
                variant="borderless"
                style={{ backgroundColor: 'white', borderRadius: 12 }}
                styles={{ body: { padding: 0 } }}
              >
                <div
                  ref={dropZoneRef}
                  className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleOpenFileDialog}
                >
                  <div className="drop-zone-icon">
                    <CloudUploadOutlined />
                  </div>
                  <Paragraph className="drop-zone-text" style={{ fontSize: 15 }}>
                    {isProcessing ? '正在处理...' : '拖拽文件到此处，或点击选择文件'}
                  </Paragraph>
                  <Paragraph className="drop-zone-hint">
                    支持 TXT / CSV / JSON / XML / Excel / Word
                  </Paragraph>
                  {isProcessing && <Progress percent={99} status="active" size="small" style={{ width: 200, margin: '12px auto 0' }} />}
                </div>
              </Card>
            </div>

            {/* 统计面板 */}
            <Card
              title={<><BarChartOutlined style={{ marginRight: 6 }} />处理统计</>}
              variant="borderless"
              extra={<Tooltip title="清空历史"><Button type="text" icon={<ClearOutlined />} size="small" onClick={handleClearHistory} /></Tooltip>}
              style={{ backgroundColor: 'white', borderRadius: 12 }}
            >
              <Row gutter={12} className="mb-4">
                <Col span={12}><Statistic title="已处理文件" value={stats.totalFiles} /></Col>
                <Col span={12}><Statistic title="检测敏感数据" value={stats.totalMatches} valueStyle={{ color: '#FF4D4F' }} /></Col>
              </Row>
              {stats.totalDuration > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>总耗时 {stats.totalDuration.toFixed(3)}s</Text>
              )}
              {categoryData.length > 0 && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Table
                    size="small"
                    pagination={false}
                    columns={categoryColumns}
                    dataSource={categoryData}
                    rowKey="key"
                  />
                </>
              )}
              {categoryData.length === 0 && (
                <Text type="secondary" style={{ fontSize: 13 }}>暂无统计数据，处理文件后显示</Text>
              )}
            </Card>
          </div>

          {/* 第二行：配置 + 预览对比 */}
          <div className="grid grid-cols-3 gap-5">

            {/* 脱敏配置 */}
            <Card
              title="脱敏配置"
              variant="borderless"
              style={{ backgroundColor: 'white', borderRadius: 12 }}
            >
              <div className="mb-4">
                <Text strong style={{ display: 'block', marginBottom: 8 }}>脱敏强度</Text>
                <Radio.Group
                  value={intensity}
                  onChange={e => setIntensity(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="middle"
                  block
                >
                  <Radio.Button value="light">🌱 轻度</Radio.Button>
                  <Radio.Button value="medium">🌤️ 中度</Radio.Button>
                  <Radio.Button value="heavy">🔒 重度</Radio.Button>
                </Radio.Group>
              </div>

              <div className="mb-4">
                <Text strong style={{ display: 'block', marginBottom: 8 }}>脱敏策略</Text>
                <Radio.Group
                  value={strategy}
                  onChange={e => setStrategy(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="middle"
                  block
                >
                  <Radio.Button value="mask">掩码</Radio.Button>
                  <Radio.Button value="hash">哈希</Radio.Button>
                  <Radio.Button value="fake">假数据</Radio.Button>
                  <Radio.Button value="reversible">可逆</Radio.Button>
                </Radio.Group>
              </div>

              <Alert
                message={
                  strategy === 'mask' ? '🔒 掩码替换：部分字符用 * 遮蔽，可读性强'
                  : strategy === 'hash' ? '🔐 哈希脱敏：不可逆，无法还原，适合数据分析场景'
                  : strategy === 'fake' ? '🎭 假数据：生成同类型假数据，完全无法追溯'
                  : '🔑 可逆加密：AES-256-GCM，需保管密钥可还原'
                }
                type="info"
                showIcon
                style={{ marginBottom: 12, fontSize: 13 }}
              />

              {/* 强度说明 */}
              <Collapse ghost size="small">
                <Panel header={<Text type="secondary" style={{ fontSize: 12 }}>强度说明</Text>} key="1">
                  <div className="space-y-1" style={{ fontSize: 12 }}>
                    <div>🌱 <Text type="secondary">轻度：仅处理个人隐私类（手机号、身份证、邮箱等）</Text></div>
                    <div>🌤️ <Text type="secondary">中度：个人隐私 + 金融信息（银行卡、开户行等）</Text></div>
                    <div>🔒 <Text type="secondary">重度：全部类型，含设备/网络、商业/政务类</Text></div>
                  </div>
                </Panel>
              </Collapse>
            </Card>

            {/* 预览对比 */}
            <div className="col-span-2">
              <div className="flex-between mb-2">
                <Text strong style={{ fontSize: 15 }}>预览对比</Text>
                {currentFile && (
                  <Space size="middle">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      📄 {currentFile.name} · 检测到 <Text strong style={{ color: '#FF4D4F' }}>{currentFile.maskedCount}</Text> 处敏感数据
                    </Text>
                    {currentFile.duration && (
                      <Text type="secondary" style={{ fontSize: 12 }}>⏱ {currentFile.duration.toFixed(3)}s</Text>
                    )}
                  </Space>
                )}
              </div>

              {!currentFile ? (
                <Card
                  variant="borderless"
                  style={{
                    backgroundColor: 'white', borderRadius: 12,
                    border: '1px dashed #e5e7eb',
                  }}
                  styles={{ body: { padding: '40px 24px', textAlign: 'center' } }}
                >
                  <FileTextOutlined style={{ fontSize: 40, color: '#d1d5db', marginBottom: 12 }} />
                  <br />
                  <Text type="secondary">请选择或拖入文件，预览结果将显示在这里</Text>
                </Card>
              ) : (
                <div className="preview-container">
                  <Card
                    variant="borderless"
                    className="preview-panel original"
                    style={{ borderRadius: 12 }}
                    styles={{ body: { padding: 0 } }}
                  >
                    <div style={{ padding: 14 }}>
                      <div className="preview-label" style={{ color: '#FF4D4F' }}>
                        🔴 原始内容
                      </div>
                      <div className="preview-content">
                        {highlightOriginal(currentFile.originalContent, currentFile.maskedFields)}
                      </div>
                    </div>
                  </Card>

                  <Card
                    variant="borderless"
                    className="preview-panel masked"
                    style={{ borderRadius: 12 }}
                    styles={{ body: { padding: 0 } }}
                  >
                    <div style={{ padding: 14 }}>
                      <div className="preview-label" style={{ color: '#52C41A' }}>
                        🟢 脱敏结果
                      </div>
                      <div className="preview-content">
                        {highlightMasked(currentFile.maskedContent)}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* 操作按钮 */}
              {currentFile && (
                <div className="flex-center gap-3 mt-4">
                  <Button icon={<CopyOutlined />} onClick={handleCopyResult}>复制结果</Button>
                  <Button icon={<SaveOutlined />} onClick={handleSaveFile}>保存文件</Button>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={handleQuickMask}
                    loading={isProcessing}
                    disabled={!currentFile?.path}
                  >
                    重新脱敏
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 第三行：历史记录 */}
          {history.length > 0 && (
            <Card
              title={<><HistoryOutlined style={{ marginRight: 6 }} />处理历史</>}
              variant="borderless"
              extra={<Button type="text" size="small" icon={<DeleteOutlined />} onClick={handleClearHistory}>清空</Button>}
              style={{ backgroundColor: 'white', borderRadius: 12 }}
            >
              <Table
                size="small"
                pagination={{ pageSize: 5 }}
                columns={historyColumns}
                dataSource={history}
                rowKey="timestamp"
                onRow={record => ({
                  onClick: () => handleHistorySelect(record),
                  style: { cursor: 'pointer' },
                })}
              />
            </Card>
          )}

        </div>
      </main>

      {/* ── 底部状态栏 ── */}
      <footer className="status-bar">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${isProcessing ? 'processing' : ''}`} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isProcessing ? '处理中...' : '就绪'}
          </Text>
        </div>
        <Space size="large">
          <Text type="secondary" style={{ fontSize: 12 }}>已处理 {stats.totalFiles} 个文件</Text>
          {currentFile && (
            <>
              <Text type="secondary" style={{ fontSize: 12 }}>
                强度：{intensity === 'light' ? '🌱轻度' : intensity === 'medium' ? '🌤️中度' : '🔒重度'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                策略：{strategy === 'mask' ? '掩码' : strategy === 'hash' ? '哈希' : strategy === 'fake' ? '假数据' : '可逆'}
              </Text>
            </>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            规则库 v1.1 · 21 种敏感类型
          </Text>
        </Space>
      </footer>
    </div>
  );
};

export default App;
