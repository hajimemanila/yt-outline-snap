import React, { useState, useEffect, useRef } from 'react';
import { Rewind, Play, Pause, FastForward, Trash, Edit } from 'lucide-react';
import JSZip from 'jszip';
import { getOutline, deleteOutline, saveOutline } from '../lib/storageUtils';
import { getSettings } from '../lib/storage';
import { useTranslation } from '../lib/useTranslation';
import OutlineEditForm from './OutlineEditForm';

// CustomWindow インターフェースは下で定義されています

// contentScript.tsx と同じスナップショットの型を定義
interface Snapshot {
  title: string;
  time: number;
  timestamp: number; // Unix timestamp (ms)
  videoUrl: string;
  imageDataUrl?: string;
  description: string; // ユーザーが編集可能な説明
}

// Define outline item type
interface OutlineItem {
  timestamp: number;
  title: string;
  description: string;
}

// contentScript.tsx で定義されている window の型を拡張
interface CustomWindow extends Window {
  handleCaptureSnapshot?: () => void;
  handleCaptureAllSnapshots?: (snapshotInfos: { time: number; title?: string; description?: string }[]) => void;
  handleSeekTo?: (time: number) => void;
  handleGenerateOutline?: () => Promise<{ items: OutlineItem[], hasTranscript: boolean }>;
  generateSnapshotDescription?: (snapshotId: string, callbacks?: { onSuccess?: () => void, onError?: (error: string) => void }) => Promise<string | null>;
}
declare const window: CustomWindow;

interface OverlayPanelProps {
  onSeekBackward?: () => void;
  onPlayPause?: () => void;
  onSeekForward?: () => void;
  isPlaying: boolean;
  snapshots: Snapshot[]; // Snapshots will be passed as a prop
  onSaveDescription?: (timestamp: number, description: string) => Promise<void>; // Handler from contentScript
  initialOutlineItems?: OutlineItem[];
  initialHasTranscript?: boolean;
  // onDeleteSnapshot: (timestamp: number) => Promise<void>; // Consider adding for future refactor
}

const OverlayPanel: React.FC<OverlayPanelProps> = ({ 
  onSeekBackward, 
  onPlayPause, 
  onSeekForward, 
  isPlaying, 
  snapshots, // Use the prop directly
  onSaveDescription,
  initialOutlineItems,
  initialHasTranscript
}) => {
  const { t } = useTranslation();
  const [editingSnapshotTimestamp, setEditingSnapshotTimestamp] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [localSnapshots, setLocalSnapshots] = useState<Snapshot[]>(snapshots); // ローカルコピーを作成
  const [customTimes, setCustomTimes] = useState<string>('');
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>(initialOutlineItems || []);
  const [outlineLoading, setOutlineLoading] = useState<boolean>(false);
  const [hasTranscript, setHasTranscript] = useState<boolean>(initialHasTranscript ?? true); // トランスクリプト情報が取得できたかどうか
  const [isEditingOutline, setIsEditingOutline] = useState<boolean>(false);
  const [enableOutlineEdit, setEnableOutlineEdit] = useState<boolean>(false); // アウトライン編集機能フラグ
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string>('');
  const [currentVideoDuration, setCurrentVideoDuration] = useState<number>(0);
  const [generatingDescriptionFor, setGeneratingDescriptionFor] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<Record<string, string | null>>({});
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false); // 折りたたみ状態
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<number, HTMLLIElement | null>>({});
  const prevSnapshotsCountRef = useRef<number>(localSnapshots.length);

  const logDebug = (...args: any[]) => {
    // IS_DEBUG フラグに基づいてログ出力を制御できます (contentScript.tsx と同様)
    console.log('YT Outline & Snap (Overlay):', ...args);
  };
  
  // アウトライン編集モードを開始
  const handleEditOutline = () => {
    try {
      setIsEditingOutline(true);
    } catch (error) {
      console.error('アウトライン編集モードの開始中にエラーが発生しました:', error);
      // エラーが発生した場合、ページを再読み込みするようユーザーに促す
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        alert('拡張機能のコンテキストが無効になりました。ページを再読み込みしてください。');
      }
    }
  };
  
  // アウトライン編集をキャンセル
  const handleCancelEditOutline = () => {
    try {
      setIsEditingOutline(false);
    } catch (error) {
      console.error('アウトライン編集のキャンセル中にエラーが発生しました:', error);
      // エラーが発生した場合、ページを再読み込みするようユーザーに促す
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        alert('拡張機能のコンテキストが無効になりました。ページを再読み込みしてください。');
      }
    }
  };
  
  // アウトライン編集を保存
  const handleSaveOutline = async (editedItems: OutlineItem[]) => {
    if (!currentVideoId || editedItems.length === 0) {
      return;
    }
    
    try {
      // アウトラインを保存
      await saveOutline(
        currentVideoId,
        currentVideoTitle,
        currentVideoDuration,
        editedItems,
        hasTranscript
      );
      
      // 状態を更新
      setOutlineItems(editedItems);
      setIsEditingOutline(false);
    } catch (error) {
      console.error('Error saving outline:', error);
      
      // Extension context invalidated エラーの場合は特別な処理
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        alert('拡張機能のコンテキストが無効になりました。ページを再読み込みしてください。');
        return; // エラーを上位に伝播しない
      }
      
      // その他のエラーは上位に伝播して処理させる
      throw error;
    }
  };

  // Export all snapshots as individual JPEG downloads and a markdown file with snapshot information
  const exportSnapshots = async () => {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('v') || '';
    const zip = new JSZip();
    const imgFolderName = `imgs_${videoId}`;
    
    // Create markdown content for snapshots
    let markdownContent = `# YouTube Video Snapshots

## Video ID: ${videoId}
## Export Date: ${new Date().toLocaleString()}

`;
    
    // Add outline content if available
    if (outlineItems.length > 0) {
      markdownContent += `## Video Outline

`;
      outlineItems.forEach((item, index) => {
        const outlineTime = new Date(item.timestamp * 1000).toISOString().substr(11, 8);
        markdownContent += `### ${index + 1}. ${item.title}
`;
        markdownContent += `- **Timestamp**: ${outlineTime}
`;
        markdownContent += `- **Description**: ${item.description}

`;
      });
      markdownContent += `---

## Snapshots

`;
    }
    
    // Process each snapshot
    localSnapshots.forEach((snapshot, index) => {
      if (snapshot.imageDataUrl) {
        const totalSeconds = snapshot.time;
        const hh = Math.floor(totalSeconds / 3600);
        const mm = Math.floor((totalSeconds % 3600) / 60);
        const ss = Math.floor(totalSeconds % 60);
        const hhmmss = [hh, mm, ss].map(n => String(n).padStart(2, '0')).join('');
        const formattedTime = `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        const filename = `snap${videoId}_${hhmmss}.jpg`;
        const imgPath = `${imgFolderName}/${filename}`;
        
        // Add image to zip in the imgs folder
        const base64 = snapshot.imageDataUrl.split(',')[1];
        zip.file(imgPath, base64, { base64: true });
        
        // Add snapshot information to markdown
        markdownContent += `## Snapshot ${index + 1}

`;
        markdownContent += `- **Title**: ${snapshot.title}
`;
        markdownContent += `- **Timestamp**: ${formattedTime}
`;
        markdownContent += `- **Image**: ![Snapshot](${imgPath})
`;
        if (snapshot.description) {
          markdownContent += `- **Description**: ${snapshot.description}
`;
        }
        markdownContent += '\n---\n\n';
      }
    });
    
    // Add markdown file to zip
    zip.file(`snapshots_${videoId}.md`, markdownContent);
    
    // Generate and download the zip file
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshots_${videoId}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const deleteSnapshot = (timestampToDelete: number) => {
    chrome.storage.local.get({ snapshots: [] }, (result) => {
      if (chrome.runtime.lastError) {
        logDebug('Error retrieving snapshots for deletion:', chrome.runtime.lastError.message);
        return;
      }
      const updatedSnapshots = result.snapshots.filter(
        (snapshot: Snapshot) => snapshot.timestamp !== timestampToDelete
      );
      chrome.storage.local.set({ snapshots: updatedSnapshots }, () => {
        if (chrome.runtime.lastError) {
          logDebug('Error deleting snapshot:', chrome.runtime.lastError.message);
        } else {
          logDebug('Snapshot deleted successfully, timestamp:', timestampToDelete);
          // loadSnapshots(); // Storage listener があれば不要、なければ手動で再読み込み
        }
      });
    });
  };

  const clearAll = () => {
    chrome.storage.local.set({ snapshots: [] }, () => {
      logDebug('All snapshots cleared');
    });
    setOutlineItems([]);
    setLocalSnapshots([]);
  };

  // Storageの変更を監視するリスナーを設定
  // 設定を読み込む
  useEffect(() => {
    getSettings().then(settings => {
      setEnableOutlineEdit(settings.ENABLE_OUTLINE_EDIT || false);
    }).catch(err => {
      console.error('Error loading settings:', err);
    });
  }, []);

  // 動画情報を読み込む
  useEffect(() => {
    // URLからビデオIDを取得
    const params = new URLSearchParams(window.location.href.split('?')[1]);
    const videoId = params.get('v');
    
    if (videoId) {
      setCurrentVideoId(videoId);
      
      // 動画タイトルを取得
      const titleElement = document.querySelector<HTMLElement>('h1.ytd-watch-metadata yt-formatted-string');
      const videoTitle = titleElement?.innerText || 'No title found';
      setCurrentVideoTitle(videoTitle);
      
      // 動画の長さを取得
      const video = document.querySelector('video');
      if (video) {
        setCurrentVideoDuration(video.duration || 0);
      }
      
      // 既存のアウトラインを取得
      getOutline(videoId).then(outline => {
        if (outline) {
          setOutlineItems(outline.items);
          setHasTranscript(outline.hasTranscript);
        } else {
          setOutlineItems([]);
        }
      }).catch(err => {
        console.error('Error loading outline:', err);
        setOutlineItems([]);
      });
    }
  }, []);

  useEffect(() => {
    // 初期化時にプロップからローカルスナップショットを設定
    setLocalSnapshots(snapshots);

    // リスナー関数をuseEffect内で定義して、依存関係を適切に管理する
    
    // Storage変更監視用のリスナー関数
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.snapshots) {
        logDebug('Storage changed, updating snapshots from storage listener');
        const newSnapshots = changes.snapshots.newValue || [];
        // 詳細なデバッグログを追加
        if (newSnapshots.length > 0) {
          const snapWithDesc = newSnapshots.filter((s: Snapshot) => s.description && s.description.trim() !== '');
          logDebug(`Updated snapshots count: ${newSnapshots.length}, with descriptions: ${snapWithDesc.length}`);
        }
        setLocalSnapshots(newSnapshots);
      }
    };
    
    // リスナーを登録
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    // クリーンアップ時にリスナーを削除
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [snapshots]); // snapshotsが変更されたときにもリスナーを再設定

  // プロップのsnapshotsが変更されたときにローカルスナップショットも更新
  useEffect(() => {
    setLocalSnapshots(snapshots);
  }, [snapshots]);

  useEffect(() => {
    if (!outlineLoading && outlineItems.length > 0) {
      outlineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [outlineItems, outlineLoading]);

  useEffect(() => {
    const prevCount = prevSnapshotsCountRef.current;
    const currCount = localSnapshots.length;
    if (currCount > prevCount) {
      const newest = localSnapshots.reduce((max, s) => s.timestamp > max.timestamp ? s : max, localSnapshots[0]);
      const el = cardRefs.current[newest.timestamp];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    prevSnapshotsCountRef.current = currCount;
  }, [localSnapshots]);

  // generate outline via AI
  const generateOutline = async () => {
    if (!window.handleGenerateOutline) {
      console.error('handleGenerateOutline function not available on window object');
      return;
    }

    setOutlineLoading(true);
    try {
      // 現在の動画IDを取得
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('v');
      
      if (!videoId) {
        logDebug('Failed to extract video ID from URL');
        const result = await window.handleGenerateOutline();
        setOutlineItems(result.items);
        setHasTranscript(result.hasTranscript);
        return;
      }
      
      // 保存されたアウトラインを確認
      logDebug(`Checking for saved outline for video ${videoId}...`);
      const savedOutline = await getOutline(videoId);
      
      if (savedOutline && savedOutline.items.length > 0) {
        logDebug(`Found saved outline for video ${videoId} with ${savedOutline.items.length} items. Using cached version.`);
        setOutlineItems(savedOutline.items);
        // 既存のアウトラインで hasTranscript が undefined の場合は、トランスクリプトが正常に取得できたものとして扱う
        const transcriptAvailable = savedOutline.hasTranscript === undefined ? true : savedOutline.hasTranscript;
        setHasTranscript(transcriptAvailable);
        logDebug(`Transcript available: ${transcriptAvailable} (original value: ${savedOutline.hasTranscript})`);
      } else {
        logDebug(`No saved outline found for video ${videoId}. Generating new outline...`);
        const result = await window.handleGenerateOutline();
        setOutlineItems(result.items);
        setHasTranscript(result.hasTranscript);
        logDebug(`Transcript available: ${result.hasTranscript}`);
      }
    } catch (error) {
      console.error('Error generating outline:', error);
    } finally {
      setOutlineLoading(false);
    }
  };
  

  
  // 現在の動画のアウトラインを削除する
  const deleteCurrentOutline = async () => {
    // 確認ダイアログを表示
    if (!confirm('現在のアウトラインを削除しますか？この操作は元に戻せません。')) {
      return;
    }
    
    try {
      // 現在の動画IDを取得
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('v');
      
      if (!videoId) {
        logDebug('Failed to extract video ID from URL');
        return;
      }
      
      // アウトラインを削除
      await deleteOutline(videoId);
      logDebug(`Deleted outline for video ${videoId}`);
      
      // UIを更新
      setOutlineItems([]);
    } catch (error) {
      console.error('Error deleting outline:', error);
    }
  };
  
  // アウトラインの全タイムスタンプでスナップショットを撮影
  const captureAllOutlineSnapshots = () => {
    if (!window.handleCaptureAllSnapshots || outlineItems.length === 0) {
      console.error('handleCaptureAllSnapshots function not available or no outline items');
      return;
    }
    
    // 動画の長さを取得（可能な場合）
    const videoElement = document.querySelector<HTMLVideoElement>('video.html5-main-video');
    const videoDuration = videoElement?.duration || Number.MAX_SAFE_INTEGER;
    
    // 有効なタイムスタンプのみをフィルタリング
    const validOutlineItems = outlineItems.filter(item => {
      if (item.timestamp >= videoDuration) {
        logDebug(`Skipping outline item at ${item.timestamp}s as it exceeds video duration (${videoDuration}s)`);
        return false;
      }
      if (item.timestamp < 0) {
        logDebug(`Skipping outline item with negative timestamp (${item.timestamp}s)`);
        return false;
      }
      return true;
    });
    
    if (validOutlineItems.length === 0) {
      logDebug('No valid outline timestamps found after filtering.');
      alert(t('no_valid_timestamps', '有効なタイムスタンプがありません。'));
      return;
    }
    
    // アウトラインからタイムスタンプ、タイトル、説明文を抽出
    const snapshotInfos = validOutlineItems.map(item => ({
      time: item.timestamp,
      title: item.title,
      description: item.description
    }));
    
    logDebug(`Capturing snapshots for ${snapshotInfos.length} valid outline timestamps out of ${outlineItems.length} total.`);
    
    // 拡張された一括撮影機能を使用
    window.handleCaptureAllSnapshots(snapshotInfos);
    logDebug('Capturing snapshots for all outline timestamps with titles and descriptions:', snapshotInfos);
  };

  // AIによるスナップショット説明生成処理
  const handleGenerateAIDescription = async (snapshotId: string) => {
    if (!window.generateSnapshotDescription) {
      console.error('generateSnapshotDescription function not available on window object');
      return;
    }

    // スナップショットIDを文字列に確実に変換
    const snapshotIdStr = snapshotId.toString();
    
    // 生成中の状態をセット
    setGeneratingDescriptionFor(snapshotIdStr);
    // 以前のエラーをクリア
    setGenerationError(prev => ({ ...prev, [snapshotIdStr]: null }));
    
    try {
      // 説明文を生成して返り値を受け取る
      const generatedDescription = await window.generateSnapshotDescription(snapshotIdStr, {
        onSuccess: () => {
          // 成功時は生成中状態をクリア
          setGeneratingDescriptionFor(null);
          // エラー状態もクリア
          setGenerationError(prev => ({ ...prev, [snapshotIdStr]: null }));
          
          // 生成後にストレージから最新のスナップショットを取得して表示を更新
          logDebug('Description generated successfully, fetching updated snapshots');
          chrome.storage.local.get(['snapshots'], (result) => {
            if (chrome.runtime.lastError) {
              console.error('Error getting updated snapshots:', chrome.runtime.lastError);
              return;
            }
            
            // 更新されたスナップショットの内容をログ出力（デバッグ用）
            const updatedSnapshotsList = result.snapshots || [];
            const updatedSnapshot = updatedSnapshotsList.find((s: any) => s.timestamp.toString() === snapshotIdStr);
            logDebug('Updated snapshot description:', updatedSnapshot?.description);
            
            // ローカルスナップショットも更新して即時UIに反映する
            if (updatedSnapshotsList && updatedSnapshotsList.length > 0) {
              logDebug('Immediately updating localSnapshots with latest from storage');
              setLocalSnapshots(updatedSnapshotsList);
            }
          });
        },
        onError: (errorMsg: string) => {
          // エラー発生時はエラーメッセージを保存
          setGenerationError(prev => ({ ...prev, [snapshotIdStr]: errorMsg }));
          // 生成中状態はクリア
          setGeneratingDescriptionFor(null);
          logDebug('Error generating description:', errorMsg);
        }
      });
      
      logDebug('Generated description result:', generatedDescription);
      
      // 説明文が生成された場合、手動で該当スナップショットを更新
      if (generatedDescription) {
        // 現在のスナップショットのコピーを作成
        const updatedSnapshots = [...localSnapshots];
        // 該当のスナップショットを見つけて説明文を更新
        const snapshotIndex = updatedSnapshots.findIndex(s => s.timestamp.toString() === snapshotIdStr);
        if (snapshotIndex !== -1) {
          updatedSnapshots[snapshotIndex] = {
            ...updatedSnapshots[snapshotIndex],
            description: generatedDescription
          };
          // この変更をUI上に反映させる（再レンダリングが行われる）
          // UIの更新はchrome.storage.onChangedリスナー経由で行われるが、
          // 即時更新のためにローカルステートも更新しておく
          setLocalSnapshots(prevSnapshots => {
            const updatedLocalSnapshots = prevSnapshots.map(s => {
              if (s.timestamp.toString() === snapshotIdStr) {
                return { ...s, description: generatedDescription };
              }
              return s;
            });
            return updatedLocalSnapshots;
          });
        }
      }
    } catch (error) {
      // 予期せぬエラー処理
      const errorMsg = error instanceof Error ? error.message : '予期せぬエラーが発生しました';
      setGenerationError(prev => ({ ...prev, [snapshotIdStr]: errorMsg }));
      setGeneratingDescriptionFor(null);
      console.error('Error generating description:', error);
      logDebug('Error details:', JSON.stringify(error));
    }
  };

  const handleSaveDescription = async (timestampToSave: number) => {
    logDebug('[OVERLAY PANEL] handleSaveDescription called. Timestamp:', timestampToSave, 'Current Desc:', editingDescription);

    // Find the original description to compare if there are actual changes
    const originalSnapshot = localSnapshots.find(s => s.timestamp === timestampToSave);
    const originalDescription = originalSnapshot ? originalSnapshot.description : '';

    if (editingSnapshotTimestamp === null || editingDescription.trim() === originalDescription) {
      logDebug('[OVERLAY PANEL] No changes to save, or not in edit mode, or description is the same.');
      setEditingSnapshotTimestamp(null); // Exit edit mode
      // Do not clear editingDescription here if user just clicked off without saving, 
      // they might want to click back and see their unsaved changes.
      // It will be cleared if they start editing another snapshot or on successful save.
      return;
    }

    try {
      logDebug('[OVERLAY PANEL] Calling onSaveDescription prop with ts:', timestampToSave, 'desc:', editingDescription);
      await onSaveDescription?.(timestampToSave, editingDescription);
      logDebug('[OVERLAY PANEL] onSaveDescription prop call successful.');
      setEditingSnapshotTimestamp(null); // Reset editing state
      setEditingDescription('');     // Reset editing description field
      // contentScript.tsx will handle re-rendering with updated snapshots
      // 編集後、ローカルステートも即時更新
      setLocalSnapshots(prevSnapshots => {
        return prevSnapshots.map(s => {
          if (s.timestamp === timestampToSave) {
            return { ...s, description: editingDescription };
          }
          return s;
        });
      });
    } catch (error) {
      logDebug('[OVERLAY PANEL] Error calling onSaveDescription prop:', error);
      console.error('Error saving description in OverlayPanel. Check console for details.', error);
    }
  };

  // console.log('YT Outline & Snap (Debug Version): OverlayPanel rendering with snapshots state:', snapshots);

  // ボタンスタイルの定義
  const actionButtonStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    padding: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: '50%',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    marginRight: '8px',
    color: '#333',
  };
  
  // AI説明生成ボタン用のスタイル
  const aiButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
    color: '#fff',
    border: 'none',
    padding: '3px 6px',
    fontSize: '11px',
    borderRadius: '4px',
    cursor: 'pointer'
  };
  
  // Generate Outlineボタン用のスタイル
  const outlineButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #10b981 100%)',
    color: '#fff',
    border: 'none',
    padding: '3px 6px',
    fontSize: '11px',
    borderRadius: '4px',
    cursor: 'pointer'
  };
  
  // 折りたたみ/展開ボタンのスタイル
  const toggleButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: '#555',
    padding: '3px',
    borderRadius: '3px',
    transition: 'all 0.2s',
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
  };

  // 編集ボタン専用スタイル
  const editButtonStyle: React.CSSProperties = {
    backgroundColor: '#008299',
    color: '#fff',
    border: 'none',
    padding: '3px 6px',
    fontSize: '11px',
    borderRadius: '4px',
    cursor: 'pointer',
  };



  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: '25px', // YouTubeのアイコンと被らないように下にズラす
        right: '10px',
        width: isCollapsed ? '32px' : '380px', // 幅を広げてボタンテキストが切れないようにする
        height: isCollapsed ? '32px' : '500px', // 折りたたみ時と展開時の高さを固定
        overflow: 'visible', // 内部は scrollContainerRef でスクロール
        backgroundColor: isCollapsed ? 'rgba(0, 120, 215, 0.9)' : 'rgba(240, 240, 240, 0.95)',
        zIndex: 10000,
        border: '1px solid ' + (isCollapsed ? 'rgba(0, 120, 215, 0.5)' : '#ccc'),
        borderRadius: isCollapsed ? '50%' : '8px', // 折りたたみ時は丸く
        padding: isCollapsed ? '4px' : '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#333',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out' // スムーズなアニメーション効果
      }}
    >
      {/* 言語切り替えコンポーネントは削除しました */}
      {isCollapsed ? (
        // 折りたたみ時はアイコンのみ表示
        <button 
          onClick={() => setIsCollapsed(false)} 
          style={{
            width: '24px',
            height: '24px',
            padding: 0,
            margin: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'white',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}
          title="展開"
        >
          📹
        </button>
      ) : (
        // 展開時は通常のヘッダーを表示
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          marginBottom: '8px', 
          borderBottom: '1px solid #ddd', 
          paddingBottom: '8px', 
          width: '100%',
          position: 'sticky',
          top: 0,
          backgroundColor: 'rgba(240, 240, 240, 0.98)',
          zIndex: 10,
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{
              marginTop: 0,
              marginBottom: 0,
              marginLeft: '12px',
              fontSize: '18px',
              fontWeight: 'bold',
              fontFamily: 'Inter, sans-serif',
              background: 'linear-gradient(45deg, #22d3ee, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              YT Outline & Snap
            </h3>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={clearAll} title={t('overlay_delete_all', 'すべて削除')} style={{ marginRight: '8px', ...actionButtonStyle }}>
                <Trash size={16} color="#dc3545" />
              </button>
              <button onClick={() => setIsCollapsed(true)} style={toggleButtonStyle} title={t('collapse', '折りたたむ')}>
                ⤡
              </button>
            </div>
          </div>
          
          {/* 動画プレーヤーコントロール - ヘッダー内に移動 */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '2px 8px',
            backgroundColor: 'rgba(240, 240, 240, 0.98)',
            borderRadius: '4px',
            marginBottom: '2px'
          }}>
            <button 
              onClick={() => onSeekBackward?.()} 
              title={t('rewind_5_seconds', '5秒戻る')}
              style={actionButtonStyle}
              className="action-btn"
            >
              <Rewind size={20} />
            </button>
            <button 
              onClick={() => onPlayPause?.()} 
              title={isPlaying ? t('pause', '停止') : t('play', '再生')}
              style={actionButtonStyle}
              className="action-btn"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button 
              onClick={() => onSeekForward?.()} 
              title={t('forward_5_seconds', '5秒進む')}
              style={actionButtonStyle}
              className="action-btn"
            >
              <FastForward size={20} />
            </button>
            <button
              onClick={() => window.handleCaptureSnapshot?.()}
              title={t('take_snapshot', 'スナップショットを撮る')}
              style={{
                ...actionButtonStyle,
                background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
                color: '#fff'
              }}
              className="action-btn"
            >
              📷
            </button>
          </div>
        </div>
      )}
    {/* 折りたたみ時はコントロールと他のコンテンツを非表示 */}
    {!isCollapsed && (
      <>
        {/* Scrollable content */}
        <div ref={scrollContainerRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          {/* 動画プレーヤーコントロールはヘッダーに移動しました */}
          <button
            onClick={exportSnapshots}
            className="w-full mb-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 text-sm font-medium"
          >
            {t('overlay_export', 'エクスポート')}
          </button>
          <button
            onClick={generateOutline}
            disabled={outlineLoading}
            className="w-full mb-4 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/50 outline-btn action-btn"
            style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #10b981 100%)' }}
          >
            {outlineLoading ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #ccc', borderTopColor: '#0ea5e9', animation: 'spin 1s linear infinite' }} />
                {t('overlay_loading', '生成中...')}
              </div>
            ) : (
              t('overlay_generate_outline', 'アウトライン生成')
            )}
          </button>
          <div className="mb-4">
            <input
              type="text"
              value={customTimes}
              onChange={(e) => setCustomTimes(e.target.value)}
              placeholder="00:01:48,00:03:06,00:03:13"
              className="w-full mb-2 px-3 py-2 border rounded text-sm"
            />
            <button
              onClick={() => {
                const times = customTimes.split(',').map((t) => {
                  const parts = t.trim().split(':').map(Number);
                  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
                  if (parts.length === 2) return parts[0] * 60 + parts[1];
                  return NaN;
                }).filter((n) => !isNaN(n));
                if (times.length > 0 && window.handleCaptureAllSnapshots) {
                  // 新しいインターフェースに合わせて、時間だけでなくタイトルと説明文も含める
                  const snapshotInfos = times.map(time => ({
                    time,
                    title: `${t('custom_timestamp', 'カスタムタイムスタンプ')} ${new Date(time * 1000).toISOString().substr(11, 8)}`,
                    description: t('custom_timestamp_description', 'カスタム設定されたタイムスタンプでのスナップショット')
                  }));
                  window.handleCaptureAllSnapshots(snapshotInfos);
                } else {
                  console.error('Invalid timestamps or capture function unavailable.');
                }
              }}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
            >
              {t('overlay_custom_snapshots', '複数カスタムスナップショット')}
            </button>
          </div>
          
          {localSnapshots.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#777' }}>{t('overlay_no_snapshots', 'まだスナップショットを撮影していません。')}</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
              {localSnapshots.map((snapshot) => (
                <li 
                  key={snapshot.timestamp} 
                  ref={(el) => { cardRefs.current[snapshot.timestamp] = el; }}
                  style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    marginBottom: '10px',
                    borderRadius: '5px',
                    border: '1px solid #eee',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    position: 'relative' // For positioning edit/delete buttons if needed later
                  }}
                >
                  {snapshot.imageDataUrl && (
                    <img
                      src={snapshot.imageDataUrl}
                      alt="Snapshot"
                      style={{ 
                        width: '100%', 
                        maxHeight: '200px', 
                        objectFit: 'contain', 
                        marginBottom: '8px', 
                        borderRadius: '4px',
                        backgroundColor: '#f5f5f5'
                      }}
                    />
                  )}
                  {editingSnapshotTimestamp === snapshot.timestamp ? (
                    <div style={{ marginBottom: '8px' }}>
                      <textarea
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '8px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          marginBottom: '8px'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleSaveDescription(snapshot.timestamp)}
                          style={{...aiButtonStyle}}
                        >
                          {t('overlay_save', '保存')}
                        </button>
                        <button
                          onClick={() => {
                            setEditingSnapshotTimestamp(null);
                            setEditingDescription(''); // Optionally, reset to originalSnapshot.description
                          }}
                          style={{...aiButtonStyle, marginLeft: '5px'}}
                        >
                          {t('overlay_cancel', 'キャンセル')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '8px' }}>
                      {generatingDescriptionFor === snapshot.timestamp.toString() ? (
                        <div style={{ margin: '5px 0', fontSize: '13px', color: '#666' }}>
                          <span style={{ display: 'inline-block', marginRight: '5px' }}>{t('ai_description_generating', 'AI説明文生成中...')}</span>
                          <div style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #ccc', borderTopColor: '#007bff', animation: 'spin 1s linear infinite' }}></div>
                        </div>
                      ) : generationError[snapshot.timestamp.toString()] ? (
                        <div style={{ margin: '5px 0' }}>
                          <p style={{ fontSize: '12px', color: '#dc3545', margin: '0 0 5px 0' }}>
                            {t('error_prefix', 'エラー:')} {generationError[snapshot.timestamp.toString()]}
                          </p>
                          <button
                            onClick={() => handleGenerateAIDescription(snapshot.timestamp.toString())}
                            style={{ ...aiButtonStyle, fontSize: '11px', padding: '3px 6px' }}
                            className="retry-btn action-btn"
                          >
                            {t('retry', '再試行')}
                          </button>
                        </div>
                      ) : (
                        <div style={{ margin: '5px 0' }}>
                          {snapshot.description ? (
                            // 説明文がある場合
                            <div>
                              <p 
                                onClick={() => {
                                  setEditingSnapshotTimestamp(snapshot.timestamp);
                                  setEditingDescription(snapshot.description || '');
                                }}
                                style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#333', wordBreak: 'break-all', cursor: 'pointer' }}
                              >
                                {snapshot.description}
                              </p>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                  onClick={() => handleGenerateAIDescription(snapshot.timestamp.toString())}
                                  style={{ ...aiButtonStyle, fontSize: '11px', padding: '3px 6px' }}
                                  className="ai-btn action-btn"
                                >
                                  {t('ai_regenerate', 'AI再生成')}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSnapshotTimestamp(snapshot.timestamp);
                                    setEditingDescription(snapshot.description || '');
                                  }}
                                  style={editButtonStyle}
                                  className="edit-btn action-btn"
                                >
                                  {t('overlay_edit', '編集')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            // 説明文がない場合
                            <div>
                              <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#777' }}>
                                {t('no_description', '説明がありません。')}
                              </p>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                  onClick={() => handleGenerateAIDescription(snapshot.timestamp.toString())}
                                  style={{ ...aiButtonStyle, fontSize: '11px', padding: '3px 6px' }}
                                  className="ai-btn action-btn"
                                >
                                  {t('ai_generate', 'AI説明生成')}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSnapshotTimestamp(snapshot.timestamp);
                                    setEditingDescription('');
                                  }}
                                  style={editButtonStyle}
                                >
                                  {t('overlay_edit', '編集')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>
                      {t('time_prefix', '時間:')} <span
                        onClick={() => window.handleSeekTo?.(snapshot.time)}
                        style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
                      >{new Date(snapshot.time * 1000).toISOString().substr(11, 8)}</span> 
                    </p>
                    <button
                      onClick={() => deleteSnapshot(snapshot.timestamp)}
                      title={t('overlay_delete', '削除')}
                      className="action-btn"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash size={16} color="#dc3545" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          {outlineItems.length > 0 && (
            <div ref={outlineRef} style={{ marginBottom: '15px' }}>
              {!hasTranscript && (
                <div style={{ 
                  backgroundColor: '#fff3cd', 
                  color: '#856404', 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  marginBottom: '10px',
                  fontSize: '0.9em',
                  border: '1px solid #ffeeba'
                }}>
                  <span style={{ fontWeight: 'bold', marginRight: '5px' }}>⚠️ {t('warning_label', '注意')}:</span>
                  {t('no_transcript_warning', '対象の動画のトランスクリプトが取得できないため、アウトラインが誤った内容となっている可能性があります')}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: '0', fontWeight: 'bold' }}>{t('outline_heading', 'Outline')}</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* 編集ボタン - フラグが有効な場合のみ表示 */}
                  {enableOutlineEdit && (
                    <button
                      onClick={handleEditOutline}
                      className="edit-btn"
                      style={{
                        backgroundColor: '#008299',
                        color: '#fff',
                        border: 'none',
                        padding: '3px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={t('edit_outline', 'アウトラインを編集')}
                    >
                      <Edit size={12} /> {t('overlay_edit', '編集')}
                    </button>
                  )}
                  
                  {/* 削除ボタン */}
                  <button
                    onClick={deleteCurrentOutline}
                    className="action-btn"
                    style={{
                      background: 'linear-gradient(135deg, #ff5252 0%, #b33939 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '3px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={t('delete_outline', 'アウトラインを削除')}
                  >
                    <span style={{ fontSize: '12px' }}>🗑️</span> {t('overlay_delete', '削除')}
                  </button>
                  
                  {/* スナップショット撮影ボタン */}
                  <button
                    onClick={captureAllOutlineSnapshots}
                    className="action-btn"
                    style={{
                      background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '3px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={t('capture_all_outline_snapshots', 'アウトラインの全タイムスタンプでスナップショットを撮影')}
                  >
                    <span style={{ fontSize: '12px' }}>📷</span> {t('overlay_capture_all', '全て撮影')}
                  </button>
                </div>
              </div>
              {isEditingOutline ? (
                <OutlineEditForm 
                  items={outlineItems} 
                  onSave={handleSaveOutline}
                  onCancel={handleCancelEditOutline}
                />
              ) : (
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                  {outlineItems.map((item, index) => (
                    <li key={index} style={{ marginBottom: '12px' }}>
                      <div style={{ marginBottom: '5px' }}>
                        <span
                          onClick={() => window.handleSeekTo?.(item.timestamp)}
                          style={{ cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}
                        >[{new Date(item.timestamp * 1000).toISOString().substr(11,8)}]</span>
                        <strong style={{ marginLeft: '6px', color: '#333' }}>{item.title}</strong>
                      </div>
                      <div style={{ fontSize: '0.9em', color: '#555', marginLeft: '6px', lineHeight: '1.4' }}>
                        {item.description}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {/* Floating scroll-to-top button */}
        <button
          onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', opacity: 0.5, pointerEvents: 'auto' }}
          title={t('scroll_to_top', 'トップにスクロール')}
        >
          ↑
        </button>
      </>
    )}
    </div>
  );
};
// スピンアニメーション用のスタイル

// スピンアニメーション用のスタイル
const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// スタイルタグを動的に追加
if (typeof document !== 'undefined') {
  // スピナースタイルが存在しない場合のみ追加
  if (!document.getElementById('yt-outline-snap-spinner-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'yt-outline-snap-spinner-style';
    styleEl.innerHTML = spinKeyframes;
    document.head.appendChild(styleEl);
  }
  
  // ボタンホバースタイルが存在しない場合のみ追加
  if (!document.getElementById('yt-outline-snap-button-styles')) {
    const buttonStyleEl = document.createElement('style');
    buttonStyleEl.id = 'yt-outline-snap-button-styles';
    // ボタンホバースタイルを直接指定
    buttonStyleEl.innerHTML = `.action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .action-btn:active {
      transform: translateY(1px);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .ai-btn:hover {
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
      filter: brightness(1.1);
    }
    .ai-btn:active {
      transform: translateY(1px);
      filter: brightness(0.95);
      box-shadow: 0 2px 3px rgba(99, 102, 241, 0.3);
    }
    .outline-btn:hover {
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.5);
      filter: brightness(1.1);
    }
    .outline-btn:active {
      transform: translateY(1px);
      filter: brightness(0.95);
      box-shadow: 0 2px 3px rgba(14, 165, 233, 0.3);
    }
    .edit-btn:hover {
      background-color: #0069d9;
      box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
    }
    `;
    document.head.appendChild(buttonStyleEl);
  }
}

export default OverlayPanel;
