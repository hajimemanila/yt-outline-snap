// React コンポーネント - SnapshotPreview

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { getMessage } from '../lib/i18n';

interface SnapshotPreviewProps {
  blob: Blob | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export const SnapshotPreview: React.FC<SnapshotPreviewProps> = ({
  blob,
  isOpen,
  onClose,
  onDownload
}) => {
  const imageUrl = blob ? URL.createObjectURL(blob) : '';
  
  // コンポーネントがアンマウントされたときにURLを解放
  React.useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{getMessage('snapshot_preview')}</DialogTitle>
        </DialogHeader>
        
        {blob && (
          <div className="flex flex-col items-center">
            <img 
              src={imageUrl} 
              alt="Snapshot" 
              className="max-w-full max-h-[70vh] object-contain"
            />
            
            <div className="mt-4">
              <button
                onClick={onDownload}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                {getMessage('download')}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SnapshotPreview;
