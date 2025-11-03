# git-commit-push 使用例

## ケース1: 全ファイルをコミット

メインエージェントから呼び出し:
```
Skill: git-commit-push

全ての変更をコミットしてください。
メッセージ: "fix: レビュー指摘対応 - BatteryChecker改善"
```

**実行内容**:
1. `git add .` で全ファイルをステージング
2. 指定されたメッセージでコミット
3. `git push` でリモートにプッシュ

---

## ケース2: 特定ファイルのみコミット

```
Skill: git-commit-push

以下のファイルのみコミット:
- app/src/main/java/com/example/Foo.kt
- app/src/test/java/com/example/FooTest.kt

メッセージ: "test: FooクラスのテストケースD追加"
```

**実行内容**:
1. 指定されたファイルのみ`git add`
2. 指定されたメッセージでコミット
3. `git push` でリモートにプッシュ

---

## ケース3: レビュー対応後のコミット

git-reviewスキルで対応した後:

```
Skill: git-commit-push

レビュー指摘を3件修正しました。
メッセージ: "fix: レビュー指摘対応 - デバッグログレベル修正など"
```

**実行内容**:
1. 修正された全ファイルをステージング
2. 簡潔なメッセージでコミット
3. 既存のPRブランチにプッシュ

---

## ケース4: ドキュメント更新

```
Skill: git-commit-push

ドキュメントを更新しました。
メッセージ: "docs: database-best-practices.mdにFTS4パターンを追加"
```

**実行内容**:
1. ドキュメントファイルのみステージング
2. `docs:` プレフィックスでコミット
3. プッシュ
