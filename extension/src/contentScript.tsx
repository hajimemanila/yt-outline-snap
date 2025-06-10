// Simplified contentScript.tsx for debugging
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import OverlayPanel from './components/OverlayPanel';
import './index.css';
import { getSettings } from './lib/storage';
import { getOutline, saveOutline } from './lib/storageUtils';
import { TemplateManager, TemplateType } from './lib/promptTemplates';
import { getCurrentLanguage } from './lib/i18n';
import { flags, loadFlags } from './lib/flags';

// Use a different ID for this debug version to avoid potential conflicts
const OVERLAY_CONTAINER_ID = 'yt-outline-snap-debug-overlay'; 
let appRoot: Root | null = null;
let currentSnapshots: Snapshot[] = []; // To store snapshots in contentScript

// 起動時にフラグ設定をストレージから読み込む
loadFlags().then(() => {
  console.log('デバッグフラグを読み込みました:', flags);
});

// 拡張機能コンテキストが有効かどうかをチェックする関数
function isExtensionContextValid(): boolean {
  try {
    // Chrome APIが利用可能かテスト
    chrome.runtime.getURL('');
    return true;
  } catch (e) {
    console.error('Extension context invalidated');
    return false;
  }
}

// Module-scoped state variables
let currentIsPlaying: boolean = false;
let lastUrl = window.location.href; // For detecting URL changes
let isInitializing = false; // Flag to prevent multiple initializations
let isOverlayInitialized = false; // Flag to track if the overlay UI is set up
let enhancedObserver: MutationObserver | null = null; // For observing DOM changes more robustly

// Listen for messages from the background script or other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logDebug('contentScript.tsx received message:', message, 'from sender:', sender);

  if (message.action === 'initializeOverlay') {
    // Handle the initialization of the overlay
    // TODO: Implement actual overlay initialization logic if it's not already handled elsewhere
    logDebug('contentScript.tsx: Received initializeOverlay. Current isOverlayInitialized:', isOverlayInitialized);
    // Example: if (!isOverlayInitialized) { initializeUI(); isOverlayInitialized = true; }
    // If a response is needed:
    // sendResponse({ success: true, message: 'Overlay initialization acknowledged' });
    // If this were an async operation that uses sendResponse later, you'd return true here.
    // return true;
  } else if (message.type === 'CAPTURE_SNAPSHOT_COMMAND') { // Example from potential popup interaction
    logDebug('contentScript.tsx: Received CAPTURE_SNAPSHOT_COMMAND');
    if (window.handleCaptureSnapshot) {
      window.handleCaptureSnapshot();
      // sendResponse({ success: true, message: 'Snapshot capture initiated by command.' });
    } else {
      console.error('handleCaptureSnapshot not found on window');
      // sendResponse({ success: false, error: 'handleCaptureSnapshot not available.' });
    }
    // return true; // if sendResponse is used asynchronously
  }

  // Default behavior: return false if not sending an asynchronous response.
  // This is important to prevent "The message port closed before a response was received."
  // if the sender expects a response and this listener doesn't explicitly handle it asynchronously.
  return false; 
});


let renderPanel: (
  isPlayingState: boolean,
  snapshotsToRender?: Snapshot[],
  outlineItemsToRender?: OutlineItem[],
  hasTranscriptToRender?: boolean
) => void = (isPlayingState, snapshotsToRender, outlineItemsToRender, hasTranscriptToRender) => {
  logDebug("--- CONTENT SCRIPT: renderPanel called ---", { isPlayingState, snapshotsCount: snapshotsToRender?.length, outlineItemsCount: outlineItemsToRender?.length, hasTranscriptToRender });
  if (appRoot) {
    currentIsPlaying = isPlayingState; // Update state
    if (snapshotsToRender) {
      currentSnapshots = snapshotsToRender; // Update snapshots as well
    }
    appRoot.render(
      React.createElement(OverlayPanel, {
        isPlaying: isPlayingState,
        snapshots: snapshotsToRender || currentSnapshots,
        initialOutlineItems: outlineItemsToRender,
        initialHasTranscript: hasTranscriptToRender,
        // Add other necessary props here
      })
    );
  } else {
    logDebug("appRoot is null, cannot render panel.");
  }
};/// <reference types="chrome" />

// Define a type for the function that will be exposed on the window object
interface CustomWindow extends Window {
  handleCaptureSnapshot?: () => void;
  handleCaptureAllSnapshots?: (snapshotInfos: SnapshotInfo[]) => void;
  handleSeekTo?: (time: number) => void;
  handleGenerateOutline?: () => Promise<{ items: OutlineItem[], hasTranscript: boolean }>;
  generateSnapshotDescription?: (snapshotId: string, callbacks?: { onSuccess?: () => void, onError?: (error: string) => void }) => Promise<string | null>;
  // You can add other custom properties or methods here as needed
}
declare const window: CustomWindow;

// Define an interface for our snapshot data
interface Snapshot {
  title: string;
  time: number;
  timestamp: number; // Unix timestamp (ms)
  videoUrl: string;
  imageDataUrl?: string; // キャプチャした画像のデータURL
  description: string; // ユーザーが編集可能な説明
}

interface OutlineItem { timestamp: number; title: string; description: string; }

const IS_DEBUG = true; // Set to false for production

// Utility function for logging with a prefix, respecting IS_DEBUG
const logDebug = (...args: any[]) => {
  if (IS_DEBUG) {
    console.log('YT Outline & Snap (Debug Version):', ...args);
  }
};

// Function to handle the snapshot capture
const handleCaptureSnapshot = () => {
  // 拡張機能コンテキストが無効化されていないか確認
  try {
    // Chrome APIが利用可能かテスト
    chrome.runtime.getURL('');
  } catch (e) {
    console.error('Extension context invalidated, cannot capture snapshot');
    return;
  }
  try {
    logDebug('Attempting to capture snapshot. window.handleCaptureSnapshot exists:', typeof window.handleCaptureSnapshot === 'function');
    const videoElement = document.querySelector<HTMLVideoElement>('video.html5-main-video');
    if (!videoElement) {
      logDebug('Video element not found.');
      return;
    }
    const titleElement = document.querySelector<HTMLElement>('h1.ytd-watch-metadata yt-formatted-string');
    const title = titleElement?.innerText || 'No title found';
    const time = videoElement.currentTime;
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || videoElement.clientWidth;
    canvas.height = videoElement.videoHeight || videoElement.clientHeight;
    const ctx = canvas.getContext('2d');
    let imageDataUrl: string | undefined;
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      imageDataUrl = canvas.toDataURL('image/jpeg');
    }
    const snapshot: Snapshot = { title, time, timestamp: Date.now(), videoUrl: window.location.href, imageDataUrl, description: '' };
    // 拡張機能コンテキストが無効化されていないか確認
if (!isExtensionContextValid()) {
  console.error('Extension context invalidated, cannot access storage');
  return;
}

chrome.storage.local.get({ snapshots: [] }, ({ snapshots }) => {
      const updated = [...snapshots, snapshot];
      chrome.storage.local.set({ snapshots: updated }, () => logDebug('Snapshot saved successfully:', snapshot));
    });
  } catch (error) {
    console.error('Error in handleCaptureSnapshot:', error);
  }
};

// Import ad utilities
import { waitForNoAds } from './lib/adUtils';

// Function to capture a frame at a specific time as a data URL
const captureFrameAt = async (time: number): Promise<string | undefined> => {
  try {
    const videoElement = document.querySelector<HTMLVideoElement>('video.html5-main-video');
    if (!videoElement) {
      logDebug('Video element not found for captureFrameAt.');
      return undefined;
    }
    
    // 動画の長さを取得
    const videoDuration = videoElement.duration;
    
    // 指定された時間が動画の長さを超えていないか確認
    if (time >= videoDuration) {
      logDebug(`Requested time (${time}s) exceeds video duration (${videoDuration}s). Adjusting to end of video.`);
      time = Math.max(0, Math.floor(videoDuration) - 1);
    }
    
    // 負の値でないことを確認
    if (time < 0) {
      logDebug(`Negative time value (${time}s) detected. Adjusting to start of video.`);
      time = 0;
    }
    
    // シーク操作前に広告が終了するまで待機
    await waitForNoAds();
    
    return new Promise((resolve) => {
      const onSeeked = async () => {
        videoElement.removeEventListener('seeked', onSeeked);
        
        // シーク後に再度広告が表示されていないか確認し、表示されていれば終了を待機
        await waitForNoAds();
        
        // 広告終了後にキャプチャを実行
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || videoElement.clientWidth;
        canvas.height = videoElement.videoHeight || videoElement.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg'));
        } else {
          resolve(undefined);
        }
      };
      videoElement.addEventListener('seeked', onSeeked);
      if (Math.abs(videoElement.currentTime - time) < 0.001) {
        onSeeked();
      } else {
        videoElement.currentTime = time;
      }
    });
  } catch (error) {
    logDebug('Error in captureFrameAt:', error);
    return undefined;
  }
};

// 拡張されたスナップショット情報の型定義
interface SnapshotInfo {
  time: number;
  title?: string;
  description?: string;
}

// Function to capture multiple snapshots at given times with optional titles and descriptions
const handleCaptureAllSnapshots = async (snapshotInfos: SnapshotInfo[]) => {
  for (const info of snapshotInfos) {
    const dataUrl = await captureFrameAt(info.time);
    if (dataUrl) {
      const videoElement = document.querySelector<HTMLVideoElement>('video.html5-main-video');
      const titleElement = document.querySelector<HTMLElement>('h1.ytd-watch-metadata yt-formatted-string');
      if (!videoElement) continue;
      const videoTitle = titleElement?.innerText || 'No title found';
      
      const snapshot: Snapshot = {
        title: videoTitle, // ビデオのタイトル
        time: info.time,
        timestamp: Date.now(),
        videoUrl: window.location.href,
        imageDataUrl: dataUrl,
        description: info.description || info.title || '', // アウトラインの説明文またはタイトルを使用
      };
      // 拡張機能コンテキストが無効化されていないか確認
      if (!isExtensionContextValid()) {
        console.error('Extension context invalidated, cannot access storage in handleCaptureAllSnapshots');
        return;
      }

      chrome.storage.local.get({ snapshots: [] }, ({ snapshots }) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting snapshots in handleCaptureAllSnapshots:', chrome.runtime.lastError.message);
          return;
        }
        const updated = [...snapshots, snapshot];
        chrome.storage.local.set({ snapshots: updated }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error setting snapshots in handleCaptureAllSnapshots (set operation):', chrome.runtime.lastError.message);
            return;
          }
          logDebug('Snapshot saved via all capture with description:', snapshot);
        });
      });
    }
    await new Promise((r) => setTimeout(r, 500)); // throttle between captures
  }
};

// Function to extract transcript segment around a specific timestamp
const extractTranscriptSegment = (transcript: string, targetTimestamp: number, beforeSeconds: number = 30, afterSeconds: number = 60): string => {
  if (!transcript) {
    logDebug('extractTranscriptSegment: Empty transcript provided');
    return '';
  }
  
  // 詳細デバッグログを追加
  logDebug(`extractTranscriptSegment: Processing transcript (${transcript.length} chars) for timestamp ${targetTimestamp}s`);
  logDebug(`extractTranscriptSegment: Range: ${targetTimestamp - beforeSeconds}s to ${targetTimestamp + afterSeconds}s`);
  
  // プレビューとして最初の100文字をログ出力
  const transcriptPreview = transcript.length > 100 ? transcript.substring(0, 100) + '...' : transcript;
  logDebug(`extractTranscriptSegment: Transcript preview: ${transcriptPreview}`);
  
  const lines = transcript.split('\n');
  logDebug(`extractTranscriptSegment: Split into ${lines.length} lines`);
  
  const segments: { timestamp: number; text: string }[] = [];
  let timeParsingErrorCount = 0;
  
  // YouTubeトランスクリプトの主な形式に対応する正規表現パターン
  const patterns = [
    // 標準フォーマット [HH:MM:SS] Text または [MM:SS] Text
    /\[(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?\]\s*(.+)/,
    // 秒数のみのフォーマット [123s] Text
    /\[(\d+)s\]\s*(.+)/,
    // 時間表記のみのフォーマット (MM:SS) Text または (HH:MM:SS) Text
    /\((\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?\)\s*(.+)/,
    // 数値のみのフォーマット 123: Text または 1:23: Text
    /(\d+)(?::(\d+))?(?::(\d+))?:\s*(.+)/
  ];
  
  // Parse transcript lines with timestamps
  for (const line of lines) {
    let parsed = false;
    
    // トランスクリプト行を解析
    for (let i = 0; i < patterns.length; i++) {
      const match = patterns[i].exec(line);
      if (!match) continue;
      
      try {
        let timestamp = 0;
        let text = "";
        
        if (i === 0) { // [HH:MM:SS] or [MM:SS] format
          if (match[3]) { // HH:MM:SS
            timestamp = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
            text = match[4].trim();
          } else if (match[2]) { // MM:SS
            timestamp = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
            text = match[4].trim();
          } else { // SS
            timestamp = parseInt(match[1], 10);
            text = match[4].trim();
          }
        } else if (i === 1) { // [123s] format
          timestamp = parseInt(match[1], 10);
          text = match[2].trim();
        } else if (i === 2) { // (HH:MM:SS) or (MM:SS) format
          if (match[3]) { // HH:MM:SS
            timestamp = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
            text = match[4].trim();
          } else if (match[2]) { // MM:SS
            timestamp = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
            text = match[4].trim();
          } else { // SS
            timestamp = parseInt(match[1], 10);
            text = match[4].trim();
          }
        } else if (i === 3) { // 123: or 1:23: format
          if (match[3]) { // H:MM:SS
            timestamp = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
            text = match[4].trim();
          } else if (match[2]) { // MM:SS
            timestamp = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
            text = match[4].trim();
          } else { // SS
            timestamp = parseInt(match[1], 10);
            text = match[4].trim();
          }
        }
        
        // YouTube動画の実際の長さよりも大幅に大きい値は無効とする（YouTubeの最大長さは約12時間 = 43200秒）
        if (timestamp <= 43200) {
          segments.push({ timestamp, text });
          parsed = true;
          break;
        }
      } catch (error) {
        timeParsingErrorCount++;
        if (timeParsingErrorCount <= 3) { // 最初の数エラーだけログ出力
          logDebug(`Error parsing timestamp in line: ${line}, error: ${error}`);
        }
        continue;
      }
    }
  }
  
  if (timeParsingErrorCount > 0) {
    logDebug(`extractTranscriptSegment: ${timeParsingErrorCount} timestamp parsing errors occurred`);
  }
  
  logDebug(`extractTranscriptSegment: Parsed ${segments.length} segments from transcript`);
  
  // セグメントが見つからない場合、トランスクリプト全体を返す
  if (segments.length === 0) {
    logDebug('extractTranscriptSegment: No segments found in transcript, returning original transcript');
    return transcript;
  }
  
  // 全体の時間幅を確認
  segments.sort((a, b) => a.timestamp - b.timestamp);
  const firstTimestamp = segments[0].timestamp;
  const lastTimestamp = segments[segments.length - 1].timestamp;
  logDebug(`extractTranscriptSegment: Transcript covers time range ${firstTimestamp}s to ${lastTimestamp}s`);
  
  // スナップショットが動画の範囲外の場合の処理
  if (targetTimestamp > lastTimestamp * 1.5) {
    logDebug(`extractTranscriptSegment: Target timestamp ${targetTimestamp}s is outside transcript range, normalizing`);
    
    // トランスクリプトの時間範囲に合わせて対象タイムスタンプをスケーリング
    const normalizedTimestamp = (targetTimestamp / 100) % lastTimestamp;
    if (normalizedTimestamp > 0) {
      logDebug(`extractTranscriptSegment: Normalized timestamp to ${normalizedTimestamp}s`);
      targetTimestamp = normalizedTimestamp;
    } else {
      // 単純に最後の20%を使用
      targetTimestamp = lastTimestamp * 0.8;
      logDebug(`extractTranscriptSegment: Using 80% of transcript range, timestamp: ${targetTimestamp}s`);
    }
  }
  
  // Find segments within the specified range
  const startTime = Math.max(0, targetTimestamp - beforeSeconds);
  const endTime = targetTimestamp + afterSeconds;
  const relevantSegments = segments.filter(seg => seg.timestamp >= startTime && seg.timestamp <= endTime);
  
  logDebug(`extractTranscriptSegment: Found ${relevantSegments.length} segments within range ${startTime}s-${endTime}s`);
  
  // 範囲内にセグメントがない場合、最も近いセグメントを探す
  if (relevantSegments.length === 0) {
    logDebug('extractTranscriptSegment: No segments in range, finding closest segments');
    
    // 指定されたタイムスタンプに最も近いセグメントを見つける
    let closestIndex = 0;
    let minDistance = Math.abs(segments[0].timestamp - targetTimestamp);
    
    for (let i = 1; i < segments.length; i++) {
      const distance = Math.abs(segments[i].timestamp - targetTimestamp);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    // 最も近いセグメントの前後に複数のセグメントを含める
    const startIndex = Math.max(0, closestIndex - 5); // 前5個まで
    const endIndex = Math.min(segments.length - 1, closestIndex + 10); // 後10個まで
    
    for (let i = startIndex; i <= endIndex; i++) {
      relevantSegments.push(segments[i]);
    }
    
    logDebug(`extractTranscriptSegment: Added ${relevantSegments.length} segments around closest timestamp ${segments[closestIndex].timestamp}s`);
    
    // タイムスタンプ順に並べ直す
    relevantSegments.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  // 最大30個のセグメントに制限（長すぎるとプロンプトが大きくなりすぎる）
  if (relevantSegments.length > 30) {
    const middleIndex = relevantSegments.findIndex(seg => seg.timestamp >= targetTimestamp);
    const start = Math.max(0, middleIndex - 10); // 対象時間の前10個
    const limitedSegments = relevantSegments.slice(start, start + 30);
    logDebug(`extractTranscriptSegment: Limited from ${relevantSegments.length} to ${limitedSegments.length} segments`);
    relevantSegments.length = 0;
    relevantSegments.push(...limitedSegments);
  }
  
  // Format the relevant segments into a transcript string
  const result = relevantSegments.map(seg => {
    const h = Math.floor(seg.timestamp / 3600);
    const m = Math.floor((seg.timestamp % 3600) / 60);
    const s = Math.floor(seg.timestamp % 60);
    const timeStr = [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
    return `[${timeStr}] ${seg.text}`;
  }).join('\n');
  
  logDebug(`extractTranscriptSegment: Final transcript segment (${result.length} chars)`);
  if (result.length > 0) {
    const resultPreview = result.length > 100 ? result.substring(0, 100) + '...' : result;
    logDebug(`extractTranscriptSegment: Result preview: ${resultPreview}`);
  }
  
  return result;
};

// Shared function to fetch transcript from DOM
async function fetchTranscriptFromDOM(videoId: string, forceRetry: boolean = false): Promise<string | null> {
  try {
    // 既にキャッシュされたトランスクリプトがあるか確認（forceRetryが false の場合のみ）
    const transcriptCacheKey = `transcript_cache_${videoId}`;
    if (!forceRetry) {
      try {
        const cachedData = await chrome.storage.local.get(transcriptCacheKey) as {[key: string]: string};
        if (cachedData && cachedData[transcriptCacheKey]) {
          logDebug(`Using cached transcript for video ${videoId}`);
          return cachedData[transcriptCacheKey];
        }
      } catch (cacheError) {
        logDebug('Error checking transcript cache:', cacheError);
        // キャッシュエラーは無視して続行
      }
    } else {
      logDebug(`Force retry requested for transcript of video ${videoId}`);
    }
    
    const buttonTexts = ['show transcript', '文字起こしを表示'];
    let transcriptButton: HTMLElement | null = null;

    const allButtons = Array.from(document.querySelectorAll<HTMLElement>(
      'button, yt-button-renderer, ytd-button-renderer, tp-yt-paper-button, yt-button-shape'
    ));

    for (const btn of allButtons) {
      const label = (btn.getAttribute('aria-label') || btn.textContent || '').trim().toLowerCase();
      if (buttonTexts.some(text => label.includes(text))) {
        transcriptButton = btn;
        break;
      }
    }
    
    if (!transcriptButton) {
        const specificButton = document.querySelector<HTMLElement>(
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] ytd-button-renderer button,' +
            'ytd-video-description-transcript-section-renderer button,' + 
            'button[aria-label*="transcript" i]' 
        );
        // Ensure the button found using specific selectors is indeed for showing, not hiding
        if (specificButton && (specificButton.textContent || specificButton.getAttribute('aria-label') || '').toLowerCase().includes('show')) {
             transcriptButton = specificButton;
        }
    }

    if (transcriptButton) {
      const innerButton = transcriptButton.querySelector('button') || transcriptButton;
      (innerButton as HTMLElement).click();
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second wait for panel to open

      // Transcript parsing logic
      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer'); // Changed to select segments
      if (transcriptSegments.length > 0) {
        let fullTranscript = "";
        transcriptSegments.forEach((segment, index) => {
          let timestampEl: Element | null = null;
          let textEl: Element | null = null;

          // 1. Try Shadow DOM
          if (segment.shadowRoot) {
            timestampEl = segment.shadowRoot.querySelector('div.cue-group-start-offset');
            if (!timestampEl) timestampEl = segment.shadowRoot.querySelector('div.cue-timestamp');
            if (!timestampEl) timestampEl = segment.shadowRoot.querySelector('div[class*="timestamp"], div[aria-label*="timestamp"]');
            
            textEl = segment.shadowRoot.querySelector('div.cue');
            if (!textEl) textEl = segment.shadowRoot.querySelector('div.cue-text');
            if (!textEl) {
              const candidateTextElements = Array.from(segment.shadowRoot.querySelectorAll('div[class*="cue"], div[class*="text"], div.segment-text, #text, #cue'));
              textEl = candidateTextElements.find(el => {
                if (el === timestampEl) return false;
                const trimmedContent = el.textContent?.trim();
                return !!trimmedContent && trimmedContent.length > 0;
              }) || null;
            }
          }

          // 2. If not fully found in Shadow DOM (or if no Shadow DOM), try Light DOM
          if (!timestampEl || !textEl) {
            // 2a. Try specific Light DOM selectors (only if current corresponding element is null)
            if (!timestampEl) {
                timestampEl = segment.querySelector('div.segment-timestamp');
            }
            if (!textEl) {
                textEl = segment.querySelector('yt-formatted-string.segment-text');
            }

            // 2b. If still not fully found, try fallback Light DOM selectors
            if (!timestampEl || !textEl) {
                const fallbackLightDomSelectorsToTry = [
                  { ts: 'div.cue-group-start-offset', txt: 'div.cue' },
                  { ts: 'div.timestamp', txt: 'div.text' },
                  { ts: '.cue-group-start-offset', txt: '.cue' },
                  { ts: '.timestamp', txt: '.text' }
                ];
                for (const selectorPair of fallbackLightDomSelectorsToTry) {
                  let potentialTs = timestampEl; 
                  let potentialTxt = textEl;

                  if (!potentialTs) potentialTs = segment.querySelector(selectorPair.ts);
                  if (!potentialTxt) potentialTxt = segment.querySelector(selectorPair.txt);
                  
                  if (potentialTs && potentialTxt) { 
                    timestampEl = potentialTs;
                    textEl = potentialTxt;
                    break; 
                  }
                }
            }
          }

          // 3. Process results or log errors for the current segment
          if (timestampEl && textEl) {
            const timestamp = timestampEl.textContent?.trim() || "";
            const text = textEl.textContent?.trim() || "";
            if (timestamp && text) {
              fullTranscript += `[${timestamp}] ${text}\n`;
            }
          } else {
            let missingInfo: string[] = [];
            if (!timestampEl) missingInfo.push("timestamp");
            if (!textEl) missingInfo.push("text");
          }
        });

        // トランスクリプトが取得できた場合はキャッシュに保存し返す
        if (fullTranscript.length > 0) {
          const trimmedTranscript = fullTranscript.trim();
          try {
            const cacheData = { [transcriptCacheKey]: trimmedTranscript };
            await chrome.storage.local.set(cacheData);
            logDebug(`Cached transcript for video ${videoId} (${trimmedTranscript.length} chars)`);
          } catch (cacheError) {
            logDebug('Error caching transcript:', cacheError);
            // キャッシュエラーは無視して続行
          }
          return trimmedTranscript;
        } else {
          logDebug('Found transcript segments, but could not extract text or timestamps');
          return null;
        }
      } else {
        logDebug('Transcript panel might be open, but no transcript segments found');
        return null;
      }
    } else {
      logDebug('"Show transcript" button not found on the page');
      return null;
    }
  } catch (error) {
    logDebug('Error in fetchTranscriptFromDOM:', error);
    return null;
  }
}

// Helper function to generate content with retries for both API types
const generateContentWithRetries = async (prompt: string, apiKey: string, modelName: string, maxRetries: number = 3): Promise<string> => {
  let endpoint, requestBody;
  
  if (modelName.startsWith('gemini')) {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    requestBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
    };
  } else {
    endpoint = `https://api.openai.com/v1/chat/completions`;
    requestBody = {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 4096
    };
  }
  
  let rawText = '';
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logDebug(`API Request attempt ${attempt} for model: ${modelName}`);
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(modelName.startsWith('gemini') ? {} : { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
      
      const json = await resp.json();
      // Extract text from response based on API type
      if (json.candidates && Array.isArray(json.candidates) && json.candidates.length > 0) {
        const candidate = json.candidates[0];
        if (candidate.content && Array.isArray(candidate.content.parts)) {
          rawText = candidate.content.parts.map((part: any) => part.text || '').join('\n');
        } else if (candidate.content && typeof candidate.content.text === 'string') {
          rawText = candidate.content.text;
        } else if (candidate.text) {
          rawText = candidate.text;
        }
      } else if (json.choices && Array.isArray(json.choices)) {
        rawText = json.choices[0]?.message?.content || '';
      }
      
      if (rawText.trim()) return rawText;
      throw new Error('Empty content');
    } catch (err) {
      logDebug(`Attempt ${attempt} failed:`, err);
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  
  throw new Error('Failed to generate content after retries');
};

// Helper function to generate content with image and retries for multimodal models
const generateContentWithImageAndRetries = async (prompt: string, imageBase64: string, apiKey: string, modelName: string, maxRetries: number = 3): Promise<string> => {
  let endpoint, requestBody;
  
  if (modelName.startsWith('gemini')) {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    requestBody = {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
        ]
      }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
    };
  } else {
    // For models that don't support image input, just use text prompt
    return generateContentWithRetries(prompt, apiKey, modelName, maxRetries);
  }
  
  let rawText = '';
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logDebug(`API Request attempt ${attempt} for model with image: ${modelName}`);
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(modelName.startsWith('gemini') ? {} : { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!resp.ok) {
        const errorText = await resp.text();
        logDebug(`API error: ${resp.status}`, errorText);
        throw new Error(`HTTP ${resp.status}: ${errorText}`);
      }
      
      const json = await resp.json();
      logDebug('API Response with image:', json);
      
      // More detailed logging for debugging
      if (json.candidates && Array.isArray(json.candidates) && json.candidates.length > 0) {
        logDebug('First candidate:', json.candidates[0]);
        if (json.candidates[0].content) {
          logDebug('Candidate content:', json.candidates[0].content);
          if (json.candidates[0].content.parts) {
            logDebug('Content parts:', json.candidates[0].content.parts);
          }
        }
      }
      
      // Extract text from response for Gemini models
      if (json.candidates && Array.isArray(json.candidates) && json.candidates.length > 0) {
        const candidate = json.candidates[0];
        if (candidate.content && Array.isArray(candidate.content.parts)) {
          // Explicitly log each part for debugging
          candidate.content.parts.forEach((part: any, index: number) => {
            logDebug(`Part ${index}:`, part);
            if (part.text) {
              logDebug(`Part ${index} text:`, part.text);
            }
          });
          
          // Get text from parts
          rawText = candidate.content.parts
            .filter((part: any) => part.text !== undefined)
            .map((part: any) => part.text || '')
            .join('\n');
            
          logDebug('Extracted raw text:', rawText);
        } else if (candidate.content && candidate.content.text) {
          rawText = candidate.content.text;
          logDebug('Extracted text from content.text:', rawText);
        } else if (candidate.text) {
          rawText = candidate.text;
          logDebug('Extracted text directly from candidate:', rawText);
        }
      }
      
      if (rawText.trim()) return rawText;
      throw new Error('Empty content from image-based generation');
    } catch (err) {
      logDebug(`Attempt ${attempt} failed with image:`, err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        // If we fail with image after multiple attempts, try falling back to text-only prompt
        if (attempt === maxRetries - 1) {
          logDebug('Falling back to text-only prompt after image failures');
          try {
            return await generateContentWithRetries(prompt, apiKey, modelName, 1);
          } catch (textErr) {
            logDebug('Text fallback also failed:', textErr);
            // Continue with final image attempt
          }
        }
      } else {
        throw err; // Re-throw on final attempt
      }
    }
  }
  
  throw new Error('Failed to generate content with image after retries');
};

// Function to generate a description for a snapshot using AI
const handleGenerateSnapshotDescription = async (snapshotId: string, callbacks?: { onSuccess?: () => void, onError?: (error: string) => void }): Promise<string | null> => {
  try {
    logDebug(`--- CONTENT SCRIPT: handleGenerateSnapshotDescription CALLED ---`);
    logDebug(`--- Snapshot ID: ${snapshotId} ---`);
    
    // Get API credentials
    const { apiKey, modelName } = await getSettings();
    if (!apiKey) {
      const errorMsg = 'API key not configured. Please set it in the extension options.';
      callbacks?.onError?.(errorMsg);
      return null;
    }
    
    // Find the snapshot by ID (timestamp)
    let targetSnapshot: Snapshot | undefined;
    const storageResult = await new Promise<{ snapshots: Snapshot[] }>((resolve, reject) => {
      chrome.storage.local.get({ snapshots: [] }, (result) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(result as { snapshots: Snapshot[] });
      });
    });
    const { snapshots } = storageResult;
    targetSnapshot = snapshots.find(s => s.timestamp.toString() === snapshotId);
    
    if (!targetSnapshot) {
      const errorMsg = `Snapshot with ID ${snapshotId} not found`;
      callbacks?.onError?.(errorMsg);
      return null;
    }
    
    // Check if image data exists
    if (!targetSnapshot.imageDataUrl) {
      const errorMsg = `Snapshot does not have image data`;
      callbacks?.onError?.(errorMsg);
      return null;
    }
    
    // Get base64 image data by removing the data URL prefix
    const imageBase64 = targetSnapshot.imageDataUrl.split(',')[1];
    if (!imageBase64) {
      const errorMsg = `Invalid image data format`;
      callbacks?.onError?.(errorMsg);
      return null;
    }
    
    // Get video ID from the snapshot URL
    const videoUrl = targetSnapshot.videoUrl;
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|\/embed\/|\/v\/|\/e\/|youtube\.com\/shorts\/|youtu\.be\/)([^#\&\?\n]*)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    if (!videoId) {
      const errorMsg = 'Could not extract video ID from snapshot URL';
      callbacks?.onError?.(errorMsg);
      return null;
    }
    
    // Get transcript with improved error handling and retry logic
    let transcriptSegment = "";
    try {
      logDebug(`Attempting to fetch transcript for video ID: ${videoId} at time: ${targetSnapshot.time}s`);
      
      // 1. First attempt: Try to fetch from DOM
      const fullTranscript = await fetchTranscriptFromDOM(videoId);
      
      if (fullTranscript) {
        // Extract transcript segment around the snapshot time (+/- some seconds)
        transcriptSegment = extractTranscriptSegment(fullTranscript, targetSnapshot.time, 30, 60);
        logDebug(`Successfully retrieved transcript segment (${transcriptSegment.length} chars) for snapshot description`);
        // Log a preview of the transcript segment for debugging
        if (transcriptSegment.length > 0) {
          const preview = transcriptSegment.length > 100 ? transcriptSegment.substring(0, 100) + '...' : transcriptSegment;
          logDebug(`Transcript segment preview: ${preview}`);
        } else {
          logDebug('Warning: Transcript segment is empty after extraction');
        }
      } else {
        logDebug('No transcript found via DOM, trying alternative methods');
        
        // 2. Fallback: Check if we have a stored outline with transcript
        try {
          const savedOutline = await getOutline(videoId);
          if (savedOutline && savedOutline.hasTranscript) {
            logDebug('Found stored outline with transcript flag');
            // Attempt to re-fetch transcript
            const retryTranscript = await fetchTranscriptFromDOM(videoId, true); // Force retry
            if (retryTranscript) {
              transcriptSegment = extractTranscriptSegment(retryTranscript, targetSnapshot.time, 30, 60);
              logDebug(`Retrieved transcript segment on retry (${transcriptSegment.length} chars)`);
            }
          }
        } catch (outlineError) {
          logDebug('Error checking stored outline:', outlineError);
        }
      }
    } catch (error) {
      logDebug('Error fetching transcript:', error);
      // Continue without transcript if it fails
    }
    
    // Final check and warning if transcript is still empty
    if (!transcriptSegment) {
      logDebug('Warning: No transcript segment available for snapshot description generation');
    }
    
    // 現在の言語設定を取得
    const currentLanguage = await getCurrentLanguage();
    
    // テンプレートマネージャーからテンプレートを取得
    const templateManager = TemplateManager.getInstance();
    const promptTemplate = await templateManager.getTemplate('snapshotDescription', currentLanguage);
    
    logDebug(`Using ${currentLanguage} template for snapshot description generation`);
    
    // Create prompt for the API
    const formattedTime = new Date(targetSnapshot.time * 1000).toISOString().substr(11, 8);
    
    // トランスクリプトセクションの言語別フォーマット
    let transcriptSection = "";
    if (transcriptSegment) {
      if (currentLanguage === 'ja') {
        transcriptSection = `## 前後のトランスクリプト\n\n${transcriptSegment}`;
      } else {
        transcriptSection = `## Surrounding Transcript\n\n${transcriptSegment}`;
      }
    }
    
    // テンプレートに変数を埋め込む
    const prompt = promptTemplate
      .replace('{videoUrl}', videoUrl)
      .replace('{formattedTime}', formattedTime)
      .replace('{transcriptSection}', transcriptSection);
    
    logDebug('Generating snapshot description with prompt:', prompt);
    
    // Call modified API function that includes image data
    const description = await generateContentWithImageAndRetries(prompt, imageBase64, apiKey, modelName);
    
    // Update the snapshot with the generated description
    const updatedSnapshots = snapshots.map(s => {
      if (s.timestamp.toString() === snapshotId) {
        return { ...s, description };
      }
      return s;
    });
    
    // Save to storage
    await new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ snapshots: updatedSnapshots }, () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      });
    });
    
    // Update current snapshots array
    currentSnapshots = updatedSnapshots;
    
    // Call success callback
    callbacks?.onSuccess?.();
    
    return description;
  } catch (error) {
    console.error('Error generating snapshot description:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    callbacks?.onError?.(errorMsg);
    return null;
  }
};

// Function to generate outline via AI
const handleGenerateOutline = async (): Promise<{ items: OutlineItem[], hasTranscript: boolean }> => {
  try {
    // Get API credentials
    const { apiKey, modelName } = await getSettings();
    
    // APIキーが設定されているか確認
    if (!apiKey) {
      console.error('API key is not configured. Please set it in the extension options.');
      logDebug('API key is missing. Cannot generate outline.');
      return { items: [], hasTranscript: false };
    }
    
    // モデル名が設定されているか確認
    if (!modelName) {
      console.error('Model name is not configured. Please set it in the extension options.');
      logDebug('Model name is missing. Cannot generate outline.');
      return { items: [], hasTranscript: false };
    }
    
    // デバッグ用にAPI設定を表示
    console.log('=== API SETTINGS ===');
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'Not set');
    console.log('Model Name:', modelName);
    console.log('===================');
    
    // Get video information
    const currentLocation = window.location.href;
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) {
      console.error('Failed to extract video ID from URL', currentLocation);
      return { items: [], hasTranscript: false };
    }
    
    // Get the video element
    const videoElement = document.querySelector<HTMLVideoElement>('video.html5-main-video');
    if (!videoElement) {
      console.error('Video element not found');
      return { items: [], hasTranscript: false };
    }
    
    // Get video metadata
    const titleElement = document.querySelector('h1.title.style-scope.ytd-video-primary-info-renderer');
    const videoTitle = titleElement?.textContent?.trim() || 'Unknown Title';
    const channelElement = document.querySelector('#text.ytd-channel-name');
    const channelName = channelElement?.textContent?.trim() || 'Unknown Channel';
    const videoDuration = videoElement.duration || 0;
    
    // まず既存のアウトラインがあるか確認
    const existingOutline = await getOutline(videoId);
    if (existingOutline && existingOutline.items.length > 0) {
      logDebug(`Found existing outline for video ${videoId} with ${existingOutline.items.length} items. Using cached version.`);
      // 既存のアウトラインにトランスクリプト情報があればそれを使用
      // hasTranscript が undefined の場合は、旧バージョンで保存されたアウトラインでトランスクリプトが正常に取得できたものとして扱う
      return { 
        items: existingOutline.items, 
        hasTranscript: existingOutline.hasTranscript === undefined ? true : existingOutline.hasTranscript 
      };
    }
    
    logDebug(`Generating new outline for video ${videoId} (${videoTitle})...`);
    
    // console.log('Video Information:', { videoId, videoTitle, channelName, videoDuration });
    
    // Calculate appropriate number of outline points based on video length
    const videoMinutes = videoDuration / 60;
    const pointsPerMinute = videoDuration < 300 ? 0.9 : videoDuration < 900 ? 0.7 : 0.6;
    const numPoints = Math.max(8, Math.min(30, Math.ceil(videoMinutes * pointsPerMinute)));
    // console.log('Requesting outline with points:', numPoints, 'based on duration:', videoMinutes.toFixed(2), 'min');
    
    // Function to generate sample data in case of API errors
    const generateSampleData = (): OutlineItem[] => {
      console.warn('Using sample data for outline');
      const items: OutlineItem[] = [];
      
      // Calculate intervals based on video duration
      const interval = Math.max(2, Math.floor(videoMinutes / 8));
      
      // 言語に基づいたサンプルデータを準備
      const sampleData = {
        ja: {
          pokerTitles: [
            'シーン1', 'シーン2', 'シーン3', 'シーン4',
            'シーン5', 'シーン6', 'シーン7', 'シーン8'
          ],
          pokerDescriptions: [
            'AIによる生成が失敗したため、サンプルデータを使用しています。',
            'AIによる生成が失敗したため、サンプルデータを使用しています。',
            'AIによる生成が失敗したため、サンプルデータを使用しています。',
            'AIによる生成が失敗したため、サンプルデータを使用しています。',
            'AIによる生成が失敗したため、サンプルデータを使用しています。',
            'AIによる生成が失敗したため、サンプルデータを使用しています。',
            'AIによる生成が失敗したため、サンプルデータを使用しています。',
            'AIによる生成が失敗したため、サンプルデータを使用しています。'
          ],
          defaultTitle: (i: number) => `重要ポイント${i+1}`,
          defaultDescription: '動画の重要な内容が展開されています。'
        },
        en: {
          pokerTitles: [
            'Scene 1', 'Scene 2', 'Scene 3', 'Scene 4',
            'Scene 5', 'Scene 6', 'Scene 7', 'Scene 8'
          ],
          pokerDescriptions: [
            'Using sample data because AI generation failed.',
            'Using sample data because AI generation failed.',
            'Using sample data because AI generation failed.',
            'Using sample data because AI generation failed.',
            'Using sample data because AI generation failed.',
            'Using sample data because AI generation failed.',
            'Using sample data because AI generation failed.',
            'Using sample data because AI generation failed.'
          ],
          defaultTitle: (i: number) => `Key Point ${i+1}`,
          defaultDescription: 'Important content is presented at this timestamp.'
        },
        'zh-CN': {
          pokerTitles: [
            '场景 1', '场景 2', '场景 3', '场景 4',
            '场景 5', '场景 6', '场景 7', '场景 8'
          ],
          pokerDescriptions: [
            '由于AI生成失败，使用示例数据。',
            '由于AI生成失败，使用示例数据。',
            '由于AI生成失败，使用示例数据。',
            '由于AI生成失败，使用示例数据。',
            '由于AI生成失败，使用示例数据。',
            '由于AI生成失败，使用示例数据。',
            '由于AI生成失败，使用示例数据。',
            '由于AI生成失败，使用示例数据。'
          ],
          defaultTitle: (i: number) => `要点 ${i+1}`,
          defaultDescription: '在此时间戳呈现重要内容。'
        },
        ko: {
          pokerTitles: [
            '씬 1', '씬 2', '씬 3', '씬 4',
            '씬 5', '씬 6', '씬 7', '씬 8'
          ],
          pokerDescriptions: [
            'AI 생성이 실패하여 예제 데이터를 사용합니다.',
            'AI 생성이 실패하여 예제 데이터를 사용합니다.',
            'AI 생성이 실패하여 예제 데이터를 사용합니다.',
            'AI 생성이 실패하여 예제 데이터를 사용합니다.',
            'AI 생성이 실패하여 예제 데이터를 사용합니다.',
            'AI 생성이 실패하여 예제 데이터를 사용합니다.',
            'AI 생성이 실패하여 예제 데이터를 사용합니다.',
            'AI 생성이 실패하여 예제 데이터를 사용합니다.'
          ],
          defaultTitle: (i: number) => `핵심 포인트 ${i+1}`,
          defaultDescription: '이 타임스킬프에 중요한 내용이 표시됩니다.'
        }
      };
      
      // 現在の言語に基づいたデータを選択
      const data = sampleData[currentLanguage] || sampleData.ja;
      
      // Generate sample timestamps
      for (let i = 0; i < 8; i++) {
        const minutes = Math.min(Math.floor(videoMinutes), i * interval);
        const seconds = Math.floor(Math.random() * 50);
        const timestamp = (Math.floor(minutes / 60) * 3600) + ((minutes % 60) * 60) + seconds;
        
        // Content based on video title
        let title, description;
        if (videoTitle.toLowerCase().includes('poker')) {
          title = data.pokerTitles[i % data.pokerTitles.length];
          description = data.pokerDescriptions[i % data.pokerDescriptions.length];
        } else {
          title = data.defaultTitle(i);
          description = data.defaultDescription;
        }
        
        items.push({ timestamp, title, description });
      }
      
      return items;
    };
    
    // Prepare API request
    const videoUrl = window.location.href;

    // 現在の言語設定を取得
    const currentLanguage = await getCurrentLanguage();
    
    // テンプレートマネージャーからテンプレートを取得
    const templateManager = TemplateManager.getInstance();
    const promptTemplate = await templateManager.getTemplate('outline', currentLanguage);
    
    logDebug(`Using ${currentLanguage} template for outline generation`);
    
    // Re-use the shared fetchTranscriptFromDOM function
    let transcriptTextForPrompt = "";
    let hasTranscript = false;
    try {
      const transcript = await fetchTranscriptFromDOM(videoId); 
      if (transcript && transcript.trim().length > 0) {
        // 言語に応じたトランスクリプトセクションのフォーマット
        if (currentLanguage === 'ja') {
          transcriptTextForPrompt = `\n\n## トランスクリプト\n${transcript}`;
        } else {
          transcriptTextForPrompt = `\n\n## Transcript\n${transcript}`;
        }
        hasTranscript = true;
        logDebug('Transcript found and will be included in the prompt.');
      } else {
        logDebug('No transcript available from DOM or transcript is empty. Proceeding without transcript.');
      }
    } catch (error) {
      console.error('Error during DOM transcript fetching:', error);
      logDebug('Proceeding without transcript due to error during DOM fetching.');
    }

    // 設定を取得
    const settings = await getSettings();
    const excludeVideoUrl = settings.EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT || false;
    
    // テンプレートに変数を埋め込む
    // 設定に応じて動画URLを含めるかどうかを制御
    const prompt = promptTemplate
      .replace('{videoUrl}', excludeVideoUrl ? '' : videoUrl)
      .replace('{videoTitle}', videoTitle)
      .replace('{channelName}', channelName)
      .replace('{videoDuration}', videoDuration.toString())
      .replace('{numPoints}', numPoints.toString())
      .replace('{transcriptSection}', transcriptTextForPrompt);
    
    // デバッグ情報：動画URLの扱い
    logDebug(`URL inclusion in prompt: ${!excludeVideoUrl ? 'INCLUDED' : 'EXCLUDED'}`);
    // console.log('API Prompt:', prompt);
    
    let endpoint, requestBody;
    if (modelName.startsWith('gemini')) {
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 10240 }
      };
    } else {
      endpoint = `https://api.openai.com/v1/chat/completions`;
      requestBody = {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 10240
      };
    }
    
    // console.log('API Request:', { endpoint, model: modelName });
    
    // Implement retry logic for robust API request
    let rawText = '';
    const maxRetries = 3;
    
    // デバッグ用にリクエスト情報をコンソールに表示
    console.log('=== API REQUEST DETAILS ===');
    console.log('Endpoint:', endpoint);
    console.log('Model:', modelName);
    console.log('Language:', currentLanguage);
    console.log('Transcript available:', hasTranscript);
    console.log('Exclude video URL from prompt:', flags.EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT);
    console.log('Request body:', requestBody);
    console.log('Prompt:', prompt);
    console.log('========================');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API Request attempt ${attempt}/${maxRetries}`);
        
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(modelName.startsWith('gemini') ? {} : { 'Authorization': `Bearer ${apiKey}` })
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log(`API Response status: ${resp.status}`);
        
        if (!resp.ok) {
          // エラーレスポンスの詳細を取得
          let errorDetail = '';
          try {
            const errorJson = await resp.json();
            errorDetail = JSON.stringify(errorJson);
            console.error('API Error Response:', errorJson);
          } catch (e) {
            errorDetail = await resp.text();
            console.error('API Error Response (text):', errorDetail);
          }
          
          throw new Error(`HTTP ${resp.status}: ${errorDetail}`);
        }
        
        const json = await resp.json();
        console.log('=== API RESPONSE ===');
        console.log('Response JSON:', json);
        console.log('===================');
        
        // Extract text from response
        if (json.candidates && Array.isArray(json.candidates) && json.candidates.length > 0) {
          const candidate = json.candidates[0];
          if (candidate.content && Array.isArray(candidate.content.parts)) {
            rawText = candidate.content.parts.map((part: any) => part.text || '').join('\n');
            console.log(`Extracted text from Gemini response (parts array): ${rawText.length} chars`);
          } else if (candidate.content && typeof candidate.content.text === 'string') {
            rawText = candidate.content.text;
            console.log(`Extracted text from Gemini response (content.text): ${rawText.length} chars`);
          } else if (candidate.text) {
            rawText = candidate.text;
            console.log(`Extracted text from Gemini response (candidate.text): ${rawText.length} chars`);
          } else {
            console.error(`Unexpected Gemini response format:`, candidate);
            throw new Error('Unexpected response format from Gemini API');
          }
        } else if (json.choices && Array.isArray(json.choices) && json.choices.length > 0) {
          // OpenAI形式のレスポンスを処理
          const choice = json.choices[0];
          if (choice.message && choice.message.content) {
            rawText = choice.message.content;
            console.log(`Extracted text from OpenAI response: ${rawText.length} chars`);
          } else {
            console.error(`Unexpected OpenAI response format:`, choice);
            throw new Error('Unexpected response format from OpenAI API');
          }
        } else {
          console.error(`Unexpected API response format:`, json);
          throw new Error('Unexpected API response format');
        }
        
        // 抽出したテキストを表示
        console.log('=== EXTRACTED TEXT ===');
        console.log(rawText);
        console.log('=====================')
        // console.log('Extracted text length:', rawText.length);
        if (rawText.trim()) break;
        throw new Error('Empty content');
      } catch (err) {
        console.warn(`Attempt ${attempt} failed:`, err);
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000));
      }
    }
    if (!rawText.trim()) {
      console.error('Failed to retrieve outline after retries');
      logDebug('API call failed to return valid content. Check API key and model settings.');
      
      // 空の結果を返す（サンプルデータを使用しない）
      return { items: [], hasTranscript: false };
    }
    // console.log('Raw outline text:', rawText);
    
    // Parse the response text
    const outlineItems: OutlineItem[] = [];
    
    console.log('=== PARSING RESPONSE ===');
    console.log('Raw text length:', rawText.length);
    console.log('First 200 chars:', rawText.substring(0, 200));
    
    // 言語に応じたデバッグ情報を表示
    console.log(`言語設定: ${currentLanguage}`);
    
    // First try to parse as JSON - より強化されたJSON検出
    try {
      // 複数のJSON検出パターンを試す
      // パターン1: 標準的なJSON配列
      let jsonText = '';
      let jsonMatch = rawText.match(/\[\s*\{.*\}\s*\]/s);
      
      if (jsonMatch) {
        jsonText = jsonMatch[0];
        console.log('パターン1でJSONを検出:', jsonText.substring(0, 100) + '...');
      } else {
        // パターン2: コードブロック内のJSON
        jsonMatch = rawText.match(/```(?:json)?\s*\n?(\[\s*\{.*\}\s*\])\s*\n?```/s);
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1];
          console.log('パターン2でコードブロック内のJSONを検出:', jsonText.substring(0, 100) + '...');
        } else {
          // パターン3: 行ごとのJSONオブジェクト（配列でない場合）
          const lines = rawText.split(/\r?\n/);
          const jsonObjects = [];
          
          for (const line of lines) {
            const objMatch = line.match(/\{\s*"timestamp".*\}/s);
            if (objMatch) {
              try {
                const obj = JSON.parse(objMatch[0]);
                if (obj && typeof obj === 'object' && 'timestamp' in obj) {
                  jsonObjects.push(obj);
                }
              } catch (e) {
                // 個別のオブジェクト解析エラーは無視
              }
            }
          }
          
          if (jsonObjects.length > 0) {
            jsonText = JSON.stringify(jsonObjects);
            console.log('パターン3で個別のJSONオブジェクトを検出:', jsonObjects.length, '件');
          }
        }
      }
      
      // 検出したJSONテキストを解析
      if (jsonText) {
        try {
          // JSON文字列を正規化（余分な空白や改行を削除）
          jsonText = jsonText.replace(/\s+/g, ' ').trim();
          console.log('正規化したJSON:', jsonText.substring(0, 100) + '...');
          
          const parsedItems = JSON.parse(jsonText);
          if (Array.isArray(parsedItems) && parsedItems.length > 0) {
            console.log(`✅ JSONの解析に成功: ${parsedItems.length}件のアイテムを検出`);
            
            // 各アイテムを検証して変換
            for (const item of parsedItems) {
              if (typeof item === 'object' && item !== null) {
                const timestamp = typeof item.timestamp === 'number' ? item.timestamp : 
                                 typeof item.timestamp === 'string' ? parseInt(item.timestamp, 10) : 0;
                                 
                const title = typeof item.title === 'string' ? item.title.trim() : 'Unknown Title';
                const description = typeof item.description === 'string' ? item.description.trim() : '';
                
                if (!isNaN(timestamp)) {
                  console.log(`✅ JSONアイテムを解析: ${timestamp}秒 - "${title}" - "${description}"`);
                  outlineItems.push({ timestamp, title, description });
                }
              }
            }
            
            if (outlineItems.length > 0) {
              console.log(`JSON解析成功: ${outlineItems.length}件のアイテムを取得`);
              // JSON解析が成功した場合、早期に適切な構造のオブジェクトを返す
              if (outlineItems.length > 0) {
                try {
                  // videoId, videoTitle, videoDuration are available from earlier in the function scope
                  await saveOutline(videoId, videoTitle, videoDuration, outlineItems, hasTranscript);
                  logDebug(`Successfully saved newly generated outline for video ${videoId} with ${outlineItems.length} items. Transcript fetched: ${hasTranscript}`);
                } catch (saveError) {
                  console.error('Failed to save outline:', saveError);
                  logDebug('Error saving outline:', saveError);
                }
              }
              return { items: outlineItems, hasTranscript };
            }
          }
        } catch (jsonError) {
          console.warn('JSON解析エラー:', jsonError);
          console.log('解析に失敗したJSON文字列:', jsonText);
        }
      }
    } catch (jsonError) {
      console.warn('JSON抽出中のエラー:', jsonError);
    }
    
    // If JSON parsing failed, fall back to text parsing
    console.log('Falling back to text parsing...');
    const lines = rawText.split(/\r?\n/);
    console.log(`Found ${lines.length} lines to parse`);
    
    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Match [HH:MM:SS] or [MM:SS], then title and description
      const m = line.match(/\[?(\d{1,2}(?::\d{1,2}){1,2})\]?\s*([^:\uff1a-]+)[:\uff1a-]\s*(.+)/);
      if (m) {
        const timeStr = m[1];
        const parts = timeStr.split(':').map(Number);
        let timestamp = 0;
        if (parts.length === 3) {
          timestamp = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else {
          timestamp = parts[0] * 60 + parts[1];
        }
        const title = m[2].trim();
        const description = m[3].trim();
        console.log(`✅ Parsed item: ${timeStr} - "${title}" - "${description}"`);
        outlineItems.push({ timestamp, title, description });
      } else if (line.includes(':') && line.length > 10) {
        console.log(`❌ Failed to parse line: "${line}"`);
        
        // Try alternative parsing patterns
        // Try to match timestamps in different formats
        let altMatch = line.match(/(\d{1,2}:\d{1,2}(?::\d{1,2})?)\s*[-\u2013\u2014]\s*(.+)/);
        if (altMatch) {
          const timeStr = altMatch[1];
          const parts = timeStr.split(':').map(Number);
          let timestamp = 0;
          if (parts.length === 3) {
            timestamp = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else {
            timestamp = parts[0] * 60 + parts[1];
          }
          
          // Split the remaining text into title and description if possible
          const remainingText = altMatch[2].trim();
          let title = remainingText;
          let description = '';
          
          // Try to split by common separators
          const separatorMatch = remainingText.match(/(.+?)[:\uff1a-]\s*(.+)/);
          if (separatorMatch) {
            title = separatorMatch[1].trim();
            description = separatorMatch[2].trim();
          }
          
          console.log(`🔄 Alternative parsing succeeded: ${timeStr} - "${title}" - "${description}"`);
          outlineItems.push({ timestamp, title, description });
        }
      }
    }
    
    console.log(`Parsed ${outlineItems.length} outline items from ${lines.length} lines`);
    
    // タイムスタンプの検証と修正
    const validatedOutlineItems = outlineItems.map(item => {
      // 動画の長さを超えていないか確認
      if (item.timestamp >= videoDuration) {
        logDebug(`Outline item timestamp (${item.timestamp}s) exceeds video duration (${videoDuration}s). Adjusting to end of video.`);
        item.timestamp = Math.max(0, Math.floor(videoDuration) - 1);
      }
      
      // 負の値でないことを確認
      if (item.timestamp < 0) {
        logDebug(`Negative timestamp value (${item.timestamp}s) detected in outline. Adjusting to start of video.`);
        item.timestamp = 0;
      }
      
      return item;
    });
    
    // タイムスタンプでソート
    validatedOutlineItems.sort((a, b) => a.timestamp - b.timestamp);
    
    logDebug(`Generated ${validatedOutlineItems.length} outline items after validation. Transcript available: ${hasTranscript}`);
    
    // 生成したアウトラインを永続化
    if (validatedOutlineItems.length > 0 && videoId) {
      try {
        await saveOutline(videoId, videoTitle, videoDuration, validatedOutlineItems, hasTranscript);
        logDebug(`Saved outline for video ${videoId} with ${validatedOutlineItems.length} items (hasTranscript: ${hasTranscript})`);
      } catch (error) {
        console.error('Error saving outline:', error);
      }
    }
    
    // Only use sample data if we explicitly want to (for debugging) or if API call completely failed
    // Do NOT use sample data if API call succeeded but parsing failed - we need to fix the parsing
    let useSampleData = false;
    
    if (validatedOutlineItems.length === 0) {
      console.warn('No valid outline items were parsed from the API response');
      console.log('Raw text length:', rawText.length);
      console.log('First 100 chars of raw text:', rawText.substring(0, 100));
      
      // Check if this looks like a valid API response that we failed to parse
      const hasTimestampPattern = /\d{1,2}:\d{1,2}/.test(rawText);
      
      if (hasTimestampPattern) {
        console.warn('API response contains timestamp patterns but parsing failed');
        // Don't use sample data, return empty array so we can debug the parsing issue
        useSampleData = false;
      } else {
        console.warn('API response does not contain recognizable timestamp patterns');
        // Use sample data as fallback for better user experience
        useSampleData = true;
      }
    }
    
    const result = {
      items: validatedOutlineItems.length > 0 ? validatedOutlineItems : (useSampleData ? generateSampleData() : []),
      hasTranscript
    };
    
    console.log('=== FINAL RESULT ===');
    console.log(`Returning ${result.items.length} items (${validatedOutlineItems.length} from API, sample data: ${useSampleData})`);
    console.log('=====================');
    
    return result;
    
  } catch (error) {
    console.error('Error in handleGenerateOutline:', error);
    return { items: [], hasTranscript: false };
  }
};



// Expose functions to window for access from OverlayPanel
(window as CustomWindow).handleCaptureAllSnapshots = handleCaptureAllSnapshots;
(window as CustomWindow).handleCaptureSnapshot = handleCaptureSnapshot;
(window as CustomWindow).handleGenerateOutline = handleGenerateOutline;
(window as CustomWindow).generateSnapshotDescription = handleGenerateSnapshotDescription;

// Function to handle saving description from OverlayPanel
const handleSaveDescriptionInContentScript = async (timestamp: number, description: string) => {
  logDebug(`--- CONTENT SCRIPT: handleSaveDescriptionInContentScript CALLED ---`);
  logDebug(`--- Timestamp: ${timestamp}, Description: ${description} ---`);

  try {
    const { snapshots: storedSnapshots } = await chrome.storage.local.get({ snapshots: [] }) as { snapshots: Snapshot[] };
    logDebug('--- CONTENT SCRIPT: Retrieved snapshots from storage:', storedSnapshots);

    const snapshotIndex = storedSnapshots.findIndex(snap => snap.timestamp === timestamp);

    if (snapshotIndex === -1) {
      logDebug(`--- CONTENT SCRIPT: Snapshot with timestamp ${timestamp} not found! ---`);
      // Optionally, alert the user or handle this error more gracefully
      console.error(`Error: Could not find snapshot with timestamp ${timestamp} to save description.`);
      logDebug(`--- CONTENT SCRIPT: Snapshot with timestamp ${timestamp} not found! ---`);
      return;
    }

    // Update the description
    storedSnapshots[snapshotIndex].description = description;
    currentSnapshots = [...storedSnapshots]; // Update local copy

    await chrome.storage.local.set({ snapshots: currentSnapshots });
    logDebug('--- CONTENT SCRIPT: Successfully updated snapshot description in storage ---', currentSnapshots[snapshotIndex]);
    logDebug('--- CONTENT SCRIPT: Description saved successfully! ---');

    // Re-render the panel to show the updated description
    // We need to ensure renderPanel is accessible and uses the updated currentSnapshots
    if (typeof renderPanel === 'function' && typeof currentIsPlaying === 'boolean') {
      renderPanel(currentIsPlaying, currentSnapshots); // Pass updated snapshots
    } else {
      logDebug('--- CONTENT SCRIPT: renderPanel or currentIsPlaying not ready for re-render after save ---');
    }

  } catch (error) {
    logDebug('--- CONTENT SCRIPT: Error in handleSaveDescriptionInContentScript:', error);
    console.error('Error saving description. Check console. (From Content Script)');
    logDebug('--- CONTENT SCRIPT: Error saving description. ---');
  }
};

// この関数はファイルの先頭に移動しました

// Function to create and render the simple overlay
function initializeSimpleOverlay(attempt = 1, initialItems?: OutlineItem[], initialHasTranscript?: boolean) {
  if (!isExtensionContextValid()) {
    logDebug('Cannot initialize simple overlay - extension context invalidated at the very start.');
    isInitializing = false; // isInitializing フラグをリセット
    return;
  }
  // console.log(`YT Outline & Snap (Debug Version): initializeSimpleOverlay called (attempt ${attempt}).`);

  // Prevent multiple injections if script somehow runs multiple times
  if (document.getElementById(OVERLAY_CONTAINER_ID)) {
    logDebug('Debug overlay container already exists. Skipping.');
    isOverlayInitialized = true;
    isInitializing = false;
    return;
  }
  
  // Only run on YouTube watch pages
  if (!window.location.href.includes('youtube.com/watch')) {
    logDebug('Not a YouTube watch page. Skipping injection.');
    isInitializing = false;
    return;
  }

  const videoElement = document.querySelector<HTMLVideoElement>('video.html5-main-video');
  if (!videoElement) {
    // console.log(`YT Outline & Snap (Debug Version): Video element not found (attempt ${attempt}). Retrying...`);
    if (attempt < 5) { // Retry up to 5 times
      setTimeout(() => initializeSimpleOverlay(attempt + 1), 500);
    } else {
      console.error(`YT Outline & Snap: Max retries reached. Video element not found.`);
      isInitializing = false;
    }
    return;
  }
  // console.log('YT Outline & Snap (Debug Version): Video element found.');

  const container = document.createElement('div');
  container.id = OVERLAY_CONTAINER_ID;
  container.style.position = 'fixed';
  container.style.zIndex = '2147483647';
  
  document.body.appendChild(container);
  // console.log('YT Outline & Snap (Debug Version): Debug overlay container created and appended to body.');

  const appendedContainer = document.getElementById(OVERLAY_CONTAINER_ID);
  if (appendedContainer) {
    // console.log('YT Outline & Snap (Debug Version): Container successfully found in DOM after append. Parent:', appendedContainer.parentElement?.tagName);
    if (appendedContainer.parentElement !== document.body) {
      console.warn('YT Outline & Snap: Container parent is NOT document.body! It is:', appendedContainer.parentElement?.tagName);
    }

    try {
      if (appRoot) {
        appRoot.unmount();
        appRoot = null;
      }
      // Assign functions to window BEFORE rendering OverlayPanel
      (window as CustomWindow).handleCaptureSnapshot = handleCaptureSnapshot;
      logDebug('window.handleCaptureSnapshot assigned.');
      (window as CustomWindow).handleSeekTo = (time: number) => {
        // 現在のDOM内でビデオ要素を取得する（毎回最新の要素を取得するため）
        const currentVideoElement = document.querySelector('video');
        // 見つかった場合はシーク、見つからない場合はスコープ内のvideoElementを使用
        if (currentVideoElement) {
          logDebug(`Seeking to ${time}s using current video element`); 
          currentVideoElement.currentTime = time;
        } else if (videoElement) {
          logDebug(`Seeking to ${time}s using cached video element`);
          videoElement.currentTime = time;
        } else {
          logDebug(`Failed to seek: No video element found for time ${time}s`);
        }
      };
      logDebug('window.handleSeekTo assigned.');

      // Player control functions
      const handleSeekBackward = () => {
        if (videoElement) {
          videoElement.currentTime -= 5;
          logDebug('Seeked backward by 5s');
        }
      };

      const handleSeekForward = () => {
        if (videoElement) {
          videoElement.currentTime += 5;
          logDebug('Seeked forward by 5s');
        }
      };

      // Variable to hold the current playing state, initialized from videoElement
      // Ensure videoElement is valid before accessing its properties
      currentIsPlaying = !videoElement.paused; // Assign to module-scoped variable

            // renderPanel is now module-scoped, initializeSimpleOverlay will assign to it.

      const handlePlayPause = () => {
        if (videoElement) {
          if (videoElement.paused) {
            videoElement.play().catch((err: any) => logDebug('Error playing video:', err));
          } else {
            videoElement.pause();
          }
          // Event listeners will handle updating currentIsPlaying and re-rendering via renderPanel
          logDebug(`Play/Pause toggled. Video initially paused: ${videoElement.paused}`);
        }
      };

      // Define renderPanel function properly after appRoot is in scope or ensure it's called when appRoot is valid.
      // This will be fully defined after appRoot is created.

      appRoot = createRoot(container);
      logDebug('React root created. Attempting to render OverlayPanel...');

      // Fully define renderPanel now that appRoot is available
      renderPanel = (isPlayingState: boolean, snapshotsToRender: Snapshot[] = currentSnapshots, outlineItemsToRender?: OutlineItem[], hasTranscriptToRender?: boolean) => {
        // 拡張機能コンテキストが無効化されていないか確認
        if (!isExtensionContextValid()) {
          logDebug('Cannot render panel - extension context invalidated');
          return;
        }
        
        // appRootが存在しない場合は早期リターン
        if (!appRoot) {
          logDebug('Cannot render panel - appRoot is null');
          return;
        }
        
        // 現在の動画IDを取得
        const currentVideoId = getCurrentVideoId();
        logDebug(`Rendering panel with current video ID: ${currentVideoId}`);
        
        if (appRoot && container) { // Ensure appRoot and container are valid
          appRoot.render(
            <OverlayPanel
              onSeekBackward={handleSeekBackward}
              onPlayPause={handlePlayPause}
              onSeekForward={handleSeekForward}
              isPlaying={isPlayingState}
              onSaveDescription={handleSaveDescriptionInContentScript} // Pass the handler
              snapshots={snapshotsToRender} // Pass current snapshots
              initialOutlineItems={outlineItemsToRender}
              initialHasTranscript={hasTranscriptToRender}
              currentVideoId={currentVideoId} // 現在の動画IDを渡す
            />
          );
          logDebug(`OverlayPanel re-rendered. isPlaying: ${isPlayingState}`);
        }
      };

      // Event listeners for play/pause state changes
      // videoElement is guaranteed non-null here
      const onPlayHandler = () => {
          currentIsPlaying = true;
          renderPanel(currentIsPlaying);
          logDebug('Video play event triggered, isPlaying:', currentIsPlaying);
        };
        videoElement.addEventListener('play', onPlayHandler);

        const onPauseHandler = () => {
          currentIsPlaying = false;
          renderPanel(currentIsPlaying);
          logDebug('Video pause event triggered, isPlaying:', currentIsPlaying);
        };
        videoElement.addEventListener('pause', onPauseHandler);
        
        // TODO: Add cleanup for these listeners if the overlay is removed or reinitialized.

      // Load initial snapshots and then render
      chrome.storage.local.get({ snapshots: [] }, (data) => {
        currentSnapshots = data.snapshots || [];
        logDebug('Initial snapshots loaded for OverlayPanel:', currentSnapshots);
        // Initial render of the panel using the current state of videoElement
        currentIsPlaying = !videoElement.paused; // Re-check just before initial render, videoElement is non-null
        logDebug('[initializeSimpleOverlay] Calling inner renderPanel...');
    renderPanel(currentIsPlaying, currentSnapshots, initialItems, initialHasTranscript);
    logDebug('[initializeSimpleOverlay] Completed.');
    logDebug('OverlayPanel initial render call completed with snapshots.');
      });

      // 初期化完了のフラグを設定
      isOverlayInitialized = true;

    } catch (error) {
      console.error('YT Outline & Snap (Debug Version): Error during React rendering phase:', error);
      if (error instanceof Error && error.stack) {
        console.error('YT Outline & Snap (Debug Version): Render error stack:', error.stack);
      }
      if (container.parentNode === document.body) {
        document.body.removeChild(container);
        logDebug('Cleaned up container after render error.');
      }
      isOverlayInitialized = false;
    }

  } else {
    console.error(`YT Outline & Snap (Debug Version): CRITICAL (Attempt ${attempt}) - Container NOT found in DOM after append.`);
    if (attempt < 3) { // 最大3回までリトライ
      logDebug(`Retrying initialization in 500ms...`);
      setTimeout(() => initializeSimpleOverlay(attempt + 1), 500); // 500ms後にリトライ
    } else {
      console.error('YT Outline & Snap: Max retries reached. Could not initialize overlay.');
      isOverlayInitialized = false;
    }
  }
  
  // 初期化完了後にフラグをリセット
  isInitializing = false;
}

// 初期化を確実に行うための関数
async function ensureInitialization() {
  logDebug('[ensureInitialization] Started.');
  try {
  if (!isExtensionContextValid()) {
    logDebug('Cannot initialize - extension context invalidated');
    return;
  }
  if (window.location.href.includes('youtube.com/watch')) {
    logDebug('Ensuring initialization on watch page');

    // If overlay is already initialized but we are not in an initialization process,
    // it might mean a page navigation to the same video or a soft reload.
    // We might want to refresh data, but for now, this mainly prevents re-entry if isInitializing is true.
    // if (isOverlayInitialized && !isInitializing) {
    //   logDebug('Overlay already initialized. Consider if data refresh is needed.');
    //   // Potentially, could trigger a data load and re-render if videoId matches
    // }

    if (isInitializing) {
      logDebug('Initialization already in progress, skipping');
      return;
    }

    isInitializing = true;
    logDebug('Starting initialization process.');

    waitForYouTubeNavigation(async () => {
      let initialOutlineItems: OutlineItem[] = [];
      let initialHasTranscript = false;
      const videoId = new URLSearchParams(window.location.search).get('v');

      try {
        if (videoId) {
          logDebug(`Attempting to load existing outline for video ${videoId}`);
          logDebug('[ensureInitialization] Calling getOutline...');
  const savedOutline = await getOutline(videoId);
  logDebug('[ensureInitialization] getOutline returned:', savedOutline);
          if (savedOutline && savedOutline.items.length > 0) {
            initialOutlineItems = savedOutline.items;
            initialHasTranscript = savedOutline.hasTranscript === undefined ? true : savedOutline.hasTranscript;
            logDebug(`Loaded ${initialOutlineItems.length} items from saved outline for video ${videoId}. Has transcript: ${initialHasTranscript}`);
          } else {
            logDebug(`No saved outline found for video ${videoId}`);
          }
        }
        logDebug('[ensureInitialization] Calling initializeOverlayWithCheck with initialOutlineItems:', initialOutlineItems, 'initialHasTranscript:', initialHasTranscript);
  initializeOverlayWithCheck(initialOutlineItems, initialHasTranscript);
  logDebug('[ensureInitialization] Completed successfully.');
      } catch (error) {
        console.error('Error during initialization or loading outline:', error);
        logDebug('Error in ensureInitialization callback:', error);
        initializeOverlayWithCheck([], false); // Fallback
      } finally {
        isInitializing = false;
        logDebug('Initialization process finished.');
      }
    }); // Closes waitForYouTubeNavigation callback
  } // Closes if (window.location.href.includes('youtube.com/watch'))
  } catch (error) {
    console.error('YT Outline & Snap (Content Script): Error in ensureInitialization (outer try):', error);
    logDebug('[ensureInitialization] Error in outer try-catch:', error);
  } finally {
    isInitializing = false; // Ensure this is reset regardless of success or failure of the try block
    logDebug('[ensureInitialization] ensureInitialization outer try-catch process finished.');
  }
} // Closes ensureInitialization function

// URLが変更されたときにWatchページかどうかをチェックする関数
function checkForWatchPage() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    logDebug(`URL changed: ${lastUrl} -> ${currentUrl}`);
    lastUrl = currentUrl;
    
    // YouTubeのWatchページに遷移した場合
    if (currentUrl.includes('youtube.com/watch')) {
      logDebug('Navigation to watch page detected');
      ensureInitialization();
    } else {
      // Watchページ以外に遷移した場合（ホームページなど）
      removeOverlayIfExists();
    }
  }
}

// オーバーレイを初期化する関数（重複チェック付き）
function initializeOverlayWithCheck(initialItems?: OutlineItem[], initialHasTranscript?: boolean) {
  // 既に初期化中の場合はスキップ
  if (isInitializing) {
    logDebug('Initialization already in progress, skipping');
    return;
  }
  
  // 既に初期化済みの場合はスキップ
  if (isOverlayInitialized && document.getElementById(OVERLAY_CONTAINER_ID)) {
    logDebug('Overlay already initialized and exists, skipping');
    return;
  }
  
  isInitializing = true;
  
  // オーバーレイが既に存在する場合は削除
  const existingOverlay = document.getElementById(OVERLAY_CONTAINER_ID);
  if (existingOverlay) {
    logDebug('Removing existing overlay before re-initialization');
    existingOverlay.remove();
    isOverlayInitialized = false;
  }
  
  // 少し遅延させてオーバーレイを初期化（動画要素が読み込まれるのを待つ）
  setTimeout(() => {
    logDebug('Initializing overlay');
    initializeSimpleOverlay(1, initialItems, initialHasTranscript);
  }, 500); // 遅延時間を短縮（1000ms→500ms）
}

// 現在の動画IDを取得する関数
function getCurrentVideoId(): string | null {
  const url = window.location.href;
  return getVideoIdFromUrl(url);
}

// URLから動画IDを抽出する関数
function getVideoIdFromUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|\/embed\/|\/v\/|\/e\/|youtube\.com\/shorts\/|youtu\.be\/)([^#\&\?\n]*)/);
  const videoId = match ? match[1] : null;
  logDebug(`getVideoIdFromUrl: ${url} -> ${videoId}`);
  return videoId;
}

// YouTubeのSPAナビゲーション完了を待つ関数
function waitForYouTubeNavigation(callback: () => void) {
  // YouTubeのナビゲーション完了を示す要素を確認
  const checkForVideoElement = () => {
    const videoElement = document.querySelector<HTMLVideoElement>('video.html5-main-video');
    const playerElement = document.querySelector('#movie_player');
    
    if (videoElement && playerElement) {
      logDebug('YouTube video and player elements found, proceeding with initialization');
      
      // 動画IDを取得
      const videoId = getCurrentVideoId();
      if (videoId) {
        logDebug(`Attempting to retrieve outline for video ID: ${videoId}`);
        
        // 保存されたアウトラインを取得
        getOutline(videoId)
          .then(savedOutline => {
            if (savedOutline && savedOutline.items && savedOutline.items.length > 0) {
              logDebug(`✅ Found saved outline for video ${videoId} with ${savedOutline.items.length} items`);
              
              const titleElement = document.querySelector<HTMLElement>('h1.ytd-watch-metadata yt-formatted-string');
              const videoTitle = titleElement?.innerText || 'No title found';
              const videoDuration = videoElement.duration;
              logDebug(`Video duration: ${videoDuration}s, Title: ${videoTitle}`);
              
              const validatedItems = savedOutline.items.map(item => {
                let timestamp = item.timestamp;
                if (timestamp >= videoDuration) {
                  logDebug(`Outline item timestamp (${timestamp}s) exceeds video duration (${videoDuration}s). Adjusting to end of video.`);
                  timestamp = Math.max(0, Math.floor(videoDuration) - 1);
                }
                if (timestamp < 0) {
                  logDebug(`Negative timestamp value (${timestamp}s) detected in outline. Adjusting to start of video.`);
                  timestamp = 0;
                }
                return { ...item, timestamp };
              });
              
              const snapshotInfos: SnapshotInfo[] = validatedItems.map(item => ({
                time: item.timestamp,
                title: item.title,
                description: item.description
              }));
              
              return new Promise<void>((resolveStorageGet) => {
                chrome.storage.local.get({ snapshots: [] }, ({ snapshots }: { snapshots: Snapshot[] }) => {
                  if (chrome.runtime.lastError) {
                    console.error('YT Outline & Snap (Content Script): Error getting snapshots in waitForYouTubeNavigation:', chrome.runtime.lastError.message);
                    // エラーが発生した場合でも、コールバックは呼び出す必要があるかもしれない
                    // ただし、この後の処理がストレージデータに依存する場合は注意
                    logDebug('[waitForYouTubeNavigation] Error in storage.get. Calling navigation complete callback (or error handling).');
                    callback(); // or handle error and then call callback
                    return;
                  }
                  const existingSnapshots = snapshots.filter(snap => {
                    const snapVideoId = getVideoIdFromUrl(snap.videoUrl);
                    return snapVideoId === videoId;
                  });
                  logDebug(`Found ${existingSnapshots.length} existing snapshots for this video`);
                  
                  // 自動スナップショット取得機能を無効化（動画ページ遷移時の自動キャプチャを防止）
                  // 代わりに既存のスナップショットを使用
                  logDebug('Using existing snapshots only. Auto-capture on page navigation is disabled.');
                  currentSnapshots = existingSnapshots;
                  if (typeof renderPanel === 'function') {
                    renderPanel(currentIsPlaying, currentSnapshots);
                  }
                  resolveStorageGet(); // Resolve without capturing new snapshots
                });
              });
            } else {
              logDebug(`No saved outline found for video ${videoId} or outline is empty`);
              return Promise.resolve(); // No storage.get needed, return resolved promise
            }
          })
          .catch(error => {
            console.error('YT Outline & Snap (Content Script): Error retrieving outline in waitForYouTubeNavigation:', error);
            return Promise.resolve(); // Ensure finally block is called
          })
          .finally(() => {
            if (!isExtensionContextValid()) {
              logDebug('[waitForYouTubeNavigation] Context invalidated before calling final callback. Aborting.');
              return;
            }
            logDebug('[waitForYouTubeNavigation] getOutline promise chain settled. Calling navigation complete callback.');
            callback(); // This is the original `callback` (navigationCompleteCallback)
          });
      } else {
        logDebug('Could not determine video ID in waitForYouTubeNavigation. Calling navigation complete callback.');
        callback(); // This is the original `callback` (navigationCompleteCallback)
      }
    } else {
      logDebug('YouTube video or player elements not found yet, waiting...');
      setTimeout(checkForVideoElement, 500); // 500ms後に再確認
    }
  };
  
  checkForVideoElement();
}

// より強力なMutationObserverの実装
function setupEnhancedObserver() {
  if (enhancedObserver) {
    enhancedObserver.disconnect();
  }

  logDebug('Setting up enhanced DOM observer');
  enhancedObserver = new MutationObserver((mutations) => {
    // 特定のYouTube要素の出現を監視
    if (document.querySelector('video.html5-main-video') && 
        document.querySelector('#movie_player') &&
        window.location.href.includes('youtube.com/watch') &&
        !document.getElementById(OVERLAY_CONTAINER_ID) &&
        !isInitializing &&
        !isOverlayInitialized) {
      
      logDebug('Critical YouTube elements detected by enhanced observer, initializing overlay');
      initializeOverlayWithCheck();
    }
  });
  
  // document全体を監視
  enhancedObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  return enhancedObserver;
}

// YouTubeの内部イベントを監視する関数
function listenForYouTubeApiEvents() {
  logDebug('Setting up YouTube API event listeners');
  
  // yt-navigate-finish イベント
  document.addEventListener('yt-navigate-finish', () => {
    logDebug('YouTube API event detected: yt-navigate-finish');
    if (window.location.href.includes('youtube.com/watch')) {
      setTimeout(() => ensureInitialization(), 500);
    } else {
      // Watchページ以外に遷移した場合
      removeOverlayIfExists();
    }
  });
  
  // yt-page-data-updated イベント
  document.addEventListener('yt-page-data-updated', () => {
    logDebug('YouTube API event detected: yt-page-data-updated');
    if (window.location.href.includes('youtube.com/watch')) {
      setTimeout(() => ensureInitialization(), 500);
    } else {
      // Watchページ以外に遷移した場合
      removeOverlayIfExists();
    }
  });
}

// オーバーレイが存在する場合に削除する関数
function removeOverlayIfExists() {
  const existingOverlay = document.getElementById(OVERLAY_CONTAINER_ID);
  if (existingOverlay) {
    logDebug('Removing overlay as we are no longer on a watch page');
    existingOverlay.remove();
    isOverlayInitialized = false; // フラグをリセット
  }
}

// Initialize the overlay when the script runs
// We'll check if the DOM is already loaded, or wait for it, then use requestIdleCallback (fallback) instead of blocking rAF
const scheduleInit = (callback: () => void) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback);
  } else {
    requestAnimationFrame(callback);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    logDebug('DOMContentLoaded event. Setting up initial overlay and URL change listener.');
    scheduleInit(() => {
      setupURLChangeListener(); // URL変更リスナーを先に設定
      
      // 現在のURLがWatchページかどうかをチェック
      if (window.location.href.includes('youtube.com/watch')) {
        logDebug('Initial page is a YouTube watch page, initializing overlay');
        // 初期化を確実に行う
        ensureInitialization();
      } else {
        logDebug('Initial page is not a YouTube watch page, skipping overlay initialization');
      }
      
      // 初期化が失敗した場合のバックアップとして、少し遅延させて再確認
      setTimeout(() => {
        const existingOverlay = document.getElementById(OVERLAY_CONTAINER_ID);
        if (!existingOverlay && window.location.href.includes('youtube.com/watch')) {
          logDebug('Overlay not found after initial initialization, retrying...');
          ensureInitialization();
        }
      }, 3000); // 3秒後に確認
    });
  });
} else {
  logDebug('DOM already loaded. Setting up initial overlay and URL change listener.');
  scheduleInit(() => {
    setupURLChangeListener(); // URL変更リスナーを先に設定
    
    // 現在のURLがWatchページかどうかをチェック
    if (window.location.href.includes('youtube.com/watch')) {
      logDebug('Initial page is a YouTube watch page, initializing overlay');
      // 初期化を確実に行う
      ensureInitialization();
    } else {
      logDebug('Initial page is not a YouTube watch page, skipping overlay initialization');
    }
    
    // 初期化が失敗した場合のバックアップとして、少し遅延させて再確認
    setTimeout(() => {
      const existingOverlay = document.getElementById(OVERLAY_CONTAINER_ID);
      if (!existingOverlay && window.location.href.includes('youtube.com/watch')) {
        logDebug('Overlay not found after initial initialization, retrying...');
        ensureInitialization();
      }
    }, 3000); // 3秒後に確認
  });
}

// URL変更リスナーをセットアップする関数
function setupURLChangeListener() {
  logDebug('Setting up URL change listener');
  
  // YouTubeの独自イベントも監視
  document.addEventListener('yt-navigate-finish', () => {
    logDebug('yt-navigate-finish event detected');
    checkForWatchPage();
  });

  // バックアップとしてMutationObserverも使用
  const observer = new MutationObserver(() => {
    // URLが変更されたかチェック
    if (lastUrl !== window.location.href) {
      checkForWatchPage();
    }
  });

  // body要素の変更を監視（より広範囲に監視）
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['href']
  });

  // 履歴APIの変更も監視（pushState, replaceState）
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(data: any, unused: string, url?: string | URL | null) {
    originalPushState.call(this, data, unused, url);
    logDebug('history.pushState called');
    setTimeout(checkForWatchPage, 100); // 少し遅延させて確実にURLが更新された後にチェック
  };

  history.replaceState = function(data: any, unused: string, url?: string | URL | null) {
    originalReplaceState.call(this, data, unused, url);
    logDebug('history.replaceState called');
    setTimeout(checkForWatchPage, 100); // 少し遅延させて確実にURLが更新された後にチェック
  };

  // popstate イベントも監視（ブラウザの戻る/進むボタン）
  window.addEventListener('popstate', () => {
    logDebug('popstate event detected');
    setTimeout(checkForWatchPage, 100); // 少し遅延させて確実にURLが更新された後にチェック
  });
  
  logDebug('URL change listener setup complete');
  return observer;
}
