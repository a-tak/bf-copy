# 推奨コマンド集

## 開発コマンド
```bash
# 開発モードで実行
npm start

# 開発モード（デバッグ有効）
npm run dev

# テスト実行
npm test

# テスト（ウォッチモード）
npm test:watch
```

## ビルドコマンド
```bash
# Windows用ポータブル版ビルド
npm run pack

# Windows用インストーラー作成
npm run build-win

# Mac用ビルド
npm run build-mac

# 全プラットフォーム
npm run build
```

## 自動ビルドスクリプト
```bash
# プロセス終了＋クリーンアップ＋ビルド＋確認
./build-and-run.sh
```

## Windowsシステムコマンド（WSL環境）
```bash
# プロセス確認
/mnt/c/Windows/System32/tasklist.exe | grep -i "bf"

# プロセス終了
/mnt/c/Windows/System32/taskkill.exe /F /IM "BF Copy.exe"

# PowerShell経由のプロセス操作
powershell.exe -Command "Get-Process | Where-Object {\$_.ProcessName -like '*bf*'} | Stop-Process -Force"
```

## Git操作
```bash
# 状態確認
git status

# ステージング
git add .

# コミット
git commit -m "メッセージ"

# プッシュ
git push origin main
```