/**
 * 機能フラグ
 * 多言語対応フェーズ1と2の実装のため、デフォルトで有効化
 */
export const flags = {
  // オーバーレイUIの多言語対応を有効にする
  ENABLE_I18N_OVERLAY: true,
  // AIプロンプトの多言語対応を有効にする
  ENABLE_I18N_PROMPTS: true,
  // アウトライン生成時のプロンプトに動画URLを含めない（デバッグ用）
  EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT: false,
};

/**
 * 拡張機能コンテキストが有効かどうかをチェック
 */
function isExtensionContextValid(): boolean {
  try {
    // Chrome APIが利用可能かテスト
    chrome.runtime.getURL('');
    return true;
  } catch (e) {
    console.warn('拡張機能コンテキストが無効です。フラグの読み込みをスキップします。');
    return false;
  }
}

/**
 * フラグの設定をストレージから読み込む
 */
export async function loadFlags(): Promise<void> {
  // 拡張機能コンテキストが無効な場合は処理をスキップ
  if (!isExtensionContextValid()) {
    return;
  }

  try {
    const result = await chrome.storage.sync.get('debugFlags');
    if (result.debugFlags) {
      // ストレージに保存されたフラグで更新
      Object.assign(flags, result.debugFlags);
      console.log('デバッグフラグをストレージから読み込みました:', flags);
    }
  } catch (error) {
    console.error('デバッグフラグの読み込みエラー:', error);
  }
}

/**
 * フラグの設定をストレージに保存する
 */
export async function saveFlags(): Promise<void> {
  // 拡張機能コンテキストが無効な場合は処理をスキップ
  if (!isExtensionContextValid()) {
    return;
  }

  try {
    // デバッグ用フラグのみを保存
    const debugFlags = {
      EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT: flags.EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT
    };
    await chrome.storage.sync.set({ debugFlags });
    console.log('デバッグフラグをストレージに保存しました:', debugFlags);
  } catch (error) {
    console.error('デバッグフラグの保存エラー:', error);
  }
}
