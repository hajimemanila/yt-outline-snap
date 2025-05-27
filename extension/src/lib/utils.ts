export function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

// デバッグ用のロギング関数
const IS_DEBUG = true; // Set to false for production

/**
 * デバッグ情報をコンソールに出力する
 * IS_DEBUG が true の場合のみ出力する
 */
export const logDebug = (...args: any[]) => {
  if (IS_DEBUG) {
    console.log('YT Outline & Snap:', ...args);
  }
};
