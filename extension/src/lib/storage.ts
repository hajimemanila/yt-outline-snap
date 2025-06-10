// ストレージ関連の機能

import { Settings } from './types';

// デフォルト設定
const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  modelName: 'gemini-2.5-pro',
  maxResolution: 1080,
  language: 'ja',
  // ストレージ設定のデフォルト値
  autoOptimize: true,
  maxSnapshotCount: 100,
  warningThresholdMB: 50,
  optimizeQuality: 0.8,
  optimizeMaxWidth: 800,
  // ベータ機能フラグ
  ENABLE_OUTLINE_EDIT: true,
  ENABLE_AD_PAUSE: true,
  EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT: false
};

/**
 * 設定を保存する
 */
export const saveSettings = async (settings: Partial<Settings>): Promise<void> => {
  const currentSettings = await getSettings();
  await chrome.storage.sync.set({
    ...currentSettings,
    ...settings
  });
};

/**
 * 設定を取得する
 */
export const getSettings = async (): Promise<Settings> => {
  const result = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  return {
    ...DEFAULT_SETTINGS,
    ...result
  } as Settings;
};

/**
 * APIキーが設定されているかチェックする
 */
export const hasApiKey = async (): Promise<boolean> => {
  const settings = await getSettings();
  return !!settings.apiKey && settings.apiKey.trim() !== '';
};

/**
 * 言語設定を取得する
 */
export const getLanguage = async (): Promise<'en' | 'ja'> => {
  const settings = await getSettings();
  return settings.language;
};

/**
 * 言語設定を検出する（YouTubeページから）
 */
export const detectLanguage = (): 'en' | 'ja' => {
  const htmlLang = document.documentElement.lang;
  return htmlLang.startsWith('ja') ? 'ja' : 'en';
};

/**
 * 最大解像度設定を取得する
 */
export const getMaxResolution = async (): Promise<number> => {
  const settings = await getSettings();
  return settings.maxResolution;
};

/**
 * ストレージ設定を取得する
 */
export const getStorageSettings = async (): Promise<{
  autoOptimize: boolean;
  maxSnapshotCount: number;
  warningThresholdMB: number;
  optimizeQuality: number;
  optimizeMaxWidth: number;
}> => {
  const settings = await getSettings();
  return {
    autoOptimize: settings.autoOptimize,
    maxSnapshotCount: settings.maxSnapshotCount,
    warningThresholdMB: settings.warningThresholdMB,
    optimizeQuality: settings.optimizeQuality,
    optimizeMaxWidth: settings.optimizeMaxWidth
  };
};
