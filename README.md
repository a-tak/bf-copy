# Sigma BF Copy

Sigma BFカメラから写真・動画をWindows/macOSに自動コピーするElectronアプリケーション

## 機能

- ✅ Sigma BFカメラのUSB自動検知
- 📁 カメラ内フォルダの選択的コピー  
- 🔄 写真・動画の自動分類
- ⚙️ コピー先設定の保存・復元
- 📊 コピー進行状況の表示

## 開発環境セットアップ

### 必要要件
- Node.js 16+
- npm または yarn

### インストール

```bash
# 依存関係インストール
npm install

# 開発モードで起動
npm run dev

# 本番ビルド
npm run build

# Windows向けビルド
npm run build-win

# macOS向けビルド  
npm run build-mac
```

## プロジェクト構造

```
sigma-bf-copy/
├── src/
│   ├── main/          # Electronメインプロセス
│   │   ├── main.js    # アプリケーションエントリーポイント
│   │   └── preload.js # レンダラープロセス連携
│   └── renderer/      # UI (HTML/CSS/JS)
│       ├── index.html # メイン画面
│       ├── styles.css # スタイルシート  
│       └── app.js     # フロントエンドロジック
├── assets/            # アイコン・画像
├── requirements.md    # 要件定義書
└── package.json       # プロジェクト設定
```

## 技術スタック

- **Electron**: クロスプラットフォームデスクトップアプリ
- **Node.js**: バックエンド処理
- **HTML/CSS/JS**: フロントエンドUI
- **drivelist**: USB ドライブ検知
- **fs-extra**: ファイル操作

## 開発状況

- [x] プロジェクト初期設定
- [x] 基本UI実装  
- [ ] USB カメラ検知機能
- [ ] ファイルコピー機能
- [ ] エラーハンドリング
- [ ] テスト・デバッグ

## ライセンス

MIT License