/**
 * プロンプトテンプレートの型定義
 */

// テンプレートの種類
export type TemplateType = 'outline' | 'snapshotDescription';

// 言語コード
export type LanguageCode = 'en' | 'ja' | 'zh-CN' | 'ko';

// テンプレート構造
export interface Templates {
  [lang: string]: {
    [type in TemplateType]?: string;
  };
}

// カスタムテンプレート構造（ストレージ用）
export interface CustomTemplates {
  __version?: string;
  outline?: {
    [lang in LanguageCode]?: string;
  };
  snapshotDescription?: {
    [lang in LanguageCode]?: string;
  };
}
