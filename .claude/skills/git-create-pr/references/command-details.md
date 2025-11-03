# git-create-pr コマンド詳細

## 処理フロー

```bash
# 1. 現在の状態確認
git status
git branch --show-current

# 2. 変更内容を確認（PR説明文作成用）
git diff main...HEAD
git log main..HEAD --oneline

# 3. 変更がステージングされていない場合
git add .

# 4. ステージ済みの変更がある場合はコミット作成
if ! git diff --cached --quiet; then
  git commit -m "$(cat <<'EOF'
<コミットメッセージ>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
fi

# 5. リモートにプッシュ
git push -u origin HEAD

# 6. PRを作成
gh pr create --title "<PR タイトル>" --body "$(cat <<'EOF'
## 概要

<PR説明文>

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# 7. PR URLを取得
gh pr view --web
```

## PR説明文フォーマット

以下の形式に従ってPR説明文を作成する：

```markdown
## 概要

<変更内容の簡潔な説明（1-3行）>

## 変更内容

- <変更点1>
- <変更点2>
- <変更点3>

## テスト

- [ ] ユニットテスト実施 (`./gradlew test`)
- [ ] UIテスト実施 (`./gradlew connectedAndroidTest`)
- [ ] 手動テスト実施

## 関連Issue

Closes #<issue番号>

## スクリーンショット（UI変更がある場合）

<スクリーンショット>

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## PRタイトルの命名規則

### プレフィックス
- `feat:` 新機能追加
- `fix:` バグ修正
- `docs:` ドキュメント変更のみ
- `refactor:` リファクタリング
- `test:` テスト追加・修正
- `chore:` ビルド・設定変更

### 例
- `feat: Google Drive復元機能追加`
- `fix(P1): 文字起こし停止不具合を修正`
- `docs: Claude Code Skills使用ガイド追加`

## エラーハンドリング詳細

### 1. PR既存
- **原因**: 同じブランチで既にPRが存在
- **対処**: 既存PRのURLを表示して終了

### 2. gh未認証
- **原因**: GitHub CLIが未認証
- **対処**: `gh auth login`を実行するよう指示

### 3. プッシュ失敗
- **原因**: リモートとの差分がある
- **対処**: `git pull`を提案

**エラーメッセージ例**:
```
⚠️ プッシュ失敗: リモートとコンフリクトしています

メインエージェントで以下を実行してください:
1. git pull --rebase origin main
2. コンフリクトを解決
3. git rebase --continue
4. 再度このSkillを実行
```

### 4. コンフリクト
- **原因**: 他のコミットとの衝突
- **対処**: メインエージェントに解決を依頼

## 注意事項詳細

### 既存PR
同じブランチで既にPRが存在する場合はスキップする。

### コミット漏れ
未コミットの変更がある場合は自動的にコミットする。

### ベースブランチ
デフォルトは`main`、必要に応じて変更可能。

### Draft PR
作業中の場合は`--draft`オプションを使用する。

## 出力フォーマット

実行完了後、以下の情報を報告する:

```
✅ PR作成完了

- PR番号: #123
- タイトル: feat: Google Drive復元機能追加
- URL: https://github.com/a-tak/voxment/pull/123
- ベースブランチ: main
- コミット数: 3

次のステップ:
- [ ] レビュー依頼
- [ ] CI/CDチェック待ち
```
