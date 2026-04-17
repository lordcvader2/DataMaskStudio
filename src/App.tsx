import { ConfigProvider, theme } from 'antd';
/**
 * DataMaskStudio - 主应用组件
 * 数据脱敏工具的 React 前端界面
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Button,
  Radio,
  Card,
  Alert,
  Typography,
  Tooltip,
  Space,
  Progress,
  Divider,
  message,
} from 'antd';
import {
  SafetyCertificateOutlined,
  SettingOutlined,
  HistoryOutlined,
  BulbOutlined,
  CopyOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/** 脱敏强度选项 */
type MaskIntensity = 'light' | 'medium' | 'heavy';

/** 脱敏策略选项 */
type MaskStrategy = 'mask' | 'hash' | 'fake' | 'reversible';

/** 文件处理状态 */
interface FileState {
  name: string;
  path: string;
  originalContent: string;
  maskedContent: string;
  maskedFields: string[];
  maskedCount: number;
}

/** 状态栏信息 */
interface StatusInfo {
  processedCount: number;
  totalDuration: number;
  isProcessing: boolean;
}

/**
 * App 主组件
 */
const App: React.FC = () => {
  // ==================== 状态管理 ====================

  /** 脱敏强度状态（默认重度） */
  const [intensity, setIntensity] = useState<MaskIntensity>('heavy');

  /** 脱敏策略状态（默认可逆） */
  const [strategy, setStrategy] = useState<MaskStrategy>('reversible');

  /** 当前处理的文件 */
  const [currentFile, setCurrentFile] = useState<FileState | null>(null);

  /** 状态栏信息 */
  const [status, setStatus] = useState<StatusInfo>({
    processedCount: 0,
    totalDuration: 0,
    isProcessing: false,
  });

  /** 拖拽状态 */
  const [_isDragOver, setIsDragOver] = useState<boolean>(false);

  /** 深色模式 */
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);


  // Apply/remove dark class on html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  /** 消息提示实例引用 */
  const [messageApi, contextHolder] = message.useMessage();

  /** 拖拽区域 ref */
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ==================== 事件处理 ====================

  /**
   * 打开文件选择对话框
   */
  const handleOpenFileDialog = useCallback(async () => {
    if (!window.electronAPI) {
      messageApi.error('Electron API 不可用，请确保在 Electron 环境中运行');
      return;
    }

    try {
      const result = await window.electronAPI.openFileDialog();
      if (result.success && result.filePaths && result.filePaths.length > 0) {
        await handleFile(result.filePaths[0]);
      }
    } catch (error) {
      messageApi.error('打开文件对话框失败');
      console.error('打开文件对话框失败:', error);
    }
  }, [messageApi]);

  /**
   * 处理文件（读取并脱敏）
   */
  const handleFile = useCallback(
    async (filePath: string) => {
      if (!window.electronAPI) {
        messageApi.error('Electron API 不可用');
        return;
      }

      setStatus((prev) => ({ ...prev, isProcessing: true }));

      try {
        const result = await window.electronAPI.maskFile({
          filePath,
          intensity,
          strategy,
        });

        if (result.success) {
          const fileName = filePath.split(/[/\\]/).pop() || '未知文件';
          setCurrentFile({
            name: fileName,
            path: filePath,
            originalContent: result.originalContent || '',
            maskedContent: result.maskedContent || '',
            maskedFields: result.maskedFields || [],
            maskedCount: result.maskedFields?.length || 0,
          });

          setStatus((prev) => ({
            processedCount: prev.processedCount + 1,
            totalDuration: prev.totalDuration + (result.duration || 0),
            isProcessing: false,
          }));

          messageApi.success(`脱敏完成！发现 ${result.maskedFields?.length ?? 0} 处敏感数据`);
        } else {
          messageApi.error(`脱敏失败: ${result.error}`);
          setStatus((prev) => ({ ...prev, isProcessing: false }));
        }
      } catch (error) {
        messageApi.error('处理文件时发生错误');
        console.error('处理文件失败:', error);
        setStatus((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [intensity, strategy, messageApi]
  );

  /**
   * 一键脱敏按钮处理
   */
  const handleQuickMask = useCallback(() => {
    if (!currentFile) {
      messageApi.warning('请先选择文件');
      return;
    }
    handleFile(currentFile.path);
  }, [currentFile, handleFile, messageApi]);

  /**
   * 复制脱敏结果
   */
  const handleCopyResult = useCallback(() => {
    if (!currentFile) {
      messageApi.warning('没有可复制的内容');
      return;
    }

    navigator.clipboard
      .writeText(currentFile.maskedContent)
      .then(() => {
        messageApi.success('脱敏结果已复制到剪贴板');
      })
      .catch(() => {
        messageApi.error('复制失败');
      });
  }, [currentFile, messageApi]);

  /**
   * 保存脱敏后文件
   */
  const handleSaveFile = useCallback(async () => {
    if (!currentFile || !window.electronAPI) {
      messageApi.warning('没有可保存的内容');
      return;
    }

    try {
      const result = await window.electronAPI.openFileDialog({
        filters: [
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result.success && result.filePaths && result.filePaths.length > 0) {
        const saveResult = await window.electronAPI.saveFile({
          filePath: result.filePaths[0],
          content: currentFile.maskedContent,
        });

        if (saveResult.success) {
          messageApi.success('文件保存成功');
        } else {
          messageApi.error(`保存失败: ${saveResult.error || '未知错误'}`);
        }
      }
    } catch (error) {
      messageApi.error('保存文件时发生错误');
      console.error('保存文件失败:', error);
    }
  }, [currentFile, messageApi]);

  // ==================== 拖拽处理 ====================

  /**
   * 拖拽进入事件
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  /**
   * 拖拽离开事件
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  /**
   * 拖拽放置事件
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        handleDroppedFile(file);
      }
    },
    [messageApi]
  );

  /**
   * 处理拖拽文件（通过 FileReader 读取，再通过 IPC 传给 main 进程）
   */
  const handleDroppedFile = useCallback(
    async (file: File) => {
      if (!window.electronAPI) {
        messageApi.error('Electron API 不可用，请确保在 Electron 环境中运行');
        return;
      }

      setStatus((prev) => ({ ...prev, isProcessing: true }));

      try {
        // 用 FileReader 读取文件为 ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        // 转为 base64 字符串传给 main 进程
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const bufferBase64 = btoa(binary);

        const result = await window.electronAPI.maskBuffer({
          fileName: file.name,
          bufferBase64,
          intensity,
          strategy,
        });

        if (result.success) {
          setCurrentFile({
            name: file.name,
            path: '',
            originalContent: result.originalContent || '',
            maskedContent: result.maskedContent || '',
            maskedFields: result.maskedFields || [],
            maskedCount: result.maskedFields?.length || 0,
          });

          setStatus((prev) => ({
            processedCount: prev.processedCount + 1,
            totalDuration: prev.totalDuration + (result.duration || 0),
            isProcessing: false,
          }));

          messageApi.success(`脱敏完成！发现 ${result.maskedFields?.length ?? 0} 处敏感数据`);
        } else {
          messageApi.error(`脱敏失败: ${result.error}`);
          setStatus((prev) => ({ ...prev, isProcessing: false }));
        }
      } catch (error) {
        messageApi.error('处理拖拽文件时发生错误');
        console.error('处理拖拽文件失败:', error);
        setStatus((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [intensity, strategy, messageApi]
  );

  // ==================== 渲染 ====================

  /**
   * 高亮敏感字段
   * @param text 原始文本
   * @param maskedFields 脱敏后的字段列表
   * @returns 高亮处理后的 React 节点
   */
  const highlightOriginal = (text: string, maskedFields: string[]): React.ReactNode => {
    if (!maskedFields.length || !text) {
      return text;
    }

    // 对原始文本进行敏感字段高亮
    let result = text;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // 按敏感字段在文本中的位置排序
    const positions: Array<{ value: string; index: number }> = [];
    for (const field of maskedFields) {
      const index = result.indexOf(field);
      if (index !== -1) {
        positions.push({ value: field, index });
      }
    }
    positions.sort((a, b) => a.index - b.index);

    // 构建高亮片段
    for (const { value, index } of positions) {
      if (index >= lastIndex) {
        if (index > lastIndex) {
          parts.push(result.substring(lastIndex, index));
        }
        parts.push(
          <span key={index} className='sensitive-highlight'>
            {value}
          </span>
        );
        lastIndex = index + value.length;
      }
    }

    if (lastIndex < result.length) {
      parts.push(result.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  /**
   * 高亮脱敏后的敏感内容
   */
  const highlightMasked = (text: string): React.ReactNode => {
    // 脱敏后的敏感字段通常是 * 或其他掩码字符
    const maskPattern = /\*+/g;
    const parts = text.split(maskPattern);
    const masks = text.match(maskPattern) || [];

    const result: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      result.push(parts[i]);
      if (i < masks.length) {
        result.push(
          <span key={`mask-${i}`} className='safe-highlight dark:bg-[#2D4A22] dark:text-[#95DE64]'>
            {masks[i]}
          </span>
        );
      }
    }

    return result;
  };

  return (
    <ConfigProvider theme={isDarkMode ? { algorithm: theme.darkAlgorithm } : {}}>
    <div className='min-h-screen flex flex-col dark:bg-[#1A1B1E]'>
      {contextHolder}

      {/* ==================== 顶部导航栏 ==================== */}
      <header className='bg-[var(--color-bg-card)] border-b border-[var(--color-border)] px-6 py-4 flex-between shadow-sm'>
        <div className='flex items-center gap-3'>
          <SafetyCertificateOutlined style={{ fontSize: 28, color: '#1890FF' }} />
          <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            DataMask Studio
          </Title>
        </div>

        <Space>
          <Tooltip title='应用设置'>
            <Button type='text' icon={<SettingOutlined />}>
              设置
            </Button>
          </Tooltip>
          <Tooltip title='历史记录'>
            <Button type='text' icon={<HistoryOutlined />}>
              历史
            </Button>
          </Tooltip>
          <Tooltip title={isDarkMode ? '切换浅色模式' : '切换深色模式'}>
            <Button
              type='text'
              icon={<BulbOutlined />}
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? '浅色' : '深色'}
            </Button>
          </Tooltip>
        </Space>
      </header>

      {/* ==================== 主内容区域 ==================== */}
      <main className='flex-1 p-6 bg-[var(--color-bg-base)]'>
        <div className='max-w-5xl mx-auto space-y-6 dark:text-gray-200'>
          {/* 文件拖拽区域 */}
          <Card
            title={null}
            variant='borderless'
            style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: 12 }}
            styles={{ body: { padding: 0 } }}
          >
            <div
              ref={dropZoneRef}
              className='drop-zone'
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleOpenFileDialog}
              style={{ margin: 16, borderRadius: 12 }}
            >
              <div className='drop-zone-icon'>
                <UploadOutlined />
              </div>
              <Paragraph className='drop-zone-text'>
                拖拽文件到此处，或点击选择文件
              </Paragraph>
              <Paragraph className='drop-zone-hint'>
                支持 TXT / CSV / JSON / XML / Excel / Word
              </Paragraph>
            </div>
          </Card>

          {/* 脱敏选项 */}
          <Card
            title='脱敏配置'
            variant='borderless'
            style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: 12 }}
          >
            <div className='flex gap-12 flex-wrap'>
              {/* 脱敏强度 */}
              <div className='flex-1 min-w-48'>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  脱敏强度
                </Text>
                <Radio.Group
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value)}
                  optionType='button'
                  buttonStyle='solid'
                >
                  <Radio.Button value='light'>轻度</Radio.Button>
                  <Radio.Button value='medium'>中度</Radio.Button>
                  <Radio.Button value='heavy'>重度</Radio.Button>
                </Radio.Group>
              </div>

              {/* 脱敏策略 */}
              <div className='flex-1 min-w-48'>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  脱敏策略
                </Text>
                <Radio.Group
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  optionType='button'
                  buttonStyle='solid'
                >
                  <Radio.Button value='mask'>掩码替换</Radio.Button>
                  <Radio.Button value='hash'>哈希</Radio.Button>
                  <Radio.Button value='fake'>假数据</Radio.Button>
                  <Radio.Button value='reversible'>可逆</Radio.Button>
                </Radio.Group>
              </div>
            </div>

            {/* 策略说明提示 */}
            <Alert
              message={
                strategy === 'mask'
                  ? '掩码替换：用 * 字符部分或全部替换敏感内容'
                  : strategy === 'hash'
                  ? '哈希：对敏感数据进行不可逆的哈希处理'
                  : strategy === 'fake'
                  ? '假数据：用随机生成的假数据替换真实敏感信息'
                  : '可逆脱敏：用可逆算法处理，后续可还原（需妥善保管密钥）'
              }
              type='info'
              showIcon
              style={{ marginTop: 16 }}
            />
          </Card>

          {/* 预览对比区域 */}
          <div>
            <div className='flex-between mb-3'>
              <Text strong style={{ fontSize: 16 }}>
                预览对比
              </Text>
              {currentFile && (
                <Text type='secondary'>
                  文件：{currentFile.name} | 检测到 {currentFile.maskedCount} 处敏感数据
                </Text>
              )}
            </div>

            {!currentFile ? (
              <Card
                variant='borderless'
                style={{
                  backgroundColor: 'var(--color-bg-base)',
                  borderRadius: 12,
                  border: '1px dashed var(--color-border)',
                }}
                styles={{ body: { padding: '48px 24px', textAlign: 'center' } }}
              >
                <Text type='secondary'>
                  请先选择文件进行脱敏处理，预览结果将显示在这里
                </Text>
              </Card>
            ) : (
              <div className='preview-container'>
                {/* 原始内容 */}
                <Card
                  variant='borderless'
                  className='preview-panel original'
                  style={{ borderRadius: 12 }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div style={{ padding: 16 }}>
                    <div className='preview-label' style={{ color: 'var(--color-danger)' }}>
                      <span style={{ marginRight: 6 }}>🔴</span> 原始内容
                    </div>
                    <div className='preview-content'>
                      {highlightOriginal(currentFile.originalContent, currentFile.maskedFields)}
                    </div>
                  </div>
                </Card>

                {/* 脱敏结果 */}
                <Card
                  variant='borderless'
                  className='preview-panel masked'
                  style={{ borderRadius: 12 }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div style={{ padding: 16 }}>
                    <div className='preview-label' style={{ color: 'var(--color-safe)' }}>
                      <span style={{ marginRight: 6 }}>🟢</span> 脱敏结果
                    </div>
                    <div className='preview-content'>
                      {highlightMasked(currentFile.maskedContent)}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          <Divider className='section-divider' />

          {/* 操作按钮区域 */}
          <div className='flex-center gap-4'>
            <Button
              size='large'
              icon={<CopyOutlined />}
              onClick={handleCopyResult}
              disabled={!currentFile}
            >
              复制结果
            </Button>
            <Button
              size='large'
              icon={<SaveOutlined />}
              onClick={handleSaveFile}
              disabled={!currentFile}
            >
              保存文件
            </Button>
            <Button
              type='primary'
              size='large'
              icon={<ThunderboltOutlined />}
              onClick={handleQuickMask}
              disabled={!currentFile || status.isProcessing}
              loading={status.isProcessing}
            >
              一键脱敏
            </Button>
          </div>

          {/* 处理进度 */}
          {status.isProcessing && (
            <div className='flex-center mt-4'>
              <Progress
                percent={99}
                status='active'
                size='small'
                strokeColor='#1890FF'
              />
            </div>
          )}
        </div>
      </main>

      {/* ==================== 底部状态栏 ==================== */}
      <footer className='status-bar'>
        <div className='status-bar-item'>
          <span className='status-dot' />
          <Text type='secondary' style={{ fontSize: 13 }}>
            {status.isProcessing ? '处理中...' : '就绪'}
          </Text>
        </div>

        <Space size='large'>
          <Text type='secondary' style={{ fontSize: 13 }}>
            已处理 {status.processedCount} 个文件
          </Text>
          {status.totalDuration > 0 && (
            <Text type='secondary' style={{ fontSize: 13 }}>
              总耗时 {status.totalDuration.toFixed(2)}s
            </Text>
          )}
          {currentFile && (
            <>
              <Text type='secondary' style={{ fontSize: 13 }}>
                检测到 {currentFile.maskedCount} 处敏感数据
              </Text>
              <Text type='secondary' style={{ fontSize: 13 }}>
                强度：{intensity === 'light' ? '轻度' : intensity === 'medium' ? '中度' : '重度'}
              </Text>
              <Text type='secondary' style={{ fontSize: 13 }}>
                策略：
                {strategy === 'mask' ? '掩码替换' : strategy === 'hash' ? '哈希' : strategy === 'fake' ? '假数据' : '可逆'}
              </Text>
            </>
          )}
        </Space>
      </footer>
    </div>
    </ConfigProvider>
  );
};

export default App;
App;
