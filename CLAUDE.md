# Claude設定

## 言語設定
- **応対言語**: 日本語
- **コミュニケーション**: 日本語でのやり取りを優先

## プロジェクト概要
BFカメラから写真・動画をWindows/macOSに自動コピーするElectronアプリケーション

## 開発ガイドライン
- コメントやドキュメントは日本語で記述
- コミット メッセージは日本語または英語（慣習に従う）
- コードは英語で記述（変数名、関数名など）

## 技術スタック
- Electron
- Node.js  
- HTML/CSS/JavaScript
- Jest（テスティングフレームワーク）

## TDD（テスト駆動開発）ガイドライン
### 開発原則
- **原則としてテスト駆動開発（TDD）で進める**
- Red-Green-Refactorサイクルを厳守する

### TDD実装プロセス
1. **Red（失敗）フェーズ**
   - 期待される入出力に基づき、まずテストを作成する
   - 実装コードは書かず、テストのみを用意する
   - テストを実行し、失敗を確認する
   - テストが正しいことを確認できた段階でコミットする

2. **Green（成功）フェーズ**
   - テストをパスさせる最小限の実装を進める
   - 実装中はテストを変更せず、コードを修正し続ける
   - すべてのテストが通過するまで繰り返す

3. **Refactor（リファクタリング）フェーズ**
   - テストが通る状態でコードの品質を向上させる
   - 重複排除、可読性向上、設計改善を行う

### テスト作成指針
- **機能単位でテストを作成**（カメラ検知、ファイル操作、設定管理など）
- **Edge case**も含めて網羅的にテストする
- **モック**を適切に使用してElectron APIをテスト可能にする
- **テストファイル命名規則**: `*.test.js`
- **テスト実行**: `npm test`

### テスト対象機能
- USB デバイス／カメラ検知機能
- ファイル操作（コピー、移動、分類）
- 設定管理（読み書き、検証）
- UI操作（レンダラープロセス）
- エラーハンドリング

## 重要な注意点
- USB デバイス検知機能が含まれているため、セキュリティに注意
- ファイル操作（コピー）機能があるため、エラーハンドリングを重視

## ビルドと実行手順

### 自動ビルド・実行コマンド
人間による動作確認が必要な場合は、以下のコマンドを実行してWindows用アプリケーションをビルド・実行する：

```bash
# WSL環境対応の強化されたプロセス終了・ビルドスクリプト
./build-and-run.sh

# または手動実行の場合：

# 1. WSL環境でのプロセス終了（PowerShell経由）
powershell.exe -Command "Get-Process | Where-Object {$_.ProcessName -like '*bf*'} | Stop-Process -Force"
powershell.exe -Command "Get-Process | Where-Object {$_.ProcessName -like '*electron*'} | Stop-Process -Force"

# 2. 代替方法（Windowsコマンド直接指定）
/mnt/c/Windows/System32/taskkill.exe /F /IM "BF Copy.exe"
/mnt/c/Windows/System32/taskkill.exe /F /IM "electron.exe"

# 3. ビルドファイルクリーンアップ
rm -rf dist

# 4. Windows用ビルド実行
npm run pack

# 5. 実行確認
ls -la dist/win-unpacked/"BF Copy.exe"
```

### プロセス管理コマンド

```bash
# WSL環境での確実なプロセス終了
powershell.exe -Command "Get-Process | Where-Object {$_.ProcessName -like '*bf*'} | Stop-Process -Force"
powershell.exe -Command "Get-Process | Where-Object {$_.ProcessName -like '*electron*'} | Stop-Process -Force"

# 実行中プロセス確認（WSL環境）
powershell.exe -Command "Get-Process | Where-Object {$_.ProcessName -like '*bf*' -or $_.ProcessName -like '*electron*'}"

# 代替方法（Windowsコマンド直接）
/mnt/c/Windows/System32/taskkill.exe /F /IM "BF Copy.exe"
/mnt/c/Windows/System32/tasklist.exe | grep -i "bf"

# 開発モードで実行
npm start
```

### ビルド設定
- **Windows用ビルド**: `npm run pack` (WSL環境でも実行可能)
- **完全インストーラー**: Windows環境で `npm run build-win` を実行
- **出力先**: `dist/win-unpacked/BF Copy.exe`

## Windows版インストーラー作成

### インストーラー作成コマンド
Windows PowerShell環境で実行：

```powershell
# Windows版インストーラーを作成
npm run build-win

# または直接electron-builderを実行
npx electron-builder --win
```

### 出力ファイル
```
dist/
├── win-unpacked/                    # ポータブル版
│   └── BF Copy.exe
├── BF Copy Setup 1.0.0.exe         # インストーラー
└── latest.yml                      # 自動更新用メタデータ
```

### インストーラーの特徴
- **形式**: NSIS (.exe形式)
- **コード署名**: なし（個人使用・小規模配布向け）
- **ワンクリックインストール**: 無効（ユーザーが設定可能）
- **インストールディレクトリ変更**: 可能
- **スタートメニューショートカット**: 作成
- **インストール完了後の自動実行**: 無効

### ユーザー向けインストール手順
1. `BF Copy Setup 1.0.0.exe` をダブルクリック
2. **「WindowsによってPCが保護されました」が表示された場合**：
   - 「詳細情報」をクリック
   - 「実行」ボタンをクリック
3. インストーラーの指示に従ってインストール
4. スタートメニューから「BF Copy」を起動

**注意**: コード署名なしのため初回実行時にWindows Defender SmartScreenが警告を表示しますが、アプリケーションの機能には影響ありません。

