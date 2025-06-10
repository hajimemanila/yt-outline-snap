// React コンポーネント - ActionButtons

import React from 'react';
import { Button } from './ui/button';
import { getMessage } from '../lib/i18n';

interface ActionButtonsProps {
  onGenerateSummary: () => void;
  onCaptureSnapshot: () => void;
  isGenerating: boolean;
  isCapturing: boolean;
  isDRM: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onGenerateSummary,
  onCaptureSnapshot,
  isGenerating,
  isCapturing,
  isDRM
}) => {
  return (
    <div className="flex space-x-2">
      <Button
        onClick={onGenerateSummary}
        disabled={isGenerating || isCapturing}
        className="flex-1"
      >
        {isGenerating ? getMessage('loading') : '📝 ' + getMessage('generate_summary')}
      </Button>
      
      <Button
        onClick={onCaptureSnapshot}
        disabled={isCapturing || isDRM}
        className="flex-1"
        title={isDRM ? getMessage('drm_warning') : ''}
      >
        {isCapturing ? getMessage('processing') : '📸 ' + getMessage('capture_snapshot')}
      </Button>
    </div>
  );
};

export default ActionButtons;
