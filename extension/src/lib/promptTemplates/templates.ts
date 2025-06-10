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
# 全体的な指示
- **目的**: このアウトラインは、視聴者が動画の主要な内容と流れを素早く把握するためのものです。
- **形式**: 各アウトライン項目は \`[HH:MM:SS] タイトル: 説明\` の形式で記述してください。

# タイムスタンプとセグメント化に関する最重要指示
- **タイムスタンプの定義**: 各タイムスタンプは、動画内でそのトピックやシーンが**実際に開始される正確な時刻 (HH:MM:SS)** を示してください。
- **内容の区切りの重視**: タイムスタンプは、単なる時間経過や機械的な間隔ではなく、**動画の物語上、または情報伝達上の明確な区切り**（例: 主要な話題の転換、新しいセクションの開始、デモンストレーションの開始、場面の大きな変化、キーパーソンの登場と発言の開始など）に基づいて決定してください。
- **過度な細分化の厳禁**:
    - **短すぎるセグメントの回避**: 数秒から数十秒で終わるような細かすぎる事象の連続に対して、それぞれ個別のタイムスタンプを割り当てるのは避けてください。
    - **類似イベントの集約**: 短時間で連続して発生する類似の細かいイベント（例: 参加者紹介の連続、短いカットの連続したモンタージュシーンなど）は、それらを**1つの代表的なタイムスタンプと説明に集約**してください。例えば、「[HH:MM:SS] 参加者紹介シーン全体: 多数の参加者が連続して紹介される」や「[HH:MM:SS] 試合のハイライトシーン: 緊張感のあるプレイが連続する」のように、一連のイベントをまとめてください。
- **タイムスタンプ間の適切な間隔**: 結果として、各タイムスタンプ間には、内容的に意味のある時間的間隔（通常は少なくとも数十秒から数分）が空くことを期待します。ただし、動画の構成によってはこの限りではありません。
- **検証可能性**: 生成された各タイムスタンプは、第三者が動画のその時刻を確認した際に、説明内容の事象がその瞬間に開始されていると明確に同意できるものである必要があります。

# タイトルと説明
- **タイトル**: そのセグメントの内容を的確に表す、簡潔なタイトルを付けてください。
- **説明**: 各ポイントの説明は、そのシーンの内容を100文字以内で具体的に記述してください。

# ポイント数
- 動画全体を網羅し、**およそ{numPoints}個（ただし、動画の内容に応じて最小5個から最大30個の範囲）**の重要なポイントを抽出してください。動画が非常に短い場合や内容が単調な場合は、ポイント数が少なくなることを許容します。

# 期待する出力形式の例 (内容に基づいたタイムスタンプ)
[00:01:23] 新機能のデモンストレーション開始: 新しい分析ツールの使い方を説明。
[00:05:45] ユーザーインタビュー: 既存ユーザーが体験談を語る。 (←前のポイントから数分経過している点に注目)
[00:08:10] Q&Aセッション: よくある質問とその回答。

# 避けるべき出力形式の例 (過度に細分化された、または内容と無関係なタイムスタンプ)
[00:01:00] 参加者A紹介
[00:01:05] 参加者B紹介 (←細かすぎる)
[00:01:10] 参加者C紹介 (←細かすぎる)
[00:02:00] 次の話題 (←機械的な間隔)

- 最初と最後のポイントは動画の冒頭と終盤に設定してください
- 重要なポイントを見逃さないようにしてください
- 動画の内容に関係ないポイントは含めないでください`,

    // スナップショット説明文生成用テンプレート
    snapshotDescription: `YouTube動画 {videoTitle} の{formattedTime}時点のスナップショットです。
画像及び前後のトランスクリプトを元にこの画像の核心を突く日本語説明文を70文字から100文字程度で生成してください。

ガイドライン  
- 前後30〜60秒の発言・画像内テキストから “数値・固有名詞・引用” 等の  
  具体的ディテールを最低1つ盛り込む  
- 冒頭に「画像／シーン」は置かない、タイトル語句も使わない  
- 同一動画内では切り口と言葉選びを変える

{transcriptSection}`
  },

  // 英語テンプレート
  en: {
    // Outline generation template
    outline: `Generate an outline for YouTube video {videoUrl}.
Based on the following information, extract important points from the video in chronological order.

## Video Information
Title: {videoTitle}
Channel: {channelName}
Duration: {videoDuration} seconds

{transcriptSection}
# Overall Instructions
- **Purpose**: This outline is designed to help viewers quickly understand the main content and flow of the video.
- **Format**: Each outline item should be written in the format \`[HH:MM:SS] Title: Description\`.

# Critical Instructions for Timestamps and Segmentation
- **Timestamp Definition**: Each timestamp should indicate the **exact time (HH:MM:SS) when that topic or scene actually begins** in the video.
- **Emphasis on Content Breaks**: Timestamps should be determined based on **clear breaks in the video's narrative or information delivery** (e.g., major topic transitions, beginning of new sections, start of demonstrations, significant scene changes, key person appearances and start of their statements), not merely time progression or mechanical intervals.
- **Strict Prohibition of Excessive Subdivision**:
    - **Avoid Overly Short Segments**: Avoid assigning individual timestamps to overly detailed events that last only seconds to tens of seconds in succession.
    - **Aggregate Similar Events**: Similar minor events that occur consecutively in a short time (e.g., continuous participant introductions, consecutive short cuts in montage scenes) should be **consolidated into one representative timestamp and description**. For example, "[HH:MM:SS] Complete participant introduction scene: Multiple participants are introduced consecutively" or "[HH:MM:SS] Match highlight scene: Tense plays occur in succession."
- **Appropriate Intervals Between Timestamps**: As a result, each timestamp should have meaningful temporal intervals (usually at least tens of seconds to several minutes) between them. However, this may vary depending on the video's structure.
- **Verifiability**: Each generated timestamp should be such that when a third party checks that time in the video, they can clearly agree that the described event begins at that moment.

# Title and Description
- **Title**: Provide a concise title that accurately represents the content of that segment.
- **Description**: The description for each point should specifically describe the content of that scene within 50 words.

# Number of Points
- Cover the entire video and extract **approximately {numPoints} important points (however, within a range of minimum 5 to maximum 30 depending on the video content)**. If the video is very short or the content is monotonous, fewer points are acceptable.

# Expected Output Format Example (Content-based timestamps)
[00:01:23] New feature demonstration begins: Explaining how to use the new analysis tool.
[00:05:45] User interview: Existing user shares their experience. (←Note several minutes have passed since the previous point)
[00:08:10] Q&A session: Common questions and their answers.

# Output Format Examples to Avoid (Overly subdivided or content-irrelevant timestamps)
[00:01:00] Participant A introduction
[00:01:05] Participant B introduction (←Too detailed)
[00:01:10] Participant C introduction (←Too detailed)
[00:02:00] Next topic (←Mechanical interval)

- Set the first and last points at the beginning and end of the video
- Don't miss important points
- Don't include points unrelated to the video content`,

    // スナップショット説明文生成用テンプレート
    snapshotDescription: `This is a snapshot at {formattedTime} from the YouTube video {videoTitle}.

Task: Turn the snapshot at {formattedTime} into a 30–50 words English caption  
that spotlights a key detail.  

Guidelines  
- Pull at least one concrete element (figure, proper noun, quote) from the  
  transcript or on-screen text.  
- Do not start with generic scene phrases or timestamps, repeat title words.  
- Refresh angle and diction for each caption in the same video.

{transcriptSection}`
  },

  // 中国語（簡体字）テンプレート
  'zh-CN': {
    // アウトライン生成用テンプレート
    outline: `请为YouTube视频 {videoUrl} 生成大纲。
基于以下信息，按时间顺序提取视频的重要要点。

## 视频信息
标题: {videoTitle}
频道: {channelName}
时长: {videoDuration}秒

{transcriptSection}
# 总体指示
- **目的**: 此大纲旨在帮助观众快速了解视频的主要内容和流程。
- **格式**: 每个大纲项目应以 \`[HH:MM:SS] 标题: 描述\` 的格式编写。

# 时间戳和分段的重要指示
- **时间戳定义**: 每个时间戳应指示该主题或场景在视频中**实际开始的准确时间 (HH:MM:SS)**。
- **强调内容断点**: 时间戳应基于**视频叙述或信息传递中的明确断点**（例如：主要话题转换、新章节开始、演示开始、重要场景变化、关键人物出现及其发言开始等）来确定，而不是仅仅基于时间进展或机械间隔。
- **严格禁止过度细分**:
    - **避免过短片段**: 避免为连续发生且仅持续几秒到几十秒的过于详细的事件分配单独的时间戳。
    - **聚合相似事件**: 在短时间内连续发生的相似小事件（例如：连续的参与者介绍、蒙太奇场景中的连续短镜头）应**合并为一个代表性的时间戳和描述**。例如，"[HH:MM:SS] 完整参与者介绍场景：多位参与者被连续介绍"或"[HH:MM:SS] 比赛精彩片段：紧张的比赛连续进行"。
- **时间戳间的适当间隔**: 因此，每个时间戳之间应有有意义的时间间隔（通常至少几十秒到几分钟）。但这可能因视频结构而异。
- **可验证性**: 生成的每个时间戳应该是这样的：当第三方检查视频中的该时间时，他们可以清楚地同意所描述的事件在那一刻开始。

# 标题和描述
- **标题**: 提供准确代表该片段内容的简洁标题。
- **描述**: 每个要点的描述应在100个字符内具体描述该场景的内容。

# 要点数量
- 覆盖整个视频并提取**大约 {numPoints} 个重要要点（但根据视频内容在最少5个到最多30个的范围内）**。如果视频很短或内容单调，较少的要点是可以接受的。

# 预期输出格式示例（基于内容的时间戳）
[00:01:23] 新功能演示开始：解释如何使用新的分析工具。
[00:05:45] 用户访谈：现有用户分享他们的体验。（←注意与前一个要点间隔了几分钟）
[00:08:10] 问答环节：常见问题及其答案。

# 应避免的输出格式示例（过度细分或与内容无关的时间戳）
[00:01:00] 参与者A介绍
[00:01:05] 参与者B介绍（←过于详细）
[00:01:10] 参与者C介绍（←过于详细）
[00:02:00] 下一个话题（←机械间隔）

- 将第一个和最后一个要点设置在视频的开头和结尾
- 不要遗漏重要要点
- 不要包含与视频内容无关的要点`,

    // スナップショット説明文生成用テンプレート
    snapshotDescription: `这是 YouTube 视频 {videoTitle} 在 {formattedTime} 时间点的截图。

任务：将 {formattedTime} 时的截图转化为 60-90 字的中文说明，
突出关键细节。

指南
- 从字幕或屏幕文本中提取至少一个具体元素（数字、专有名词、引用语）
- 不要以通用场景短语或时间戳开头，不要重复标题词语
- 在同一视频的不同截图中更新角度和描述方式

{transcriptSection}`
  },

  // 韓国語テンプレート
  ko: {
    // アウトライン生成用テンプレート
    outline: `YouTube 동영상 {videoUrl}의 개요를 생성해주세요.
다음 정보를 바탕으로 동영상의 중요한 포인트를 시간순으로 추출해주세요.

## 동영상 정보
제목: {videoTitle}
채널: {channelName}
길이: {videoDuration}초

{transcriptSection}
# 전체적인 지시사항
- **목적**: 이 개요는 시청자가 동영상의 주요 내용과 흐름을 빠르게 파악하기 위한 것입니다.
- **형식**: 각 개요 항목은 \`[HH:MM:SS] 제목: 설명\` 형식으로 작성해주세요.

# 타임스탬프와 세그먼트화에 관한 중요 지시사항
- **타임스탬프 정의**: 각 타임스탬프는 동영상에서 해당 주제나 장면이 **실제로 시작되는 정확한 시간 (HH:MM:SS)**을 나타내야 합니다.
- **내용 구분점 강조**: 타임스탬프는 단순한 시간 경과나 기계적 간격이 아닌 **동영상의 서사나 정보 전달에서의 명확한 구분점**(예: 주요 주제 전환, 새로운 섹션 시작, 데모 시작, 중요한 장면 변화, 핵심 인물 등장 및 발언 시작 등)을 기반으로 결정되어야 합니다.
- **과도한 세분화 엄격 금지**:
    - **너무 짧은 세그먼트 피하기**: 연속적으로 발생하며 몇 초에서 몇십 초만 지속되는 지나치게 세부적인 사건들에 개별 타임스탬프를 할당하는 것을 피하세요.
    - **유사한 이벤트 통합**: 짧은 시간 내에 연속적으로 발생하는 유사한 소규모 이벤트들(예: 연속된 참가자 소개, 몽타주 장면의 연속된 짧은 컷들)은 **하나의 대표적인 타임스탬프와 설명으로 통합**해야 합니다. 예를 들어, "[HH:MM:SS] 완전한 참가자 소개 장면: 여러 참가자가 연속적으로 소개됨" 또는 "[HH:MM:SS] 경기 하이라이트 장면: 긴장감 있는 플레이가 연속됨"과 같이 작성하세요.
- **타임스탬프 간의 적절한 간격**: 결과적으로 각 타임스탬프 간에는 의미 있는 시간 간격(보통 최소 몇십 초에서 몇 분)이 있어야 합니다. 다만 동영상 구조에 따라 달라질 수 있습니다.
- **검증 가능성**: 생성된 각 타임스탬프는 제3자가 동영상의 해당 시간을 확인했을 때, 설명된 사건이 그 순간에 시작된다는 것에 명확히 동의할 수 있는 것이어야 합니다.

# 제목과 설명
- **제목**: 해당 세그먼트의 내용을 정확하게 나타내는 간결한 제목을 제공하세요.
- **설명**: 각 포인트의 설명은 해당 장면의 내용을 100자 이내로 구체적으로 기술해야 합니다.

# 포인트 수
- 전체 동영상을 포괄하며 **약 {numPoints}개의 중요한 포인트(단, 동영상 내용에 따라 최소 5개에서 최대 30개 범위 내)**를 추출하세요. 동영상이 매우 짧거나 내용이 단조로운 경우 더 적은 포인트도 허용됩니다.

# 예상 출력 형식 예시 (내용 기반 타임스탬프)
[00:01:23] 새로운 기능 데모 시작: 새로운 분석 도구 사용법 설명.
[00:05:45] 사용자 인터뷰: 기존 사용자가 경험담을 공유함. (←이전 포인트로부터 몇 분이 지났음에 주목)
[00:08:10] Q&A 세션: 자주 묻는 질문과 답변.

# 피해야 할 출력 형식 예시 (과도하게 세분화되거나 내용과 무관한 타임스탬프)
[00:01:00] 참가자 A 소개
[00:01:05] 참가자 B 소개 (←너무 세부적)
[00:01:10] 참가자 C 소개 (←너무 세부적)
[00:02:00] 다음 주제 (←기계적 간격)

- 첫 번째와 마지막 포인트는 동영상의 시작과 끝에 설정하세요
- 중요한 포인트를 놓치지 마세요
- 동영상 내용과 관련 없는 포인트는 포함하지 마세요`,

    // 스냅샷 설명文生成用テンプレート
    snapshotDescription: `이것은 YouTube 동영상 {videoTitle}의 {formattedTime} 시점 스냅샷입니다.

작업: {formattedTime} 시점의 스냅샷을 30-50단어의 한국어 설명으로 변환하여
핵심 세부 사항을 부각해 주세요.

지침
- 자막이나 화면에 표시된 텍스트에서 최소한 하나의 구체적 요소(숫자, 고유 명사, 인용문)를 추출해 주세요
- 일반적인 장면 구문이나 타임스킬프로 시작하지 마시고, 제목 단어를 반복하지 마세요
- 동일한 동영상의 서로 다른 스냅샷에서 관점과 표현 방식을 새롭게 해주세요

{transcriptSection}`
  }
};
