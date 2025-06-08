# Windowsアプリアイコン修正ガイド

## 問題
ビルドしたEXEファイルがデフォルトのElectronアイコンを使用している

## 解決方法

### 方法1: ICOファイルを作成（推奨）

1. ICO作成スクリプトを実行:
```bash
npm run create-icon
```

2. ICOファイルが作成されたら、package.jsonを更新:
```json
"win": {
  "icon": "assets/icon.ico"
}
```

### 方法2: オンラインコンバーターを使用

1. [https://convertio.co/png-ico/](https://convertio.co/png-ico/) にアクセス
2. `assets/bf-copy-icon-256.png` をアップロード
3. 変換後の `icon.ico` を `assets/` フォルダに保存
4. package.jsonのアイコンパスを `"assets/icon.ico"` に更新

### 方法3: ImageMagickを使用（開発環境）

```bash
# ImageMagickがインストールされている場合
magick convert assets/bf-copy-icon-256.png assets/icon.ico
```

## 現在の改善点

以下の設定が既に最適化されています：

1. **electron-builder設定の最適化**:
   - アーキテクチャ指定 (x64)
   - ポータブル版も生成
   - インストーラーアイコンも設定

2. **NSISインストーラー設定**:
   - インストーラーとアンインストーラーアイコンを設定
   - 発行者名の追加

## 確認方法

ビルド後に以下を確認:
- `dist/win-unpacked/BF Copy.exe` のアイコン
- インストーラー `dist/BF Copy Setup 1.0.0.exe` のアイコン

## 注意点

- Windows用実行ファイルには `.ico` 形式が最も適している
- PNG形式でも動作する場合があるが、ICO形式がより確実
- 複数サイズを含むICOファイルが推奨される