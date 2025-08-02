# BF Copy プロジェクト概要

## プロジェクトの目的
BFカメラから写真・動画をWindows/macOSに自動コピーするElectronアプリケーション

## 技術スタック
- **フレームワーク**: Electron
- **ランタイム**: Node.js
- **フロントエンド**: HTML/CSS/JavaScript
- **テスティング**: Jest
- **ビルドツール**: electron-builder
- **依存関係管理**: npm

## プロジェクト構造
```
bf-copy/
├── src/               # ソースコード
├── assets/            # アセット（アイコンなど）
├── tests/             # テストファイル
├── dist/              # ビルド出力（自動生成）
├── package.json       # プロジェクト設定・依存関係
└── build-and-run.sh   # 自動ビルドスクリプト
```

## 主要機能
- USB デバイス／カメラ検知機能
- ファイル操作（コピー、移動、分類）
- 設定管理
- システムトレイ統合
- 自動起動機能