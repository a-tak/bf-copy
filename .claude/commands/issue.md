---
allowed-tools: Bash(git:*), Bash(gh:*)
argument-hint: [issue-number]
description: GitHubのIssueからブランチを作成して開発を開始（引数省略時は現在のブランチ名から自動抽出）
---

## Context

**現在のGit状態を確認しています...**
!`git status --porcelain | wc -l | xargs -I {} echo "未コミット変更数: {}"`
!`git branch --show-current`

## Your task

### Issue番号の決定

まず、使用するIssue番号を以下のロジックで決定してください：

1. **引数が指定されている場合（$ARGUMENTS が空でない）:**
   - `$ARGUMENTS` をIssue番号として使用

2. **引数が指定されていない場合（$ARGUMENTS が空）:**
   - 現在のブランチ名から先頭のIssue番号を抽出
   - 抽出パターン例：
     - `feature/issue-30-xxx` → `30`
     - `123-fix-bug` → `123`
     - `fix/456-update` → `456`
   - 正規表現: `^(?:feature/)?(?:issue-)?(\d+)`
   - Issue番号が見つからない場合 → エラーメッセージを表示して終了

### Issue情報の取得

決定したIssue番号を使って、以下のコマンドでIssue情報を取得してください：

```bash
gh issue view <決定したIssue番号> --json number,title,body,state,url
```

### メインタスク

取得したIssue情報に基づいて以下を実行してください：

### 1. **Issue情報の分析と表示**
- 取得したIssue情報（番号、タイトル、状態、URL）を分析
- Issue本文から主要な要件と目的を抽出
- 開発者向けにわかりやすく要約

### 2. **ブランチ命名規則の適用**
- 以下の規則でブランチ名を生成：
  - **feature/issue-{番号}-{スラッグ}** の形式
  - 日本語タイトル → 英語概要 → kebab-case変換
  - 最大50文字に制限（可読性重視）
  - 特殊文字の除去と適切なエスケープ

**ブランチ名変換例：**
- "簡単にIssueを取得してブランチを切って修正開始する..." → `feature/issue-30-create-issue-branch-command`
- "バグ修正: 音声録音が停止しない問題" → `feature/issue-XX-fix-audio-recording-stop-bug`

### 3. **安全なGit操作の実行**
- 未コミット変更の確認（警告表示）
- ブランチ名の重複チェック
- mainブランチからの分岐を確認
- 新しいブランチの作成と切り替え

### 4. **開発環境の準備**
- ブランチ作成成功の確認
- Issue詳細のコンテキスト提供
- 推奨される次のステップ（TDD、テストファイル作成など）
- 関連ファイルの特定と提案

## エラーハンドリング

以下の状況に対して適切に対応してください：

### **Issue番号の決定エラー**

- 引数なし & ブランチ名からIssue番号抽出不可 → エラーメッセージ表示

  ```text
  ❌ エラー: Issue番号が指定されておらず、現在のブランチ名からも抽出できませんでした

  使用方法:
  1. Issue番号を引数で指定: /issue 123
  2. Issue番号を含むブランチ名（例: feature/issue-123-xxx, 123-fix-bug）
  ```

### **Issue取得エラー**
- 存在しないIssue番号 → 利用可能なIssueリストの表示提案
- アクセス権限不足 → 認証状態の確認方法を案内
- ネットワークエラー → リトライ方法の提案

### **Git操作エラー**
- 未コミット変更がある → 変更のstash方法を提案
- ブランチ名重複 → 代替名の自動生成（例：`-v2`追加）
- mainブランチ以外からの分岐 → mainへの切り替えを確認

### **復旧方法**
- 作成途中で失敗 → `git checkout main && git branch -d failed-branch`
- ブランチ作成済みだが問題あり → 手動修正方法の案内

## 使用例とサンプル出力

### **使用例1: Issue番号を指定**

```bash
/issue 30
```

### **使用例2: 引数なし（現在のブランチ名から抽出）**

```bash
# 現在のブランチ: feature/issue-30-create-issue-branch-command
/issue
# → Issue番号 30 を自動抽出して処理
```

### **期待されるサンプル出力**

```text
📋 Issue #30: 簡単にIssueを取得してブランチを切って修正開始するClaude Codeのカスタムコマンドをつくりたい

🔍 Issue分析:
- 状態: Open
- 目的: Claude Code開発効率化
- 要件: Issue→ブランチ作成の自動化

🌿 生成ブランチ名: feature/issue-30-create-issue-branch-command

✅ ブランチ作成完了
💡 推奨次ステップ:
  1. TDDアプローチでテストファイル作成
  2. .claude/commands/ ディレクトリの詳細設計
  3. 関連ドキュメントの更新検討
```

## CLAUDE.mdとの連携

このコマンドは本プロジェクトのTDD開発方針に従い、以下を推奨します：
- 適切なcommit message規約の遵守  
- Pull Request作成時のIssue自動連携