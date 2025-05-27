/**
 * ストレージユーティリティ関数
 * ストレージ使用量の計算や管理機能を提供
 */

import { Snapshot, SavedOutline, OutlineItem } from './types';
import { getSettings, saveSettings } from './storage';

/**
 * ストレージ使用量情報の型定義
 */
export interface StorageUsageInfo {
  used: number;       // 使用量（バイト）
  quota: number;      // 割り当て容量（バイト）
  percent: number;    // 使用率（%）
  usedMB: number;     // 使用量（MB）
  quotaMB: number;    // 割り当て容量（MB）
  snapshotCount: number; // スナップショット数
  averageSize: number;   // 平均スナップショットサイズ（KB）
}

/**
 * ストレージ使用量を取得する
 * @returns ストレージ使用量情報
 */
export async function getStorageUsage(): Promise<StorageUsageInfo> {
  // Navigator Storage APIを使用して全体の使用量を取得
  let used = 0;
  let quota = 0;
  
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    used = estimate.usage || 0;
    quota = estimate.quota || 0;
  }
  
  // スナップショットの情報を取得
  const { snapshots } = await chrome.storage.local.get({ snapshots: [] }) as { snapshots: Snapshot[] };
  const snapshotCount = snapshots.length;
  
  // アウトラインの情報も取得（ストレージ使用量に含める）
  const { outlines } = await chrome.storage.local.get({ outlines: {} }) as { outlines: Record<string, SavedOutline> };
  const outlineCount = Object.keys(outlines).length;
  
  // スナップショットのサイズを計算
  let snapshotsTotalSize = 0;
  snapshots.forEach(snapshot => {
    if (snapshot.imageDataUrl) {
      // Base64データURLのサイズを計算（ヘッダーを除く）
      const base64Length = snapshot.imageDataUrl.split(',')[1]?.length || 0;
      // Base64は4文字で3バイトを表現するため、実際のバイト数に変換
      const imageSize = Math.floor(base64Length * 0.75);
      snapshotsTotalSize += imageSize;
    }
  });
  
  // スナップショットとアウトラインのサイズから計算（navigator.storage.estimate()の値は信頼しない）
  // アウトラインのサイズを計算
  let outlinesTotalSize = 0;
  Object.values(outlines).forEach(outline => {
    // JSONとしてシリアライズしてサイズを概算
    const outlineJson = JSON.stringify(outline);
    outlinesTotalSize += outlineJson.length * 2; // UTF-16文字として概算
  });
  
  // 設定データのサイズを概算（固定値）
  const settingsSize = 2048; // 2KB程度と仮定
  
  // 合計使用量を計算
  used = snapshotsTotalSize + outlinesTotalSize + settingsSize;
  
  // データがなくても最小値を設定（0.01MB）
  if (used < 10240) {
    used = 10240; // 最低10KB
  }
  
  // Chrome拡張のストレージ上限は通常5MBだが、unlimitedStorageパーミッションがあれば大きくなる
  // 仮のquota値を設定（実際の上限に合わせて調整可能）
  if (quota === 0) {
    quota = 5 * 1024 * 1024; // 5MB
  }
  
  // 平均サイズを計算（KB単位）
  const averageSize = snapshotCount > 0 
    ? Math.round(snapshotsTotalSize / snapshotCount / 1024) 
    : 0;
  
  // MB単位に変換
  const usedMB = Math.round(used / (1024 * 1024) * 10) / 10;
  const quotaMB = Math.round(quota / (1024 * 1024) * 10) / 10;
  
  return {
    used,
    quota,
    percent: quota > 0 ? Math.round((used / quota) * 100) : 0,
    usedMB,
    quotaMB,
    snapshotCount,
    averageSize
  };
}

/**
 * スナップショットを最適化する
 * @param snapshot 最適化するスナップショット
 * @param maxWidth 最大幅
 * @param quality 画質（0-1）
 * @returns 最適化されたスナップショット
 */
export async function optimizeSnapshot(
  snapshot: Snapshot, 
  maxWidth: number = 800, 
  quality: number = 0.8
): Promise<Snapshot> {
  if (!snapshot.imageDataUrl) {
    return snapshot;
  }
  
  try {
    const optimizedDataUrl = await compressImage(snapshot.imageDataUrl, maxWidth, quality);
    return {
      ...snapshot,
      imageDataUrl: optimizedDataUrl
    };
  } catch (error) {
    console.error('スナップショットの最適化に失敗しました:', error);
    return snapshot;
  }
}

/**
 * 画像を圧縮する
 * @param dataUrl 画像のデータURL
 * @param maxWidth 最大幅
 * @param quality 画質（0-1）
 * @returns 圧縮された画像のデータURL
 */
export function compressImage(
  dataUrl: string, 
  maxWidth: number = 800, 
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // WebP形式でエクスポート（サポートされていない場合はJPEGにフォールバック）
        const format = canvas.toDataURL('image/webp').startsWith('data:image/webp') 
          ? 'image/webp' 
          : 'image/jpeg';
        resolve(canvas.toDataURL(format, quality));
      } else {
        reject(new Error('Canvas context is not available'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * 全てのスナップショットを最適化する
 * @param maxWidth 最大幅
 * @param quality 画質（0-1）
 * @returns 最適化されたスナップショット数
 */
export async function optimizeAllSnapshots(
  maxWidth: number = 800, 
  quality: number = 0.8
): Promise<number> {
  const { snapshots } = await chrome.storage.local.get({ snapshots: [] }) as { snapshots: Snapshot[] };
  
  if (snapshots.length === 0) {
    return 0;
  }
  
  let optimizedCount = 0;
  const optimizedSnapshots = await Promise.all(
    snapshots.map(async (snapshot) => {
      if (snapshot.imageDataUrl) {
        const optimized = await optimizeSnapshot(snapshot, maxWidth, quality);
        if (optimized.imageDataUrl !== snapshot.imageDataUrl) {
          optimizedCount++;
        }
        return optimized;
      }
      return snapshot;
    })
  );
  
  await chrome.storage.local.set({ snapshots: optimizedSnapshots });
  return optimizedCount;
}

/**
 * ストレージ使用量が警告レベルを超えているかチェック
 * @param warningThresholdMB 警告しきい値（MB）
 * @returns 警告が必要かどうか
 */
export async function shouldShowStorageWarning(warningThresholdMB: number = 50): Promise<boolean> {
  const usage = await getStorageUsage();
  return usage.usedMB > warningThresholdMB;
}

/**
 * アウトラインを保存する
 * @param videoId 動画ID
 * @param videoTitle 動画タイトル
 * @param videoDuration 動画の長さ（秒）
 * @param items アウトラインアイテムの配列
 * @param hasTranscript トランスクリプト情報が取得できたかどうか
 * @returns 保存されたアウトライン
 */
export async function saveOutline(
  videoId: string,
  videoTitle: string,
  videoDuration: number,
  items: OutlineItem[],
  hasTranscript: boolean = false
): Promise<SavedOutline> {
  // 既存のアウトラインを取得
  const { outlines } = await chrome.storage.local.get({ outlines: {} }) as { outlines: Record<string, SavedOutline> };
  
  const now = Date.now();
  const existingOutline = outlines[videoId];
  
  // 新しいアウトラインを作成
  const newOutline: SavedOutline = {
    videoId,
    videoTitle,
    videoDuration,
    items,
    createdAt: existingOutline?.createdAt || now,
    updatedAt: now,
    hasTranscript
  };
  
  // アウトラインを保存
  outlines[videoId] = newOutline;
  await chrome.storage.local.set({ outlines });
  
  console.log(`Outline saved for video ${videoId} with ${items.length} items (hasTranscript: ${hasTranscript})`);
  return newOutline;
}

/**
 * 特定の動画のアウトラインを取得する
 * @param videoId 動画ID
 * @returns アウトライン（存在しない場合はundefined）
 */
export async function getOutline(videoId: string): Promise<SavedOutline | undefined> {
  const { outlines } = await chrome.storage.local.get({ outlines: {} }) as { outlines: Record<string, SavedOutline> };
  return outlines[videoId];
}

/**
 * すべてのアウトラインを取得する
 * @returns すべてのアウトライン
 */
export async function getAllOutlines(): Promise<Record<string, SavedOutline>> {
  const { outlines } = await chrome.storage.local.get({ outlines: {} }) as { outlines: Record<string, SavedOutline> };
  return outlines;
}

/**
 * 特定の動画のアウトラインを削除する
 * @param videoId 動画ID
 * @returns 成功したかどうか
 */
export async function deleteOutline(videoId: string): Promise<boolean> {
  const { outlines } = await chrome.storage.local.get({ outlines: {} }) as { outlines: Record<string, SavedOutline> };
  
  if (!outlines[videoId]) {
    return false;
  }
  
  delete outlines[videoId];
  await chrome.storage.local.set({ outlines });
  
  console.log(`Outline deleted for video ${videoId}`);
  return true;
}

/**
 * ストレージ内のすべてのデータを削除する
 * スナップショット、アウトライン、その他のデータを含む
 * @returns 成功したかどうか
 */
export async function clearAllData(): Promise<boolean> {
  try {
    // スナップショットを削除
    await chrome.storage.local.set({ snapshots: [] });
    
    // アウトラインを削除
    await chrome.storage.local.set({ outlines: {} });
    
    // 設定は残すが、その他のデータを削除
    // 設定を取得
    const settings = await getSettings();
    
    // ストレージをクリア
    await chrome.storage.local.clear();
    
    // 設定を復元
    await saveSettings(settings);
    
    console.log('All data cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
}

/**
 * すべてのアウトラインを削除する
 */
export async function deleteAllOutlines(): Promise<void> {
  await chrome.storage.local.set({ outlines: {} });
  console.log('All outlines deleted');
}
