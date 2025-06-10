// バックグラウンドスクリプト（Service Worker）

import { generateSummary } from './lib/gemini';
import { GeminiRequest } from './lib/types';

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // オプションページを開く処理
  if (message.action === 'openOptionsPage') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'GENERATE_SUMMARY') {
    handleGenerateSummary(message.data)
      .then(result => {
        console.log('Background: Sending success response for GENERATE_SUMMARY', result);
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('Background: Sending error response for GENERATE_SUMMARY', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンスのため
  } else {
    // 想定外のメッセージをログに出力
    console.warn('Background script received unexpected message:', message, 'from sender:', sender);
    // ここで sendResponse を呼び出さず、true も返さないことで、
    // 送信側が応答を期待していた場合に「ポートが閉じた」エラーが発生します。
    // このログが出力されるかどうかが重要です。
  }
});

/**
 * 要約生成処理
 */
async function handleGenerateSummary(data: GeminiRequest) {
  try {
    const result = await generateSummary(data);
    return result;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

// タブの更新を監視して、YouTubeのWatchページを検出する
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // タブの読み込みが完了し、URLがYouTubeのWatchページの場合
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    console.log('YouTube Watch page detected, sending initialization message to content script');
    // コンテンツスクリプトに初期化メッセージを送信
    chrome.tabs.sendMessage(tabId, { action: "initializeOverlay" })
      .catch(error => {
        // エラーが発生した場合（コンテンツスクリプトがまだ読み込まれていない可能性がある）
        console.log('Error sending message to content script:', error);
      });
  }
});

// Service Worker起動時のログ
console.log('YT Outline & Snap background service worker started');
