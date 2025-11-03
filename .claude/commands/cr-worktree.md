---
allowed-tools: Bash(*)
argument-hint: [issue-number|branch-name]
description: Issue番号やブランチ名を指定してgit worktreeでワークツリーを作成し、Cursorを起動します
---

git worktreeを使用してワークツリーを作成し、開発を開始してください。作業は新しく起動したCursorで行うので、新しいワークツリーに切り替えたり、作業を進めないようにしてください。Cursorの起動までで止めてください。と

引数の処理：
- Issue番号（数字）が指定された場合：GitHub CLIを使ってIssue情報を取得し、タイトルからブランチ名を生成
- ブランチ名が指定された場合：そのままブランチ名として使用
- 引数がない場合：対話式でブランチ名を入力

以下の処理を実行してください：

```bash
# 引数の処理
ARG="$ARGUMENTS"

# 引数がない場合は対話式
if [ -z "$ARG" ]; then
  echo "🔧 ブランチ名を入力してください:"
  read -r ARG
  if [ -z "$ARG" ]; then
    echo "❌ ブランチ名が入力されませんでした"
    exit 1
  fi
fi

# worktreeディレクトリの設定（プロジェクト外）
PROJECT_ROOT=$(git rev-parse --show-toplevel)
if [ $? -ne 0 ]; then
  echo "❌ Gitプロジェクトのルートディレクトリを取得できませんでした"
  exit 1
fi

WORKTREE_BASE="$(dirname "$PROJECT_ROOT")/worktrees/$(basename "$PROJECT_ROOT")"
echo "🔧 ワークツリーベースディレクトリ: $WORKTREE_BASE"

if ! mkdir -p "$WORKTREE_BASE"; then
  echo "❌ ワークツリーベースディレクトリの作成に失敗しました: $WORKTREE_BASE"
  exit 1
fi

# 数字かどうかをチェック（Issue番号か判定）
if [[ "$ARG" =~ ^[0-9]+$ ]]; then
  # Issue番号の場合
  echo "📋 Issue #$ARG の情報を取得中..."
  
  # GitHub CLIの認証チェック
  if \! gh auth status &> /dev/null; then
    echo "❌ GitHub CLIの認証が必要です: gh auth login"
    exit 1
  fi
  
  # Issue情報取得
  ISSUE_INFO=$(gh issue view "$ARG" --json title 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "❌ Issue #$ARG が見つかりません"
    exit 1
  fi
  
  # タイトルを取得してブランチ名を自動生成
  TITLE=$(echo "$ISSUE_INFO" | jq -r '.title')

  echo "📦 Issue #$ARG: $TITLE"
  echo ""

  # ⚠️ Claude Code: Issue取得後にブランチ名を決定してください
  # スクリプトはここでexitし、Claude Codeが以下を実行：
  # 1. Issueタイトルから適切な英語ブランチ名（シンプルで短い）を決定
  # 2. ブランチ名は "$ARG-[スラッグ]" の形式（例: "435-fix-back-navigation"）
  # 3. ユーザーに選択を求めず自動決定
  # 4. 決定したブランチ名で以下のコマンドを実行：
  #    BRANCH_NAME="決定したブランチ名"
  #    WORKTREE_PATH="$WORKTREE_BASE/$BRANCH_NAME"
  #    git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" main
  #    cd "$WORKTREE_PATH" && git submodule update --init --recursive
  #    cd "$WORKTREE_PATH" && cursor .

  echo "🤖 Claude Codeがブランチ名を自動決定します..."
  exit 0
else
  # ブランチ名として直接使用
  BRANCH_NAME="$ARG"
  WORKTREE_PATH="$WORKTREE_BASE/$BRANCH_NAME"
  
  echo "🌿 ワークツリー作成中: $BRANCH_NAME"
  
  # worktree作成（ブランチが存在しない場合は自動作成）
  echo "🔧 ワークツリーとブランチを作成中..."
  if git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" main; then
    echo "✅ ワークツリー作成完了: $BRANCH_NAME"
    echo "📁 パス: $WORKTREE_PATH"
  else
    # ブランチが既に存在する場合の処理
    echo "🔄 既存ブランチでワークツリーを作成中..."
    if git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"; then
      echo "✅ ワークツリー作成完了: $BRANCH_NAME"
      echo "📁 パス: $WORKTREE_PATH"
    else
      echo "❌ ワークツリーの作成に失敗しました"
      echo "詳細: ブランチ名 '$BRANCH_NAME'、パス '$WORKTREE_PATH'"
      exit 1
    fi
  fi
fi

# Cursor起動
if [ -d "$WORKTREE_PATH" ]; then
  echo ""
  echo "🚀 Cursorを起動中..."
  echo ""
  echo "⚠️  【重要】Serena安全対策"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Cursorが起動したら、必ず以下を実行してください："
  echo ""
  echo "1. CursorでClaude Codeを起動"
  echo "2. 以下のコマンドでSerenaプロジェクトをアクティベート："
  echo "   mcp__serena__activate_project: \"$WORKTREE_PATH\""
  echo ""
  echo "⚠️  これを忘れると、間違ったプロジェクトを参照する危険があります！"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  cd "$WORKTREE_PATH" && cursor .
else
  echo "❌ ワークツリーのパスが見つかりませんでした"
  exit 1
fi
```