## 講義系資料

プロジェクトでの、基礎知識獲得のための勉強会で使用する資料を配置します。
内容は一般的なもので、プロジェクトの業務知識や機微情報は含まれません。

### GitHub Pages

公開元は `main` ブランチのリポジトリ直下（`/`）です。

### 深層学習入門

[GitHub Pages で読む](https://chibiham.github.io/lessons/deep-learning-introduction/)

`deep-learning-introduction/index.html` から、概要と全9章を章一覧・ページ内目次・図版付きで閲覧できます。モバイル表示、OS に合わせたダークモード、印刷にも対応しています。各章・見出しの URL を共有できます。

Markdown と SVG を直接読み込むため、資料の更新後に HTML を再生成する必要はありません。描画にはバージョン固定の marked と DOMPurify を CDN から読み込みます。

ローカル確認はリポジトリ直下で以下を実行し、`http://localhost:8000/deep-learning-introduction/` を開いてください（HTML ファイルの直接オープンではなく HTTP 経由で確認します）。

```sh
python3 -m http.server 8000
```
