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
    'invalid_timestamp_format': 'Invalid timestamp format: {0}',
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
    'outline ': 'Outline',
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
    'beta_features_heading': 'Beta Features',
    'outline_edit_feature_label': 'Outline Editing Feature',
    'outline_edit_description_long': 'Allows editing outline data. ',
    'ad_pause_feature_label': 'Pause snapshot capture during ads',
    'ad_pause_description_long': 'Pauses snapshot capture while ads are playing and resumes after they end. ',
    'exclude_video_url_option_label': 'Exclude video URL from outline generation prompt',
    'exclude_video_url_description_long': 'Excluding video URL from the prompt can speed up outline generation and save AI tokens, but may reduce the accuracy of the generated outline information.',
    'data_management_button': 'Data Management',
    'data_management_heading': 'Data Management',
    'data_management_description': 'Manage saved snapshots and outline data.',
    'video_title': 'Video Title',
    'last_updated': 'Last Updated',
    'delete_button': 'Delete',
    'delete_success': 'Successfully deleted',
    'language_settings_heading': 'Language Settings',
    'language_select_label': 'Language Selection',
    'language_setting_description': 'Localizes overlay panel UI text and AI prompts. ',
    'i18n_prompts_option_label': 'Use Localized AI Prompts',
    'i18n_prompts_description_long': 'Switches AI prompt templates based on language settings.',
    'debug_warning_text': 'Debug Mode Enabled - Performance may be affected',
    'i18n_overlay_option_label': 'Enable UI Localization',
    'i18n_overlay_description_long': 'Localizes overlay panel UI text based on language settings.',
    'close_button': 'Close',
    'language_english': 'English',
    'language_japanese': 'Japanese (日本語)',
    'language_simplified_chinese': 'Chinese (Simplified) (简体中文)',
    'language_korean': 'Korean (한국어)',
    'save_settings_button': 'Save settings',
    'settings_saved_status': 'Settings saved successfully',
    'rewind_5_seconds_tooltip': 'Rewind 5 seconds',
    'play_tooltip': 'Play',
    'pause_tooltip': 'Pause',
    'forward_5_seconds_tooltip': 'Forward 5 seconds',
    'take_snapshot_tooltip': 'Take a snapshot',
    'delete_outline_tooltip': 'Delete outline',
    'overlay_delete_current_video': 'Delete data for this video',
    'overlay_options': 'Options',
  };
  
  // 日本語のメッセージ
  messages.ja = {
    'overlay_capture_all': '全て撮影',
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
    'invalid_timestamp_format': '無効なタイムスタンプ形式: {0}',
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
    'outline': 'アウトライン',
    'clear_all_data_button': 'すべてのデータを消去',
    'api_key_settings': 'APIキー設定',
    'api_key_label': 'APIキー',
    'api_key_placeholder': 'GeminiのAPIキー（または他のモデルのAPIキー）を入力',
    'model_name_label': 'モデル名',
    'model_name_placeholder': '例：gemini-1.5-flash-latest',
    'recommended_model_text': '推奨モデル: gemini-2.5-flash-preview-05-20 がおすすめです。',
    'advanced_settings_heading': '詳細設定',
    'max_resolution_label_long': 'スナップショットの最大解像度',
    'high_resolution_warning_long': '高い解像度はストレージ使用量を増やし、処理時間が長くなる可能性があります。',
    'beta_features_heading': 'ベータ機能',
    'outline_edit_feature_label': 'アウトライン編集機能',
    'outline_edit_description_long': 'アウトラインデータの編集を可能にします。',
    'ad_pause_feature_label': '広告再生中はスナップショット撮影を一時停止',
    'ad_pause_description_long': '広告再生中はスナップショット撮影を一時停止し、広告終了後に再開します。',
    'exclude_video_url_option_label': 'アウトライン生成時のプロンプトに動画URLを含めない',
    'exclude_video_url_description_long': 'プロンプトに動画URLを含めないことで アウトライン生成が高速化しAIトークンを節約できますが、生成されるアウトライン情報の精度が低下するおそれがあります',
    'data_management_button': 'データ管理',
    'data_management_heading': 'データ管理',
    'data_management_description': '保存されたスナップショットとアウトラインデータを管理します。',
    'video_title': '動画タイトル',
    'last_updated': '最終更新',
    'delete_button': '削除',
    'delete_success': '正常に削除されました',
    'language_settings_heading': '言語設定 (Language Settings)',
    'language_select_label': '言語選択',
    'language_setting_description': 'オーバーレイパネルのUIテキストおよびAIプロンプトをローカライズします。',
    'i18n_prompts_option_label': 'ローカライズされたAIプロンプトを使用',
    'i18n_prompts_description_long': '言語設定に基づいてAIプロンプトテンプレートを切り替えます。',
    'debug_warning_text': 'デバッグモード有効 - パフォーマンスに影響する可能性があります',
    'i18n_overlay_option_label': 'UI多言語化を有効にする',
    'i18n_overlay_description_long': '言語設定に基づいてオーバーレイパネルのUIテキストをローカライズします。',
    'close_button': '閉じる',
    'language_english': '英語 (English)',
    'language_japanese': '日本語 (日本語)',
    'language_simplified_chinese': '中国語（簡体） (简体中文)',
    'language_korean': '韓国語 (한국어)',
    'save_settings_button': '設定を保存',
    'settings_saved_status': '設定が正常に保存されました',
    'rewind_5_seconds_tooltip': '5秒巻き戻し',
    'play_tooltip': '再生',
    'pause_tooltip': '一時停止',
    'forward_5_seconds_tooltip': '5秒進む',
    'take_snapshot_tooltip': 'スナップショットを撮影',
    'delete_outline_tooltip': 'アウトラインを削除',
    'overlay_delete_current_video': 'この動画のデータを削除',
    'overlay_options': 'オプション設定',
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
    'invalid_timestamp_format': '无效的时间戳格式: {0}',
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
    'outline': '大纲',
    'clear_all_data_button': '清除所有数据',
    'api_key_settings': 'API密钥设置',
    'api_key_label': 'API密钥',
    'api_key_placeholder': '输入你的Gemini API密钥（或其他模型的API密钥）',
    'model_name_label': '模型名称',
    'model_name_placeholder': '例如：gemini-1.5-flash-latest',
    'recommended_model_text': '推荐模型：建议使用 gemini-2.5-flash-preview-05-20。',
    'advanced_settings_heading': '高级设置',
    'max_resolution_label_long': '快照最大分辨率',
    'high_resolution_warning_long': '更高的分辨率会消耗更多存储空间，并可能需要更长时间处理。',
    'beta_features_heading': '测试版功能',
    'outline_edit_feature_label': '大纲编辑功能',
    'outline_edit_description_long': '允许编辑大纲数据。',
    'ad_pause_feature_label': '广告期间暂停快照截取',
    'ad_pause_description_long': '在播放广告时暂停快照截取，广告结束后恢复截取。',
    'exclude_video_url_option_label': '从大纲生成提示词中排除视频 URL',
    'exclude_video_url_description_long': '从提示词中排除视频 URL 可以加快大纲生成并节省 AI 令牌，但可能会降低生成的大纲信息的准确性。',
    'data_management_button': '数据管理',
    'data_management_heading': '数据管理',
    'data_management_description': '管理已保存的快照和大纲数据。',
    'video_title': '视频标题',
    'last_updated': '最后更新',
    'delete_button': '删除',
    'delete_success': '已成功删除',
    'language_settings_heading': '语言设置 (Language Settings)',
    'language_select_label': '语言选择',
    'language_setting_description': '本地化覆盖面板UI文本和AI提示。',
    'i18n_prompts_option_label': '使用本地化AI提示',
    'i18n_prompts_description_long': '根据语言设置切换AI提示模板。',
    'debug_warning_text': '已启用调试模式 - 可能会影响性能',
    'i18n_overlay_option_label': '启用UI本地化',
    'i18n_overlay_description_long': '根据语言设置本地化覆盖面板UI文本。',
    'close_button': '关闭',
    'language_english': '英语 (English)',
    'language_japanese': '日语 (日本語)',
    'language_simplified_chinese': '中文（简体） (简体中文)',
    'language_korean': '韩语 (한국어)',
    'save_settings_button': '保存设置',
    'settings_saved_status': '设置已成功保存',
    'rewind_5_seconds_tooltip': '后退 5 秒',
    'play_tooltip': '播放',
    'pause_tooltip': '暂停',
    'forward_5_seconds_tooltip': '前进 5 秒',
    'take_snapshot_tooltip': '截取快照',
    'delete_outline_tooltip': '删除大纲',
    'overlay_delete_current_video': '删除此视频的数据',
    'overlay_options': '选项设置',
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
    'invalid_timestamp_format': '잘못된 타임스탬프 형식: {0}',
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
    'outline': '개요',
    'clear_all_data_button': '모든 데이터 지우기',
    'api_key_settings': 'API 키 설정',
    'api_key_label': 'API 키',
    'api_key_placeholder': 'Gemini API 키(또는 다른 모델의 API 키)를 입력하세요',
    'model_name_label': '모델 이름',
    'model_name_placeholder': '예: gemini-1.5-flash-latest',
    'recommended_model_text': '추천 모델: gemini-2.5-flash-preview-05-20이 권장됩니다.',
    'advanced_settings_heading': '고급 설정',
    'max_resolution_label_long': '스냅샷 최대 해상도',
    'high_resolution_warning_long': '더 높은 해상도는 저장 공간을 더 많이 사용하고 처리 시간이 더 오래 걸릴 수 있습니다.',
    'beta_features_heading': '베타 기능',
    'outline_edit_feature_label': '개요 편집 기능',
    'outline_edit_description_long': '개요 데이터 편집을 허용합니다. ',
    'ad_pause_feature_label': '광고 중 스냅샷 촬영 일시 정지',
    'ad_pause_description_long': '광고 재생 중에 스냅샷 촬영을 일시 정지하고 광고 종료 후 재개합니다. ',
    'exclude_video_url_option_label': '개요 생성 프롬프트에서 동영상 URL 제외',
    'exclude_video_url_description_long': '프롬프트에서 동영상 URL을 제외하면 개요 생성 속도가 향상되고 AI 토큰을 절약할 수 있지만, 생성되는 개요 정보의 정확성이 떨어질 수 있습니다.',
    'data_management_button': '데이터 관리',
    'data_management_heading': '데이터 관리',
    'data_management_description': '저장된 스냅샷과 개요 데이터를 관리합니다.',
    'video_title': '동영상 제목',
    'last_updated': '최종 업데이트',
    'delete_button': '삭제',
    'delete_success': '성공적으로 삭제되었습니다',
    'language_settings_heading': '언어 설정 (Language Settings)',
    'language_select_label': '언어 선택',
    'language_setting_description': '오버레이 패널 UI 텍스트 및 AI 프롬프트를 현지화합니다.',
    'i18n_prompts_option_label': '현지화된 AI 프롬프트 사용',
    'i18n_prompts_description_long': '언어 설정에 따라 AI 프롬프트 템플릿을 전환합니다.',
    'debug_warning_text': '디버그 모드 활성화됨 - 성능에 영향을 줄 수 있습니다',
    'i18n_overlay_option_label': 'UI 현지화 활성화',
    'i18n_overlay_description_long': '언어 설정에 따라 오버레이 패널 UI 텍스트를 현지화합니다.',
    'close_button': '닫기',
    'language_english': '영어 (English)',
    'language_japanese': '일본어 (日本語)',
    'language_simplified_chinese': '중국어 (간체) (简体中文)',
    'language_korean': '한국어 (한국어)',
    'save_settings_button': '설정 저장',
    'settings_saved_status': '설정이 성공적으로 저장되었습니다',
    'rewind_5_seconds_tooltip': '5초 되감기',
    'play_tooltip': '재생',
    'pause_tooltip': '일시정지',
    'forward_5_seconds_tooltip': '5초 앞으로',
    'take_snapshot_tooltip': '스냅샷 찍기',
    'delete_outline_tooltip': '개요 삭제',
    'overlay_delete_current_video': '이 동영상의 데이터 삭제',
    'overlay_options': '옵션 설정',
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
  
  // キーの後ろに_tooltip, _long などの接尾辞がついている場合の処理
  let modifiedKey = key;
  const specialSuffixes = ['_tooltip', '_long'];
  
  // 通常のキーでの翻訳試行
  let result = tForced(key, '', lang);
  
  // 翻訳が見つからず、特殊な接尾辞が付いていない場合
  if (result === key && !specialSuffixes.some(suffix => key.endsWith(suffix))) {
    // フォールバックを返す前に、対応する特殊キーでの翻訳を試行
    for (const suffix of specialSuffixes) {
      const suffixKey = `${key}${suffix}`;
      const suffixResult = tForced(suffixKey, '', lang);
      if (suffixResult !== suffixKey) {
        // 特殊キーでの翻訳が見つかった場合はそれを返す
        logDebug(`特殊キーでの翻訳が見つかりました: ${suffixKey}`);
        return suffixResult;
      }
    }
  }
  
  // それでも翻訳が見つからない場合、fallback を使用
  if (result === key && fallback) {
    logDebug(`翻訳キーが見つかりません: ${key}、フォールバックを使用: ${fallback}`);
    return fallback;
  }
  
  return result;
};

/**
 * Chromeの_localesディレクトリから翻訳メッセージを取得する
 * @param key 翻訳キー
 * @param lang 言語コード（指定しない場合は現在の言語を使用）
 * @returns 翻訳されたメッセージまたは空文字列
 */
export const getLocaleMessage = (key: string, lang?: 'en' | 'ja' | 'zh-CN' | 'ko'): string => {
  // 現在の言語を使用
  const currentLang = lang || getCurrentLanguageSync();
  
  try {
    let message = '';
    
    // Chrome APIは言語を指定できないため、現在の言語に関係なくメッセージを取得
    // そのため、現在設定されている言語とChrome APIの返す言語が一致しない場合がある
    message = chrome.i18n.getMessage(key);
    
    // 言語切替対応：現在の言語と一致するか確認するため、ハードコードされた辞書も参照
    if (messages[currentLang] && messages[currentLang][key]) {
      logDebug(`現在の言語 ${currentLang} のハードコード辞書からキー ${key} の翻訳を取得`);  
      return messages[currentLang][key];
    }
    
    if (message) {
      // Chrome APIが返した翻訳を使用
      logDebug(`Chrome APIからキー ${key} の翻訳を取得`);  
      return message;
    }
    
    // 接尾辞付きキー対応
    const specialSuffixes = ['_tooltip', '_long'];
    
    // 1. まずハードコード辞書で接尾辞付きキーを確認
    for (const suffix of specialSuffixes) {
      if (key.endsWith(suffix)) {
        const baseKey = key.substring(0, key.length - suffix.length);
        if (messages[currentLang] && messages[currentLang][baseKey]) {
          logDebug(`現在の言語 ${currentLang} のハードコード辞書からベースキー ${baseKey} の翻訳を取得`);
          return messages[currentLang][baseKey];
        }
      }
    }
    
    // 2. Chrome APIで接尾辞付きキー対応
    for (const suffix of specialSuffixes) {
      if (key.endsWith(suffix)) {
        const baseKey = key.substring(0, key.length - suffix.length);
        message = chrome.i18n.getMessage(baseKey);
        if (message) {
          logDebug(`Chrome APIからベースキー ${baseKey} の翻訳を取得`);
          return message;
        }
      }
    }
    
    // 英語へのフォールバック（現在の言語が英語でない場合）
    if (currentLang !== 'en') {
      // 英語のハードコード辞書をチェック
      if (messages['en'] && messages['en'][key]) {
        logDebug(`英語のハードコード辞書からキー ${key} の翻訳を取得`);
        return messages['en'][key];
      }
      
      // 英語の接尾辞付きキー対応
      for (const suffix of specialSuffixes) {
        if (key.endsWith(suffix)) {
          const baseKey = key.substring(0, key.length - suffix.length);
          if (messages['en'] && messages['en'][baseKey]) {
            logDebug(`英語のハードコード辞書からベースキー ${baseKey} の翻訳を取得`);
            return messages['en'][baseKey];
          }
        }
      }
    }
    
    return '';
  } catch (error) {
    console.error(`getLocaleMessage エラー: ${error}`);
    return '';
  }
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
  const localeMessage = getLocaleMessage(key, lang);
  if (localeMessage) {
    logDebug(`Chromeの_localesから翻訳を取得 (${lang}): ${localeMessage}`);
    return localeMessage;
  }
  
  // 3. 次にChrome i18n APIで試す（オプションページなど、一部の翻訳はこちらを使用）
  const chromeMessage = chrome.i18n.getMessage(key);
  if (chromeMessage) {
    logDebug(`Chrome i18n APIから翻訳を取得: ${chromeMessage}`);
    return chromeMessage;
  }
  
  // 4. 英語以外の言語の場合、英語の翻訳を試す
  if (lang !== 'en') {
    // 英語のカスタム辞書から取得
    if (messages['en'] && messages['en'][key]) {
      logDebug(`英語のカスタム辞書から翻訳を取得: ${messages['en'][key]}`);
      return messages['en'][key];
    }
    
    // 英語のChromeの_localesディレクトリから取得
    const enLocaleMessage = getLocaleMessage(key, 'en');
    if (enLocaleMessage) {
      logDebug(`英語のChromeの_localesから翻訳を取得: ${enLocaleMessage}`);
      return enLocaleMessage;
    }
  }
  
  // 5. それでもなければフォールバックまたはキー自体を返す
  logDebug(`翻訳が見つかりません。フォールバックまたはキーを返します: ${fallback || key}`);
  return fallback || key;
};
