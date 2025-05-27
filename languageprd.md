
### フェーズ1までの実装完了、フェーズ2以降を改定しました。

### 推奨ロードマップ
💡 考え方
❶ 共通インフラ → ❷ 既存 UI の文字列 → ❸ AI プロンプト → ❹ 将来のカスタム編集
に分け、各フェーズとも “feature flag ON のときだけ新コードが動く” 方式でリグレッション面積を局所化します。

フェーズ	ゴール	メモ
0. 基盤強化	i18n.ts を拡張し getCurrentLanguage() + t(key) を統一 API に。
_locales に新キーを追加しただけでは UI が変わらない状態に留める。	src/lib/i18n.ts, _locales/*/messages.json	★☆☆	全機能 OFF でふだん通り動くことを 手動テストで確認。
1. Overlay UI 多言語化	対応済み
2. AI プロンプト 言語設定にしたがって変更	アウトライン／画像説明のテンプレートを
promptTemplates/{ja,en}.ts へ分離。
getPrompt(type, lang) ヘルパを追加。	contentScript.tsx	
3. プロンプトのカスタム編集機能のためのUI options.tsx

## 共通の安全策

- Feature Flag
- 手動テスト

UI なしで「内部構造だけ」先に用意し、フェーズ 2・フェーズ 3のどちらにも耐えられる土台を作る。

2-A. アーキテクチャ概要

           +---------------------+
           |  promptTemplates.ts |  ← defaultTemplates = { ja:{…}, en:{…} }
           +----------+----------+
                      |
           +----------v----------+
           |  TemplateManager    |  ← getTemplate(type, lang)
           |  - caches defaults  |
           |  - merges user mods |-- chrome.storage.sync['customTemplates']
           +----------+----------+
                      |
          contentScript.tsx (handleGenerateOutline / SnapshotDescription)
TemplateManager は UI 依存ゼロ。

後で編集 UI を作ったら、Storage に { type:"outline", lang:"en", body:"…" } を保存するだけで即反映。

Unit-test が極めて楽：expect(getTemplate('outline','ja')).toContain('タイムスタンプ')

2-B. 実装ステップ（安全順）
ステップ	影響	リグレッション対策
0: TemplateManager 新規追加 	新ファイルのみ	既存コードからは 呼び出さない（build 緑確認）
1: contentScript.tsx を 2 行変更し TemplateManager.getTemplate() 経由にする	Prompt 文字列の生成箇所	ENABLE_TEMPLATE_MANAGER フラグでガード
2: _locales へ英語 default テンプレ（短縮版）をキー分割して登録	既存 UI 触らず	Fallback→日本語で必ず成功するテストを追加
3: OptionsPage のDevelopers Options に "Enable Template Manager" を追加

これなら Phase 2 相当の作業は「ステップ 1-2」のみ。
カスタム機能は Storage 連携と簡素な <textarea> を足すだけで完成し、リグレッション範囲は TemplateManager だけに限定されます。

---

## パフォーマンス・安定運用メモ

テーマ	推奨
Storage read	chrome.storage.sync は 100 ms 台も珍しくない。
初期ロード時に 1 回 fetch → in-memory cache で済ませる（TemplateManager に保持）。
バージョン管理	customTemplates.__version を設け、テンプレ仕様変更時にマイグレート or 破棄。
長文 JSON の破損	保存前に JSON.parse(JSON.stringify(obj)) で stringify→parse round-tripしエラーを検出。
デフォルト差分だけ保存	Storage には カスタム部分のみを delta 形式で。
例：{ outline: { en:"…" } }

---

## リグレッション防止チェックリスト（PRごとに実施）


- [ ] AI API リクエスト body が想定テンプレ文字列になっている（コンソールログで確認）  

---

### まとめ

1. **インフラ → UI → AI プロンプト** の順でコード量が小さいところから攻める。  
2. **Feature flag & Fallback** で “戻せば元通り” を保証。  

チャットウインドウでの説明は常に日本語で。
