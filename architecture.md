# YouTube Watch オーバーレイ拡張「YT Outline & Snap」アーキテクチャ設計

## 1. 全体アーキテクチャ

### 拡張機能の構成要素
- **Content Script**: YouTube Watchページに挿入され、UIを表示・操作するためのReactアプリケーション
- **Background Script (Service Worker)**: Gemini API呼び出しなど、バックグラウンド処理を担当
- **Options Page**: Gemini APIキーやその他設定を管理するページ
- **Storage**: chrome.storage.syncを使用してAPIキーや設定を保存

### データフロー
1. **ユーザー操作** → **Content Script** → **Background Script** → **Gemini API** → **Background Script** → **Content Script** → **UI更新**
2. **スナップショット取得**: Content Script内で完結（video要素 → canvas/WebCodecs → Blob → ダウンロード）
3. **設定管理**: Options Page → Storage → Content Script/Background Scriptで参照

## 2. コンポーネント設計

### Reactコンポーネント階層
```
<App>
  └─ <ThemeProvider>  
      └─ <OverlayPanel>  // メインコンテナ
          ├─ <ActionButtons>  // 要約生成・スナップショットボタン
          ├─ <OutlineList>  // 要約リスト
          │   └─ <OutlineItem>  // 個別要約項目
          └─ <SnapshotPreview>  // スナップショットプレビュー（モーダル）
```

### 状態管理
- **XState**を使用した状態管理
  - アプリケーション状態: 初期化中、準備完了、要約生成中、スナップショット取得中、エラー状態
  - プレイヤー状態: 通常、DRM検出、広告表示中
  - スナップショット状態: アイドル、処理中、完了、エラー

### イベント処理
- **DOM変更監視**: MutationObserverによるYouTube DOM変化の検出
- **カスタムイベント**: `yt-page-data-updated`イベントのリスナー登録
- **リサイズ監視**: ResizeObserverによるプレイヤーサイズ変更検出

## 3. フェイルセーフ設計

### DOM変化対応
```typescript
// MutationObserverによる監視と再レイアウト
const setupDOMObserver = () => {
  const observer = new MutationObserver((mutations) => {
    // 関連するDOM変更のみフィルタリング
    const relevantChanges = mutations.filter(/* 関連変更の条件 */);
    if (relevantChanges.length > 0) {
      adjustOverlayPosition();
    }
  });
  
  // 監視設定
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
  
  return observer;
};

// リサイズ時のみプレイヤー位置計算
const adjustOverlayPosition = () => {
  const player = document.querySelector('#movie_player');
  if (player) {
    const rect = player.getBoundingClientRect();
    // オーバーレイ位置調整（毎フレームではなくリサイズ時のみ）
    setOverlayPosition({ top: rect.top + 16, right: window.innerWidth - rect.right + 16 });
  }
};

// リサイズ監視
const setupResizeObserver = () => {
  const resizeObserver = new ResizeObserver(() => {
    adjustOverlayPosition();
  });
  
  const player = document.querySelector('#movie_player');
  if (player) {
    resizeObserver.observe(player);
  }
  
  return resizeObserver;
};
```

### DRM/広告対応
```typescript
// DRM検出
const checkForDRM = (video: HTMLVideoElement): boolean => {
  // webkitDecodedFrameCountが常に0ならDRMとみなす
  return video.webkitDecodedFrameCount === 0;
};

// 広告検出
const checkForAd = (): boolean => {
  return document.querySelector('.ad-showing') !== null;
};

// 定期的な状態チェック
const setupPlayerStateMonitor = () => {
  const checkInterval = setInterval(() => {
    const video = document.querySelector('video');
    if (!video) return;
    
    const isDRM = checkForDRM(video);
    const isAd = checkForAd();
    
    // 状態に応じたUI更新
    updatePlayerState({ isDRM, isAd });
    
    // DRMの場合は機能を無効化
    if (isDRM) {
      disableFeatures();
      showDRMWarning();
    }
  }, 1000);
  
  return () => clearInterval(checkInterval);
};
```

### スナップショット安定化
```typescript
// スナップショット取得（WebCodecs優先、フォールバックあり）
const captureFrame = async (ts?: number): Promise<Blob> => {
  const video = document.querySelector('video');
  if (!video) throw new Error('video not found');
  
  // クロスオリジン設定
  video.crossOrigin = 'anonymous';
  
  // タイムスタンプ指定があれば移動
  if (ts != null) {
    video.pause();
    video.currentTime = ts;
    await new Promise(resolve => {
      const seeked = () => {
        video.removeEventListener('seeked', seeked);
        resolve(null);
      };
      video.addEventListener('seeked', seeked);
    });
  }
  
  // フレーム描画待ち
  await new Promise(r => video.requestVideoFrameCallback(r));
  
  // 解像度制限の適用
  const maxResolution = await getMaxResolutionSetting();
  const targetWidth = Math.min(video.videoWidth, maxResolution);
  const targetHeight = Math.min(video.videoHeight, maxResolution);
  const scale = Math.min(1, targetWidth / video.videoWidth);
  
  // WebCodecs対応チェック
  if ('MediaStreamTrackProcessor' in window) {
    return await captureWithWebCodecs(video, scale);
  } else {
    // フォールバック: Canvas
    showPerformanceWarning();
    return await captureWithCanvas(video, scale);
  }
};

// WebCodecsによるキャプチャ
const captureWithWebCodecs = async (video: HTMLVideoElement, scale: number): Promise<Blob> => {
  // WebCodecs実装
  // ...
};

// Canvasによるキャプチャ
const captureWithCanvas = async (video: HTMLVideoElement, scale: number): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth * scale;
  canvas.height = video.videoHeight * scale;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
      
      // メモリ解放
      canvas.width = 0;
      canvas.height = 0;
    }, 'image/png');
  });
};

// 連続キャプチャ（メモリ管理）
const captureMultipleFrames = async (timestamps: number[]): Promise<Blob[]> => {
  const results: Blob[] = [];
  
  // 直列処理で実行（並列処理によるOOMを防止）
  for (const ts of timestamps) {
    try {
      const blob = await captureFrame(ts);
      results.push(blob);
      
      // 不要なメモリを解放
      if (results.length > 1) {
        URL.revokeObjectURL(URL.createObjectURL(results[results.length - 2]));
      }
    } catch (error) {
      console.error(`Failed to capture frame at ${ts}:`, error);
    }
  }
  
  return results;
};
```

## 4. Gemini API連携設計

### APIキー管理
```typescript
// APIキー保存
const saveApiKey = async (apiKey: string, modelName: string = 'gemini-2.5-pro'): Promise<void> => {
  await chrome.storage.sync.set({ apiKey, modelName });
};

// APIキー取得
const getApiKey = async (): Promise<{ apiKey: string, modelName: string }> => {
  const result = await chrome.storage.sync.get(['apiKey', 'modelName']);
  return {
    apiKey: result.apiKey || '',
    modelName: result.modelName || 'gemini-2.5-pro'
  };
};
```

### API呼び出し
```typescript
// Background Scriptでの実装
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_SUMMARY') {
    generateSummary(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスのため
  }
});

// Gemini API呼び出し
const generateSummary = async (data: { videoUrl: string, language: string, frameSamples?: string[] }): Promise<any> => {
  const { apiKey, modelName } = await getApiKey();
  if (!apiKey) throw new Error('API key not set');
  
  const prompt = `あなたはソフトウェア解説者です。以下の YouTube 動画を分析し、
各重要ステップを <timestamp> <title> <description> <code> 形式で
出力してください。省略なしで詳細に記述してください。`;
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { text: `動画URL: ${data.videoUrl}` },
              { text: `言語: ${data.language || 'ja'}` },
              ...(data.frameSamples ? data.frameSamples.map(sample => ({ inlineData: { data: sample, mimeType: 'image/png' } })) : [])
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40
        }
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API error: ${error.error?.message || 'Unknown error'}`);
  }
  
  return await response.json();
};
```

## 5. 多言語対応設計

### 言語リソース管理
```typescript
// 言語リソース
const translations = {
  en: {
    generateSummary: 'Generate Summary',
    captureSnapshot: 'Take Snapshot',
    captureAll: 'Capture All',
    apiKeySettings: 'API Key Settings',
    drmWarning: 'DRM content detected. Snapshot feature is disabled.',
    performanceWarning: 'WebCodecs not available. Using fallback method with reduced performance.',
    // ...その他の翻訳キー
  },
  ja: {
    generateSummary: '要約を生成',
    captureSnapshot: 'スナップショット',
    captureAll: '全て撮影',
    apiKeySettings: 'APIキー設定',
    drmWarning: 'DRMコンテンツが検出されました。スナップショット機能は無効化されています。',
    performanceWarning: 'WebCodecsが利用できません。パフォーマンスが低下する代替方法を使用します。',
    // ...その他の翻訳キー
  }
};

// 言語検出と適用
const detectLanguage = (): 'en' | 'ja' => {
  // YouTubeの言語設定またはブラウザの言語設定から検出
  const htmlLang = document.documentElement.lang;
  return htmlLang.startsWith('ja') ? 'ja' : 'en';
};

// 翻訳関数
const t = (key: string): string => {
  const lang = detectLanguage();
  return translations[lang][key] || translations['en'][key] || key;
};
```

## 6. ディレクトリ構造と主要ファイル

```
/extension
 ├─ /public
 │   └─ _locales/  // 多言語リソース
 │       ├─ en/
 │       │   └─ messages.json
 │       └─ ja/
 │           └─ messages.json
 ├─ /src
 │   ├─ /components
 │   │   ├─ ActionButtons.tsx  // 要約・スナップショットボタン
 │   │   ├─ OutlineItem.tsx    // 要約アイテム
 │   │   ├─ OutlineList.tsx    // 要約リスト
 │   │   ├─ OverlayPanel.tsx   // メインパネル
 │   │   └─ SnapshotPreview.tsx // スナップショットプレビュー
 │   ├─ /lib
 │   │   ├─ captureFrame.ts    // スナップショット取得ロジック
 │   │   ├─ domObserver.ts     // DOM監視
 │   │   ├─ gemini.ts          // Gemini API連携
 │   │   ├─ i18n.ts            // 多言語対応
 │   │   ├─ playerState.ts     // プレイヤー状態管理
 │   │   ├─ storage.ts         // 設定保存
 │   │   └─ types.ts           // 型定義
 │   ├─ /machines              // XState状態マシン
 │   │   ├─ appMachine.ts      // アプリケーション状態
 │   │   ├─ playerMachine.ts   // プレイヤー状態
 │   │   └─ snapshotMachine.ts // スナップショット状態
 │   ├─ background.ts          // service_worker
 │   ├─ contentScript.tsx      // React root
 │   ├─ options.html           // オプションページHTML
 │   ├─ options.tsx            // オプションページReact
 │   └─ manifest.json          // 拡張マニフェスト
 └─ vite.config.ts             // ビルド設定
```

## 7. 実装計画

1. **プロジェクト初期化**
   - Vite + React + TypeScript + Tailwind + shadcn/ui のセットアップ
   - 必要なパッケージのインストール

2. **基本構造の実装**
   - manifest.json の作成
   - ディレクトリ構造の作成
   - 基本的なコンポーネントの実装

3. **コア機能の実装**
   - DOM監視とレイアウト調整
   - スナップショット取得ロジック
   - Gemini API連携
   - 状態管理の実装

4. **UI実装**
   - オーバーレイパネル
   - 要約リスト
   - スナップショットプレビュー
   - オプションページ

5. **フェイルセーフ機能の実装**
   - DRM検出と警告表示
   - メモリ管理と解像度制限
   - エラーハンドリング

6. **多言語対応の実装**
   - 言語リソースの作成
   - 言語検出と適用

7. **テストと検証**
   - 各機能のテスト
   - エッジケースの検証

8. **ドキュメント作成と納品準備**
   - README（英語・日本語）の作成
   - デモ動画の作成
   - ビルドと最終チェック
