# 第9章：ハンズオンと総復習

最終章は手を動かす回です。ここまで 8 章で学んだ概念——順伝播、損失関数、勾配降下法、誤差逆伝播、過学習、CNN——が、実際のコードではどの行に対応するのかを確認します。環境構築は不要で、ブラウザだけで完結します。

最後に全 8 章のキーワードを総復習し、次に学ぶべきトピックを案内します。

## 9.1 環境準備

### Google Colab での実行環境

**Google Colab** は、ブラウザ上で Python を実行できる無料のノートブック環境です。GPU も無料枠で使えるため、深層学習の学習用途には最適です。

```
1. https://colab.research.google.com/ を開く
2. 「ノートブックを新規作成」
3. メニュー → ランタイム → ランタイムのタイプを変更
4. ハードウェアアクセラレータ → GPU を選択 → 保存
```

まずは環境を確認しましょう。最初のセルに貼り付けて実行してください。

```python
import torch

print("PyTorch version:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)
```

`CUDA available: True` と出れば GPU が有効です。`False` でも本章のハンズオンは動きますが、学習に数倍の時間がかかります。

### PyTorch の基本操作（テンソル・自動微分）

PyTorch の中心にあるのが **テンソル（Tensor）** です。NumPy の多次元配列に「GPU で動く」「勾配を自動計算できる」という 2 つの能力を足したもの、と考えてください。

```python
import torch

# 生成
a = torch.tensor([[1.0, 2.0], [3.0, 4.0]])   # 明示的に指定
b = torch.zeros(2, 3)                         # ゼロ埋め
c = torch.randn(2, 3)                         # 標準正規分布からランダム

print(a.shape)   # torch.Size([2, 2])
print(a.dtype)   # torch.float32

# 演算
print(a + a)      # 要素ごとの加算
print(a @ a)      # 行列積（第2章の順伝播そのもの）
print(a.T)        # 転置

# 形の変更（第5章で CNN の出力を全結合層に渡すときに使う）
x = torch.randn(4, 1, 28, 28)   # (バッチ, チャネル, 高さ, 幅)
print(x.flatten(1).shape)        # torch.Size([4, 784])

# デバイス転送
x = x.to(device)
```

そして PyTorch の最重要機能が **自動微分（autograd）** です。第 3 章で学んだ誤差逆伝播が、たった 1 行で実行できます。

```python
# y = x^2 + 3x の x=2 における微分を求める（手計算では 2x+3 = 7）
x = torch.tensor(2.0, requires_grad=True)   # 「この値で微分したい」と宣言
y = x ** 2 + 3 * x

y.backward()          # 誤差逆伝播を実行
print(x.grad)         # tensor(7.) ← 自動で計算されている
```

`requires_grad=True` を付けたテンソルに対する演算は、すべて **計算グラフ** として記録されます。`backward()` はそのグラフを逆にたどって連鎖律を適用します。第 3 章の理論が、そのままライブラリの機能になっているわけです。

> **押さえどころ**：私たちが書くのは順伝播だけです。逆伝播は PyTorch が自動生成します。これが深層学習フレームワークの最大の価値です。

## 9.2 ハンズオン 1：全結合ネットワークで手書き数字認識

**MNIST** は 28×28 ピクセルのグレースケール手書き数字（0〜9）のデータセットです。訓練 60,000 枚、テスト 10,000 枚で、深層学習の「Hello, World」と呼ばれています。

### データの読み込みと前処理

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

# 再現性のためのシード固定
torch.manual_seed(42)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 前処理：PIL画像 → テンソル化 → 正規化
transform = transforms.Compose([
    transforms.ToTensor(),                      # 0-255 → 0.0-1.0 の (1,28,28) テンソル
    transforms.Normalize((0.1307,), (0.3081,)), # MNIST の平均・標準偏差で標準化
])

train_dataset = datasets.MNIST(root="./data", train=True,  download=True, transform=transform)
test_dataset  = datasets.MNIST(root="./data", train=False, download=True, transform=transform)

train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True)
test_loader  = DataLoader(test_dataset,  batch_size=256, shuffle=False)

print("train:", len(train_dataset), "test:", len(test_dataset))

# 1 バッチだけ取り出して形を確認
images, labels = next(iter(train_loader))
print("images:", images.shape)   # torch.Size([128, 1, 28, 28])
print("labels:", labels.shape)   # torch.Size([128])
```

ポイントを整理します。

| 要素 | 役割 | 対応する章 |
|------|------|-----------|
| `Normalize` | 入力のスケールを揃え、学習を安定させる | 第 4 章 |
| `batch_size` | 1 回の更新に使うサンプル数 | 第 3 章（ミニバッチ） |
| `shuffle=True` | エポックごとに順序を入れ替える（訓練のみ） | 第 3 章 |
| テストは `shuffle=False` | 評価は順序に依存しないので不要 | 第 4 章 |

データを目で見ておきましょう。

```python
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 8, figsize=(12, 2))
for i, ax in enumerate(axes):
    ax.imshow(images[i].squeeze(), cmap="gray")
    ax.set_title(int(labels[i]))
    ax.axis("off")
plt.show()
```

### モデル定義

第 2 章の多層ニューラルネットワークをそのまま書きます。

```python
class MLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(28 * 28, 256)   # 入力層 → 隠れ層
        self.fc2 = nn.Linear(256, 128)       # 隠れ層 → 隠れ層
        self.fc3 = nn.Linear(128, 10)        # 隠れ層 → 出力層（10クラス）
        self.dropout = nn.Dropout(0.2)       # 第4章：過学習対策

    def forward(self, x):
        x = x.flatten(1)          # (B, 1, 28, 28) → (B, 784)
        x = F.relu(self.fc1(x))   # 第2章：活性化関数
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        x = self.dropout(x)
        return self.fc3(x)        # ← Softmax は付けない（後述）

model = MLP().to(device)
print(model)

n_params = sum(p.numel() for p in model.parameters())
print(f"パラメータ数: {n_params:,}")   # 約 235,000
```

> **なぜ出力層に Softmax を付けないのか**：PyTorch の `CrossEntropyLoss` は内部で Softmax を適用します。二重にかけると誤った勾配になるため、モデルの出力は生のスコア（**ロジット**）のままにするのが PyTorch の流儀です。

### 学習ループ・評価

第 3 章の勾配降下法が、そのままコードになります。

```python
criterion = nn.CrossEntropyLoss()                        # 第3章：損失関数
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3) # 第3章：最適化アルゴリズム


def train_one_epoch(model, loader):
    model.train()                       # ドロップアウトを有効化
    total_loss, correct, total = 0.0, 0, 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()           # ① 前回の勾配をクリア
        outputs = model(images)         # ② 順伝播
        loss = criterion(outputs, labels)  # ③ 損失を計算
        loss.backward()                 # ④ 誤差逆伝播で勾配を計算
        optimizer.step()                # ⑤ パラメータを更新

        total_loss += loss.item() * labels.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()
        total += labels.size(0)

    return total_loss / total, correct / total


@torch.no_grad()                        # 勾配計算を止める（省メモリ・高速）
def evaluate(model, loader):
    model.eval()                        # ドロップアウトを無効化
    total_loss, correct, total = 0.0, 0, 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        loss = criterion(outputs, labels)

        total_loss += loss.item() * labels.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()
        total += labels.size(0)

    return total_loss / total, correct / total
```

学習ループの ①〜⑤ は**深層学習のコードで必ず登場する定型句**です。ここだけは暗記してしまって構いません。

特に `optimizer.zero_grad()` を忘れると、勾配が前回の値に加算され続けて学習が壊れます。PyTorch で最も多いバグの 1 つです。

```python
EPOCHS = 10
history = {"train_loss": [], "train_acc": [], "test_loss": [], "test_acc": []}

for epoch in range(1, EPOCHS + 1):
    tr_loss, tr_acc = train_one_epoch(model, train_loader)
    te_loss, te_acc = evaluate(model, test_loader)

    history["train_loss"].append(tr_loss)
    history["train_acc"].append(tr_acc)
    history["test_loss"].append(te_loss)
    history["test_acc"].append(te_acc)

    print(f"epoch {epoch:2d} | "
          f"train loss {tr_loss:.4f} acc {tr_acc:.4f} | "
          f"test loss {te_loss:.4f} acc {te_acc:.4f}")
```

GPU 環境なら 1〜2 分で完了し、テスト精度は **97〜98%** 程度になるはずです。

### 学習曲線を観察する

第 4 章で学んだ学習曲線を描きます。数字の羅列より、グラフのほうが圧倒的に情報量があります。

```python
fig, axes = plt.subplots(1, 2, figsize=(11, 4))

axes[0].plot(history["train_loss"], label="train")
axes[0].plot(history["test_loss"],  label="test")
axes[0].set_xlabel("epoch"); axes[0].set_ylabel("loss")
axes[0].set_title("Loss"); axes[0].legend(); axes[0].grid(alpha=0.3)

axes[1].plot(history["train_acc"], label="train")
axes[1].plot(history["test_acc"],  label="test")
axes[1].set_xlabel("epoch"); axes[1].set_ylabel("accuracy")
axes[1].set_title("Accuracy"); axes[1].legend(); axes[1].grid(alpha=0.3)

plt.tight_layout(); plt.show()
```

![学習曲線](../ai-introduction/learning-curve.svg)

読み取りのポイント（第 4 章の復習）。

| 見えるもの | 解釈 | 対処 |
|-----------|------|------|
| 両方まだ下がっている | 学習の途中 | エポックを増やす |
| train が下がり test が上がり始める | **過学習** | 早期終了、ドロップアウト強化、データ拡張 |
| 両方が高止まり | **未学習**（表現力不足） | モデルを大きく、学習率を調整 |
| loss が跳ねる | 学習率が大きすぎる | lr を下げる |

さらに、第 4 章の**混同行列**で「どの数字を間違えやすいか」を確認します。

```python
import numpy as np

cm = np.zeros((10, 10), dtype=int)
model.eval()
with torch.no_grad():
    for images, labels in test_loader:
        preds = model(images.to(device)).argmax(1).cpu()
        for t, p in zip(labels, preds):
            cm[t, p] += 1

plt.figure(figsize=(6, 5))
plt.imshow(cm, cmap="Blues")
plt.xlabel("predicted"); plt.ylabel("true")
plt.colorbar(); plt.title("Confusion Matrix"); plt.show()

print(cm)
```

対角線以外の大きな値に注目してください。「4 と 9」「3 と 5」「7 と 1」のように、人間でも紛らわしいペアで誤りが集中していることが多いはずです。

## 9.3 ハンズオン 2：CNN への改良と事前学習モデルの利用

### 畳み込み層を加えて精度を比較

第 5 章で学んだとおり、全結合層は画像を 784 次元のベクトルに潰してしまうため、**ピクセルの位置関係の情報を捨てています**。CNN に置き換えて改善するか確かめましょう。

```python
class CNN(nn.Module):
    def __init__(self):
        super().__init__()
        # 特徴抽出部
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)   # (B,1,28,28) → (B,32,28,28)
        self.bn1   = nn.BatchNorm2d(32)                           # 第4章：バッチ正規化
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)  # → (B,64,14,14)
        self.bn2   = nn.BatchNorm2d(64)
        self.pool  = nn.MaxPool2d(2)                              # 第5章：最大プーリング
        # 分類部
        self.fc1     = nn.Linear(64 * 7 * 7, 128)
        self.fc2     = nn.Linear(128, 10)
        self.dropout = nn.Dropout(0.25)

    def forward(self, x):
        x = self.pool(F.relu(self.bn1(self.conv1(x))))   # (B,32,14,14)
        x = self.pool(F.relu(self.bn2(self.conv2(x))))   # (B,64,7,7)
        x = x.flatten(1)                                 # (B,3136)
        x = self.dropout(F.relu(self.fc1(x)))
        return self.fc2(x)


cnn = CNN().to(device)
print(f"CNN パラメータ数: {sum(p.numel() for p in cnn.parameters()):,}")
```

shape の追い方を確認しておきます。ここが CNN 実装でつまずく最大のポイントです。

```
入力            (B, 1, 28, 28)
conv1 (pad=1)   (B, 32, 28, 28)   ← padding=1 なので幅高さは変わらない
pool  (2x2)     (B, 32, 14, 14)   ← 半分になる
conv2 (pad=1)   (B, 64, 14, 14)
pool  (2x2)     (B, 64,  7,  7)
flatten         (B, 64*7*7 = 3136)
fc1             (B, 128)
fc2             (B, 10)
```

学習部分は MLP と完全に同じ関数を再利用できます。モデルだけ差し替えます。

```python
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(cnn.parameters(), lr=1e-3)

cnn_history = {"train_acc": [], "test_acc": []}

for epoch in range(1, 11):
    tr_loss, tr_acc = train_one_epoch(cnn, train_loader)
    te_loss, te_acc = evaluate(cnn, test_loader)
    cnn_history["train_acc"].append(tr_acc)
    cnn_history["test_acc"].append(te_acc)
    print(f"epoch {epoch:2d} | train acc {tr_acc:.4f} | test acc {te_acc:.4f}")
```

MLP と比較します。

```python
plt.figure(figsize=(6, 4))
plt.plot(history["test_acc"],     marker="o", label="MLP")
plt.plot(cnn_history["test_acc"], marker="s", label="CNN")
plt.xlabel("epoch"); plt.ylabel("test accuracy")
plt.legend(); plt.grid(alpha=0.3); plt.show()
```

典型的な結果は次のようになります。

| モデル | パラメータ数 | テスト精度（10 epoch） |
|--------|-------------|----------------------|
| MLP | 約 23.5 万 | 97〜98% |
| CNN | 約 42 万 | 99% 前後 |

誤り率で見ると **2% → 1%**、つまり**間違いが半分になっています**。精度 97% と 99% の差は小さく見えますが、「1 万枚中 200 枚間違える」と「100 枚間違える」の違いだと考えると、実務上のインパクトは大きいことがわかります。

### 学習済みモデルのファインチューニング

実務で画像タスクに取り組むとき、モデルをゼロから学習することはほとんどありません。**ImageNet などで学習済みのモデルを持ってきて、最後の層だけ差し替える**のが定石です（第 5 章の転移学習）。

```python
from torchvision import models

# 1. 学習済み ResNet18 をダウンロード
resnet = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)

# 2. 全パラメータを凍結（特徴抽出器として固定）
for param in resnet.parameters():
    param.requires_grad = False

# 3. 出力層だけを自分のタスク用（10クラス）に差し替え
#    新しく作った層は requires_grad=True がデフォルト
resnet.fc = nn.Linear(resnet.fc.in_features, 10)
resnet = resnet.to(device)

trainable = sum(p.numel() for p in resnet.parameters() if p.requires_grad)
total     = sum(p.numel() for p in resnet.parameters())
print(f"学習対象: {trainable:,} / 全体: {total:,}")   # ごく一部だけ学習
```

ただし ResNet は「3 チャネル・224×224」の入力を前提にしているため、MNIST 側を合わせる必要があります。

```python
transform_resnet = transforms.Compose([
    transforms.Resize(224),                       # 28x28 → 224x224
    transforms.Grayscale(num_output_channels=3),  # 1ch → 3ch
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],   # ImageNet の統計量
                         [0.229, 0.224, 0.225]),
])

train_ds_r = datasets.MNIST(root="./data", train=True,  download=True, transform=transform_resnet)
test_ds_r  = datasets.MNIST(root="./data", train=False, download=True, transform=transform_resnet)

# 224x224 は重いので、時間短縮のため一部だけ使う
train_ds_r = torch.utils.data.Subset(train_ds_r, range(6000))
test_ds_r  = torch.utils.data.Subset(test_ds_r,  range(1000))

train_loader_r = DataLoader(train_ds_r, batch_size=64, shuffle=True)
test_loader_r  = DataLoader(test_ds_r,  batch_size=64, shuffle=False)

optimizer = torch.optim.Adam(resnet.fc.parameters(), lr=1e-3)  # 差し替えた層のみ

for epoch in range(1, 4):
    tr_loss, tr_acc = train_one_epoch(resnet, train_loader_r)
    te_loss, te_acc = evaluate(resnet, test_loader_r)
    print(f"epoch {epoch} | train acc {tr_acc:.4f} | test acc {te_acc:.4f}")
```

**わずか 3 エポック・6,000 枚**でもかなりの精度が出ます。これが転移学習の威力です。

| 戦略 | やること | 向いている場面 |
|------|---------|--------------|
| 特徴抽出 | 全凍結＋出力層のみ学習 | データが少ない、元タスクと近い |
| ファインチューニング | 一部または全体を小さい学習率で追加学習 | データがそこそこある、ドメインが異なる |
| フルスクラッチ | ゼロから学習 | 大量データがあり、既存モデルが合わない |

> **実務の出発点**：まず「学習済みモデル＋出力層の差し替え」を試す。それで足りなければ徐々に解凍していく。MNIST を自前 CNN で 99% にする話より、この選択のほうが現場では圧倒的に重要です。

## 9.4 総復習

### 全 8 章のキーワード確認

| 章 | テーマ | 必ず説明できるべきキーワード |
|----|--------|---------------------------|
| **1** | 深層学習とは | AI ⊃ 機械学習 ⊃ 深層学習／教師あり・教師なし・強化学習／学習と推論／訓練・検証・テストデータ／特徴量設計の自動化 |
| **2** | ニューラルネットの基礎 | ニューロン／重み・バイアス／パーセプトロンと XOR 問題／入力層・隠れ層・出力層／順伝播／行列積／活性化関数（Sigmoid・tanh・ReLU）／Softmax |
| **3** | 学習の仕組み | 損失関数（MSE・交差エントロピー）／勾配降下法／学習率／ミニバッチ・SGD／誤差逆伝播／連鎖律／計算グラフ・自動微分／エポック・イテレーション／Momentum・AdaGrad・RMSProp・Adam |
| **4** | 評価とチューニング | 過学習・未学習／学習曲線／バイアスとバリアンス／交差検証／L1・L2 正則化／ドロップアウト／早期終了／データ拡張／バッチ正規化／適合率・再現率・F 値／混同行列／ハイパーパラメータ探索 |
| **5** | CNN | パラメータ数の爆発／畳み込み・フィルタ（カーネル）／ストライド・パディング・チャネル／特徴マップ／最大プーリング／LeNet・AlexNet・VGG・ResNet／物体検出・セグメンテーション／転移学習 |
| **6** | RNN・LSTM・GRU | 系列データ／隠れ状態／時間方向の展開／勾配消失・勾配爆発／長期依存／ゲート機構（忘却・入力・出力）／GRU／双方向 RNN／Seq2Seq・Encoder-Decoder／逐次処理の壁 |
| **7** | Attention・Transformer | Seq2Seq のボトルネック／Query・Key・Value／Scaled Dot-Product Attention／Self-Attention／Multi-Head／位置エンコーディング／残差接続・レイヤー正規化／Masked Attention／並列化／BERT と GPT／スケーリング則／ViT |
| **8** | LLM と生成 AI | 次トークン予測／トークナイズ／コンテキストウィンドウ／事前学習・SFT・RLHF／In-Context Learning・few-shot／Chain-of-Thought／ハルシネーション／知識のカットオフ／拡散モデル／マルチモーダル／RAG／プロンプト設計／エージェント／プロンプトインジェクション |

### 3 つのアーキテクチャの使い分け

最後に、本講座の中核である 3 つを 1 枚にまとめます。

| | CNN | RNN / LSTM | Transformer |
|---|---|---|---|
| 得意なデータ | 画像・空間構造 | 短〜中の系列 | 系列全般（言語・画像・音声） |
| 中心となる発想 | 局所的なフィルタの共有 | 隠れ状態の持ち回り | 全要素間の Attention |
| 並列化 | しやすい | しにくい | しやすい |
| 長距離の依存 | 層を重ねて到達 | 苦手 | 得意（1 ステップ） |
| 計算量（長さ n） | O(n) | O(n) | O(n²) |
| 必要なデータ量 | 中 | 中 | 多い |
| 現在の立ち位置 | 画像で現役、軽量・省データ | レガシー寄り、組込み等で現役 | 事実上の標準 |

### 次に学ぶべきこと

![LLM の未来](../ai-introduction/llm-future.svg)

本講座で「知らない単語がない状態」の土台はできました。次の一歩として、目的別に 3 つの方向を示します。

**A. 実装力を伸ばしたい**

- PyTorch 公式チュートリアルを一通り写経する
- MNIST 以外のデータセット（CIFAR-10、自前の画像）で同じ流れを再現する
- Hugging Face の `transformers` で学習済みモデルを動かす
- 学習曲線・混同行列を見て仮説を立て、改善する練習を繰り返す

**B. 理論を深めたい**

- 誤差逆伝播を紙の上で手計算してみる（小さいネットワークで十分）
- 線形代数・確率統計・微分の基礎を復習する
- "Attention Is All You Need" など主要論文を図を追いながら読む
- 最適化アルゴリズムや正則化の数式的な意味を追う

**C. 実務に適用したい**

- まず「これは機械学習で解くべき問題か」を判断する目を養う（ルールで済むなら、ルールのほうが良い）
- データの収集・品質・ラベリングのコストを見積もる
- MLOps（実験管理、モデルのバージョニング、デプロイ、監視、ドリフト検知）を学ぶ
- LLM を使うなら、評価セットの作り方とコスト管理を最優先で整える

> **最後に**：深層学習は日進月歩ですが、本講座で扱った「順伝播・損失・勾配・過学習・Attention」という骨格は、この 10 年変わっていません。新しいモデルのニュースを読むときは、**「この骨格のどこを、なぜ変えたのか」**という視点で読んでください。それができれば、流行を追い続けなくても本質は捉えられます。

## まとめ

本章では、ここまでの理論をコードで確認し、全 8 章を総復習しました。

✅ **Colab + PyTorch でブラウザだけで深層学習を実行できる** — テンソルと autograd が基本
✅ **学習ループの定型句は 5 行** — `zero_grad → forward → loss → backward → step`
✅ **MLP（約 98%）から CNN（約 99%）へ** — 位置関係を捉える構造が誤り率を半減させた
✅ **実務の出発点は学習済みモデルの転移学習** — 少ないデータと時間で高精度に届く
✅ **3 つのアーキテクチャ（CNN / RNN / Transformer）の使い分けが、この講座の中核**

次に学ぶべきことは、実装力・理論・実務適用の 3 方向です。自分の目的に近いところから、手を動かして深めていってください。9 回お疲れさまでした。

## 演習問題

1. ハンズオン 1 の MLP で、隠れ層のユニット数を `256 → 64` に減らし、`Dropout` を `0.0` にして学習してみてください。学習曲線はどう変化しましたか。過学習・未学習のどちらに近づいたかを説明してください。

2. 学習ループから `optimizer.zero_grad()` をコメントアウトして実行してください。損失がどうなるかを観察し、なぜそうなるのかを第 3 章の内容で説明してください。

3. CNN の `conv2` を削除し、畳み込み層 1 層だけにした場合、`fc1` の入力次元はいくつにすべきですか。shape を順に追って求め、実際に動かして精度を比較してください。

4. 「社内の製品写真を 5 種類に自動分類したい。手元にあるのは各カテゴリ 200 枚程度」という案件が来ました。どのようなアプローチを取りますか。第 4・5 章の内容を踏まえ、手順と注意点を 3 つ以上挙げて説明してください。
