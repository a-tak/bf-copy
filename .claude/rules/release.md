---
paths:
  - "dist/**/*"
  - "dist/*"
---

# リリース手順ルール

**ローカルビルドでリリースしてはいけない。GitHub Actionsの自動ビルド・リリースを使用すること。**

## 正しいリリース手順
1. `npm version patch --no-git-tag-version` でバージョンインクリメント
2. バージョン変更をコミット・プッシュ
3. `git tag v{バージョン}` でタグ作成
4. `git push origin v{バージョン}` でタグをプッシュ
5. GitHub Actionsが自動でWindows/macOS両方をビルドしてGitHub Releaseを作成

## 禁止事項
- `gh release create` で手動リリースを作成しない
- ローカルの `npm run build-win` の成果物を配布用として使わない
- 上記をやるとmacOS版が含まれず不完全なリリースになる
