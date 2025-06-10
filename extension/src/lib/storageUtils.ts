/**
 * ストレージユーティリティ関数
 * ストレージ使用量の計算や管理機能を提供
 */

import { Snapshot, SavedOutline, OutlineItem } from './types';
import { getSettings, saveSettings } from './storage';

/**
 * URLから動画IDを抽出する関数
 * @param url YouTube動画のURL
 * @returns 動画ID、抽出できない場合はnull
 */
export function getVideoIdFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|\/embed\/|\/v\/|\/e\/|youtube\.com\/shorts\/|youtu\.be\/)([^#\&\?\n]*)/); 
  return match ? match[1] : null;
}

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
 * 特定の動画IDに関連するスナップショットを取得する
 * @param videoId 動画ID
 * @returns 特定の動画IDに関連するスナップショットの配列
 */
export async function getSnapshotsByVideoId(videoId: string): Promise<Snapshot[]> {
  const { snapshots } = await chrome.storage.local.get({ snapshots: [] }) as { snapshots: Snapshot[] };
  return snapshots.filter(snapshot => {
    // videoIdプロパティが一致する場合
    if (snapshot.videoId === videoId) return true;
    
    // スナップショットのURLから抽出した動画IDが一致する場合
    const snapVideoId = getVideoIdFromUrl(snapshot.videoUrl);
    return snapVideoId === videoId;
  });
}

/**
 * 特定の動画IDに関連するスナップショットを削除する
 * @param videoId 動画ID
 * @returns 削除されたスナップショットの数
 */
export async function deleteSnapshotsByVideoId(videoId: string): Promise<number> {
  // 現在のスナップショットを取得
  const { snapshots } = await chrome.storage.local.get({ snapshots: [] }) as { snapshots: Snapshot[] };
  
  // 削除前のスナップショット数
  const initialCount = snapshots.length;
  
  // 指定された動画ID以外のスナップショットだけを残す
  const filteredSnapshots = snapshots.filter(snapshot => {
    // videoIdプロパティが一致しない場合は残す
    if (snapshot.videoId === videoId) return false;
    
    // スナップショットのURLから抽出した動画IDが一致しない場合は残す
    const snapVideoId = getVideoIdFromUrl(snapshot.videoUrl);
    return snapVideoId !== videoId;
  });
  
  // 更新されたスナップショットを保存
  await chrome.storage.local.set({ snapshots: filteredSnapshots });
  
  // 削除されたスナップショット数を返す
  const deletedCount = initialCount - filteredSnapshots.length;
  console.log(`Deleted ${deletedCount} snapshots for video ${videoId}`);
  return deletedCount;
}

/**
 * 特定の動画IDに関連するすべてのデータ（スナップショットとアウトライン）を削除する
 * @param videoId 動画ID
 * @returns 削除操作の結果（削除されたスナップショット数とアウトライン削除の成否）
 */
export async function deleteVideoData(videoId: string): Promise<{ snapshotsDeleted: number; outlineDeleted: boolean }> {
  console.log(`Deleting all data for video ID: ${videoId}`);
  
  return new Promise((resolve, reject) => {
    try {
      // 現在の動画ID以外のスナップショットを保持
      chrome.storage.local.get({ snapshots: [] }, async ({ snapshots }: { snapshots: Snapshot[] }) => {
        // 削除前のスナップショット数
        const initialCount = snapshots.length;
        
        // 指定された動画ID以外のスナップショットだけを残す
        const filteredSnapshots = snapshots.filter(snapshot => {
          // videoIdプロパティが一致しない場合は残す
          if (snapshot.videoId === videoId) return false;
          
          // スナップショットのURLから抽出した動画IDが一致しない場合は残す
          const snapVideoId = getVideoIdFromUrl(snapshot.videoUrl);
          return snapVideoId !== videoId;
        });
        
        // 削除されたスナップショット数
        const snapshotsDeleted = initialCount - filteredSnapshots.length;
        console.log(`Found ${snapshotsDeleted} snapshots to delete for video ${videoId}`);
        
        // フィルタリングされたスナップショットを保存
        chrome.storage.local.set({ snapshots: filteredSnapshots }, async () => {
          console.log(`Snapshots for video ID ${videoId} cleared. Kept ${filteredSnapshots.length} snapshots for other videos.`);
          
          // アウトラインを削除
          const outlineDeleted = await deleteOutline(videoId);
          
          // 結果を返す
          resolve({ snapshotsDeleted, outlineDeleted });
        });
      });
    } catch (error) {
      console.error(`Error deleting data for video ${videoId}:`, error);
      reject(error);
    }
  });
}

/**
 * すべての動画データの概要を取得する
 * 各動画IDごとに、タイトル、スナップショット数、アウトラインの有無などの情報を含む
 * @returns 動画データ概要の配列
 */
export async function getVideoDataSummary(): Promise<Array<{
  videoId: string;
  videoTitle: string;
  snapshotCount: number;
  hasOutline: boolean;
  outlineItemCount: number;
  lastUpdated: number;
}>> {
  // スナップショットとアウトラインを取得
  const { snapshots } = await chrome.storage.local.get({ snapshots: [] }) as { snapshots: Snapshot[] };
  const outlines = await getAllOutlines();
  
  // 動画IDごとのスナップショット数をカウント
  const snapshotCountByVideoId: Record<string, number> = {};
  
  // 各スナップショットをカウント
  snapshots.forEach(snapshot => {
    // スナップショットのプロパティから動画IDを取得
    let id: string | null = snapshot.videoId;
    
    // 動画IDがない場合は、URLから抽出する
    if (!id && snapshot.videoUrl) {
      id = getVideoIdFromUrl(snapshot.videoUrl);
    }
    
    // 動画IDが取得できた場合はカウント
    if (id) {
      snapshotCountByVideoId[id] = (snapshotCountByVideoId[id] || 0) + 1;
    }
  });
  
  console.log('Snapshot counts by videoId:', snapshotCountByVideoId);
  
  // 動画IDの完全なセットを作成（スナップショットとアウトラインの両方から）
  const allVideoIds = new Set<string>([...Object.keys(snapshotCountByVideoId), ...Object.keys(outlines)]);
  
  // 各動画IDに対して概要情報を作成
  const summary = Array.from(allVideoIds).map(videoId => {
    const outline = outlines[videoId];
    return {
      videoId,
      videoTitle: outline?.videoTitle || videoId, // アウトラインがない場合はIDを表示
      snapshotCount: snapshotCountByVideoId[videoId] || 0,
      hasOutline: !!outline,
      outlineItemCount: outline?.items?.length || 0,
      lastUpdated: outline?.updatedAt || 0
    };
  });
  
  // 最終更新日時で降順ソート
  return summary.sort((a, b) => b.lastUpdated - a.lastUpdated);
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
