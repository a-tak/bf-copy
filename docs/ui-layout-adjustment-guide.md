# UIレイアウト調整ガイド

## 概要
BF Copyアプリケーションのタイトルエリア削除とレスポンシブ対応の実装手順をまとめたガイドです。

## 実装背景
- issue #47: タイトル場所取り過ぎ
- issue #48: サイドバーのフォルダが見切れている

## 手順

### 1. HTMLからタイトルヘッダーを削除
```html
<!-- 削除対象 -->
<header>
    <h1>📷 BF Copy <span id="app-version" class="version-display">v1.0.6</span></h1>
</header>
```

### 2. バージョン情報を適切な場所に移動
メインエリア（`#main-area`）の最下部に配置：
```html
<!-- バージョン表示 -->
<div class="version-info">
    <span id="app-version" class="version-display">v1.0.9</span>
</div>
```

### 3. CSSでレスポンシブ対応を実装

#### ヘッダー関連スタイルを削除
```css
/* 削除: header, header h1, .version-display の古いスタイル */
```

#### 新しいバージョン表示スタイル
```css
.version-info {
    text-align: center;
    margin-top: 20px;
}

.version-display {
    font-size: 0.75rem;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.05);
    padding: 6px 12px;
    border-radius: 6px;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}
```

#### レスポンシブ対応
```css
/* 2カラムレイアウト */
#two-column-layout {
    display: grid;
    grid-template-columns: 450px 1fr;
    gap: 20px;
    height: calc(100vh - 320px);  /* 重要: この値でウィンドウに収まる */
    min-height: 350px;
}

/* 左側サイドバー */
#folder-sidebar {
    /* 既存スタイル + */
    height: 100%;
}

/* フォルダリスト */
#folder-sidebar .folder-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 10px;
    min-height: 0;  /* flexboxでの自動調整に重要 */
}
```

## 重要なポイント

### calc()の値調整
- `calc(100vh - 320px)` が最適値
- 段階的に調整: 160px → 200px → 280px → 320px
- 数値が小さいほど高い、大きいほど低い

### flexbox使用時の注意
- `min-height: 0` を設定してflexアイテムの自動サイズ調整を有効化
- `height: 100%` でコンテナーの高さを最大限使用

### テスト手順
1. アプリケーション起動
2. ウィンドウサイズを変更して収まりを確認
3. フォルダリストのスクロール動作確認
4. バージョン情報の表示位置確認

## よくある問題と解決法

### フォルダエリアが画面からはみ出す
- `calc(100vh - XXXpx)` のXXX値を大きくする
- `min-height` も合わせて調整

### バージョン情報が他要素と重なる
- 絶対配置（`position: absolute`）を避ける
- メインエリア内の適切な場所に配置

### ブラウザキャッシュで変更が反映されない
- アプリケーションを完全に再起動
- 必要に応じて `npm start` を一度停止してから再実行

## コミットメッセージ例
```
fix: タイトルエリア削除とレスポンシブ対応でUI改善

- 大きなタイトルヘッダーを削除してスペースを節約
- バージョン情報をメインエリア下部に移動
- フォルダ選択エリアをレスポンシブ対応（calc(100vh - 320px)）
- サイドバーのフォルダリストが見切れる問題を解決

Fixes #47 #48
```

## 次回作業時の確認事項
1. issue内容の確認（タイトル・レイアウト関連）
2. 既存のCSS構造の把握
3. レスポンシブ対応の必要性
4. バージョン情報など必要要素の移動先検討
5. 段階的なcalc()値の調整