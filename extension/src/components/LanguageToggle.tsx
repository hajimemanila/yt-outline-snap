import React from 'react';
import { useTranslation } from '../lib/useTranslation';

/**
 * 言語切り替えコンポーネント
 * デバッグ用に言語を切り替えるためのシンプルなUIを提供します
 */
const LanguageToggle: React.FC = () => {
  const { t, lang } = useTranslation();
  
  const toggleLanguage = async () => {
    console.log('言語を切り替えます:', lang === 'ja' ? 'en' : 'ja');
    
    // Chrome Storageに言語設定を保存
    await chrome.storage.sync.set({
      language: lang === 'ja' ? 'en' : 'ja'
    });
    
    console.log('言語設定を保存しました');
  };
  
  return (
    <div style={{ 
      position: 'absolute', 
      top: '5px', 
      right: '5px', 
      zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: '5px 10px',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '5px'
    }}>
      <div style={{ color: 'white', fontSize: '10px', marginBottom: '2px' }}>
        {t('current_language', '現在の言語')}:
      </div>
      <button 
        onClick={toggleLanguage}
        style={{
          backgroundColor: '#0ea5e9',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        {lang === 'ja' ? '🇯🇵 → 🇺🇸' : '🇺🇸 → 🇯🇵'}
      </button>
    </div>
  );
};

export default LanguageToggle;
