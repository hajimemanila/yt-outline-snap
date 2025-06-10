// オプションページ - React コンポーネント

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getSettings, saveSettings } from './lib/storage';
import { useTranslation } from './lib/useTranslation';
import { getStorageUsage, clearAllData, getVideoDataSummary, deleteVideoData } from './lib/storageUtils';
import { flags, saveFlags } from './lib/flags';
import './options.css';

const OptionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.5-pro');
  const [maxResolution, setMaxResolution] = useState(1080);
  const [language, setLanguage] = useState<'en' | 'ja' | 'zh-CN' | 'ko'>('ja');
  const [enableOutlineEdit, setEnableOutlineEdit] = useState(false);
  const [enableAdPause, setEnableAdPause] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // 多言語対応フラグ（デバッグ用）
  const [enableI18nOverlay, setEnableI18nOverlay] = useState(flags.ENABLE_I18N_OVERLAY);
  const [enableI18nPrompts, setEnableI18nPrompts] = useState(flags.ENABLE_I18N_PROMPTS);
  const [excludeVideoUrlFromOutlinePrompt, setExcludeVideoUrlFromOutlinePrompt] = useState(flags.EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT);
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
  
  // 保存データ管理の状態
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [videoData, setVideoData] = useState<Array<{
    videoId: string;
    videoTitle: string;
    snapshotCount: number;
    hasOutline: boolean;
    outlineItemCount: number;
    lastUpdated: number;
  }>>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<{videoId: string; message: string; isError: boolean} | null>(null);
  
  // 設定とストレージ使用量を読み込む
  useEffect(() => {
    const loadData = async () => {
      // 設定を読み込む
      const settings = await getSettings();
      setApiKey(settings.apiKey || '');
      setModelName(settings.modelName || 'gemini-2.5-pro');
      setMaxResolution(settings.maxResolution || 1080);
      setLanguage((settings.language || 'ja') as 'en' | 'ja' | 'zh-CN' | 'ko');
      setEnableOutlineEdit(settings.ENABLE_OUTLINE_EDIT || false);
      setEnableAdPause(settings.ENABLE_AD_PAUSE || false);
      setExcludeVideoUrlFromOutlinePrompt(settings.EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT || false);
      
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
      ENABLE_AD_PAUSE: enableAdPause,
      EXCLUDE_VIDEO_URL_FROM_OUTLINE_PROMPT: excludeVideoUrlFromOutlinePrompt
    });
    
    // デバッグフラグのみを更新
    flags.ENABLE_I18N_OVERLAY = enableI18nOverlay;
    flags.ENABLE_I18N_PROMPTS = enableI18nPrompts;
    
    // デバッグフラグをストレージに保存
    await saveFlags();
    
    setSaveStatus(t('settings_saved_status'));
    setTimeout(() => setSaveStatus(''), 3000);
  };
  
  // 保存データ管理の表示・非表示を切り替え
  const toggleDataManagement = async () => {
    const newState = !showDataManagement;
    setShowDataManagement(newState);
    
    // データ管理パネルを開く場合、動画データを読み込む
    if (newState) {
      await loadVideoData();
    }
  };
  
  // 動画データ一覧を読み込む
  const loadVideoData = async () => {
    setDataLoading(true);
    try {
      const data = await getVideoDataSummary();
      setVideoData(data);
    } catch (error) {
      console.error('Error loading video data:', error);
    } finally {
      setDataLoading(false);
    }
  };
  
  // 特定の動画データを削除
  const handleDeleteVideoData = async (videoId: string) => {
    // 確認ダイアログを表示
    if (!confirm(t('delete_confirm'))) {
      return;
    }
    
    setDeletingVideoId(videoId);
    setDeleteStatus(null);
    
    try {
      const result = await deleteVideoData(videoId);
      
      // 動画データを再読み込み
      await loadVideoData();
      
      // ストレージ使用量を更新
      const usage = await getStorageUsage();
      setStorageUsage(usage);
      
      // 成功メッセージを表示
      setDeleteStatus({
        videoId,
        message: t('delete_success'),
        isError: false
      });
      
      // 3秒後にメッセージを非表示
      setTimeout(() => {
        setDeleteStatus(prevStatus => 
          prevStatus?.videoId === videoId ? null : prevStatus
        );
      }, 3000);
      
    } catch (error) {
      console.error(`Error deleting data for video ${videoId}:`, error);
      
      // エラーメッセージを表示
      setDeleteStatus({
        videoId,
        message: t('delete_error'),
        isError: true
      });
    } finally {
      setDeletingVideoId(null);
    }
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
        
        // データ管理パネルが開いている場合はデータも再読み込み
        if (showDataManagement) {
          await loadVideoData();
        }
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
            <p>{t('storage_average_size')}: {(storageUsage.averageSize / 1024).toFixed(2)} MB</p>
            <div className="data-management-actions">
              <button 
                onClick={toggleDataManagement}
                className="data-management-button"
              >
                {t('data_management_button')}
              </button>
              <button 
                onClick={handleClearAllData} 
                disabled={clearingData}
                className="data-management-button clear-data-button"
              >
                {clearingData ? t('clearing_data_status') : t('clear_all_data_button')}
              </button>
            </div>
            {clearStatus && <p className="status-message">{clearStatus}</p>}
            
            {/* 保存データ管理UI */}
            {showDataManagement && (
              <div className="data-management-container">
                <h3>{t('data_management_heading')}</h3>
                <p>{t('data_management_description')}</p>
                
                {dataLoading ? (
                  <p>Loading...</p>
                ) : videoData.length > 0 ? (
                  <div className="video-data-table">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('video_title')}</th>
                          <th title={t('storage_snapshot_count')}>📸</th>
                          <th title={t('outline')}>📝</th>
                          <th>{t('last_updated')}</th>
                          <th>{t('delete_button')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {videoData.map(video => (
                          <tr key={video.videoId}>
                            <td className="video-title" title={`${t('video_id')}: ${video.videoId}`}>
                              <a 
                                href={`https://www.youtube.com/watch?v=${video.videoId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="video-link"
                              >
                                {video.videoTitle}
                              </a>
                            </td>
                            <td>{video.snapshotCount}</td>
                            <td title={video.hasOutline ? `${t('outline_item_count')}: ${video.outlineItemCount}` : ''}>{video.hasOutline ? '✔️' : '❌'}</td>
                            <td>{new Date(video.lastUpdated).toLocaleString()}</td>
                            <td>
                              {deletingVideoId === video.videoId ? (
                                <span>{t('deleting_status')}</span>
                              ) : (
                                <button 
                                  onClick={() => handleDeleteVideoData(video.videoId)}
                                  className="delete-video-button"
                                  disabled={!!deletingVideoId}
                                  title={t('delete_button')}
                                >
                                  🗑️
                                </button>
                              )}
                              {deleteStatus && deleteStatus.videoId === video.videoId && (
                                <div className={`delete-status ${deleteStatus.isError ? 'error' : 'success'}`}>
                                  {deleteStatus.message}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>{t('no_saved_data')}</p>
                )}
                
                <button 
                  onClick={toggleDataManagement}
                  className="close-button"
                >
                  {t('close_button')}
                </button>
              </div>
            )}
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
      


      {/* 言語設定セクション */}
      <h2>{t('language_settings_heading')}</h2>
      <div className="form-group">
        <label htmlFor="language">{t('language_select_label')}</label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'ja' | 'zh-CN' | 'ko')}
        >
          <option value="en">{t('language_english')}</option>
          <option value="ja">{t('language_japanese')}</option>
          <option value="zh-CN">{t('language_simplified_chinese')}</option>
          <option value="ko">{t('language_korean')}</option>
        </select>
        <p className="help-text">
          {t('language_setting_description')}
        </p>
      </div>
      
      <h2>{t('advanced_settings_heading')}</h2>
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
      
      <h2>{t('beta_features_heading')}</h2>
      
      <div className="form-group">
        <label htmlFor="excludeVideoUrlFromOutlinePrompt">
          <input
            type="checkbox"
            id="excludeVideoUrlFromOutlinePrompt"
            checked={excludeVideoUrlFromOutlinePrompt}
            onChange={(e) => setExcludeVideoUrlFromOutlinePrompt(e.target.checked)}
          />
          {t('exclude_video_url_option_label')}
        </label>
        <p className="help-text">
          {t('exclude_video_url_description_long')}
        </p>
      </div>
      
      {/* 開発者向けデバッグオプションは非表示 */}
      
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
