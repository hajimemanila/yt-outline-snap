// 型定義

// アウトラインアイテムの型
export interface OutlineItem {
  timestamp: number;  // 秒単位
  title: string;
  description: string;
  code?: string;
}

// 保存されたアウトラインの型
export interface SavedOutline {
  videoId: string;       // 動画ID
  videoTitle: string;    // 動画タイトル
  videoDuration: number; // 動画の長さ（秒）
  createdAt: number;     // 作成日時のUNIXタイムスタンプ（ミリ秒）
  updatedAt: number;     // 更新日時のUNIXタイムスタンプ（ミリ秒）
  items: OutlineItem[];  // アウトラインアイテムの配列
  hasTranscript: boolean; // トランスクリプト情報が取得できたかどうか
}

// プレイヤー状態の型
export interface PlayerState {
  isDRM: boolean;
  isAd: boolean;
  isReady: boolean;
}

// 設定の型
export interface Settings {
  apiKey: string;
  modelName: string;
  maxResolution: number;
  language: 'en' | 'ja' | 'zh-CN' | 'ko';
  // ストレージ設定を追加
  autoOptimize: boolean;       // スナップショットの自動最適化
  maxSnapshotCount: number;    // 最大スナップショット数
  warningThresholdMB: number;  // 警告表示するしきい値（MB）
  optimizeQuality: number;     // 最適化時の画質（0-1）
  optimizeMaxWidth: number;    // 最適化時の最大幅（px）
  // ベータ機能フラグ
  ENABLE_OUTLINE_EDIT: boolean; // アウトライン編集機能を有効にする
  ENABLE_AD_PAUSE: boolean; // 広告表示中のスナップショット取得を一時停止する
  EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT: boolean; // アウトライン生成時のプロンプトに動画URLを含めない
}

// Gemini APIリクエストの型
export interface GeminiRequest {
  videoUrl: string;
  language: string;
  frameSamples?: string[];
}

// Gemini APIレスポンスの型
export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// スナップショットの型
export interface Snapshot {
  title: string;           // 動画のタイトル
  time: number;            // 動画内の時間（秒）
  timestamp: number;       // 作成日時のUNIXタイムスタンプ（ミリ秒）
  videoUrl: string;        // 動画のURL
  videoId: string;         // 動画ID
  imageDataUrl?: string;   // 画像データのDataURL（オプション）
  description: string;     // ユーザーが編集可能な説明文
}

// ストレージ使用量情報の型
export interface StorageUsageInfo {
  used: number;            // 使用量（バイト）
  quota: number;           // 割り当て容量（バイト）
  percent: number;         // 使用率（%）
  usedMB: number;          // 使用量（MB）
  quotaMB: number;         // 割り当て容量（MB）
  snapshotCount: number;   // スナップショット数
  averageSize: number;     // 平均スナップショットサイズ（KB）
}

// スナップショット状態の型
export type SnapshotStatus = 'idle' | 'processing' | 'complete' | 'error';

// アプリケーション状態の型
export type AppStatus = 'initializing' | 'ready' | 'generating' | 'capturing' | 'error';
