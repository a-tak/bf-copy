# git-commit-push コマンド詳細

## 処理フロー

```bash
# 1. 現在の状態確認
git status

# 2. 変更をステージング（全ファイル or 指定ファイル）
git add .
# または
git add <指定されたファイル>

# 3. コミット作成（HEREDOCでメッセージを渡す）
git commit -m "$(cat <<'EOF'
<コミットメッセージ>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# 4. リモートにプッシュ
git push

# 5. 実行後に再度statusを確認
git status
```

## コミットメッセージ規約

### プレフィックス
- `feat:` 新機能追加
- `fix:` バグ修正
- `docs:` ドキュメント変更のみ
- `refactor:` リファクタリング
- `test:` テスト追加・修正
- `chore:` ビルド・設定変更

### フォーマット
```
<type>: <概要>

<詳細説明（必要に応じて）>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 例
```
fix(P1): レビュー指摘対応 - null check追加

BatteryCheckerクラスにnullチェックを追加し、
NPEを防止するよう修正

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## エラーハンドリング詳細

### 1. コミット失敗
- **原因**: pre-commit hook等のエラー
- **対処**: hookのエラー詳細を報告し、必要に応じて再コミット

### 2. プッシュ失敗
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

### 3. マージコンフリクト
- **原因**: 他のコミットとの衝突
- **対処**: メインエージェントに解決を依頼

## 注意事項詳細

### pre-commit hookエラー
hookで変更があった場合は自動的に再コミットする。

### 大量の変更
100ファイル以上の変更がある場合は確認を求める。

### 機密情報
`.env`, `credentials.json`等が含まれる場合は警告を出す。

## 出力フォーマット

実行完了後、以下の情報を簡潔に報告する:

```
✅ Git操作完了

- コミットハッシュ: abc1234
- 変更ファイル数: 3
- プッシュ先: origin/feature/xxx

変更内容:
- app/src/main/.../Foo.kt
- app/src/test/.../FooTest.kt
- docs/architecture/business-rules.md
```
