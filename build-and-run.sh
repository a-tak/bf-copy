#!/bin/bash

# BF Copy - 自動ビルド・実行スクリプト
# 人間による動作確認が必要な場合に実行

echo "=== BF Copy 自動ビルド・実行 ==="
echo ""

# 1. 既存のプロセス終了（Windows環境）
echo "1. 既存プロセスの終了確認..."

# WSL環境判定
IS_WSL=false
if grep -q -i microsoft /proc/version 2>/dev/null; then
    IS_WSL=true
    echo "   WSL環境を検出しました"
elif [ -f /proc/sys/kernel/osrelease ] && grep -q -i microsoft /proc/sys/kernel/osrelease 2>/dev/null; then
    IS_WSL=true
    echo "   WSL環境を検出しました（osrelease）"
elif [ -d /mnt/c ]; then
    IS_WSL=true
    echo "   WSL環境を検出しました（/mnt/c存在）"
fi

# プロセス確認
echo "   プロセス検索中..."

if [ "$IS_WSL" = true ]; then
    # WSL環境での処理（特定プロセスのみカウント）
    BF_PROCESSES=$(/mnt/c/Windows/System32/tasklist.exe 2>/dev/null | grep -i "bf" | wc -l)
    
    # bf-copy関連のelectronプロセス数をカウント（簡単な方法に変更）
    BF_ELECTRON_COUNT=$(/mnt/c/Windows/System32/tasklist.exe 2>/dev/null | grep -i "electron" | grep -c "bf" || echo "0")
    
    # 全体のelectronプロセス数（参考）
    ALL_ELECTRON_PROCESSES=$(/mnt/c/Windows/System32/tasklist.exe 2>/dev/null | grep -i "electron" | wc -l)
else
    # ネイティブWindows環境での処理
    BF_PROCESSES=$(tasklist 2>/dev/null | grep -i "bf" | wc -l)
    BF_ELECTRON_COUNT=$(tasklist 2>/dev/null | grep -i "electron" | grep -c "bf" || echo "0")
    ALL_ELECTRON_PROCESSES=$(tasklist 2>/dev/null | grep -i "electron" | wc -l)
fi

echo "   見つかったプロセス: BF関連=${BF_PROCESSES}, BF-Electron=${BF_ELECTRON_COUNT}, 全Electron=${ALL_ELECTRON_PROCESSES}"

# 複数の方法でプロセス終了を試行
echo "   プロセス終了実行中..."

if [ "$IS_WSL" = true ]; then
    # WSL環境: 特定プロセスのみ終了
    echo "   特定プロセスのみ終了（他のElectronアプリは保護）..."
    
    # 方法1: BF Copy.exe を終了（直接名前指定）
    /mnt/c/Windows/System32/taskkill.exe /F /IM "BF Copy.exe" 2>/dev/null && echo "   ✓ taskkill: BF Copy.exe を終了しました"
    
    # 方法2: コマンドライン引数でbf-copyを含むプロセスを特定・終了
    echo "   bf-copy関連プロセスを検索中..."
    BF_PIDS=$(/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -Command "Get-Process -ErrorAction SilentlyContinue | Where-Object { \$_.CommandLine -like '*bf-copy*' } | Select-Object -ExpandProperty Id" 2>/dev/null | tr -d '\r')
    
    if [ ! -z "$BF_PIDS" ]; then
        echo "   見つかったbf-copy関連PID: $BF_PIDS"
        for PID in $BF_PIDS; do
            if [ ! -z "$PID" ] && [ "$PID" != "" ]; then
                echo "   PID $PID を終了中..."
                /mnt/c/Windows/System32/taskkill.exe /F /PID "$PID" 2>/dev/null && echo "   ✓ PID $PID を終了しました"
            fi
        done
    else
        echo "   bf-copy関連プロセスは見つかりませんでした"
    fi
    
    # 方法3: プロジェクトディレクトリから実行されたelectron.exeを特定・終了
    PROJECT_PATH=$(pwd | sed 's|/mnt/d|D:|g' | sed 's|/|\\|g')
    echo "   プロジェクトパス関連プロセスを検索中: $PROJECT_PATH"
    
    PROJECT_PIDS=$(/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -Command "Get-Process -Name electron -ErrorAction SilentlyContinue | Where-Object { \$_.Path -like '*$PROJECT_PATH*' } | Select-Object -ExpandProperty Id" 2>/dev/null | tr -d '\r')
    
    if [ ! -z "$PROJECT_PIDS" ]; then
        echo "   見つかったプロジェクト関連PID: $PROJECT_PIDS"
        for PID in $PROJECT_PIDS; do
            if [ ! -z "$PID" ] && [ "$PID" != "" ]; then
                echo "   プロジェクトPID $PID を終了中..."
                /mnt/c/Windows/System32/taskkill.exe /F /PID "$PID" 2>/dev/null && echo "   ✓ プロジェクトPID $PID を終了しました"
            fi
        done
    else
        echo "   プロジェクト関連プロセスは見つかりませんでした"
    fi
    
else
    # ネイティブWindows環境: 従来の方法
    # 方法1: BF Copy.exe を終了
    taskkill /F /IM "BF Copy.exe" 2>/dev/null && echo "   ✓ BF Copy.exe を終了しました"
    
    # 方法2: electron.exe を終了
    taskkill /F /IM "electron.exe" 2>/dev/null && echo "   ✓ electron.exe を終了しました"
    
    # 方法3: Node.js関連プロセスを終了
    taskkill /F /IM "node.exe" 2>/dev/null && echo "   ✓ node.exe を終了しました"
    
    # 方法4: プロセス名で部分一致検索して終了
    powershell -Command "Get-Process | Where-Object { \$_.Name -like '*bf*' } | Stop-Process -Force" 2>/dev/null && echo "   ✓ BF関連プロセスを終了しました"
fi

# 少し待機してプロセスの完全終了を確認
echo "   プロセス終了待機中..."
sleep 3

# 終了確認
echo "   終了確認中..."

if [ "$IS_WSL" = true ]; then
    # WSL環境: bf-copy関連プロセスのみ確認
    REMAINING_BF=$(/mnt/c/Windows/System32/tasklist.exe 2>/dev/null | grep -i "bf" | wc -l)
    REMAINING_BF_ELECTRON=$(/mnt/c/Windows/System32/tasklist.exe 2>/dev/null | grep -i "electron" | grep -c "bf" || echo "0")
    REMAINING_ALL_ELECTRON=$(/mnt/c/Windows/System32/tasklist.exe 2>/dev/null | grep -i "electron" | wc -l)
else
    # ネイティブWindows環境
    REMAINING_BF=$(tasklist 2>/dev/null | grep -i "bf" | wc -l)
    REMAINING_BF_ELECTRON=$(tasklist 2>/dev/null | grep -i "electron" | grep -c "bf" || echo "0")
    REMAINING_ALL_ELECTRON=$(tasklist 2>/dev/null | grep -i "electron" | wc -l)
fi

echo "   終了後の状況: BF=${REMAINING_BF}, BF-Electron=${REMAINING_BF_ELECTRON}, 全Electron=${REMAINING_ALL_ELECTRON}"

if [ "$REMAINING_BF" -eq 0 ] && [ "$REMAINING_BF_ELECTRON" -eq 0 ]; then
    echo "✓ BF Copy関連プロセスの終了を確認しました"
    if [ "$REMAINING_ALL_ELECTRON" -gt 0 ]; then
        echo "  （他のElectronアプリ ${REMAINING_ALL_ELECTRON}個 は保護されています）"
    fi
else
    echo "⚠ BF Copy関連プロセスが残っている可能性があります"
    echo "   BF: ${REMAINING_BF}, BF-Electron: ${REMAINING_BF_ELECTRON}"
fi
echo ""

# 2. 古いビルドファイルのクリーンアップ
echo "2. 古いビルドファイルのクリーンアップ..."

if [ -d "dist" ]; then
    echo "   dist フォルダが存在します。クリーンアップを試行..."
    
    # app.asar の削除を試行（よくロックされるファイル）
    if [ -f "dist/win-unpacked/resources/app.asar" ]; then
        rm -f "dist/win-unpacked/resources/app.asar" 2>/dev/null && echo "   ✓ app.asar を削除しました"
    fi
    
    # EXEファイルの削除を試行
    if [ -f "dist/win-unpacked/Sigma BF Copy.exe" ]; then
        rm -f "dist/win-unpacked/Sigma BF Copy.exe" 2>/dev/null && echo "   ✓ EXEファイルを削除しました"
    fi
    
    # 全体削除を試行
    rm -rf dist 2>/dev/null && echo "   ✓ dist フォルダを完全削除しました" || echo "   ⚠ dist フォルダの一部削除に失敗（ファイルロックの可能性）"
else
    echo "   dist フォルダは存在しません"
fi
echo ""

# 3. Windows用ビルド実行
echo "3. Windows用ビルド実行..."

# Windows版を強制的にビルド
echo "   Windows版の強制ビルドを実行..."
npx electron-builder --dir --win --x64
echo ""

# 4. 実行ファイルの確認
echo "4. ビルド結果確認..."
if [ -f "dist/win-unpacked/BF Copy.exe" ]; then
    echo "✓ ビルド成功: $(ls -lh "dist/win-unpacked/BF Copy.exe" | awk '{print $5, $9}')"
else
    echo "✗ ビルド失敗: 実行ファイルが見つかりません"
    exit 1
fi
echo ""

# 4. 実行手順の表示
echo "=== 動作確認手順 ==="
echo ""
echo "実行方法："
echo "1. dist/win-unpacked/ フォルダをWindowsマシンにコピー"
echo "2. 'BF Copy.exe' をダブルクリックで実行"
echo ""
echo "バグ修正確認手順："
echo "1. フォルダ名を入力（例：'テスト撮影'）"
echo "2. 設定変更ボタンをクリック"
echo "3. 設定画面を閉じる（キャンセルまたは保存）"
echo "4. フォルダ名フィールドに入力した値が残っているか確認"
echo ""
echo "修正されたバグ：設定画面から戻った際のフォルダ名消失問題"
echo ""
echo "=== ビルド完了 ==="