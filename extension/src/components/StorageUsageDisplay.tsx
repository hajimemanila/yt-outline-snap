import React, { useState, useEffect } from 'react';
import { StorageUsageInfo } from '../lib/types';
import { getStorageUsage, optimizeAllSnapshots } from '../lib/storageUtils';
import { getStorageSettings } from '../lib/storage';

interface StorageUsageDisplayProps {
  onOptimizeComplete?: () => void;
}

const StorageUsageDisplay: React.FC<StorageUsageDisplayProps> = ({ onOptimizeComplete }) => {
  const [usageInfo, setUsageInfo] = useState<StorageUsageInfo | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // ストレージ使用量を取得する
  const fetchStorageUsage = async () => {
    try {
      const info = await getStorageUsage();
      setUsageInfo(info);
      
      // 警告表示の判定
      const settings = await getStorageSettings();
      setShowWarning(info.usedMB > settings.warningThresholdMB);
    } catch (error) {
      console.error('ストレージ使用量の取得に失敗しました:', error);
    }
  };

  // スナップショットを最適化する
  const handleOptimize = async () => {
    try {
      setIsOptimizing(true);
      const settings = await getStorageSettings();
      const optimizedCount = await optimizeAllSnapshots(
        settings.optimizeMaxWidth,
        settings.optimizeQuality
      );
      
      // 使用量を再取得
      await fetchStorageUsage();
      
      // 完了コールバック
      if (onOptimizeComplete) {
        onOptimizeComplete();
      }
      
      // 最適化完了メッセージ
      alert(`${optimizedCount}枚のスナップショットを最適化しました。`);
    } catch (error) {
      console.error('スナップショットの最適化に失敗しました:', error);
      alert('スナップショットの最適化に失敗しました。');
    } finally {
      setIsOptimizing(false);
    }
  };

  // 初回レンダリング時にストレージ使用量を取得
  useEffect(() => {
    fetchStorageUsage();
    
    // 定期的に使用量を更新（30秒ごと）
    const intervalId = setInterval(fetchStorageUsage, 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (!usageInfo) {
    return <div style={{ padding: '8px', fontSize: '12px' }}>読み込み中...</div>;
  }

  return (
    <div style={{ 
      padding: '8px', 
      fontSize: '12px',
      backgroundColor: showWarning ? 'rgba(255, 235, 235, 0.8)' : 'rgba(240, 240, 240, 0.8)',
      borderRadius: '4px',
      marginBottom: '8px',
      border: showWarning ? '1px solid #ffcccc' : '1px solid #e0e0e0'
    }}>
      <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
        ストレージ使用状況
      </div>
      
      {/* 使用量グラフ */}
      <div style={{ 
        height: '8px', 
        backgroundColor: '#e0e0e0', 
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '6px'
      }}>
        <div style={{ 
          height: '100%', 
          width: `${Math.min(usageInfo.percent, 100)}%`,
          backgroundColor: usageInfo.percent > 80 ? '#ff4d4d' : 
                          usageInfo.percent > 60 ? '#ffa64d' : '#4da6ff',
          borderRadius: '4px'
        }} />
      </div>
      
      {/* 使用量情報 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span>使用量: {usageInfo.usedMB} MB</span>
        <span>スナップショット: {usageInfo.snapshotCount}枚</span>
      </div>
      
      {/* 平均サイズ */}
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
        平均サイズ: {usageInfo.averageSize} KB/枚
      </div>
      
      {/* 警告メッセージ */}
      {showWarning && (
        <div style={{ 
          color: '#d32f2f', 
          fontSize: '11px', 
          marginBottom: '6px',
          padding: '4px',
          backgroundColor: 'rgba(255, 220, 220, 0.5)',
          borderRadius: '2px'
        }}>
          <strong>警告:</strong> ストレージ使用量が多くなっています。不要なスナップショットを削除するか、
          最適化を行うことをお勧めします。
        </div>
      )}
      
      {/* 最適化ボタン */}
      <button
        onClick={handleOptimize}
        disabled={isOptimizing || usageInfo.snapshotCount === 0}
        style={{
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          cursor: isOptimizing || usageInfo.snapshotCount === 0 ? 'not-allowed' : 'pointer',
          opacity: isOptimizing || usageInfo.snapshotCount === 0 ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%'
        }}
      >
        {isOptimizing ? (
          <>
            <span style={{ 
              display: 'inline-block',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              animation: 'spin 1s linear infinite',
              marginRight: '6px'
            }}></span>
            最適化中...
          </>
        ) : (
          'スナップショットを最適化'
        )}
      </button>
    </div>
  );
};

export default StorageUsageDisplay;
