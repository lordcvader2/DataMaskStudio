/**
 * DataMaskStudio - 渲染进程类型声明 v1.1.0
 */
export {};

type MaskIntensity = 'light' | 'medium' | 'heavy';
type MaskStrategy = 'mask' | 'hash' | 'fake' | 'reversible';

interface MatchDetail {
  ruleId: string;
  ruleName: string;
  category: string;
  original: string;
  replacement: string;
}

interface MaskFileResult {
  success: boolean;
  originalContent?: string;
  maskedContent?: string;
  maskedFields?: string[];
  matchDetails?: MatchDetail[];
  stats?: {
    byCategory: Record<string, number>;
    byRule: Record<string, number>;
  };
  duration?: number;
  error?: string;
}

interface MaskBufferResult extends MaskFileResult {}

interface EncryptResult { success: boolean; encrypted?: string; error?: string; }
interface DecryptResult { success: boolean; decrypted?: string; error?: string; }
interface SaveFileResult { success: boolean; filePath?: string; error?: string; }
interface OpenFileDialogResult { success: boolean; filePaths?: string[]; error?: string; }

interface ElectronAPI {
  maskFile(params: { filePath: string; intensity: MaskIntensity; strategy: MaskStrategy; hashAlgorithm?: 'md5' | 'sha256' }): Promise<MaskFileResult>;
  maskBuffer(params: { fileName: string; bufferBase64: string; intensity: MaskIntensity; strategy: MaskStrategy; hashAlgorithm?: 'md5' | 'sha256' }): Promise<MaskBufferResult>;
  encryptContent(params: { content: string; password?: string }): Promise<EncryptResult>;
  decryptContent(params: { cipherText: string; password?: string }): Promise<DecryptResult>;
  getFileContent(params: { filePath: string }): Promise<{ success: boolean; content?: string; error?: string }>;
  saveFile(params: { filePath: string; content: string }): Promise<SaveFileResult>;
  openFileDialog(params?: { filters?: Array<{ name: string; extensions: string[] }> }): Promise<OpenFileDialogResult>;
}

declare global { interface Window { electronAPI: ElectronAPI; } }
