import { useEffect, useState, useCallback, useRef } from 'react';
import { getCurrentLanguageSync, t as _t, getCurrentLanguage } from './i18n';

// デバッグ用のフラグ
const DEBUG_TRANSLATION = true; // useTranslationの状態変化のログのため
// 個々の翻訳キーのログ出力を制御するフラグ
const DEBUG_TRANSLATION_KEYS = false; // 個々の翻訳キーのログを無効化

export function useTranslation() {
  // 言語の状態管理
  const [lang, setLang] = useState<'ja' | 'en' | 'zh-CN' | 'ko'>(() => {
    const currentLang = getCurrentLanguageSync();
    if (DEBUG_TRANSLATION) {
      console.log('🌐 useTranslation: 初期言語', currentLang);
    }
    return currentLang;
  });

  // 言語変更を強制的に検知するための更新カウンター
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // 初期化時に非同期で言語設定を取得
  useEffect(() => {
    const initLanguage = async () => {
      try {
        const storedLang = await getCurrentLanguage();
        if (storedLang !== lang) {
          if (DEBUG_TRANSLATION) {
            console.log('🌐 useTranslation: 非同期で言語を更新', { old: lang, new: storedLang });
          }
          setLang(storedLang);
          // 更新カウンターをインクリメントして強制的に再レンダリングを促す
          setUpdateCounter(prev => prev + 1);
        }
      } catch (error) {
        console.error('言語設定の取得に失敗:', error);
      }
    };
    
    initLanguage();
  }, []);

  useEffect(() => {
    if (DEBUG_TRANSLATION) {
      console.log('🌐 useTranslation: リスナーをセットアップ中');
    }
    
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'sync' && changes.language) {
        const newLang = changes.language.newValue as 'en' | 'ja' | 'zh-CN' | 'ko' ?? 'en';
        if (DEBUG_TRANSLATION) {
          console.log('🌐 useTranslation: 言語変更を検出', {
            oldValue: changes.language.oldValue,
            newValue: newLang
          });
        }
        setLang(newLang);
        // 言語変更時に更新カウンターをインクリメント
        setUpdateCounter(prev => prev + 1);
      }
    };
    
    chrome.storage.onChanged.addListener(listener);
    
    // 現在の設定を確認（デバッグ用）
    if (DEBUG_TRANSLATION) {
      chrome.storage.sync.get('language', (result) => {
        console.log('🌐 useTranslation: 現在のストレージ設定', result);
      });
    }
    
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  /** 
   * 翻訳関数は useCallback でメモ化し、lang または updateCounter が変わった時だけ更新
   * updateCounter を依存配列に含めることで、言語変更時に必ず新しい関数参照が作られる
   */
  const t = useCallback(
    (key: string, fallback?: string) => {
      const result = _t(key, fallback, lang as 'en' | 'ja' | 'zh-CN' | 'ko');
      if (DEBUG_TRANSLATION_KEYS) { // 個々の翻訳キーのログは別フラグで制御
        console.log(`🌐 翻訳: key=${key}, lang=${lang}, result=${result}, counter=${updateCounter}`);
      }
      return result;
    },
    [lang, updateCounter],
  );

  return { t, lang };
}
