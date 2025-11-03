# 出力フォーマット例

このドキュメントは、git-reviewスキルの出力フォーマット例を提供します。

## ステップ1: レビュー指摘事項のリスト化

```markdown
## 📋 レビューサマリー

- PR番号: #399
- タイトル: feat: 文字起こしテキストからメモ検索機能を実装
- レビュアー数: 2
- 指摘総数: 6件（コード行コメント1件 + PR全体コメント5件）

---

## 📝 指摘事項一覧

### コード行コメント（1件）

1. **[P1] FTSトリガーのUPDATE処理の問題**
   - ファイル: `VoxmentDatabase.kt:88-90`
   - レビュアー: chatgpt-codex-connector[bot]
   - 内容: UPDATE文をDELETE + INSERTに変更

### PR全体コメント（5件）

2. **[P0/必須] デバッグログレベルの修正**
   - ファイル: `VoiceMemoSearchPagingSource.kt:34, 49-50, 54, 72-73, 90-91`
   - レビュアー: claude
   - 内容: Logger.e()をLogger.d()に変更

3. **[P2/推奨] FtsQueryEscaperのコメント修正**
   - ファイル: `FtsQueryEscaper.kt:54-56`
   - レビュアー: claude
   - 内容: 「OR検索」→「AND検索（部分一致）」

4. **[P2/推奨] combine関数の可読性向上**
   - ファイル: `RecordingListViewModel.kt:164-180`
   - レビュアー: claude
   - 内容: コメントで順序を明記

5. **[P3/軽微] escapeWithPrefixSearch関数の未使用**
   - ファイル: `FtsQueryEscaper.kt:73-93`
   - レビュアー: claude
   - 内容: 削除またはコメント追加

6. **[P3/軽微] safe-android-test.shのクロスプラットフォーム対応**
   - ファイル: `scripts/safe-android-test.sh:16-20`
   - レビュアー: claude
   - 内容: adb/adb.exe両対応
```

## ステップ2: ユーザーに選択肢を提示

**重要**: 必ず `AskUserQuestion` ツールを使用してユーザーに選択させること

**AskUserQuestionの制限**: 1つの質問で最大4つの選択肢まで

### ケースA: 指摘が4つ以下の場合

全ての指摘を提示する：

```
AskUserQuestion:
  question: "どのレビュー指摘に対応しますか？（複数選択可）"
  header: "レビュー対応"
  multiSelect: true
  options:
    - label: "[P0] デバッグログレベル修正"
      description: "VoiceMemoSearchPagingSource.kt - Logger.e() → Logger.d()"
    - label: "[P1] FTSトリガーのUPDATE処理"
      description: "VoxmentDatabase.kt - UPDATE → DELETE+INSERT"
    - label: "[P2] FtsQueryEscaperコメント修正"
      description: "FtsQueryEscaper.kt - OR検索 → AND検索"
    - label: "[P2] combine関数可読性向上"
      description: "RecordingListViewModel.kt - コメント追加"
```

### ケースB: 指摘が5つ以上の場合

優先度の高いもの（P0/P1）のみを提示し、残りは次回対応とする：

```
AskUserQuestion:
  question: "どのレビュー指摘に対応しますか？（複数選択可）\n\n⚠️ 指摘が6件あります。P0/P1の4件のみ表示します。残り2件（P3）は次回対応してください。"
  header: "レビュー対応"
  multiSelect: true
  options:
    - label: "[P0] デバッグログレベル修正"
      description: "VoiceMemoSearchPagingSource.kt - Logger.e() → Logger.d()"
    - label: "[P1] FTSトリガーのUPDATE処理"
      description: "VoxmentDatabase.kt - UPDATE → DELETE+INSERT"
    - label: "[P2] FtsQueryEscaperコメント修正"
      description: "FtsQueryEscaper.kt - OR検索 → AND検索"
    - label: "[P2] combine関数可読性向上"
      description: "RecordingListViewModel.kt - コメント追加"
```

**残りの指摘（次回対応）**:
- [P3/軽微] 未使用関数の整理 (FtsQueryEscaper.kt)
- [P3/軽微] クロスプラットフォーム対応 (safe-android-test.sh)

### ケースC: P0/P1が4つを超える場合

P0のみ、またはP0+P1の上位4つに絞る：

```
AskUserQuestion:
  question: "どのレビュー指摘に対応しますか？（複数選択可）\n\n⚠️ P0/P1指摘が7件あります。上位4件のみ表示します。残り3件は次回対応してください。"
  header: "レビュー対応"
  multiSelect: true
  options:
    - label: "[P0] クラッシュバグ修正"
      description: "MainActivity.kt - NPE対策"
    - label: "[P0] データ破損の修正"
      description: "Database.kt - トランザクション追加"
    - label: "[P1] メモリリーク修正"
      description: "RecordingService.kt - リスナー解放"
    - label: "[P1] パフォーマンス改善"
      description: "SearchViewModel.kt - 不要な再計算を削減"
```

## ステップ3: 選択された項目の詳細を返す

ユーザーが選択した項目について、以下の詳細情報をメインエージェントに返す:

```markdown
## ✅ 対応する指摘事項

ユーザーが以下の項目を選択しました:

### 1. [必須] デバッグログレベル修正

**ファイル**: `VoiceMemoSearchPagingSource.kt:34, 49-50, 54, 72-73, 90-91`
**優先度**: P0（必須）
**レビュアー**: claude

**問題内容**:
デバッグログをLogger.e()（エラーレベル）で出力しています。これにより通常の検索操作がエラーログとして記録され、実際のエラーが埋もれる可能性があります。

**推奨修正**:
Logger.e()をLogger.d()に変更

**該当箇所**:
- 行34: `Logger.e(TAG, "load() - Loading page...")`
- 行49-50: `Logger.e(TAG, "...")`
- 行54: `Logger.e(TAG, "...")`
- 行72-73: `Logger.e(TAG, "...")`
- 行90-91: `Logger.e(TAG, "...")`

---

（以降、選択された項目について同様に詳細を表示）
```
