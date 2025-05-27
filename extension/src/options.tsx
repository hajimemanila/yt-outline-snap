// オプションページ - React コンポーネント

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getSettings, saveSettings } from './lib/storage';
import { useTranslation } from './lib/useTranslation';
import { getStorageUsage, clearAllData } from './lib/storageUtils';
import { flags } from './lib/flags';
import './options.css';

const OptionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.5-pro');
  const [maxResolution, setMaxResolution] = useState(1080);
  const [language, setLanguage] = useState<'en' | 'ja'>('ja');
  const [enableOutlineEdit, setEnableOutlineEdit] = useState(false);
  const [enableAdPause, setEnableAdPause] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // 多言語対応フラグ（デバッグ用）
  const [enableI18nOverlay, setEnableI18nOverlay] = useState(flags.ENABLE_I18N_OVERLAY);
  const [enableI18nPrompts, setEnableI18nPrompts] = useState(flags.ENABLE_I18N_PROMPTS);
  const [showDebugOptions, setShowDebugOptions] = useState(false);
  
  // ストレージ使用量の状態
  const [storageUsage, setStorageUsage] = useState<{
    used: number;
    quota: number;
    percent: number;
    usedMB: number;
    quotaMB: number;
    snapshotCount: number;
    averageSize: number;
  } | null>(null);
  
  // データ削除の状態
  const [clearingData, setClearingData] = useState(false);
  const [clearStatus, setClearStatus] = useState('');
  
  // 設定とストレージ使用量を読み込む
  useEffect(() => {
    const loadData = async () => {
      // 設定を読み込む
      const settings = await getSettings();
      setApiKey(settings.apiKey || '');
      setModelName(settings.modelName || 'gemini-2.5-pro');
      setMaxResolution(settings.maxResolution || 1080);
      setLanguage(settings.language || 'ja');
      setEnableOutlineEdit(settings.ENABLE_OUTLINE_EDIT || false);
      setEnableAdPause(settings.ENABLE_AD_PAUSE || false);
      
      // ストレージ使用量を読み込む
      const usage = await getStorageUsage();
      setStorageUsage(usage);
    };
    
    loadData();
    
    // 5秒ごとにストレージ使用量を更新
    const intervalId = setInterval(async () => {
      const usage = await getStorageUsage();
      setStorageUsage(usage);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // 設定を保存
  const handleSave = async () => {
    await saveSettings({
      apiKey,
      modelName,
      maxResolution,
      language,
      ENABLE_OUTLINE_EDIT: enableOutlineEdit,
      ENABLE_AD_PAUSE: enableAdPause
    });
    
    // フラグを更新（ランタイムのみ - リロード時にリセット）
    flags.ENABLE_I18N_OVERLAY = enableI18nOverlay;
    flags.ENABLE_I18N_PROMPTS = enableI18nPrompts;
    
    setSaveStatus(t('settings_saved_status'));
    setTimeout(() => setSaveStatus(''), 3000);
  };
  
  // 全データを削除
  const handleClearAllData = async () => {
    // 確認ダイアログを表示
    if (!confirm(t('confirm_clear_data_dialog'))) {
      return;
    }
    
    setClearingData(true);
    setClearStatus(t('clearing_data_status'));
    
    try {
      const success = await clearAllData();
      
      if (success) {
        setClearStatus(t('clear_data_success_status'));
        
        // ストレージ使用量を更新
        const usage = await getStorageUsage();
        setStorageUsage(usage);
      } else {
        setClearStatus(t('clear_data_error_status'));
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      setClearStatus(t('clear_data_error_status'));
    } finally {
      setClearingData(false);
      setTimeout(() => setClearStatus(''), 5000);
    }
  };
  
  return (
    <div className="container">
      <h1>{t('options_page_title')}</h1>
      
      {/* ストレージ使用量表示 */}
      <div className="storage-info">
        <h2>{t('storage_usage_heading')}</h2>
        {storageUsage ? (
          <>
            <div className="progress-bar-container">
              <div 
                className="progress-bar"
                style={{ width: `${storageUsage.percent}%` }}
              >
                {storageUsage.percent.toFixed(2)}%
              </div>
            </div>
            <p>
              {t('storage_used')}: {storageUsage.usedMB.toFixed(2)} MB ({storageUsage.percent.toFixed(2)}%) / 
              {t('storage_quota')}: {storageUsage.quotaMB.toFixed(2)} MB
            </p>
            <p>{t('storage_snapshot_count')}: {storageUsage.snapshotCount}</p>
            <p>{t('storage_average_size')}: {(storageUsage.averageSize / 1024).toFixed(2)} KB</p>
            <button 
              onClick={handleClearAllData} 
              disabled={clearingData}
              className="clear-data-button"
            >
              {clearingData ? t('clearing_data_status') : t('clear_all_data_button')}
            </button>
            {clearStatus && <p className="status-message">{clearStatus}</p>}
          </>
        ) : (
          <p>{t('loading_storage_usage', 'Loading storage usage...')}</p>
        )}
      </div>
      
      <h2>{t('api_key_settings')}</h2>
      <div className="form-group">
        <label htmlFor="apiKey">{t('api_key_label')}</label>
        <input
          type="text"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t('api_key_placeholder')}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="modelName">{t('model_name_label')}</label>
        <input
          type="text"
          id="modelName"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder={t('model_name_placeholder')}
        />
        <p className="help-text">
        {t('recommended_model_text')}
        </p>
      </div>
      
      <div className="form-group">
        <label htmlFor="maxResolution">{t('max_resolution_label_long')}</label>
        <select
          id="maxResolution"
          value={maxResolution}
          onChange={(e) => setMaxResolution(Number(e.target.value))}
        >
          <option value="720">720p</option>
          <option value="1080">1080p</option>
          <option value="1440">1440p</option>
          <option value="2160">2160p (4K)</option>
        </select>
        <p className="help-text">
          {t('high_resolution_warning_long')}
        </p>
      </div>

      {/* 言語設定セクション */}
      <h2>{t('language_settings_heading')}</h2>
      <div className="form-group">
        <label htmlFor="language">{t('language_select_label')}</label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'ja')}
        >
          <option value="en">{t('language_english')}</option>
          <option value="ja">{t('language_japanese')}</option>
        </select>
        <p className="help-text">
          {t('language_setting_description')}
        </p>
      </div>
      
      <h2>{t('beta_features_heading')}</h2>
      <div className="form-group">
        <label htmlFor="enableOutlineEdit">
          <input
            type="checkbox"
            id="enableOutlineEdit"
            checked={enableOutlineEdit}
            onChange={(e) => setEnableOutlineEdit(e.target.checked)}
          />
          {t('outline_edit_feature_label')}
        </label>
        <p className="help-text">
          {t('outline_edit_description_long')}
        </p>
      </div>
      
      <div className="form-group">
        <label htmlFor="enableAdPause">
          <input
            type="checkbox"
            id="enableAdPause"
            checked={enableAdPause}
            onChange={(e) => setEnableAdPause(e.target.checked)}
          />
          {t('ad_pause_feature_label')}
        </label>
        <p className="help-text">
          {t('ad_pause_description_long')}
        </p>
      </div>
      
      {/* 開発者向けデバッグオプション */}
      <div className="debug-section">
        <h2 onClick={() => setShowDebugOptions(!showDebugOptions)} style={{ cursor: 'pointer' }}>
          {t('debug_options_heading')} {showDebugOptions ? '▼' : '▶'}
        </h2>
        
        {showDebugOptions && (
          <div className="form-group debug-options">
            <p className="help-text warning">
              ⚠️ {t('debug_warning_text')}
            </p>
            
            <label htmlFor="enableI18nOverlay">
              <input
                type="checkbox"
                id="enableI18nOverlay"
                checked={enableI18nOverlay}
                onChange={(e) => setEnableI18nOverlay(e.target.checked)}
              />
              {t('i18n_overlay_option_label')}
            </label>
            <p className="help-text">
              {t('i18n_overlay_description_long')}
            </p>
            
            <label htmlFor="enableI18nPrompts">
              <input
                type="checkbox"
                id="enableI18nPrompts"
                checked={enableI18nPrompts}
                onChange={(e) => setEnableI18nPrompts(e.target.checked)}
              />
              {t('i18n_prompts_option_label')}
            </label>
            <p className="help-text">
              {t('i18n_prompts_description_long')}
            </p>
            
          </div>
        )}
      </div>
      
      <div className="form-actions">
        <button onClick={handleSave}>{t('save_settings_button')}</button>
        {saveStatus && <span className="save-status">{saveStatus}</span>}
      </div>
    </div>
  );
};

// DOMにレンダリング
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<OptionsPage />);
}
