// 広告検出と制御のためのユーティリティ関数

import { getSettings } from './storage';
import { logDebug } from './utils';

/**
 * 現在広告が再生されているかどうかを確認する
 * movie_playerに付与される ad-showing / ad-interrupting クラスで検知
 */
export const isAdPlaying = (): boolean => {
  const moviePlayer = document.querySelector('#movie_player');
  if (!moviePlayer) return false;

  // ad-showing または ad-interrupting クラスが付与されているか確認
  return (
    moviePlayer.classList.contains('ad-showing') || 
    moviePlayer.classList.contains('ad-interrupting')
  );
};

/**
 * 広告が終了するまで待機する
 * ENABLE_AD_PAUSE が true の場合のみ実際に待機し、false の場合は即座に解決する
 */
export const waitForNoAds = async (): Promise<void> => {
  // 設定を取得
  const settings = await getSettings();
  
  // ENABLE_AD_PAUSE が false の場合は何もせずに即座に解決
  if (!settings.ENABLE_AD_PAUSE) {
    return;
  }

  // 広告が再生されていない場合は即座に解決
  if (!isAdPlaying()) {
    return;
  }

  logDebug('広告が検出されました。広告終了を待機します...');
  
  // 広告が終了するまで待機
  return new Promise<void>((resolve) => {
    // 広告状態をチェックする間隔（ミリ秒）
    const checkInterval = 500;
    
    // 広告状態を定期的にチェック
    const intervalId = setInterval(() => {
      if (!isAdPlaying()) {
        clearInterval(intervalId);
        logDebug('広告が終了しました。スナップショット取得を再開します。');
        resolve();
      }
    }, checkInterval);
  });
};
