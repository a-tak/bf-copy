# ビルドマネージャーエージェント向けガイド

## ビルド作業のベストプラクティス

### 事前確認チェックリスト
- [ ] 開発用Electronプロセスの完全停止確認
- [ ] 依存関係の整合性確認（npm list）
- [ ] 前回ビルド成果物のクリーンアップ
- [ ] バージョン番号の適切なインクリメント

### よくある問題と対処法
- **プロセス終了失敗**: タスクマネージャーから手動終了 → システム再起動も検討
- **ネイティブモジュールエラー**: node_modules削除 → npm install → 再ビルド
- **ビルド時間過長**: 不要なlocalesの除外、キャッシュクリアを検討

### ビルド後確認項目
- [ ] インストーラー（.exe）とポータブル版の両方生成確認
- [ ] ファイルサイズの妥当性（100MB前後）
- [ ] 実行ファイルの動作確認
- [ ] Windows Defender SmartScreen表示の予想と対処法説明

### 効率的なビルド手順

#### 事前準備コマンド
```cmd
:: プロセス強制終了
taskkill /F /IM "BF Copy.exe" 2>nul
taskkill /F /IM "electron.exe" 2>nul

:: クリーンアップ
if exist dist rmdir /s /q dist
```

#### ビルドスクリプト改善提案
```json
"scripts": {
  "prebuild": "taskkill /F /IM \"BF Copy.exe\" 2>nul & taskkill /F /IM \"electron.exe\" 2>nul & if exist dist rmdir /s /q dist",
  "build-release": "npm version patch --no-git-tag-version && npm run prebuild && npm run build-win"
}
```

### 重要なポイント
1. **バージョンインクリメント**：最も重要で、忘れやすい作業
2. **プロセス完全終了**：ビルド成功の前提条件
3. **dist フォルダクリーンアップ**：古いビルド成果物との混在防止
4. **ビルド結果検証**：ファイルサイズと実行可能性の確認

### Electronアプリ特有の注意事項
- プロセスが完全に終了しないことが多い
- ネイティブ依存関係（sharpモジュールなど）の互換性確認が必要
- ファイルサイズが100MB以上になることの説明が必要
- Windows Defender SmartScreenの警告への対処法を用意

### エンドユーザー向け配布準備
- インストーラー版（推奨）とポータブル版の使い分け説明
- セキュリティ警告の対処法をユーザーに案内
- publisherNameやメタデータの充実によるSmartScreen警告軽減