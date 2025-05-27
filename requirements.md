# YouTube Watch オーバーレイ拡張「YT Outline & Snap」要件整理

## 1. 技術スタックと制約

### 基本構成
- **Manifest**: V3 (`service_worker`)
- **UI**: React 18 + TypeScript 5 + Tailwind 3 + shadcn/ui (Radix-based)
- **ビルド**: Vite + esbuild（`webext-build` 推奨）
- **対応ブラウザ**: Chrome 117+ / Edge 117+（WebCodecs 対応必須）
- **外部依存**: `type-fest`, `xstate` のみ許可

### API連携
- **Gemini API**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent`
- **API キー**: 拡張オプションで設定 & chrome.storage.sync で保存

### スナップショット技術
- **基本**: watch ページ内で `<video>` ➜ `<canvas>` (`crossOrigin="anonymous"`)
- **優先**: WebCodecs (`MediaStreamTrackProcessor`) があれば優先使用
- **フォールバック**: Canvas による代替処理（パフォーマンス低下を告知）

## 2. 主要機能

### オーバーレイUI
- YouTube の watch ページ右上にモダンなオーバーレイ UI
- パネル幅 ~380 px、ダーク＋ライト両テーマに追従
- `shadcn/ui` の `Button`, `Card`, `ScrollArea` を利用

### 要約生成機能
- Gemini 2.5 Pro API を呼び出し
- 動画のトランスクリプト＋画面内のコード／設定値／操作を解析
- 重要ポイントをタイムスタンプ順に抽出（省略禁止）
- 抽出アウトラインをパネルに表示
  - 各行：`[timestamp link] Step名 — 解説 — 付随コード全文`
  - 行右端にミニカメラアイコン（クリックでその時点を自動撮影）

### スナップショット機能
- 現在のフレームを PNG 保存
- 「自動撮影」ボタンで全アウトラインのタイムスタンプを一括キャプチャ
- 取得後は `URL.createObjectURL` でプレビューしつつ自動ダウンロード

## 3. フェイルセーフ機能

### DOM変化対応
- MutationObserver + 再レイアウト関数に一本化
- YouTube DOM 変化に追随（`yt-page-data-updated` イベントで再マウント）
- アンカー要素を固定せずプレイヤーの getBoundingClientRect() を毎フレーム計算しない設計（リサイズ時のみ）

### 広告/DRM対応
- video.webkitDecodedFrameCount が常に 0 なら DRM とみなし、機能を自動無効化＋UIで警告表示
- 広告表示中の動作安定化

### スナップショット安定化
- 高解像度 4K/8K でのメモリ圧迫対策
  - 連続処理では await で直列化し、不要になった ImageBitmap を close()
  - 最大解像度をユーザ設定 (e.g. 1080p 上限)
- WebCodecs 非対応ブラウザ対応
  - 'MediaStreamTrackProcessor' in window 判定でフォールバック
  - Fallback 時は Canvas で処理しパフォーマンス低下を告知

## 4. 言語対応
- 英語・日本語の両方に対応

## 5. ディレクトリ構成
```
/extension
 ├─ /public
 ├─ /src
 │   ├─ /components
 │   │    OverlayPanel.tsx
 │   │    OutlineItem.tsx
 │   ├─ /lib
 │   │    captureFrame.ts
 │   │    gemini.ts
 │   │    storage.ts
 │   ├─ background.ts      // service_worker
 │   ├─ contentScript.tsx  // React root
 │   ├─ options.html + .tsx
 │   └─ manifest.json
 └─ vite.config.ts
```

## 6. 納品物
- 完全ビルド済み `dist/` + ソース一式
- screencast.mp4（主要機能 60 秒デモ）
- README（英語・日本語）
