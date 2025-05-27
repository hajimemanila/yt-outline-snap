// Gemini API連携機能

import { getSettings } from './storage';
import { GeminiRequest, GeminiResponse } from './types';

/**
 * Gemini APIを呼び出す（Background Scriptから呼び出される）
 */
export const generateSummary = async (data: GeminiRequest): Promise<any> => {
  const settings = await getSettings();
  if (!settings.apiKey) {
    throw new Error('API key not set');
  }
  
  const prompt = `あなたはソフトウェア解説者です。以下の YouTube 動画を分析し、
各重要ステップを <timestamp> <title> <description> <code> 形式で
出力してください。省略なしで詳細に記述してください。`;
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${settings.modelName}:generateContent?key=${settings.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { text: `動画URL: ${data.videoUrl}` },
              { text: `言語: ${data.language || settings.language}` },
              ...(data.frameSamples ? data.frameSamples.map(sample => ({ inlineData: { data: sample, mimeType: 'image/png' } })) : [])
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40
        }
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API error: ${error.error?.message || 'Unknown error'}`);
  }
  
  return await response.json();
};

/**
 * Content ScriptからBackground Scriptへのメッセージ送信
 */
export const sendMessageToBackground = async (message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Gemini APIを呼び出す（Content Scriptから呼び出す）
 */
export const callGeminiAPI = async (data: GeminiRequest): Promise<any> => {
  try {
    const response = await sendMessageToBackground({
      type: 'GENERATE_SUMMARY',
      data
    });
    
    if (!response || !response.success) {
      throw new Error(response?.error || 'Unknown error');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
};

/**
 * Gemini APIのレスポンスからアウトラインを抽出する
 */
export const parseOutlineFromResponse = (response: GeminiResponse): { timestamp: number; title: string; description: string; code?: string }[] => {
  if (!response.candidates || !response.candidates[0]?.content?.parts) {
    throw new Error('Invalid API response format');
  }
  
  const text = response.candidates[0].content.parts
    .filter(part => part.text)
    .map(part => part.text)
    .join('\n');
  
  // タイムスタンプパターンを検出
  const timestampRegex = /\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?/;
  
  // 行ごとに分割
  const lines = text.split('\n').filter(line => line.trim());
  
  const outlineItems = [];
  let currentItem: any = null;
  let codeBlock = false;
  let codeContent = '';
  
  for (const line of lines) {
    // コードブロックの開始/終了を検出
    if (line.trim().startsWith('```')) {
      codeBlock = !codeBlock;
      if (!codeBlock && currentItem) {
        // コードブロック終了
        currentItem.code = codeContent.trim();
        codeContent = '';
      }
      continue;
    }
    
    if (codeBlock) {
      // コードブロック内
      codeContent += line + '\n';
      continue;
    }
    
    // タイムスタンプを検出
    const timestampMatch = line.match(timestampRegex);
    if (timestampMatch) {
      // 新しいアイテムを開始
      if (currentItem) {
        outlineItems.push(currentItem);
      }
      
      const minutes = parseInt(timestampMatch[1], 10);
      const seconds = parseInt(timestampMatch[2], 10);
      const timestamp = minutes * 60 + seconds;
      
      // タイトルを抽出（タイムスタンプの後の部分）
      const titlePart = line.substring(timestampMatch[0].length).trim();
      
      currentItem = {
        timestamp,
        title: titlePart || `Timestamp ${minutes}:${seconds.toString().padStart(2, '0')}`,
        description: ''
      };
    } else if (currentItem) {
      // 既存アイテムの説明を追加
      if (currentItem.description) {
        currentItem.description += '\n' + line;
      } else {
        currentItem.description = line;
      }
    }
  }
  
  // 最後のアイテムを追加
  if (currentItem) {
    outlineItems.push(currentItem);
  }
  
  return outlineItems;
};
