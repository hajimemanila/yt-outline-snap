// React コンポーネント - OutlineList

import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import OutlineItem from './OutlineItem';
import { OutlineItem as OutlineItemType } from '../lib/types';
import { getMessage } from '../lib/i18n';

interface OutlineListProps {
  items: OutlineItemType[];
  onCaptureClick: (timestamp: number) => void;
  onCaptureAll: () => void;
}

export const OutlineList: React.FC<OutlineListProps> = ({ 
  items, 
  onCaptureClick,
  onCaptureAll
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2 px-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {getMessage('outline_title')}
        </h2>
        <button
          onClick={onCaptureAll}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
        >
          {getMessage('capture_all')}
        </button>
      </div>
      
      <ScrollArea className="h-[400px] rounded-md border">
        <div>
          {items.map((item, index) => (
            <OutlineItem 
              key={`${item.timestamp}-${index}`} 
              item={item} 
              onCaptureClick={onCaptureClick} 
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default OutlineList;
