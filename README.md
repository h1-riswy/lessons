## 講義系資料

プロジェクトでの、基礎知識獲得のための勉強会で使用する資料を配置します。
内容は一般的なもので、プロジェクトの業務知識や機微情報は含まれません。

### GitHub Pages

公開元は `main` ブランチのリポジトリ直下（`/`）です。

### 深層学習入門

[GitHub Pages で読む](https://chibiham.github.io/lessons/deep-learning-introduction/)

`deep-learning-introduction/index.html` から、概要と全9章を章一覧・ページ内目次・図版付きで閲覧できます。モバイル表示、OS に合わせたダークモード、印刷にも対応しています。各章・見出しの URL を共有できます。

Markdown と SVG を直接読み込むため、資料の更新後に HTML を再生成する必要はありません。描画にはバージョン固定の marked と DOMPurify を CDN から読み込みます。

第5章（CNN）と第6章（RNN・LSTM・GRU）は、アニメーションで処理の流れを追える HTML 版（`5_cnn.html` / `6_rnn_lstm_gru.html`）です。章一覧からはこちらが開き、旧 URL（`#5_cnn.md` など）からも転送されます。各図解は再生・一時停止・コマ送り・シーク・速度変更ができ、OS の「視差効果を減らす」設定が有効な場合は自動再生しません。図解は外部ライブラリに依存しません。

数式は TeX（LaTeX）記法で書き、バージョン固定の KaTeX を CDN から読み込んで描画します（SRI で改ざんを検知）。KaTeX を読み込めない環境では、数式は TeX のソースのまま表示されます。本文では `<span class="m">…</span>`（文中）と `<div class="mb">…</div>`（別行立て）で数式を書きます。

- `assets/interactive.css` / `assets/interactive.js`：2 章で共有するレイアウトとアニメーション用プレーヤー
- `assets/ch5-cnn.js` / `assets/ch6-rnn.js`：各章の図解（表示する数値はすべてここで計算）

ローカル確認はリポジトリ直下で以下を実行し、`http://localhost:8000/deep-learning-introduction/` を開いてください（HTML ファイルの直接オープンではなく HTTP 経由で確認します）。

```sh
python3 -m http.server 8000
```
