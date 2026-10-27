# FestCue - 文化祭BGM・音響ポン出しコンソール

文化祭やステージイベントの音響・BGM・効果音（ポン出し）を直感的に整理・再生できるWeb PAコンソールです。

---

## 🚀 GitHubにプッシュして即座に公開（デプロイ）する手順

本リポジトリには、GitHubにプッシュするだけで自動でビルド＆公開される **GitHub Actions CI/CDワークフロー** (`.github/workflows/deploy.yml`) があらかじめ設定されています。

### 1. GitHubリポジトリの設定（初回のみ）

1. GitHubで新しいリポジトリを作成し、このコードをプッシュします。
2. リポジトリのページで **「Settings」タブ** を開きます。
3. 左メニューの **「Pages」** をクリックします。
4. **「Build and deployment」** の **「Source」** を **`GitHub Actions`** に切り替えます。
   - ※ 設定はこれだけで完了です！

### 2. 公開（プッシュするだけ）

コードを `main` または `master` ブランチに `git push` すると、自動的にGitHub Actionsが起動してビルドされ、数分で以下のようなURLで公開されます：

```
https://<あなたのGitHubユーザー名>.github.io/<リポジトリ名>/
```

---

## 💻 ローカル開発・ビルドコマンド

```bash
# 依存パッケージのインストール
npm install

# ローカル開発サーバー起動 (http://localhost:3000)
npm run dev

# 本番ビルド (distフォルダに出力)
npm run build

# ビルド成果物のプレビュー
npm run preview
```
