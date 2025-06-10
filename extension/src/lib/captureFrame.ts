// スナップショット取得ロジック

import { getMaxResolution } from './storage';

/**
 * 現在のフレームをキャプチャする
 * @param ts タイムスタンプ（秒）
 * @returns Blob形式の画像データ
 */
export const captureFrame = async (ts?: number): Promise<Blob> => {
  const video = document.querySelector('video');
  if (!video) throw new Error('video not found');
  
  // クロスオリジン設定
  video.crossOrigin = 'anonymous';
  
  // タイムスタンプ指定があれば移動
  if (ts != null) {
    const currentTime = video.currentTime;
    video.pause();
    video.currentTime = ts;
    
    // seeked イベントを待つ
    await new Promise<void>((resolve) => {
      const seeked = () => {
        video.removeEventListener('seeked', seeked);
        resolve();
      };
      video.addEventListener('seeked', seeked);
      
      // タイムアウト設定（5秒）
      setTimeout(() => {
        video.removeEventListener('seeked', seeked);
        resolve();
      }, 5000);
    });
  }
  
  // フレーム描画待ち
  await new Promise<void>(r => video.requestVideoFrameCallback(() => r()));
  
  // 解像度制限の適用
  const maxResolution = await getMaxResolution();
  const targetWidth = Math.min(video.videoWidth, maxResolution);
  const targetHeight = Math.min(video.videoHeight, maxResolution);
  const scale = Math.min(1, targetWidth / video.videoWidth);
  
  // WebCodecs対応チェック
  if ('MediaStreamTrackProcessor' in window) {
    try {
      return await captureWithWebCodecs(video, scale);
    } catch (error) {
      console.error('WebCodecs capture failed:', error);
      // フォールバック
      return await captureWithCanvas(video, scale);
    }
  } else {
    // フォールバック: Canvas
    return await captureWithCanvas(video, scale);
  }
};

/**
 * WebCodecsによるキャプチャ
 */
const captureWithWebCodecs = async (video: HTMLVideoElement, scale: number): Promise<Blob> => {
  // この実装はブラウザ環境に依存するため、実際の環境で動作確認が必要
  // 以下は概念的な実装
  
  // @ts-ignore - WebCodecs APIの型定義がない場合
  const stream = video.captureStream();
  const tracks = stream.getVideoTracks();
  if (!tracks.length) {
    throw new Error('No video track available');
  }
  
  // @ts-ignore - MediaStreamTrackProcessor APIの型定義がない場合
  const processor = new MediaStreamTrackProcessor({ track: tracks[0] });
  const reader = processor.readable.getReader();
  
  try {
    const { value: frame } = await reader.read();
    if (!frame) {
      throw new Error('Failed to read video frame');
    }
    
    // フレームをBitmapに変換
    const bitmap = await createImageBitmap(frame);
    frame.close(); // フレームを解放
    
    // スケーリングとBlobへの変換
    const canvas = new OffscreenCanvas(bitmap.width * scale, bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close(); // ビットマップを解放
    
    // Blobに変換
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return blob;
  } finally {
    reader.releaseLock();
    // ストリームとトラックのクリーンアップ
    tracks.forEach(track => track.stop());
  }
};

/**
 * Canvasによるキャプチャ
 */
const captureWithCanvas = async (video: HTMLVideoElement, scale: number): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth * scale;
  canvas.height = video.videoHeight * scale;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  // 描画
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Blobに変換
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
      
      // メモリ解放
      canvas.width = 0;
      canvas.height = 0;
    }, 'image/png');
  });
};

/**
 * 複数フレームを連続キャプチャ
 */
export const captureMultipleFrames = async (timestamps: number[]): Promise<Blob[]> => {
  const results: Blob[] = [];
  
  // 直列処理で実行（並列処理によるOOMを防止）
  for (const ts of timestamps) {
    try {
      const blob = await captureFrame(ts);
      results.push(blob);
      
      // 不要なメモリを解放
      if (results.length > 1) {
        // 前のBlobのURLを解放（もし作成されていれば）
        const prevBlob = results[results.length - 2];
        const url = URL.createObjectURL(prevBlob);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error(`Failed to capture frame at ${ts}:`, error);
    }
    
    // 少し待機してブラウザにレンダリングの余裕を与える
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};

/**
 * DRMコンテンツかどうかをチェック
 */
export const checkForDRM = (video: HTMLVideoElement): boolean => {
  // webkitDecodedFrameCountが常に0ならDRMとみなす
  return video.webkitDecodedFrameCount === 0 && video.currentTime > 3;
};

/**
 * Blobをダウンロード
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // URLを解放（少し遅延させる）
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
};
