# git-create-pr 使用例

## ケース1: 新機能実装完了後

メインエージェントから呼び出し:
```
Skill: git-create-pr

新機能: Google Drive復元機能
Issue: #365

全ての変更をコミットしてPRを作成してください。
```

**実行内容**:
1. 全ファイルをステージング・コミット
2. リモートにプッシュ
3. PRを作成（タイトル: `feat: Google Drive復元機能`）
4. Issue #365と自動的に関連付け

---

## ケース2: レビュー指摘対応完了後

```
Skill: git-create-pr

レビュー指摘をすべて修正しました。
既存のPR #123を更新するため、コミット・プッシュのみ実行してください。
```

**実行内容**:
1. 修正内容をコミット
2. 既存のPRブランチにプッシュ
3. PR作成はスキップ（既にPRが存在するため）

---

## ケース3: Draft PRとして作成

```
Skill: git-create-pr

作業中のため、Draft PRとして作成してください。

タイトル: feat: Google Drive復元機能（WIP）
```

**実行内容**:
1. 全ファイルをステージング・コミット
2. リモートにプッシュ
3. `--draft`フラグ付きでPRを作成

---

## ケース4: ドキュメント更新

```
Skill: git-create-pr

ドキュメントを更新しました。
タイトル: docs: Skills使用ガイド追加
```

**実行内容**:
1. ドキュメントファイルをコミット
2. プッシュ
3. `docs:`プレフィックスでPRを作成

---

## 連携例: git-commit-push → git-create-pr

段階的に実行する場合:

```markdown
# ステップ1: コミット・プッシュ
Skill: git-commit-push
メッセージ: "feat: Google Drive復元機能追加"

# ステップ2: PR作成
Skill: git-create-pr
タイトル: "feat: Google Drive復元機能追加"
Issue: #365
```

または一括実行:

```markdown
# 一括実行
Skill: git-create-pr
（内部でgit-commit-pushと同等の処理を実行）
```
