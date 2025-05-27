/**
 * テンプレートマネージャー
 * プロンプトテンプレートの取得と管理を担当
 */
import { TemplateType, LanguageCode, Templates, CustomTemplates } from './types';
import { defaultTemplates } from './templates';
import { flags } from '../flags';

// デバッグ用のフラグ
const DEBUG_TEMPLATE_MANAGER = false;

/**
 * デバッグログ出力
 */
function logDebug(...args: any[]) {
  if (DEBUG_TEMPLATE_MANAGER) {
    console.log('📝 TemplateManager:', ...args);
  }
}

/**
 * テンプレートマネージャークラス
 * デフォルトテンプレートのキャッシュとユーザーカスタムテンプレートの管理を行う
 */
export class TemplateManager {
  private static instance: TemplateManager;
  private customTemplates: CustomTemplates = {};
  private initialized = false;

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * プライベートコンストラクタ
   */
  private constructor() {
    // 初期化は非同期で行うため、ここでは何もしない
  }

  /**
   * テンプレートマネージャーを初期化
   * カスタムテンプレートをストレージから読み込む
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // ストレージからカスタムテンプレートを読み込む
      const result = await chrome.storage.sync.get('customTemplates');
      if (result.customTemplates) {
        this.customTemplates = result.customTemplates;
        logDebug('カスタムテンプレートを読み込みました:', this.customTemplates);
      } else {
        logDebug('カスタムテンプレートが見つかりませんでした。デフォルトを使用します。');
      }
      this.initialized = true;
    } catch (error) {
      console.error('カスタムテンプレートの読み込みに失敗しました:', error);
      // エラーが発生しても初期化済みとマークして、デフォルトテンプレートを使用できるようにする
      this.initialized = true;
    }
  }

  /**
   * テンプレートを取得
   * @param type テンプレートタイプ
   * @param lang 言語コード
   * @returns テンプレート文字列
   */
  public async getTemplate(type: TemplateType, lang: LanguageCode): Promise<string> {
    // フィーチャーフラグがオフの場合は日本語のデフォルトテンプレートを返す
    if (!flags.ENABLE_I18N_PROMPTS) {
      logDebug(`多言語プロンプトフラグが無効です。日本語のデフォルトテンプレートを返します: ${type}`);
      return defaultTemplates.ja[type] || '';
    }

    // 初期化されていない場合は初期化
    if (!this.initialized) {
      await this.initialize();
    }

    // カスタムテンプレートがあればそれを返す
    if (this.customTemplates[type]?.[lang]) {
      logDebug(`カスタムテンプレートを返します: ${type}, ${lang}`);
      return this.customTemplates[type]![lang]!;
    }

    // デフォルトテンプレートを返す
    const template = defaultTemplates[lang]?.[type] || defaultTemplates.ja[type] || '';
    logDebug(`デフォルトテンプレートを返します: ${type}, ${lang} => ${template.substring(0, 30)}...`);
    return template;
  }

  /**
   * テンプレートを同期的に取得（初期化済みの場合のみ）
   * 非同期処理ができない場所で使用
   * @param type テンプレートタイプ
   * @param lang 言語コード
   * @returns テンプレート文字列
   */
  public getTemplateSync(type: TemplateType, lang: LanguageCode): string {
    // フィーチャーフラグがオフの場合は日本語のデフォルトテンプレートを返す
    if (!flags.ENABLE_I18N_PROMPTS) {
      logDebug(`多言語プロンプトフラグが無効です。日本語のデフォルトテンプレートを返します: ${type}`);
      return defaultTemplates.ja[type] || '';
    }

    // 初期化されていない場合はデフォルトを返す
    if (!this.initialized) {
      logDebug(`テンプレートマネージャーが初期化されていません。デフォルトテンプレートを返します: ${type}, ${lang}`);
      return defaultTemplates[lang]?.[type] || defaultTemplates.ja[type] || '';
    }

    // カスタムテンプレートがあればそれを返す
    if (this.customTemplates[type]?.[lang]) {
      logDebug(`カスタムテンプレートを返します: ${type}, ${lang}`);
      return this.customTemplates[type]![lang]!;
    }

    // デフォルトテンプレートを返す
    const template = defaultTemplates[lang]?.[type] || defaultTemplates.ja[type] || '';
    logDebug(`デフォルトテンプレートを返します: ${type}, ${lang} => ${template.substring(0, 30)}...`);
    return template;
  }

  /**
   * カスタムテンプレートを保存
   * @param type テンプレートタイプ
   * @param lang 言語コード
   * @param template テンプレート文字列
   */
  public async saveCustomTemplate(type: TemplateType, lang: LanguageCode, template: string): Promise<void> {
    // 初期化されていない場合は初期化
    if (!this.initialized) {
      await this.initialize();
    }

    // カスタムテンプレートを更新
    if (!this.customTemplates[type]) {
      this.customTemplates[type] = {};
    }
    this.customTemplates[type]![lang] = template;

    // バージョン情報を設定
    if (!this.customTemplates.__version) {
      this.customTemplates.__version = '1.0';
    }

    try {
      // 保存前にJSON変換テストを行い、エラーを検出
      const test = JSON.parse(JSON.stringify(this.customTemplates));
      
      // ストレージに保存
      await chrome.storage.sync.set({ customTemplates: this.customTemplates });
      logDebug(`カスタムテンプレートを保存しました: ${type}, ${lang}`);
    } catch (error) {
      console.error('カスタムテンプレートの保存に失敗しました:', error);
      throw error;
    }
  }

  /**
   * カスタムテンプレートを削除
   * @param type テンプレートタイプ
   * @param lang 言語コード
   */
  public async deleteCustomTemplate(type: TemplateType, lang: LanguageCode): Promise<void> {
    // 初期化されていない場合は初期化
    if (!this.initialized) {
      await this.initialize();
    }

    // カスタムテンプレートが存在しない場合は何もしない
    if (!this.customTemplates[type]?.[lang]) {
      logDebug(`削除対象のカスタムテンプレートが存在しません: ${type}, ${lang}`);
      return;
    }

    // カスタムテンプレートを削除
    delete this.customTemplates[type]![lang];

    // 空になったオブジェクトを削除
    if (Object.keys(this.customTemplates[type]!).length === 0) {
      delete this.customTemplates[type];
    }

    try {
      // ストレージに保存
      await chrome.storage.sync.set({ customTemplates: this.customTemplates });
      logDebug(`カスタムテンプレートを削除しました: ${type}, ${lang}`);
    } catch (error) {
      console.error('カスタムテンプレートの削除に失敗しました:', error);
      throw error;
    }
  }
}
