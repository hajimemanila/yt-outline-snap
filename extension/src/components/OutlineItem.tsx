// React コンポーネント - OutlineItem

import React from 'react';
import { Button } from './ui/button';
import { OutlineItem as OutlineItemType } from '../lib/types';

interface OutlineItemProps {
  item: OutlineItemType;
  onCaptureClick: (timestamp: number) => void;
}

export const OutlineItem: React.FC<OutlineItemProps> = ({ item, onCaptureClick }) => {
  const { timestamp, title, description, code } = item;
  
  // タイムスタンプを MM:SS 形式に変換
  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // タイムスタンプをクリックしたときの処理
  const handleTimestampClick = () => {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = timestamp;
    }
  };
  
  // スナップショットボタンをクリックしたときの処理
  const handleCaptureClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCaptureClick(timestamp);
  };
  
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <button
              onClick={handleTimestampClick}
              className="text-blue-600 dark:text-blue-400 font-mono mr-2 hover:underline"
            >
              [{formatTimestamp(timestamp)}]
            </button>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          </div>
          
          {description && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{description}</p>
          )}
          
          {code && (
            <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
              <code>{code}</code>
            </pre>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCaptureClick}
          className="ml-2 flex-shrink-0"
          title="このタイムスタンプでスナップショットを撮影"
        >
          📸
        </Button>
      </div>
    </div>
  );
};

export default OutlineItem;
