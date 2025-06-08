#!/bin/bash

# Sigma BF Copy - 自動ビルド・実行スクリプト
# 人間による動作確認が必要な場合に実行

echo "=== Sigma BF Copy 自動ビルド・実行 ==="
echo ""

# 1. 既存のプロセス終了（Windows環境）
echo "1. 既存プロセスの終了確認..."
taskkill /F /IM "Sigma BF Copy.exe" 2>/dev/null && echo "✓ 既存プロセスを終了しました" || echo "✓ 実行中プロセスはありませんでした"
echo ""

# 2. Windows用ビルド実行
echo "2. Windows用ビルド実行..."
npm run pack
echo ""

# 3. 実行ファイルの確認
echo "3. ビルド結果確認..."
if [ -f "dist/win-unpacked/Sigma BF Copy.exe" ]; then
    echo "✓ ビルド成功: $(ls -lh "dist/win-unpacked/Sigma BF Copy.exe" | awk '{print $5, $9}')"
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
echo "2. 'Sigma BF Copy.exe' をダブルクリックで実行"
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