/**
 * デフォルトのプロンプトテンプレート
 */
import { Templates } from './types';

/**
 * デフォルトのテンプレート
 * 言語コードごとに異なるテンプレートを定義
 */
export const defaultTemplates: Templates = {
  // 日本語テンプレート
  ja: {
    // アウトライン生成用テンプレート
    outline: `YouTube動画 {videoUrl} のアウトラインを生成してください。
以下の情報を元に、動画の重要なポイントを時系列順に抽出してください。

## 動画情報
タイトル: {videoTitle}
チャンネル: {channelName}
長さ: {videoDuration}秒

{transcriptSection}

## 指示
- {numPoints}個程度のポイントを抽出してください
- 各ポイントには以下の情報を含めてください:
  - タイムスタンプ（秒）
  - タイトル（短く簡潔に）
  - 説明（オプション、短く）
- 出力は以下の形式で、JSONとして解析可能な形式にしてください:
\`\`\`json
[
  {"timestamp": 123, "title": "タイトル例", "description": "説明例"},
  ...
]
\`\`\`
- タイムスタンプは秒単位の数値（例: 65）で、動画の実際の内容に合わせてください
- 最初と最後のポイントは動画の冒頭と終盤に設定してください
- 重要なポイントを見逃さないようにしてください
- 動画の内容に関係ないポイントは含めないでください`,

    // スナップショット説明文生成用テンプレート
    snapshotDescription: `YouTube動画 {videoUrl} の{formattedTime}時点のスナップショットです。
画像及び前後のトランスクリプトを元にこの画像の説明文を70文字から100文字程度で生成してください。
- この画像は や このシーンは といった説明文を生成してはいけません。
- また、動画タイトルに含まれる言葉を繰り返す説明文を生成してはいけません。
- 添付の画像に文字情報が含まれている場合は、それらを優先して説明文を生成してください。

{transcriptSection}`
  },

  // 英語テンプレート
  en: {
    // アウトライン生成用テンプレート
    outline: `Please generate an outline for the YouTube video {videoUrl}.
Extract important points in chronological order based on the following information.

## Video Information
Title: {videoTitle}
Channel: {channelName}
Length: {videoDuration} seconds

{transcriptSection}

## Instructions
- Extract approximately {numPoints} points
- Include the following information for each point:
  - Timestamp (in seconds)
  - Title (short and concise)
  - Description (optional, brief)
- Format the output as follows, ensuring it can be parsed as JSON:
\`\`\`json
[
  {"timestamp": 123, "title": "Example Title", "description": "Example description"},
  ...
]
\`\`\`
- Timestamps should be numeric values in seconds (e.g., 65) and should match the actual content of the video
- Set the first and last points at the beginning and end of the video
- Make sure not to miss any important points
- Do not include points that are not related to the video content`,

    // スナップショット説明文生成用テンプレート
    snapshotDescription: `This is a snapshot at {formattedTime} from the YouTube video {videoUrl}.
Please generate a description of this image based on the image and surrounding transcript, approximately 70-100 characters in length.
- Do not start with phrases like "This image shows" or "This scene is".
- Do not repeat words from the video title in your description.
- If there is text information in the attached image, prioritize that when generating the description.

{transcriptSection}`
  }
};
