// 多言語対応機能
import { getSettings } from './storage';
import { flags } from './flags';

// Chromeの_localesのmessages.jsonファイルの型定義
type LocaleMessage = {
  message: string;
  description?: string;
};

// デバッグ用のフラグ
const DEBUG_I18N = false; // デバッグログを無効化

// デバッグログ出力（無効化）
function logDebug(...args: any[]) {
  // デバッグログ出力は無効化されています
  // 必要な場合は DEBUG_I18N を true に設定してください
}

// _localesディレクトリのメッセージは Chrome API でアクセスできるため、自前ローダーは不要

// 最後に使用された言語をキャッシュ
let lastUsedLanguage: 'en' | 'ja' | 'zh-CN' | 'ko' | null = null;

// 言語ごとのメッセージ
const messages: Record<string, Record<string, string>> = {
  en: {},
  ja: {},
  'zh-CN': {},
  ko: {}
};

// 初期化済みフラグ
let initialized = false;

/**
 * メッセージを初期化する
 * 拡張機能の _locales から直接読み込むことはできないため、
 * 必要なメッセージを手動で定義
 */
function initializeMessages() {
  if (initialized) return;
  
  // 英語のメッセージ
  messages.en = {
    'overlay_capture_all': 'Capture All',
    'overlay_generate_outline': 'Generate Outline',
    'overlay_delete_all': 'Delete All',
    'overlay_export': 'Export',
    'overlay_edit': 'Edit',
    'overlay_delete': 'Delete',
    'overlay_save': 'Save',
    'overlay_cancel': 'Cancel',
    'overlay_loading': 'Generating...',
    'overlay_no_snapshots': 'No snapshots yet',
    'overlay_no_outline': 'No outline available',
    'overlay_custom_snapshots': 'Multiple Custom Snapshots',
    'custom_timestamp': 'Custom timestamp',
    'custom_timestamp_description': 'Snapshot taken at custom timestamp',
    'no_valid_timestamps': 'No valid timestamps available.',
    'current_language': 'Current language',
    'ai_description_generating': 'Generating AI description...',
    'error_prefix': 'Error:',
    'retry': 'Retry',
    'ai_regenerate': 'AI Regenerate',
    'ai_generate': 'Generate AI Description',
    'no_description': 'No description available.',
    'time_prefix': 'Time:',
    'collapse': 'Collapse',
    'expand': 'Expand',
    'scroll_to_top': 'Scroll to top',
    'capture_all_outline_snapshots': 'Capture snapshots at all outline timestamps',
    'timestamp_format': '[{0}]',
    'custom_times_placeholder': '00:01:48,00:03:06,00:03:13',
    'invalid_timestamps_error': 'Invalid timestamps or capture function unavailable.',
    // OutlineEditForm translations
    'edit_outline': 'Edit outline',
    'save_error': 'Error saving',
    'outline_format_instruction': 'Format: [MM:SS] timestamp followed by title, then description (optional)',
    'title_label': 'Title',
    'description_optional': 'Description (optional)',
    'saving': 'Saving...',
    'warning_label': 'Warning',
    'no_transcript_warning': 'The transcript for this video could not be retrieved, so the outline may contain inaccuracies.',
    'outline_heading': 'Outline',
    'delete_outline': 'Delete outline',
    'no_outline_items': 'No outline items found.',
    'options_page_title': 'YT Outline & Snap - Options',
    'storage_usage_heading': 'Storage Usage',
    'storage_used': 'Used',
    'storage_quota': 'Quota',
    'storage_snapshot_count': 'Snapshots',
    'storage_average_size': 'Average size',
    'clear_all_data_button': 'Clear All Data',
    'api_key_settings': 'API Key Settings',
    'api_key_label': 'API Key',
    'api_key_placeholder': 'Enter your Gemini API Key (or other model\'s API key)',
    'model_name_label': 'Model Name',
    'model_name_placeholder': 'e.g. gemini-1.5-flash-latest',
    'recommended_model_text': 'Recommended model: gemini-2.5-flash-preview-05-20 is recommended.',
    'advanced_settings_heading': 'Advanced Settings',
    'max_resolution_label_long': 'Max Resolution for Snapshots',
    'high_resolution_warning_long': 'Higher resolutions consume more storage and may take longer to process.',
  };
  
  // 日本語のメッセージ
  messages.ja = {
    'overlay_capture_all': 'すべてキャプチャ',
    'overlay_generate_outline': 'アウトライン生成',
    'overlay_delete_all': 'すべて削除',
    'overlay_export': 'エクスポート',
    'overlay_edit': '編集',
    'overlay_delete': '削除',
    'overlay_save': '保存',
    'overlay_cancel': 'キャンセル',
    'overlay_loading': '生成中...',
    'overlay_no_snapshots': 'スナップショットがありません',
    'overlay_no_outline': 'アウトラインがありません',
    'overlay_custom_snapshots': '複数のカスタムスナップショット',
    'custom_timestamp': 'カスタムタイムスタンプ',
    'custom_timestamp_description': 'カスタムタイムスタンプで撮影されたスナップショット',
    'no_valid_timestamps': '有効なタイムスタンプがありません。',
    'current_language': '現在の言語',
    'ai_description_generating': 'AI説明文を生成中...',
    'error_prefix': 'エラー:',
    'retry': '再試行',
    'ai_regenerate': 'AI再生成',
    'ai_generate': 'AI説明文を生成',
    'no_description': '説明がありません。',
    'time_prefix': '時間:',
    'collapse': '折りたたむ',
    'expand': '展開',
    'scroll_to_top': '上にスクロール',
    'capture_all_outline_snapshots': 'アウトラインのすべてのタイムスタンプでスナップショットを撮影',
    'timestamp_format': '[{0}]',
    'custom_times_placeholder': '00:01:48,00:03:06,00:03:13',
    'invalid_timestamps_error': '無効なタイムスタンプまたはキャプチャ機能が利用できません。',
    // OutlineEditForm translations
    'edit_outline': 'アウトラインを編集',
    'save_error': '保存エラー',
    'outline_format_instruction': '形式: [MM:SS] タイムスタンプの後にタイトル、そして説明（任意）',
    'title_label': 'タイトル',
    'description_optional': '説明（任意）',
    'saving': '保存中...',
    'warning_label': '警告',
    'no_transcript_warning': 'この動画の文字起こしを取得できなかったため、アウトラインに不正確な情報が含まれている可能性があります。',
    'outline_heading': 'アウトライン',
    'delete_outline': 'アウトラインを削除',
    'no_outline_items': 'アウトラインアイテムが見つかりません。',
    'options_page_title': 'YT アウトライン & スナップ - オプション',
    'storage_usage_heading': 'ストレージ使用量',
    'storage_used': '使用済み',
    'storage_quota': '割り当て',
    'storage_snapshot_count': 'スナップショット数',
    'storage_average_size': '平均サイズ',
    'clear_all_data_button': 'すべてのデータを消去',
    'api_key_settings': 'APIキー設定',
    'api_key_label': 'APIキー',
    'api_key_placeholder': 'GeminiのAPIキー（または他のモデルのAPIキー）を入力',
    'model_name_label': 'モデル名',
    'model_name_placeholder': '例：gemini-1.5-flash-latest',
    'recommended_model_text': '推奨モデル: gemini-2.5-flash-preview-05-20 がおすすめです。',
    'advanced_settings_heading': '詳細設定',
    'max_resolution_label_long': 'スナップショットの最大解像度',
    'high_resolution_warning_long': '高解像度はストレージを多く消費し、処理に時間がかかる場合があります。',
  };

  // 中国語（簡体字）のメッセージ
  messages['zh-CN'] = {
    'overlay_capture_all': '捕获全部',
    'overlay_generate_outline': '生成大纲',
    'overlay_delete_all': '删除全部',
    'overlay_export': '导出',
    'overlay_edit': '编辑',
    'overlay_delete': '删除',
    'overlay_save': '保存',
    'overlay_cancel': '取消',
    'overlay_loading': '生成中...',
    'overlay_no_snapshots': '尚无快照',
    'overlay_no_outline': '无可用大纲',
    'overlay_custom_snapshots': '多个自定义快照',
    'custom_timestamp': '自定义时间戳',
    'custom_timestamp_description': '在自定义时间戳拍摄的快照',
    'no_valid_timestamps': '没有有效的时间戳。',
    'current_language': '当前语言',
    'ai_description_generating': '正在生成AI描述...',
    'error_prefix': '错误:',
    'retry': '重试',
    'ai_regenerate': 'AI重新生成',
    'ai_generate': '生成AI描述',
    'no_description': '无可用描述。',
    'time_prefix': '时间:',
    'collapse': '折叠',
    'expand': '展开',
    'scroll_to_top': '滚动到顶部',
    'capture_all_outline_snapshots': '捕获所有大纲时间戳的快照',
    'timestamp_format': '[{0}]',
    'custom_times_placeholder': '00:01:48,00:03:06,00:03:13',
    'invalid_timestamps_error': '无效的时间戳或捕获功能不可用。',
    // OutlineEditForm translations
    'edit_outline': '编辑大纲',
    'save_error': '保存错误',
    'outline_format_instruction': '格式：[MM:SS] 时间戳后跟标题，然后是描述（可选）',
    'title_label': '标题',
    'description_optional': '描述（可选）',
    'saving': '保存中...',
    'warning_label': '警告',
    'no_transcript_warning': '无法获取此视频的文字记录，因此大纲可能包含不准确之处。',
    'outline_heading': '大纲',
    'delete_outline': '删除大纲',
    'no_outline_items': '未找到大纲项目。',
    'options_page_title': 'YT大纲和快照 - 选项',
    'storage_usage_heading': '存储使用情况',
    'storage_used': '已使用',
    'storage_quota': '配额',
    'storage_snapshot_count': '快照数',
    'storage_average_size': '平均大小',
    'clear_all_data_button': '清除所有数据',
    'api_key_settings': 'API密钥设置',
    'api_key_label': 'API密钥',
    'api_key_placeholder': '输入你的Gemini API密钥（或其他模型的API密钥）',
    'model_name_label': '模型名称',
    'model_name_placeholder': '例如：gemini-1.5-flash-latest',
    'recommended_model_text': '推荐模型：建议使用 gemini-2.5-flash-preview-05-20。',
    'advanced_settings_heading': '高级设置',
    'max_resolution_label_long': '快照的最大分辨率',
    'high_resolution_warning_long': '更高的分辨率会消耗更多存储空间，并可能需要更长的处理时间。',
  };
  
  // 韓国語のメッセージ
  messages.ko = {
    'overlay_capture_all': '모두 캡처',
    'overlay_generate_outline': '개요 생성',
    'overlay_delete_all': '모두 삭제',
    'overlay_export': '내보내기',
    'overlay_edit': '편집',
    'overlay_delete': '삭제',
    'overlay_save': '저장',
    'overlay_cancel': '취소',
    'overlay_loading': '생성 중...',
    'overlay_no_snapshots': '스냅샷이 없습니다',
    'overlay_no_outline': '사용 가능한 개요가 없습니다',
    'overlay_custom_snapshots': '여러 사용자 정의 스냅샷',
    'custom_timestamp': '사용자 정의 타임스탬프',
    'custom_timestamp_description': '사용자 정의 타임스탬프에서 촬영된 스냅샷',
    'no_valid_timestamps': '유효한 타임스탬프가 없습니다.',
    'current_language': '현재 언어',
    'ai_description_generating': 'AI 설명 생성 중...',
    'error_prefix': '오류:',
    'retry': '다시 시도',
    'ai_regenerate': 'AI 재생성',
    'ai_generate': 'AI 설명 생성',
    'no_description': '설명이 없습니다.',
    'time_prefix': '시간:',
    'collapse': '접기',
    'expand': '펼치기',
    'scroll_to_top': '맨 위로 스크롤',
    'capture_all_outline_snapshots': '모든 개요 타임스탬프에서 스냅샷 캡처',
    'timestamp_format': '[{0}]',
    'custom_times_placeholder': '00:01:48,00:03:06,00:03:13',
    'invalid_timestamps_error': '타임스탬프가 잘못되었거나 캡처 기능을 사용할 수 없습니다.',
    // OutlineEditForm translations
    'edit_outline': '개요 편집',
    'save_error': '저장 오류',
    'outline_format_instruction': '형식: [MM:SS] 타임스탬프 뒤에 제목, 그 다음 설명(선택 사항)',
    'title_label': '제목',
    'description_optional': '설명(선택 사항)',
    'saving': '저장 중...',
    'warning_label': '경고',
    'no_transcript_warning': '이 동영상의 자막을 가져올 수 없어 개요에 부정확한 내용이 포함될 수 있습니다.',
    'outline_heading': '개요',
    'delete_outline': '개요 삭제',
    'no_outline_items': '개요 항목을 찾을 수 없습니다.',
    'options_page_title': 'YT 개요 및 스냅 - 옵션',
    'storage_usage_heading': '저장소 사용량',
    'storage_used': '사용됨',
    'storage_quota': '할당량',
    'storage_snapshot_count': '스냅샷',
    'storage_average_size': '평균 크기',
    'clear_all_data_button': '모든 데이터 지우기',
    'api_key_settings': 'API 키 설정',
    'api_key_label': 'API 키',
    'api_key_placeholder': 'Gemini API 키(또는 다른 모델의 API 키)를 입력하세요',
    'model_name_label': '모델 이름',
    'model_name_placeholder': '예: gemini-1.5-flash-latest',
    'recommended_model_text': '추천 모델: gemini-2.5-flash-preview-05-20이 권장됩니다.',
    'advanced_settings_heading': '고급 설정',
    'max_resolution_label_long': '스냅샷의 최대 해상도',
    'high_resolution_warning_long': '높은 해상도는 더 많은 저장 공간을 사용하고 처리 시간이 더 오래 걸릴 수 있습니다.',
  };
  
  initialized = true;
  logDebug('メッセージを初期化しました');
}

/**
 * 翻訳キーを取得する
 * @deprecated 代わりに t() を使用してください
 */
export const getMessage = (key: string, substitutions?: string | string[]): string => {
  return chrome.i18n.getMessage(key, substitutions);
};

/**
 * 現在の言語を取得する
 * 1. settings.language を優先
 * 2. chrome.i18n.getUILanguage() にフォールバック
 */
export const getCurrentLanguage = async (): Promise<'en' | 'ja' | 'zh-CN' | 'ko'> => {
  try {
    // 設定から言語設定を取得（同期的に取得できないため非同期関数を使用）
    const settings = await getSettings();
    
    if (settings?.language) {
      logDebug(`設定から言語を取得: ${settings.language}`);
      lastUsedLanguage = settings.language as 'en' | 'ja' | 'zh-CN' | 'ko';
      return lastUsedLanguage;
    }
  } catch (error) {
    console.error('言語設定の取得に失敗:', error);
  }
  
  // 設定がない場合はブラウザのUIロケールを使用
  const locale = chrome.i18n.getUILanguage();
  let detectedLang: 'en' | 'ja' | 'zh-CN' | 'ko' = 'en';
  
  // 言語を検出
  if (locale.startsWith('ja')) {
    detectedLang = 'ja';
  } else if (locale.startsWith('zh-CN') || locale.startsWith('zh-Hans')) {
    detectedLang = 'zh-CN';
  } else if (locale.startsWith('ko')) {
    detectedLang = 'ko';
  } else {
    detectedLang = 'en';
  }
  
  logDebug(`ブラウザのUIロケールから言語を検出: ${locale} => ${detectedLang}`);
  lastUsedLanguage = detectedLang;
  return detectedLang;
};

/**
 * 同期版の言語取得（フォールバックのみ）
 * 非同期処理ができない場所で使用
 */
export const getCurrentLanguageSync = (): 'en' | 'ja' | 'zh-CN' | 'ko' => {
  // キャッシュされた言語があればそれを使用
  if (lastUsedLanguage) {
    logDebug(`キャッシュされた言語を使用: ${lastUsedLanguage}`);
    return lastUsedLanguage;
  }
  
  // キャッシュがない場合はブラウザのUIロケールを使用
  const locale = chrome.i18n.getUILanguage();
  let detectedLang: 'en' | 'ja' | 'zh-CN' | 'ko' = 'en';
  
  // 言語を検出
  if (locale.startsWith('ja')) {
    detectedLang = 'ja';
  } else if (locale.startsWith('zh-CN') || locale.startsWith('zh-Hans')) {
    detectedLang = 'zh-CN';
  } else if (locale.startsWith('ko')) {
    detectedLang = 'ko';
  } else {
    detectedLang = 'en';
  }
  
  logDebug(`同期処理: ブラウザのUIロケールから言語を検出: ${locale} => ${detectedLang}`);
  lastUsedLanguage = detectedLang;
  return detectedLang;
};

/**
 * 翻訳キーを取得する新API
 * @param key 翻訳キー
 * @param fallback フォールバックテキスト（省略可）
 * @param forcedLang 強制的に使用する言語（省略可）
 * @returns 翻訳されたテキスト、またはフォールバック、またはキー自体
 */
export const t = (key: string, fallback = '', forcedLang?: 'en' | 'ja' | 'zh-CN' | 'ko'): string => {
  // フィーチャーフラグがオフの場合はフォールバックまたはキーをそのまま返す
  if (!flags.ENABLE_I18N_OVERLAY) {
    logDebug(`多言語フラグが無効です。フォールバックまたはキーを返します: ${fallback || key}`);
    return fallback || key;
  }
  
  const lang = forcedLang || getCurrentLanguageSync();
  logDebug(`t関数呼び出し: key=${key}, lang=${lang}`);
  return tForced(key, fallback, lang);
};

/**
 * Chromeの_localesディレクトリから翻訳メッセージを取得する
 * @param key 翻訳キー
 * @param lang 言語コード（指定しない場合は現在の言語を使用）
 * @returns 翻訳されたメッセージまたは空文字列
 */
export const getLocaleMessage = (key: string, lang?: 'en' | 'ja' | 'zh-CN' | 'ko'): string => {
  // Chromeのi18n APIを使用してメッセージを取得
  return chrome.i18n.getMessage(key) || '';
};

/**
 * 指定された言語で翻訳キーを取得する
 * @param key 翻訳キー
 * @param fallback フォールバックテキスト（省略可）
 * @param lang 言語コード（'en'、'ja'、'zh-CN'、または'ko'）
 * @returns 翻訳されたテキスト、またはフォールバック、またはキー自体
 */
export const tForced = (key: string, fallback = '', lang: 'en' | 'ja' | 'zh-CN' | 'ko' = 'en'): string => {
  // メッセージを初期化
  if (!initialized) {
    logDebug('メッセージ辞書を初期化します');
    initializeMessages();
  }
  
  logDebug(`tForced呼び出し: key=${key}, lang=${lang}, flags.ENABLE_I18N_OVERLAY=${flags.ENABLE_I18N_OVERLAY}`);
  
  // フラグが無効な場合は早期リターン
  if (!flags.ENABLE_I18N_OVERLAY) {
    logDebug(`多言語フラグが無効です。フォールバックまたはキーを返します: ${fallback || key}`);
    return fallback || key;
  }
  
  // 1. まず言語固有のカスタム辞書から取得（オーバーレイUIなど）
  if (messages[lang] && messages[lang][key]) {
    logDebug(`カスタム辞書から翻訳を取得 (${lang}): ${messages[lang][key]}`);
    return messages[lang][key];
  }
  
  // 2. 次にChromeの_localesディレクトリからメッセージを取得（自前ローダー）
  const localeMessage = getLocaleMessage(key);
  if (localeMessage) {
    logDebug(`Chromeの_localesから翻訳を取得: ${localeMessage}`);
    return localeMessage;
  }
  
  // 3. 次にChrome i18n APIで試す（オプションページなど、一部の翻訳はこちらを使用）
  const chromeMessage = chrome.i18n.getMessage(key);
  if (chromeMessage) {
    logDebug(`Chrome i18n APIから翻訳を取得: ${chromeMessage}`);
    return chromeMessage;
  }
  
  // 4. 最後にフォールバックまたはキー自体を返す
  logDebug(`翻訳が見つかりません。フォールバックまたはキーを返します: ${fallback || key}`);
  return fallback || key;
};
