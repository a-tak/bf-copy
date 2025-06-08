# BF Copy

BFカメラから写真・動画をWindows/macOSに自動コピーするElectronアプリケーション

## 機能

- ✅ BFカメラのUSB自動検知
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

# テスト実行
npm test

# テスト監視モード
npm run test:watch
```

## プロジェクト構造

```
bf-copy/
├── src/
│   ├── main/          # Electronメインプロセス
│   │   ├── main.js    # アプリケーションエントリーポイント
│   │   └── preload.js # レンダラープロセス連携
│   ├── renderer/      # UI (HTML/CSS/JS)
│   │   ├── index.html # メイン画面
│   │   ├── styles.css # スタイルシート  
│   │   └── app.js     # フロントエンドロジック
│   └── utils/         # ユーティリティモジュール
│       ├── camera-detector.js # カメラ検知機能
│       ├── config-manager.js  # 設定管理機能
│       └── file-manager.js    # ファイル操作機能
├── tests/             # テストファイル
├── assets/            # アイコン・画像
├── requirements.md    # 要件定義書
└── package.json       # プロジェクト設定
```

## 技術スタック

- **Electron**: クロスプラットフォームデスクトップアプリ
- **Node.js**: バックエンド処理
- **HTML/CSS/JS**: フロントエンドUI
- **fs-extra**: ファイル操作
- **Jest**: テストフレームワーク（TDD開発）

## 開発状況

- [x] プロジェクト初期設定
- [x] 基本UI実装  
- [x] USB カメラ検知機能
- [x] ファイルコピー機能
- [x] エラーハンドリング
- [x] TDD テスト実装
- [x] システムトレイ機能
- [x] 自動起動設定
- [x] 設定管理機能
- [ ] 最終デバッグ・最適化

## ライセンス

MIT License