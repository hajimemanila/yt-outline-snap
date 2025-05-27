// 多言語対応機能
import { getSettings } from './storage';
import { flags } from './flags';

// デバッグ用のフラグ
const DEBUG_I18N = false;

// デバッグログ出力
function logDebug(...args: any[]) {
  if (DEBUG_I18N) {
    console.log('🔤 I18N:', ...args);
  }
}

// 最後に使用された言語をキャッシュ
let lastUsedLanguage: 'en' | 'ja' | null = null;

// 言語ごとのメッセージ
const messages: Record<string, Record<string, string>> = {
  en: {},
  ja: {}
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
    'recommended_model_text': 'Recommended model: gemini-1.5-flash-preview-05-20 is recommended.',
    'max_resolution_label_long': 'Max Resolution for Snapshots',
    'high_resolution_warning_long': 'Higher resolutions consume more storage and may take longer to process.',
    'language_settings_heading': 'Language Setting',
    'language_select_label': 'Language',
    'language_english': 'English',
    'language_japanese': 'Japanese',
    'language_setting_description': 'Outlines and image descriptions will be generated in the selected language.',
    'beta_features_heading': 'Beta Features',
    'outline_edit_feature_label': 'Enable Outline Editing Feature',
    'outline_edit_description_long': 'Allows direct editing of generated outlines in the overlay panel.',
    'ad_pause_feature_label': 'Enable Ad Auto-Pause/Resume',
    'ad_pause_description_long': 'Automatically pauses video during ads and resumes after. (Experimental)',
    'debug_options_heading': 'Developer Debug Options',
    'debug_warning_text': 'Warning: These settings are for development and debugging.',
    'i18n_overlay_option_label': 'Enable Overlay UI localization',
    'i18n_overlay_description_long': 'Toggles translation of the overlay panel UI elements.',
    'i18n_prompts_option_label': 'Enable AI Prompt localization',
    'i18n_prompts_description_long': 'Toggles translation of prompts sent to AI models. (Experimental)',
    'save_settings_button': 'Save Settings',
    'settings_saved_status': 'Settings Saved!',
    'confirm_clear_data_dialog': 'Are you sure you want to delete ALL data (snapshots, outlines, settings)? This cannot be undone.',
    'clearing_data_status': 'Clearing data...',
    'clear_data_success_status': 'Data cleared successfully.',
    'clear_data_error_status': 'Error clearing data. Please check console.',
    'loading_storage_usage': 'Loading storage usage...'
  };
  
  // 日本語のメッセージ
  messages.ja = {
    'overlay_capture_all': '全て撮影',
    'overlay_generate_outline': 'アウトライン生成',
    'overlay_delete_all': '全て削除',
    'overlay_export': 'エクスポート',
    'overlay_edit': '編集',
    'overlay_delete': '削除',
    'overlay_save': '保存',
    'overlay_cancel': 'キャンセル',
    'overlay_loading': '生成中...',
    'overlay_no_snapshots': 'スナップショットはまだありません',
    'overlay_no_outline': 'アウトラインはありません',
    'overlay_custom_snapshots': '複数カスタムスナップショット',
    'custom_timestamp': 'カスタムタイムスタンプ',
    'custom_timestamp_description': 'カスタム設定されたタイムスタンプでのスナップショット',
    'no_valid_timestamps': '有効なタイムスタンプがありません。',
    'current_language': '現在の言語',
    'ai_description_generating': 'AI説明文生成中...',
    'error_prefix': 'エラー:',
    'retry': '再試行',
    'ai_regenerate': 'AI再生成',
    'ai_generate': 'AI説明生成',
    'no_description': '説明がありません。',
    'time_prefix': '時間:',
    'collapse': '折りたたむ',
    'expand': '展開する',
    'scroll_to_top': 'トップにスクロール',
    'capture_all_outline_snapshots': 'アウトラインの全タイムスタンプでスナップショットを撮影',
    'timestamp_format': '[{0}]',
    'custom_times_placeholder': '00:01:48,00:03:06,00:03:13',
    'invalid_timestamps_error': '無効なタイムスタンプまたは撮影機能が利用できません。',
    // OutlineEditForm translations
    'edit_outline': 'アウトラインを編集',
    'save_error': '保存中にエラーが発生しました',
    'outline_format_instruction': '形式: [MM:SS]形式のタイムスタンプの後にタイトル、続けて説明文（省略可）',
    'title_label': 'タイトル',
    'description_optional': '説明文（省略可）',
    'saving': '保存中...',
    'warning_label': '注意',
    'no_transcript_warning': '対象の動画のトランスクリプトが取得できないため、アウトラインが誤った内容となっている可能性があります',
    'outline_heading': 'アウトライン',
    'delete_outline': 'アウトラインを削除',
    'no_outline_items': 'アウトラインアイテムが見つかりません。',
    'options_page_title': 'YT Outline & Snap - 設定',
    'storage_usage_heading': 'ストレージ使用量',
    'storage_used': '使用量',
    'storage_quota': '上限',
    'storage_snapshot_count': 'スナップショット数',
    'storage_average_size': '平均サイズ',
    'clear_all_data_button': '全データ削除',
    'api_key_settings': 'API設定',
    'api_key_label': 'APIキー',
    'api_key_placeholder': 'Gemini APIキー（または他のモデルのAPIキー）を入力してください',
    'model_name_label': 'モデル名',
    'model_name_placeholder': '例: gemini-1.5-flash-latest',
    'recommended_model_text': '推奨モデル: gemini-1.5-flash-preview-05-20 が推奨されます。',
    'max_resolution_label_long': 'スナップショットの最大解像度',
    'high_resolution_warning_long': '高解像度はより多くのストレージを消費し、処理に時間がかかる場合があります。',
    'language_settings_heading': '言語設定',
    'language_select_label': '言語',
    'language_english': '英語',
    'language_japanese': '日本語',
    'language_setting_description': 'アウトラインと画像説明は、選択した言語で生成されます。',
    'beta_features_heading': 'ベータ機能',
    'outline_edit_feature_label': 'アウトライン編集機能を有効にする',
    'outline_edit_description_long': 'オーバーレイパネルで生成されたアウトラインを直接編集できるようにします。',
    'ad_pause_feature_label': '広告の自動一時停止/再開を有効にする',
    'ad_pause_description_long': '広告中に動画を自動的に一時停止し、広告後に再開します。（実験的機能）',
    'debug_options_heading': '開発者向けデバッグオプション',
    'debug_warning_text': '注意: これらの設定は開発およびデバッグ用です。',
    'i18n_overlay_option_label': 'オーバーレイUIのローカライズを有効にする',
    'i18n_overlay_description_long': 'オーバーレイパネルUI要素の翻訳を切り替えます。',
    'i18n_prompts_option_label': 'AIプロンプトのローカライズを有効にする',
    'i18n_prompts_description_long': 'AIモデルに送信されるプロンプトの翻訳を切り替えます。（実験的機能）',
    'save_settings_button': '設定を保存',
    'settings_saved_status': '設定を保存しました！',
    'confirm_clear_data_dialog': '全てのデータ（スナップショット、アウトライン、設定）を削除してもよろしいですか？この操作は元に戻せません。',
    'clearing_data_status': 'データ削除中...',
    'clear_data_success_status': 'データの削除に成功しました。',
    'clear_data_error_status': 'データ削除中にエラーが発生しました。コンソールを確認してください。',
    'loading_storage_usage': 'ストレージ使用量を読み込み中...'
  };
  
  initialized = true;
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
export const getCurrentLanguage = async (): Promise<'en' | 'ja'> => {
  try {
    // 設定から言語を取得
    const settings = await getSettings();
    if (settings.language) {
      logDebug(`設定から言語を取得: ${settings.language}`);
      lastUsedLanguage = settings.language;
      return settings.language;
    }
  } catch (error) {
    console.error('Error getting language from settings:', error);
  }
  
  // 設定がない場合はブラウザのUIロケールを使用
  const locale = chrome.i18n.getUILanguage();
  const detectedLang = locale.startsWith('ja') ? 'ja' : 'en';
  logDebug(`ブラウザのUIロケールから言語を検出: ${locale} => ${detectedLang}`);
  lastUsedLanguage = detectedLang;
  return detectedLang;
};

/**
 * 同期版の言語取得（フォールバックのみ）
 * 非同期処理ができない場所で使用
 */
export const getCurrentLanguageSync = (): 'en' | 'ja' => {
  // キャッシュされた言語があればそれを使用
  if (lastUsedLanguage) {
    logDebug(`キャッシュされた言語を使用: ${lastUsedLanguage}`);
    return lastUsedLanguage;
  }
  
  // キャッシュがない場合はブラウザのUIロケールを使用
  const locale = chrome.i18n.getUILanguage();
  const detectedLang = locale.startsWith('ja') ? 'ja' : 'en';
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
export const t = (key: string, fallback = '', forcedLang?: 'en' | 'ja'): string => {
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
 * 指定された言語で翻訳キーを取得する
 * @param key 翻訳キー
 * @param fallback フォールバックテキスト（省略可）
 * @param lang 言語コード（'en'または'ja'）
 * @returns 翻訳されたテキスト、またはフォールバック、またはキー自体
 */
export const tForced = (key: string, fallback = '', lang: 'en' | 'ja' = 'en'): string => {
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
  
  // まず言語固有のカスタム辞書から取得（オーバーレイUIなど）
  if (messages[lang] && messages[lang][key]) {
    logDebug(`カスタム辞書から翻訳を取得 (${lang}): ${messages[lang][key]}`);
    return messages[lang][key];
  }
  
  // 次にChrome i18n APIで試す（オプションページなど、一部の翻訳はこちらを使用）
  const chromeMessage = chrome.i18n.getMessage(key);
  if (chromeMessage) {
    logDebug(`Chrome i18n APIから翻訳を取得: ${chromeMessage}`);
    return chromeMessage;
  }
  
  // 最後にフォールバックまたはキー自体を返す
  logDebug(`翻訳が見つかりません。フォールバックまたはキーを返します: ${fallback || key}`);
  return fallback || key;
};
