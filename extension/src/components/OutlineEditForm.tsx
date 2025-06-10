import React, { useState, useEffect, useCallback } from 'react';
import { OutlineItem } from '../lib/types';
import { getMessage, t } from '../lib/i18n';

interface OutlineEditFormProps {
  items: OutlineItem[];
  onSave: (items: OutlineItem[]) => Promise<void>;
  onCancel: () => void;
}

/**
 * タイムスタンプの形式が正しいかどうかを検証する関数
 * @param timestamp タイムスタンプ文字列 (HH:MM:SS or MM:SS)
 * @returns 秒単位の数値、または無効な場合は null
 */
export const validateTimestamp = (timestamp: string): number | null => {
  // HH:MM:SS または MM:SS 形式をサポート
  const hhmmssPattern = /^(\d+):([0-5]?\d):([0-5]?\d)$/;
  const mmssPattern = /^([0-5]?\d):([0-5]?\d)$/;
  
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  
  if (hhmmssPattern.test(timestamp)) {
    const [, h, m, s] = timestamp.match(hhmmssPattern) || [];
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10);
    seconds = parseInt(s, 10);
  } else if (mmssPattern.test(timestamp)) {
    const [, m, s] = timestamp.match(mmssPattern) || [];
    minutes = parseInt(m, 10);
    seconds = parseInt(s, 10);
  } else {
    return null; // 無効な形式
  }
  
  // 秒単位に変換
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * 秒単位の数値をタイムスタンプ文字列に変換する関数
 * @param seconds 秒単位の数値
 * @returns タイムスタンプ文字列 (HH:MM:SS or MM:SS)
 */
export const formatTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

/**
 * アウトラインデータをテキスト形式に変換する関数
 * @param items アウトラインアイテムの配列
 * @returns テキスト形式のアウトラインデータ
 */
export const outlineItemsToText = (items: OutlineItem[]): string => {
  return items.map(item => {
    const timestamp = formatTimestamp(item.timestamp);
    return `[${timestamp}] ${item.title}\n${item.description || ''}`;
  }).join('\n\n');
};

/**
 * テキスト形式のアウトラインデータをアウトラインアイテムの配列に変換する関数
 * @param text テキスト形式のアウトラインデータ
 * @returns アウトラインアイテムの配列と検証エラー
 */
export const textToOutlineItems = (text: string): { items: OutlineItem[], errors: string[] } => {
  const lines = text.split('\n');
  const items: OutlineItem[] = [];
  const errors: string[] = [];
  
  let currentItem: Partial<OutlineItem> | null = null;
  let lineIndex = 0;
  
  while (lineIndex < lines.length) {
    const line = lines[lineIndex].trim();
    lineIndex++;
    
    if (line === '') continue;
    
    // タイムスタンプと見出しの行を検出
    const timestampMatch = line.match(/^\[([0-9:]+)\]\s*(.+)$/);
    
    if (timestampMatch) {
      // 前のアイテムがあれば保存
      if (currentItem && currentItem.timestamp !== undefined && currentItem.title) {
        items.push(currentItem as OutlineItem);
      }
      
      const [, timestampStr, title] = timestampMatch;
      const timestamp = validateTimestamp(timestampStr);
      
      if (timestamp === null) {
        errors.push(t('invalid_timestamp_format').replace('{0}', timestampStr));
        currentItem = null;
      } else {
        currentItem = {
          timestamp,
          title: title.trim(),
          description: ''
        };
      }
    } else if (currentItem) {
      // 説明文の行
      if (currentItem.description) {
        currentItem.description += '\n' + line;
      } else {
        currentItem.description = line;
      }
    }
  }
  
  // 最後のアイテムを追加
  if (currentItem && currentItem.timestamp !== undefined && currentItem.title) {
    items.push(currentItem as OutlineItem);
  }
  
  return { items, errors };
};

const OutlineEditForm: React.FC<OutlineEditFormProps> = ({ items, onSave, onCancel }) => {
  const [editText, setEditText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // 初期テキストを設定
  useEffect(() => {
    setEditText(outlineItemsToText(items));
  }, [items]);
  
  // 保存処理
  const handleSave = useCallback(async () => {
    const { items: parsedItems, errors } = textToOutlineItems(editText);
    
    if (errors.length > 0) {
      setErrors(errors);
      return;
    }
    
    if (parsedItems.length === 0) {
      setErrors([t('no_outline_items')]);
      return;
    }
    
    setIsSaving(true);
    
    try {
      await onSave(parsedItems);
      setErrors([]);
    } catch (error) {
      setErrors([`${t('save_error')}: ${error}`]);
    } finally {
      setIsSaving(false);
    }
  }, [editText, onSave]);
  
  return (
    <div className="outline-edit-form" style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '8px', color: '#333' }}>
        {t('edit_outline')}
      </h3>
      
      <div style={{ marginBottom: '8px' }}>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
          {t('outline_format_instruction')}
        </p>
        <code style={{ display: 'block', fontSize: '12px', backgroundColor: '#f5f5f5', padding: '4px', borderRadius: '4px' }}>
          [MM:SS] {t('title_label')}<br />
          {t('description_optional')}
        </code>
      </div>
      
      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        style={{
          width: '100%',
          minHeight: '300px',
          padding: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          resize: 'vertical'
        }}
      />
      
      {errors.length > 0 && (
        <div style={{ marginTop: '8px', color: '#d32f2f', fontSize: '14px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{t('error_prefix')} </p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          onClick={onCancel}
          className="action-btn"
          style={{
            background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
            color: '#333',
            border: 'none',
            padding: '5px 12px',
            fontSize: '12px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          disabled={isSaving}
        >
          {t('overlay_cancel')}
        </button>
        <button
          onClick={handleSave}
          className="edit-btn"
          style={{
            backgroundColor: '#008299',
            color: '#fff',
            border: 'none',
            padding: '5px 12px',
            fontSize: '12px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: isSaving ? 0.7 : 1
          }}
          disabled={isSaving}
        >
          {isSaving ? t('saving') : t('overlay_save')}
        </button>
      </div>
    </div>
  );
};

export default OutlineEditForm;
