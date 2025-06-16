#!/bin/bash

# GitHubイシュー用のPhantomワークツリーを作成するヘルパースクリプト
# 使用方法: ./phantom-issue.sh <issue-number>

if [ $# -eq 0 ]; then
    echo "使用方法: $0 <issue-number>"
    echo "例: $0 35"
    exit 1
fi

ISSUE_NUMBER=$1

# イシュー情報を取得
echo "GitHub issue #${ISSUE_NUMBER} の情報を取得中..."
ISSUE_JSON=$(gh issue view ${ISSUE_NUMBER} --json number,title,body,state,author,assignees,labels)

if [ $? -ne 0 ]; then
    echo "エラー: イシュー情報の取得に失敗しました"
    exit 1
fi

# イシュー情報をパース
ISSUE_TITLE=$(echo "${ISSUE_JSON}" | jq -r '.title')
ISSUE_BODY=$(echo "${ISSUE_JSON}" | jq -r '.body')
ISSUE_STATE=$(echo "${ISSUE_JSON}" | jq -r '.state')

# ワークツリー名を生成（英数字とハイフンのみ）
SAFE_TITLE=$(echo "${ISSUE_TITLE}" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
WORKTREE_NAME="issue-${ISSUE_NUMBER}-${SAFE_TITLE:0:30}"

echo "ワークツリー '${WORKTREE_NAME}' を作成中..."

# Phantomでワークツリーを作成
phantom create "${WORKTREE_NAME}"

if [ $? -ne 0 ]; then
    echo "エラー: ワークツリーの作成に失敗しました"
    exit 1
fi

# ワークツリーのパスを取得
WORKTREE_PATH=$(phantom where "${WORKTREE_NAME}")

# .claudeディレクトリを作成
mkdir -p "${WORKTREE_PATH}/.claude"

# ローカルCLAUDE.mdを作成
cat > "${WORKTREE_PATH}/.claude/CLAUDE.md" << EOF
# 現在作業中のGitHubイシュー

## イシュー情報
- **番号**: #${ISSUE_NUMBER}
- **タイトル**: ${ISSUE_TITLE}
- **状態**: ${ISSUE_STATE}

## 内容
${ISSUE_BODY}

## 作業指示
このGitHub issue #${ISSUE_NUMBER} の問題を修正してください。

### 修正手順
1. 問題の原因を調査
2. 適切な修正を実装
3. テストを作成・実行
4. 動作確認

### 注意事項
- TDD原則に従って、まずテストを作成してから実装を進めてください
- 大元のCLAUDE.mdの指示も参照してください
EOF

echo "ローカルCLAUDE.mdを作成しました: ${WORKTREE_PATH}/.claude/CLAUDE.md"

# VS Codeで開く
echo "VS Codeでワークツリーを開いています..."
cd "${WORKTREE_PATH}" && code .

echo ""
echo "セットアップ完了！"
echo "VS Codeが開いたら、ターミナルで 'claude' コマンドを実行してください。"
echo "Claude Codeは自動的にイシュー #${ISSUE_NUMBER} のコンテキストを理解します。"