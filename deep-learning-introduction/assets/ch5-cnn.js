/* 第5章 CNN — アニメーション図解
   各デモは HTML 側の .demo（id 指定）に中身を組み立てる。数値はすべてここで計算している。 */
(() => {
  'use strict';
  const { h, s, Player, demo, grid, shade, flow, drawLine, countUp, flyText, segmented, fmt, tooltip, onVisible } = window.DL;

  const setCode = (pre, lines) => pre && pre.querySelectorAll('.ln').forEach((ln, i) => ln.classList.toggle('on', lines.includes(i)));
  const show = (el, on) => { el.style.opacity = on ? 1 : 0; };
  /** 出力マスへの値の「着地」演出 */
  function arrive(cell, forward) { cell.classList.remove('arrive'); if (forward) { void cell.offsetWidth; cell.classList.add('arrive'); } }

  /* ------------------------------------------------------------------
     5.1 flatten して全結合につなぐ
  ------------------------------------------------------------------ */
  function flattenDemo() {
    const d = demo('d-flatten'); if (!d) return;
    const IMG = [[1, 0, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1], [1, 0, 1, 1, 0, 1], [1, 1, 1, 1, 1, 1], [1, 1, 0, 0, 1, 1], [0, 1, 1, 1, 1, 0]];
    const W = 720, H = 372, G = 26, gx = 34, gy = 44;
    const VC = 17, VG = 2, VW = 36 * (VC + VG) - VG, vx = (W - VW) / 2, vy = 236, HU = 8, hy = 336;
    const PAIR = [14, 20];
    const cx = k => vx + k * (VC + VG) + VC / 2;
    const hx = u => vx + (u + .5) * VW / HU;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '6×6 の画像を 36 次元のベクトルに並べ替え、隠れ層の 8 ユニットと全結合する図' });

    const wires = s('g', { class: 'fade' });
    for (let u = 0; u < HU; u++) for (let k = 0; k < 36; k++) wires.append(s('line', { x1: cx(k), y1: vy + VC + 19, x2: hx(u), y2: hy - 11, style: { stroke: 'var(--violet)', strokeWidth: .7, opacity: .3 } }));
    const units = s('g', { class: 'fade' }, [...Array(HU)].map((_, u) => s('circle', { cx: hx(u), cy: hy, r: 10, class: 'c-violet tint', style: { strokeWidth: 1.5 } })));
    const unitLabel = s('text', { x: W / 2, y: H - 4, 'text-anchor': 'middle', class: 'lbl-m fade' }, '隠れ層（8 ユニット）');
    const ghost = s('rect', { x: gx - 5, y: gy - 5, width: 6 * G + 8, height: 6 * G + 8, rx: 8, class: 'fade', style: { fill: 'none', stroke: 'var(--line)', strokeDasharray: '4 4', strokeWidth: 1.5 } });
    const imgLabel = s('text', { x: gx - 4, y: gy - 16, class: 'lbl-m' }, '入力画像（6×6）');
    const vecLabel = s('text', { x: vx, y: vy - 14, class: 'lbl-m fade' }, 'flatten 後のベクトル（36 次元）');
    const rowLabels = s('g', { class: 'fade' },
      [...Array(6)].map((_, r) => s('text', { x: cx(r * 6 + 2.5), y: vy + VC + 13, 'text-anchor': 'middle', class: 'lbl-m', style: { fontSize: '10px' } }, `${r + 1}行目`)),
      [...Array(5)].map((_, r) => s('line', { x1: vx + (r + 1) * 6 * (VC + VG) - VG / 2, x2: vx + (r + 1) * 6 * (VC + VG) - VG / 2, y1: vy - 4, y2: vy + VC + 4, style: { stroke: 'var(--muted)', strokeWidth: 1 } })));
    const mid = (cx(PAIR[0]) + cx(PAIR[1])) / 2;
    const arcG = s('g', { class: 'fade' },
      s('path', { d: `M${cx(PAIR[0])},${vy - 4} Q${mid},${vy - 58} ${cx(PAIR[1])},${vy - 4}`, class: 'ln', style: { stroke: 'var(--orange)', strokeWidth: 2.5 } }),
      s('text', { x: mid, y: vy - 40, 'text-anchor': 'middle', class: 'lbl-b' }, '6 マス離れた'));
    const statK = s('text', { x: 250, y: 74, class: 'lbl-m' });
    const statV = s('text', { x: 250, y: 116, class: 'lbl-b', style: { fontSize: '34px' } });
    const statD = s('text', { x: 250, y: 144, class: 'lbl-m' });

    const cells = [];
    const cellG = s('g');
    IMG.forEach((row, r) => row.forEach((v, c) => {
      const k = r * 6 + c;
      const rect = s('rect', { width: 24, height: 24, rx: 4, class: 'move', style: { fill: v ? 'var(--blue)' : 'var(--paper)', stroke: PAIR.includes(k) ? 'var(--orange)' : v ? 'none' : 'var(--line)', strokeWidth: PAIR.includes(k) ? 3.5 : 1.2 } });
      cells.push({ rect, r, c, k }); cellG.append(rect);
    }));
    svg.append(wires, units, unitLabel, ghost, imgLabel, vecLabel, rowLabels, arcG, statK, statV, statD, cellG);
    d.stage.append(svg);

    const gridT = (r, c) => `translate(${gx + c * G}px, ${gy + r * G}px) scale(1)`;
    const vecT = k => `translate(${vx + k * (VC + VG)}px, ${vy}px) scale(${VC / 24})`;
    const STATS = [
      ['入力の画素数', 36, '6 × 6 = 36'],
      ['入力ベクトルの次元', 36, '並べ替えただけなので数は同じ'],
      ['入力ベクトルの次元', 36, '「隣り合っていた」という情報は消える'],
      ['必要な重みの数', 288, '36 入力 × 8 ユニット'],
      ['写真（224×224×3）→ 1,000 ユニットなら', 150528000, '150,528 入力 × 1,000 ユニット ≒ 1.5 億']
    ];
    const CAPS = [
      '6×6 = 36 ピクセルの小さな画像です。<b>オレンジ枠の 2 ピクセル</b>は縦に隣り合っています。',
      '各行を順番に右へつなげて、<b>36 次元のベクトル</b>に引き伸ばします（flatten）。',
      '縦に隣同士だった 2 ピクセルが、ベクトル上では <b>6 マスも離れて</b>しまいました。全結合層には「この 2 つは近かった」という情報が残りません。',
      '全結合層では、36 個の入力それぞれが<b>すべての</b>隠れユニットとつながります。隠れユニットが 8 個でも <b>36 × 8 = 288 本</b>の重みが必要です。',
      '一般的な写真（224×224×3 = 150,528 次元）を 1,000 ユニットにつなぐと、重みは <b>約 1.5 億本</b>。これが 1 層目だけの数です。'
    ];
    new Player(d.root, {
      steps: 5, interval: 2800, holds: { 1: 3200 },
      onStep(i, { forward }) {
        cells.forEach(({ rect, r, c, k }) => {
          rect.style.transitionDelay = forward && i === 1 ? `${r * 110 + c * 16}ms` : '0ms';
          rect.style.transform = i >= 1 ? vecT(k) : gridT(r, c);
        });
        show(ghost, i >= 1); show(vecLabel, i >= 1); show(rowLabels, i >= 1); show(arcG, i === 2);
        [wires, units, unitLabel].forEach(el => show(el, i >= 3));
        const [k, v, dsc] = STATS[i];
        statK.textContent = k; statD.textContent = dsc;
        if (forward && STATS[i - 1][1] !== v) countUp(statV, v, { dur: 1100 }); else statV.textContent = fmt(v);
        return CAPS[i];
      }
    });
  }

  /* ------------------------------------------------------------------
     5.1 パラメータ数の比較（スタットタイル）
  ------------------------------------------------------------------ */
  function paramsDemo() {
    const d = demo('d-params'); if (!d) return;
    const SIZES = { mnist: [28, 1, 'MNIST 28×28×1'], cifar: [32, 3, 'CIFAR-10 32×32×3'], photo: [224, 3, '写真 224×224×3'] };
    let key = 'photo';
    const tile = (color, label) => {
      const v = h('div', { class: 'v', text: '0' }), dd = h('div', { class: 'd' });
      return { el: h('div', { class: 'stat' }, h('div', { class: 'k' }, color ? h('span', { class: 'swatch ' + color }) : null, label), v, dd), v, d: dd };
    };
    const tIn = tile(null, '入力の次元（flatten 後）');
    const tFc = tile('c-red', '全結合 → 1,000 ユニットの重み');
    const tCv = tile('c-aqua', '畳み込み 3×3 × 16 種類の重み');
    const tRatio = tile(null, '全結合 ÷ 畳み込み');
    d.options.append(segmented({ label: '入力画像', options: Object.entries(SIZES).map(([k, v]) => [k, v[2]]), value: key, onChange: v => { key = v; update(true); } }));
    d.stage.append(h('div', { class: 'stats', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' } }, tIn.el, tFc.el, tCv.el, tRatio.el),
      h('p', { class: 'note', style: { margin: '12px 0 0' }, html: '畳み込みの重みの数は<b>画像の縦横サイズに依存しません</b>（フィルタの大きさ × 入力チャネル数 × フィルタの種類数で決まる）。画像を切り替えて確かめてみましょう。' }));
    function update(animate) {
      const [n, c] = SIZES[key], D = n * n * c, fc = D * 1000, cv = 9 * c * 16;
      const set = (t, v, suffix = '') => animate ? countUp(t.v, v, { suffix }) : (t.v.textContent = fmt(v) + suffix);
      set(tIn, D); tIn.d.textContent = `${n} × ${n} × ${c}`;
      set(tFc, fc); tFc.d.textContent = `${fmt(D)} × 1,000`;
      set(tCv, cv); tCv.d.textContent = `3 × 3 × ${c} × 16（バイアス込みで ${fmt(cv + 16)}）`;
      set(tRatio, Math.round(fc / cv), ' 倍'); tRatio.d.textContent = '同じ「1 層目」でもこれだけ違う';
    }
    update(false);
    onVisible(d.root, () => update(true));
  }

  /* ------------------------------------------------------------------
     5.1 位置のずれ：flatten ベクトル vs 畳み込みの反応
  ------------------------------------------------------------------ */
  function shiftDemo() {
    const d = demo('d-shift'); if (!d) return;
    const N = 8, M = N - 2, PAT = [[0, 1, 0], [1, 1, 1], [0, 1, 0]];
    const PATH = [[0, 0], [0, 1], [1, 3], [3, 5], [5, 4], [5, 1], [3, 0], [2, 2]];
    const img = grid(N, N, { cls: 'sm' }), fm = grid(M, M, { cls: 'sm' });
    const vec = h('div', { class: 'vec', role: 'img', 'aria-label': 'flatten した 64 次元のベクトル' });
    const vcells = [...Array(N * N)].map(() => vec.appendChild(h('span')));
    const matchV = h('div', { class: 'v' }), maxV = h('div', { class: 'v' });
    const litSet = (r0, c0) => { const set = new Set(); PAT.forEach((row, a) => row.forEach((v, b) => v && set.add((r0 + a) * N + c0 + b))); return set; };
    const orig = litSet(...PATH[0]);
    let pos = PATH[0];
    d.stage.append(
      h('div', { class: 'row', style: { alignItems: 'flex-start' } },
        h('div', { class: 'col' }, img.el, h('div', { class: 'lbl-sm', text: '入力画像（8×8）と「＋」模様' })),
        h('div', { class: 'lbl-sm', style: { alignSelf: 'center', fontSize: '.85rem' }, html: '⊛ ＋型フィルタ<br>→' }),
        h('div', { class: 'col' }, fm.el, h('div', { class: 'lbl-sm', html: '畳み込みの反応（6×6）<br>数字＝フィルタとの一致度' }))),
      h('div', { style: { marginTop: '18px' } },
        h('div', { class: 'lbl-sm', style: { textAlign: 'left' }, text: 'flatten したベクトル（64 次元）— 全結合層はこの並びで入力を見る' }),
        vec,
        h('div', { class: 'legend' }, h('span', {}, h('span', { class: 'swatch c-blue' }), '現在点灯している要素'), h('span', {}, h('span', { class: 'swatch', style: { background: 'none', boxShadow: 'inset 0 0 0 2px var(--orange)' } }), '基準位置で点灯していた要素'))),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('div', { class: 'k' }, '全結合の視点：基準との一致'), matchV, h('div', { class: 'd', text: '一致が少ない＝別の入力に見える' })),
        h('div', { class: 'stat' }, h('div', { class: 'k' }, '畳み込みの視点：最大の反応'), maxV, h('div', { class: 'd', text: '位置が変わっても同じ強さで検出' }))));
    function render([r0, c0]) {
      pos = [r0, c0];
      const lit = litSet(r0, c0);
      img.cells.flat().forEach((cell, k) => { const v = lit.has(k); cell.style.background = v ? 'var(--blue)' : ''; cell.style.borderColor = v ? 'var(--blue)' : ''; });
      let best = -1, bi = 0, bj = 0;
      for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
        let sum = 0;
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) sum += PAT[a][b] * (lit.has((i + a) * N + j + b) ? 1 : 0);
        const cell = fm.cells[i][j];
        cell.textContent = sum; Object.assign(cell.style, shade(sum / 5)); cell.classList.remove('cur');
        if (sum > best) { best = sum; bi = i; bj = j; }
      }
      fm.cells[bi][bj].classList.add('cur');
      let match = 0;
      vcells.forEach((el, k) => { el.classList.toggle('on', lit.has(k)); el.classList.toggle('orig', orig.has(k)); if (lit.has(k) && orig.has(k)) match++; });
      matchV.textContent = `${match} / 5`; maxV.textContent = `${best}`;
      return { match, best };
    }
    const caption = ([r0, c0], { match, best }, base) => base
      ? '「＋」模様が基準の位置にあります。下のベクトルの<b>オレンジ枠</b>は、この基準位置で点灯する要素です。'
      : `模様を（${r0 + 1} 行, ${c0 + 1} 列）へ移動。flatten ベクトルでは基準と一致する要素が <b>${match} / 5</b> 個しかなく、全結合層には「別の入力」に見えます。一方、畳み込みの反応は<b>同じ強さ ${best} のまま模様と一緒に移動</b>しています。`;
    const player = new Player(d.root, {
      steps: PATH.length, interval: 2200,
      onStep(i) { const res = render(PATH[i]); return caption(PATH[i], res, i === 0); }
    });
    const move = (dr, dc) => {
      player.touched = true; player.pause();
      const p = [Math.max(0, Math.min(M - 1, pos[0] + dr)), Math.max(0, Math.min(M - 1, pos[1] + dc))];
      player.caption.innerHTML = caption(p, render(p), p[0] === PATH[0][0] && p[1] === PATH[0][1]);
    };
    d.options.append(h('span', { text: '自分で動かす：' }),
      ...[['←', 0, -1, '左'], ['↑', -1, 0, '上'], ['↓', 1, 0, '下'], ['→', 0, 1, '右']].map(([t, dr, dc, l]) => h('button', { type: 'button', class: 'btn', 'aria-label': `模様を${l}へ動かす`, onclick: () => move(dr, dc) }, t)));
  }

  /* ------------------------------------------------------------------
     5.2 畳み込み演算（ストライド・パディング・フィルタ切替）
  ------------------------------------------------------------------ */
  function convDemo() {
    const d = demo('d-conv'); if (!d) return;
    const X = [[1, 1, 1, 0, 0], [0, 1, 1, 1, 0], [0, 0, 1, 1, 1], [0, 0, 1, 1, 0], [0, 1, 1, 0, 0]];
    const FILTERS = { x: ['X字（本文の例）', [[1, 0, 1], [0, 1, 0], [1, 0, 1]]], v: ['縦エッジ', [[1, 0, -1], [1, 0, -1], [1, 0, -1]]], h: ['横エッジ', [[1, 1, 1], [0, 0, 0], [-1, -1, -1]]] };
    const st = { f: 'x', stride: 1, pad: 0 };
    let player, P;
    d.options.append(
      segmented({ label: 'フィルタ', options: Object.entries(FILTERS).map(([k, v]) => [k, v[0]]), value: 'x', onChange: v => { st.f = v; rebuild(); } }),
      segmented({ label: 'ストライド', options: [[1, '1'], [2, '2']], value: 1, onChange: v => { st.stride = v; rebuild(); } }),
      segmented({ label: 'パディング', options: [[0, '0'], [1, '1']], value: 0, onChange: v => { st.pad = v; rebuild(); } }));

    function build() {
      const pad = st.pad, S = st.stride, N = 5 + 2 * pad, O = Math.floor((N - 3) / S) + 1, Wt = FILTERS[st.f][1];
      const val = (r, c) => (r < pad || c < pad || r >= 5 + pad || c >= 5 + pad) ? null : X[r - pad][c - pad];
      const inG = grid(N, N, { text: (r, c) => val(r, c) ?? 0 });
      inG.cells.forEach((row, r) => row.forEach((cell, c) => {
        if (val(r, c) == null) cell.classList.add('pad');
        else if (val(r, c)) cell.style.background = 'color-mix(in srgb, var(--blue) 20%, var(--paper))';
      }));
      const win = h('div', { class: 'window hide' }); inG.el.append(win);
      const fG = grid(3, 3, { text: (r, c) => Wt[r][c] });
      fG.cells.flat().forEach(cell => cell.classList.add('c-orange', 'tint'));
      const Y = [...Array(O)].map((_, i) => [...Array(O)].map((_, j) => {
        let sum = 0;
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) sum += (val(i * S + a, j * S + b) ?? 0) * Wt[a][b];
        return sum;
      }));
      const maxAbs = Math.max(1, ...Y.flat().map(Math.abs));
      const outG = grid(O, O);
      outG.cells.flat().forEach((cell, k) => {
        Object.assign(cell, { tabIndex: 0 });
        cell.setAttribute('role', 'button'); cell.setAttribute('aria-label', `出力 ${Math.floor(k / O) + 1} 行 ${k % O + 1} 列の計算を表示`); cell.style.cursor = 'pointer';
        const jump = () => { player.touched = true; player.pause(); player.go(k + 1); };
        cell.addEventListener('click', jump);
        cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); } });
      });
      const calc = h('div', { class: 'calc' });
      d.stage.replaceChildren(
        h('div', { class: 'row' },
          h('div', { class: 'col' }, inG.el, h('div', { class: 'lbl-sm', text: pad ? `入力 5×5（周囲を 0 で埋めて ${N}×${N}）` : '入力 5×5' })),
          h('div', { class: 'op', text: '⊛' }),
          h('div', { class: 'col' }, fG.el, h('div', { class: 'lbl-sm', text: 'フィルタ 3×3（重み 9 個）' })),
          h('div', { class: 'op', text: '=' }),
          h('div', { class: 'col' }, outG.el, h('div', { class: 'lbl-sm', text: `特徴マップ ${O}×${O}` }))),
        calc,
        h('div', { class: 'formula', html: `出力サイズ = (5 + 2×<b>${pad}</b> − 3) / <b>${S}</b> + 1 = <b>${O}</b>` }));
      return { pad, S, N, O, Wt, val, inG, win, outG, Y, maxAbs, calc };
    }

    function render(i, { forward }) {
      const { O, S, inG, win, outG, Y, maxAbs, calc, Wt, val } = P;
      inG.cells.flat().forEach(c => c.querySelector('.w')?.remove());
      outG.cells.flat().forEach((cell, k) => {
        const done = k < i, r = Math.floor(k / O), c = k % O;
        cell.classList.toggle('empty', !done); cell.classList.toggle('cur', k === i - 1);
        cell.textContent = done ? Y[r][c] : '';
        Object.assign(cell.style, done ? shade(Math.abs(Y[r][c]) / maxAbs * .9, Y[r][c] < 0 ? 'var(--red)' : 'var(--blue)') : { background: '', color: '' });
        if (k !== i - 1) cell.classList.remove('arrive');
      });
      if (i === 0) {
        win.classList.add('hide');
        calc.innerHTML = '<span class="z">▶ 再生すると、フィルタが左上から順にスライドします</span>';
        return '左が入力、中央が<b>フィルタ（学習で決まる 9 個の重み）</b>、右が出力の<b>特徴マップ</b>です。フィルタを入力の左上に重ね、重なった 9 マスの積和を計算していきます。';
      }
      const k = i - 1, r = Math.floor(k / O), c = k % O, R = r * S, C = c * S;
      win.classList.remove('hide'); win.style.setProperty('--r', R); win.style.setProperty('--c', C);
      const terms = [];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        const x = val(R + a, C + b) ?? 0, w = Wt[a][b];
        inG.cells[R + a][C + b].append(h('span', { class: 'w', text: '×' + w }));
        const t = `${x}×${w < 0 ? `(${w})` : w}`;
        terms.push(x * w === 0 ? `<span class="z">${t}</span>` : t);
      }
      calc.innerHTML = `出力[${r},${c}] = ${terms.join(' + ')} = <span class="res">${Y[r][c]}</span>`;
      const cell = outG.cells[r][c];
      arrive(cell, forward);
      if (forward) flyText(calc.querySelector('.res'), cell, String(Y[r][c]), d.stage);
      const note = k === 0 ? '<br>次の位置でも<b>同じ 9 個の重み</b>を使います（重み共有）。' : '';
      const done = i === O * O ? `<br>全位置の計算が終わり、<b>${O}×${O} の特徴マップ</b>が完成しました。` : '';
      return `フィルタを入力の（${R}, ${C}）に重ね、重なった 9 マスを<b>要素ごとに掛けて全部足す</b>と <b>${Y[r][c]}</b>。これが出力の [${r}, ${c}] です。${note}${done}`;
    }
    function rebuild() { P = build(); player.setSteps(P.O * P.O + 1); }
    P = build();
    player = new Player(d.root, { steps: P.O * P.O + 1, interval: 1500, holds: { 0: 2400 }, onStep: render });
  }

  /* ------------------------------------------------------------------
     5.2 チャネルをまたぐ畳み込み
  ------------------------------------------------------------------ */
  function channelsDemo() {
    const d = demo('d-channels'); if (!d) return;
    const CH = [
      { name: 'R', color: 'var(--red)', X: [[1, 0, 1, 2], [0, 2, 1, 0], [1, 1, 0, 1], [2, 0, 1, 1]], W: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
      { name: 'G', color: 'var(--green)', X: [[0, 1, 1, 0], [1, 0, 2, 1], [0, 1, 1, 0], [1, 2, 0, 1]], W: [[0, 1, 0], [0, 1, 0], [0, 1, 0]] },
      { name: 'B', color: 'var(--blue)', X: [[2, 1, 0, 1], [0, 1, 0, 2], [1, 0, 1, 1], [0, 1, 2, 0]], W: [[0, 0, 0], [1, 1, 1], [0, 0, 0]] }
    ];
    const BIAS = 1, POS = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const partial = (ch, i, j) => { let sum = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) sum += ch.X[i + a][j + b] * ch.W[a][b]; return sum; };
    const rows = CH.map(ch => {
      const g = grid(4, 4, { cls: 'sm', text: (r, c) => ch.X[r][c] });
      g.cells.forEach((row, r) => row.forEach((cell, c) => Object.assign(cell.style, shade(ch.X[r][c] / 2 * .7, ch.color))));
      const win = h('div', { class: 'window hide' }); g.el.append(win);
      const f = grid(3, 3, { cls: 'sm', text: (r, c) => ch.W[r][c] }); f.cells.flat().forEach(c => c.classList.add('c-orange', 'tint'));
      const part = h('div', { class: 'chip mono', text: '＝ ?' });
      return { ch, g, win, part, el: h('div', { class: 'ch-row' }, h('span', { class: 'ch-name', style: { '--c': ch.color }, text: ch.name }), g.el, h('span', { class: 'op', text: '⊛' }), f.el, part) };
    });
    const sumBox = h('div', { class: 'calc', style: { textAlign: 'center', marginTop: 0 } });
    const out = grid(2, 2);
    const fan = h('div', { class: 'fan', 'aria-hidden': 'true' }, [...Array(16)].map((_, k) => h('span', { style: { '--k': k } })));
    const paramV = h('div', { class: 'v', text: '448' });
    const fanWrap = h('div', { class: 'fan-wrap' }, fan,
      h('div', { class: 'stat', style: { minWidth: '220px' } }, h('div', { class: 'k' }, 'この層のパラメータ数'), paramV, h('div', { class: 'd', text: '16 種類 × (3×3×3 の重み + バイアス 1)' })));
    d.stage.append(
      h('div', { class: 'ch-layout' },
        h('div', { class: 'ch-rows' }, rows.map(r => r.el), h('div', { class: 'lbl-sm', text: '入力 (3, 4, 4)　⊛　フィルタ 1 セット (3, 3, 3)' })),
        h('div', { class: 'col' }, h('div', { class: 'lbl-sm', text: '3 チャネル分を足してバイアスを加える' }), sumBox, out.el, h('div', { class: 'lbl-sm', text: '特徴マップ 1 枚 (2×2)' }))),
      fanWrap);
    new Player(d.root, {
      steps: 6, interval: 2200,
      onStep(i, { forward }) {
        rows.forEach(r => { r.win.classList.toggle('hide', i === 0 || i === 5); r.part.classList.remove('on'); });
        out.cells.flat().forEach((cell, k) => {
          const done = k < i && i > 0, [pi, pj] = POS[k];
          const v = rows.reduce((acc, r) => acc + partial(r.ch, pi, pj), 0) + BIAS;
          cell.textContent = done ? v : ''; cell.classList.toggle('empty', !done); cell.classList.toggle('cur', k === i - 1 && i < 5);
          Object.assign(cell.style, done ? shade(v / 10, 'var(--aqua)') : { background: '', color: '' });
          if (k !== i - 1) cell.classList.remove('arrive');
        });
        fanWrap.classList.toggle('on', i === 5);
        if (i === 5 && forward) countUp(paramV, 448);
        if (i === 0) {
          rows.forEach(r => { r.part.textContent = '＝ ?'; });
          sumBox.innerHTML = '<span class="z">R + G + B + b</span>';
          return '入力は R・G・B の <b>3 枚</b>。フィルタも同じく <b>3 枚（深さ 3）で 1 セット</b>です。各チャネルに対応する 1 枚ずつが重なります。';
        }
        if (i === 5) {
          sumBox.innerHTML = '<span class="z">1 セットのフィルタ → 特徴マップ 1 枚</span>';
          rows.forEach(r => { r.part.textContent = '＝ ?'; });
          return 'フィルタ 1 セット（重み 3×3×3 = 27 個 + バイアス 1 個）で特徴マップが 1 枚。これを <b>16 種類</b>用意すれば出力は 16 枚＝<b>16 チャネル</b>になり、パラメータ数は 16 × 28 = <b>448</b> です。';
        }
        const [pi, pj] = POS[i - 1];
        const parts = rows.map(r => {
          r.win.style.setProperty('--r', pi); r.win.style.setProperty('--c', pj);
          const v = partial(r.ch, pi, pj); r.part.textContent = '＝ ' + v; r.part.classList.add('on');
          return v;
        });
        const total = parts.reduce((a, b) => a + b, 0) + BIAS;
        sumBox.innerHTML = `${parts.join(' + ')} + ${BIAS} = <span class="res">${total}</span>`;
        const cell = out.cells[pi][pj];
        arrive(cell, forward);
        if (forward) flyText(sumBox.querySelector('.res'), cell, String(total), d.stage);
        return `位置（${pi}, ${pj}）：R・G・B それぞれで 3×3 の積和を計算し（${parts.join('、')}）、<b>3 つとバイアス ${BIAS} を足して 1 つの値 ${total}</b> にします。チャネルごとに別の出力になるわけではありません。`;
      }
    });
  }

  /* ------------------------------------------------------------------
     5.2 階層的な抽象化と受容野
  ------------------------------------------------------------------ */
  function hierarchyDemo() {
    const d = demo('d-hierarchy'); if (!d) return;
    const svg = s('svg', { viewBox: '0 0 720 320', role: 'img', 'aria-label': '猫の顔の画像上で、層が深くなるほど 1 つのニューロンが見る範囲（受容野）が広がり、エッジ、角、目や耳、顔全体へと反応対象が変わる図' });
    const cat = s('g', {},
      s('rect', { x: 10, y: 10, width: 300, height: 300, rx: 12, class: 'box' }),
      s('polygon', { points: '68,122 80,35 135,78', class: 'cat' }), s('polygon', { points: '232,122 220,35 165,78', class: 'cat' }),
      s('polygon', { points: '84,56 90,98 118,80', class: 'cat-in' }), s('polygon', { points: '216,56 210,98 182,80', class: 'cat-in' }),
      s('ellipse', { cx: 150, cy: 165, rx: 100, ry: 88, class: 'cat' }),
      s('ellipse', { cx: 112, cy: 150, rx: 15, ry: 19, class: 'eye' }), s('ellipse', { cx: 188, cy: 150, rx: 15, ry: 19, class: 'eye' }),
      s('ellipse', { cx: 112, cy: 153, rx: 5, ry: 11, class: 'pupil' }), s('ellipse', { cx: 188, cy: 153, rx: 5, ry: 11, class: 'pupil' }),
      s('path', { d: 'M140,184 L160,184 L150,196 Z', class: 'pupil' }),
      s('path', { d: 'M150,196 q-10,14 -24,8 M150,196 q10,14 24,8', class: 'whisk' }),
      s('path', { d: 'M96,188 l-52,-8 M96,196 l-52,4 M204,188 l52,-8 M204,196 l52,4', class: 'whisk' }));
    const LAYERS = [
      { name: '層1', desc: 'エッジ・明暗の境界', size: 26, rf: 'ごく狭い', boxes: [[50, 165], [250, 165], [150, 77], [150, 253], [74, 80], [226, 80], [97, 150], [203, 150], [150, 190], [104, 236], [196, 236]] },
      { name: '層2', desc: '角・曲線・単純なテクスチャ', size: 54, rf: '狭い', boxes: [[80, 46], [220, 46], [112, 136], [188, 136], [150, 244], [66, 206]] },
      { name: '層3', desc: '目・耳・鼻などの部品', size: 84, rf: '中くらい', boxes: [[112, 152], [188, 152], [150, 200], [100, 74], [200, 74]] },
      { name: '層4', desc: '顔・猫といった物体そのもの', size: 280, rf: '画像全体', boxes: [[160, 160]] }
    ];
    const GLYPH = [
      ['M4 12H20', 'M12 4V20', 'M5 19L19 5', 'M5 5L19 19'],
      ['M6 19V6H19', 'M5 19A14 14 0 0 1 19 5', 'M5 11L11 5M5 17L17 5M11 19L19 11'],
      ['M3 12Q12 3 21 12Q12 21 3 12ZM12 9.5a2.5 2.5 0 1 0 .01 0Z', 'M4 20L10 4L20 17Z', 'M6 9H18L12 17Z'],
      ['M4 21V9L7 3L10 8H14L17 3L20 9V21ZM9 13h.01M15 13h.01']
    ];
    const rfG = LAYERS.map(L => s('g', { class: 'fade', style: { opacity: 0 } }, L.boxes.map(([x, y]) => s('rect', { x: x - L.size / 2, y: y - L.size / 2, width: L.size, height: L.size, rx: 4, class: 'rf' }))));
    const rowsG = LAYERS.map((L, k) => {
      const y = 22 + k * 74;
      const bg = s('rect', { x: 330, y, width: 380, height: 62, rx: 10, class: 'box' });
      const g = s('g', { class: 'fade' }, bg,
        s('text', { x: 346, y: y + 26, class: 'lbl-b' }, L.name),
        s('text', { x: 386, y: y + 26, class: 'lbl' }, L.desc),
        s('text', { x: 346, y: y + 49, class: 'lbl-m', style: { fontSize: '11px' } }, '受容野'),
        s('rect', { x: 386, y: y + 42, width: 120, height: 6, rx: 3, style: { fill: 'var(--track)' } }),
        s('rect', { x: 386, y: y + 42, width: 120 * L.size / 280, height: 6, rx: 3, style: { fill: 'var(--orange)' } }),
        s('text', { x: 514, y: y + 49, class: 'lbl-m', style: { fontSize: '11px' } }, L.rf),
        GLYPH[k].map((p, j) => s('path', { d: p, class: 'glyph', transform: `translate(${592 + j * 29},${y + 17}) scale(1.05)` })));
      return { g, bg };
    });
    svg.append(cat, ...rfG, ...rowsG.map(r => r.g));
    d.stage.append(svg);
    const CAPS = [
      '入力画像です。この時点では「ピクセルの明るさの並び」にすぎず、ネットワークは何が写っているかを知りません。',
      '<b>層1</b>のニューロンは画像のごく一部（例: 3×3）だけを見て、<b>エッジや明暗の境界</b>に反応します。',
      '<b>層2</b>は層1の出力を 3×3 ずつ見るので、元の画像ではより広い範囲に相当します。<b>角・曲線・単純なテクスチャ</b>に反応します。',
      'さらに深い<b>層3</b>では、<b>目・耳・鼻</b>といった部品に反応するニューロンが現れます。',
      '<b>層4</b>では 1 つのニューロンが画像のほぼ全体を見渡し、<b>「猫の顔」という物体そのもの</b>に反応します。※どの層が何に反応するかは、学習結果の典型例です。'
    ];
    new Player(d.root, {
      steps: 5, interval: 2600,
      onStep(i) {
        rfG.forEach((g, k) => show(g, k === i - 1));
        rowsG.forEach(({ g, bg }, k) => {
          g.style.opacity = k < i ? 1 : .4;
          bg.setAttribute('class', 'box' + (k === i - 1 ? ' c-orange tint' : ''));
        });
        return CAPS[i];
      }
    });
  }

  /* ------------------------------------------------------------------
     5.3 プーリング
  ------------------------------------------------------------------ */
  function poolDemo() {
    const d = demo('d-pool'); if (!d) return;
    const X = [[1, 3, 2, 4], [5, 2, 1, 0], [0, 1, 3, 2], [1, 0, 1, 3]];
    let mode = 'max', player;
    const inG = grid(4, 4, { text: (r, c) => X[r][c] });
    inG.cells.forEach((row, r) => row.forEach((cell, c) => { if (((r >> 1) + (c >> 1)) % 2 === 0) cell.style.background = 'color-mix(in srgb, var(--blue) 12%, var(--paper))'; }));
    const win = h('div', { class: 'window hide', style: { '--k': 2 } }); inG.el.append(win);
    const outG = grid(2, 2);
    const calc = h('div', { class: 'calc' });
    const outLabel = h('div', { class: 'lbl-sm' });
    d.options.append(segmented({ label: '種類', options: [['max', '最大プーリング'], ['avg', '平均プーリング']], value: 'max', onChange: v => { mode = v; player.refresh(); } }));
    d.stage.append(h('div', { class: 'row' },
      h('div', { class: 'col' }, inG.el, h('div', { class: 'lbl-sm', text: '特徴マップ 4×4（色の濃淡＝ブロックの区切り）' })),
      h('div', { class: 'op', text: '→' }),
      h('div', { class: 'col' }, outG.el, outLabel)), calc);
    const blocks = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([i, j]) => {
      const cells = [[2 * i, 2 * j], [2 * i, 2 * j + 1], [2 * i + 1, 2 * j], [2 * i + 1, 2 * j + 1]];
      const vals = cells.map(([r, c]) => X[r][c]);
      const m = Math.max(...vals);
      return { i, j, cells, vals, max: m, argmax: cells[vals.indexOf(m)], avg: vals.reduce((a, b) => a + b, 0) / 4 };
    });
    const f2 = v => Number.isInteger(v) ? String(v) : v.toFixed(2);
    player = new Player(d.root, {
      steps: 5, interval: 1900, holds: { 0: 2200 },
      onStep(i, { forward }) {
        outLabel.textContent = mode === 'max' ? '出力 2×2（各ブロックの最大値）' : '出力 2×2（各ブロックの平均）';
        inG.cells.flat().forEach(c => c.classList.remove('cur'));
        outG.cells.flat().forEach((cell, k) => {
          const b = blocks[k], done = k < i, v = mode === 'max' ? b.max : b.avg;
          cell.textContent = done ? f2(v) : ''; cell.classList.toggle('empty', !done); cell.classList.toggle('cur', k === i - 1);
          Object.assign(cell.style, done ? shade(v / 5 * .8, 'var(--aqua)') : { background: '', color: '' });
          if (k !== i - 1) cell.classList.remove('arrive');
        });
        if (i === 0) {
          win.classList.add('hide');
          calc.innerHTML = '<span class="z">2×2 の窓を 2 マスずつ動かす（重なりなし）</span>';
          return '4×4 の特徴マップを <b>2×2 のブロック 4 つ</b>に分け、それぞれを 1 つの値に要約します。学習するパラメータはありません。';
        }
        const b = blocks[i - 1];
        win.classList.remove('hide'); win.style.setProperty('--r', 2 * b.i); win.style.setProperty('--c', 2 * b.j);
        const cell = outG.cells[b.i][b.j];
        let from;
        if (mode === 'max') {
          const [mr, mc] = b.argmax; from = inG.cells[mr][mc]; from.classList.add('cur');
          calc.innerHTML = `max(${b.vals.join(', ')}) = <span class="res">${b.max}</span>`;
        } else {
          calc.innerHTML = `(${b.vals.join(' + ')}) / 4 = <span class="res">${f2(b.avg)}</span>`;
          from = calc.querySelector('.res');
        }
        arrive(cell, forward);
        if (forward) flyText(from, cell, f2(mode === 'max' ? b.max : b.avg), d.stage);
        const tail = i === 4 ? '<br>出力は 2×2 で、面積は <b>1/4</b> になりました。' : '';
        return (mode === 'max'
          ? `ブロック ${i} の<b>最大値 ${b.max}</b> だけを残します。弱い反応は捨て、「この辺りに強い特徴があった」ことだけを次へ伝えます。`
          : `ブロック ${i} の<b>平均 ${f2(b.avg)}</b> を残します。ブロック全体の反応をならした値です。`) + tail;
      }
    });
  }

  /* ------------------------------------------------------------------
     5.3 CNN 全体のデータフロー（コードと同期）
  ------------------------------------------------------------------ */
  function pipelineDemo() {
    const d = demo('d-pipeline'); if (!d) return;
    const host = document.getElementById('pipeline-svg'), pre = document.getElementById('pipeline-code');
    const W = 960, H = 252, CY = 120;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '手書き数字 7 の画像が CNN を通り、テンソルの形状が変わりながら 10 クラスの確率になる図' });
    const FACE = [[.8, -.6, .4, -.9], [-.3, .9, -.7, .5], [.6, -.4, .2, -.8], [-.5, .7, -.2, .9]];
    const faceCells = [];
    function stack(x, size, n, face) {
      const g = s('g', { class: 'fade' }), y = CY - size / 2;
      for (let k = n - 1; k >= 0; k--) g.append(s('rect', { x: x + k * 4, y: y - k * 4, width: size, height: size, rx: 3, class: 'box c-blue tint', style: { strokeWidth: 1.2 } }));
      if (face) {
        const cs = size / 4, list = [];
        FACE.forEach((row, r) => row.forEach((v, c) => { const rect = s('rect', { x: x + c * cs + 1, y: y + r * cs + 1, width: cs - 2, height: cs - 2, rx: 2, class: 'box', style: { stroke: 'none' } }); list.push({ rect, v }); g.append(rect); }));
        faceCells.push(list);
      }
      return g;
    }
    const vbar = (x, len, segs = 1) => {
      const g = s('g', { class: 'fade' }), y0 = CY - len / 2, sl = len / segs, list = [];
      for (let k = 0; k < segs; k++) { const r = s('rect', { x, y: y0 + k * sl + (segs > 1 ? 1 : 0), width: 12, height: sl - (segs > 1 ? 2 : 0), rx: 2, class: 'box c-violet tint', style: { strokeWidth: 1.2 } }); list.push(r); g.append(r); }
      g.segs = list; return g;
    };
    const arrow = (x1, x2) => {
      const line = s('path', { d: `M${x1},${CY} H${x2 - 6}`, class: 'ln' });
      const head = s('path', { d: `M${x2 - 8},${CY - 5} L${x2},${CY} L${x2 - 8},${CY + 5} Z`, class: 'ahead' });
      const g = s('g', { class: 'fade arrow' }, line, head); g.line = line; return g;
    };
    const t0 = s('g', { class: 'fade' }, s('rect', { x: 16, y: CY - 30, width: 60, height: 60, rx: 4, class: 'box', style: { fill: 'var(--ink)', stroke: 'none' } }),
      s('path', { d: `M30,${CY - 16} H62 L42,${CY + 22}`, style: { fill: 'none', stroke: 'var(--paper)', strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round' } }));
    const T = { t0, t1: stack(132, 60, 6, true), t2: stack(258, 30, 6), t3: stack(354, 30, 9, true), t4: stack(462, 15, 9), v1: vbar(555, 170), v2: vbar(613, 90, 8), v3: vbar(671, 40) };
    const A = { a1: arrow(84, 126), a2: arrow(218, 252), a3: arrow(314, 348), a4: arrow(422, 456), a5: arrow(515, 549), a6: arrow(573, 607), a7: arrow(631, 665), a8: arrow(689, 725) };
    const PROBS = [.01, .02, .01, .02, .01, .01, .00, .87, .01, .04];
    const probs = s('g', { class: 'fade' },
      PROBS.map((p, k) => s('rect', { x: 736 + k * 21, y: 192 - Math.max(2, p * 140), width: 14, height: Math.max(2, p * 140), rx: 3, style: { fill: k === 7 ? 'var(--blue)' : 'color-mix(in srgb, var(--blue) 40%, var(--paper))' } })),
      PROBS.map((p, k) => s('text', { x: 743 + k * 21, y: 209, 'text-anchor': 'middle', class: k === 7 ? 'lbl-b' : 'lbl-m', style: { fontSize: '13px' } }, k)),
      s('text', { x: 743 + 7 * 21, y: 192 - .87 * 140 - 7, 'text-anchor': 'middle', class: 'lbl-b', style: { fontSize: '14px' } }, '0.87'));
    const LABELS = [[46, 226, '(1, 28, 28)', 0], [172, 244, '(16, 28, 28)', 1], [283, 226, '(16, 14, 14)', 3], [385, 244, '(32, 14, 14)', 4], [485, 226, '(32, 7, 7)', 6], [561, 244, '1,568', 7], [619, 226, '128', 8], [677, 244, '10', 10], [840, 244, '確率（0〜9 の 10 クラス）', 11]];
    const labels = LABELS.map(([x, y, t, at]) => { const el = s('text', { x, y, 'text-anchor': 'middle', class: 'lbl-m lbl-mono fade', style: { fontSize: '14px' } }, t); el.at = at; return el; });
    const opText = s('text', { x: 16, y: 28, class: 'lbl-b', style: { fontSize: '17px' } });
    svg.append(opText, ...Object.values(A), ...Object.values(T), probs, ...labels);
    host.append(svg);

    const AT = { t0: 0, t1: 1, t2: 3, t3: 4, t4: 6, v1: 7, v2: 8, v3: 10, probs: 11, a1: 1, a2: 3, a3: 4, a4: 6, a5: 7, a6: 8, a7: 10, a8: 11 };
    const STEPS = [
      [null, [16], '入力', '入力は <code>(バッチ, 1, 28, 28)</code>。ここでは 1 枚分の <b>(1, 28, 28)</b>（白黒・縦 28・横 28）の手書き「7」に注目します。'],
      ['a1', [1], 'Conv2d(1 → 16)', '3×3 のフィルタ <b>16 種類</b>で畳み込み。padding=1 なので縦横は 28 のまま、チャネルが <b>1 → 16</b> に増えます → (16, 28, 28)。'],
      [null, [2], 'ReLU', '<b>ReLU</b> で負の値（赤）を 0 にします。形状は変わりません。'],
      ['a2', [3], 'MaxPool2d(2)', '2×2 の最大プーリングで縦横が半分に：<b>28 → 14</b>。チャネル数 16 はそのまま → (16, 14, 14)。'],
      ['a3', [5], 'Conv2d(16 → 32)', '2 つ目の畳み込みでチャネルを <b>16 → 32</b> に。縦横は 14 のまま → (32, 14, 14)。'],
      [null, [6], 'ReLU', '再び ReLU で負の値を 0 に。'],
      ['a4', [7], 'MaxPool2d(2)', 'プーリングで <b>14 → 7</b> → (32, 7, 7)。「空間は小さく、チャネル（特徴の種類）は多く」が定石です。'],
      ['a5', [9], 'Flatten', '<b>Flatten</b>：32 × 7 × 7 = <b>1,568</b> 個の値を 1 列に並べます。ここから<b>識別部</b>です。'],
      ['a6', [10, 11], 'Linear(1568 → 128) + ReLU', '全結合層で <b>1,568 → 128</b> に圧縮し、ReLU をかけます。'],
      [null, [12], 'Dropout(0.5)', '<b>Dropout</b>（第4章）：学習時だけ、ランダムに約 50% の値を 0 にして過学習を防ぎます（点線の部分）。推論時は何もしません。'],
      ['a7', [13], 'Linear(128 → 10)', '最後の全結合層で <b>128 → 10</b>。各数字（0〜9）の「スコア」（ロジット）です。'],
      ['a8', [], 'Softmax', '<b>Softmax</b> でスコアを確率に変換すると「7」が 0.87 で最大。※学習時は <code>nn.CrossEntropyLoss</code> が内部で Softmax を計算するため、モデルの最後には書きません。']
    ];
    const DROP = new Set([1, 4, 5, 7]);
    new Player(d.root, {
      steps: STEPS.length, interval: 2500,
      onStep(i, { forward }) {
        const [arrowKey, lines, op, cap] = STEPS[i];
        Object.entries({ ...T, ...A, probs }).forEach(([k, el]) => show(el, AT[k] <= i));
        Object.entries(A).forEach(([k, el]) => el.classList.toggle('on', k === arrowKey));
        labels.forEach(el => { show(el, el.at <= i); el.style.fontWeight = el.at === i ? 700 : 400; });
        faceCells.forEach((list, n) => {
          const reluOn = i >= (n === 0 ? 2 : 5);
          list.forEach(({ rect, v }) => { rect.style.fill = v < 0 && reluOn ? 'var(--paper)' : `color-mix(in srgb, ${v < 0 ? 'var(--red)' : 'var(--blue)'} ${Math.round(Math.abs(v) * 80)}%, var(--paper))`; });
        });
        T.v2.segs.forEach((r, k) => { const off = i === 9 && DROP.has(k); r.style.fill = off ? 'var(--paper)' : ''; r.style.strokeDasharray = off ? '3 3' : ''; });
        opText.textContent = `処理：${op}`;
        setCode(pre, lines);
        if (forward && arrowKey) flow(A[arrowKey].line, { color: 'var(--orange)', dur: 600, r: 5 });
        return cap;
      }
    });
  }

  /* ------------------------------------------------------------------
     5.4 代表的なモデル（層数・エラー率）
  ------------------------------------------------------------------ */
  function modelsDemo() {
    const d = demo('d-models'); if (!d) return;
    const DEPTH = [['LeNet-5', 1998, 7, 'CNN の原型。郵便番号の手書き数字認識に実用化'], ['AlexNet', 2012, 8, 'ReLU・Dropout・GPU 学習を導入し ILSVRC 2012 で圧勝'], ['VGG-16', 2014, 16, '3×3 の小さいフィルタを重ねるだけのシンプルな設計'], ['GoogLeNet', 2014, 22, 'Inception モジュールで複数サイズのフィルタを並列適用'], ['ResNet-50', 2015, 50, '残差接続で深いネットワークを学習可能に'], ['ResNet-152', 2015, 152, '152 層。ILSVRC 2015 で優勝']];
    const ERR = [['AlexNet', 2012, 15.3], ['VGG', 2014, 7.3], ['GoogLeNet', 2014, 6.7], ['ResNet', 2015, 3.6]];
    const HUMAN = 5.1, X0 = 118, BW = 200;
    function chart(title, rows, max, fmtV, tip, ref) {
      const H = 18 + rows.length * 32 + (ref ? 18 : 0);
      const svg = s('svg', { viewBox: `0 0 370 ${H}`, role: 'img', 'aria-label': title });
      const bars = [];
      rows.forEach(([name, year, v, desc], k) => {
        const y = (ref ? 26 : 8) + k * 32;
        const w = Math.max(3, v / max * BW);
        const bar = s('rect', { x: X0, y: y + 4, width: w, height: 16, rx: 4, class: 'bar-grow', style: { fill: 'var(--blue)' } });
        const g = s('g', { tabindex: 0, class: 'hit' },
          s('rect', { x: 0, y, width: 370, height: 26, style: { fill: 'transparent' } }),
          s('text', { x: 0, y: y + 12, class: 'lbl', style: { fontSize: '12.5px' } }, name),
          s('text', { x: 0, y: y + 25, class: 'lbl-m', style: { fontSize: '10.5px' } }, year),
          s('line', { x1: X0, x2: X0, y1: y + 2, y2: y + 22, style: { stroke: 'var(--line)' } }),
          bar,
          s('text', { x: X0 + w + 6, y: y + 17, class: 'lbl lbl-mono halo-text', style: { fontSize: '12px' } }, fmtV(v)));
        tooltip(g, `<b>${name}</b>（${year}）<br>${tip(v, desc)}`);
        bars.push(bar); svg.append(g);
      });
      if (ref) {
        const x = X0 + ref / max * BW;
        svg.append(s('line', { x1: x, x2: x, y1: 18, y2: H - 4, style: { stroke: 'var(--ink)', strokeWidth: 1.5 } }),
          s('text', { x, y: 12, 'text-anchor': 'middle', class: 'lbl-m', style: { fontSize: '11px' } }, `人間 ≈ ${ref}%`));
      }
      return { el: h('div', {}, h('div', { class: 'lbl-sm', style: { textAlign: 'left', marginBottom: '6px' }, html: `<b style="color:var(--ink)">${title}</b>` }), svg), bars };
    }
    const c1 = chart('層の数', DEPTH, 152, v => `${v} 層`, (v, desc) => desc);
    const c2 = chart('ImageNet 分類の top-5 エラー率（低いほど良い）', ERR, 16, v => `${v}%`, v => `top-5 エラー率 ${v}%`, HUMAN);
    d.stage.append(h('div', { class: 'charts2' }, c1.el, c2.el),
      h('p', { class: 'note', style: { margin: '10px 0 0' }, text: 'エラー率は ILSVRC 画像分類部門の各モデルの報告値（ResNet は複数モデルのアンサンブル）。人間の値は同コンペの論文で報告された推定値です。バーにカーソルを合わせると詳細を表示します。' }));
    const bars = [...c1.bars, ...c2.bars];
    bars.forEach(b => { b.style.transform = 'scaleX(0)'; });
    onVisible(d.root, () => bars.forEach((b, k) => { b.style.transitionDelay = `${k * 90}ms`; b.style.transform = 'scaleX(1)'; }));
  }

  /* ------------------------------------------------------------------
     5.4 残差接続と勾配
  ------------------------------------------------------------------ */
  function residualDemo() {
    const d = demo('d-residual'); if (!d) return;
    const W = 720, H = 300, N = 6, BW = 60;
    const bx = k => 96 + k * 96;
    const ROWS = [{ y: 66, label: '通常', res: false, g: [.03, .06, .13, .25, .5, 1] }, { y: 204, label: '残差接続', res: true, g: [.9, .92, .94, .96, .98, 1] }];
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '6 層の通常ネットワークと残差接続ネットワークで、逆伝播の勾配が入力側へどれだけ届くかを比較する図' });
    const rowsData = ROWS.map(R => {
      const g = s('g');
      const base = R.y + 62;
      g.append(s('text', { x: 8, y: R.y + 5, class: 'lbl-b' }, R.label));
      const main = s('path', { d: `M70,${R.y} H${bx(N - 1) + BW + 34}`, class: 'ln' });
      g.append(main, s('text', { x: bx(N - 1) + BW + 40, y: R.y + 5, class: 'lbl' }, '損失'));
      const segs = [], skips = [], bars = [], vals = [];
      for (let k = 0; k < N; k++) {
        const x = bx(k);
        segs.push(s('path', { d: `M${x + BW},${R.y} H${k < N - 1 ? bx(k + 1) : x + BW + 34}`, class: 'ln', style: { opacity: 0 } }));
        if (R.res) {
          const sx = x - 16, ex = x + BW + 16;
          const sk = s('path', { d: `M${sx},${R.y} C${sx},${R.y - 50} ${ex},${R.y - 50} ${ex},${R.y - 9}`, class: 'ln', style: { stroke: 'var(--aqua)' } });
          skips.push(sk);
          g.append(sk, s('circle', { cx: ex, cy: R.y, r: 9, class: 'box', style: { stroke: 'var(--aqua)', strokeWidth: 1.5 } }), s('text', { x: ex, y: R.y + 4.5, 'text-anchor': 'middle', class: 'lbl-b', style: { fontSize: '13px' } }, '+'));
        }
        g.append(s('rect', { x, y: R.y - 18, width: BW, height: 36, rx: 7, class: 'box c-blue tint' }), s('text', { x: x + BW / 2, y: R.y + 5, 'text-anchor': 'middle', class: 'lbl', style: { fontSize: '12px' } }, `層${k + 1}`));
        g.append(s('rect', { x: x + 14, y: base - 1, width: BW - 28, height: 1, style: { fill: 'var(--line)' } }));
        const bar = s('rect', { x: x + 18, y: base - 40, width: BW - 36, height: 40, rx: 3, class: 'grad-bar' });
        const val = s('text', { x: x + BW / 2, y: base + 14, 'text-anchor': 'middle', class: 'lbl-m lbl-mono fade', style: { fontSize: '11px' } }, R.g[k].toFixed(2));
        bars.push(bar); vals.push(val); g.append(bar, val);
      }
      g.append(...segs);
      svg.append(g);
      return { R, segs, skips, bars, vals };
    });
    svg.append(s('text', { x: 8, y: H - 6, class: 'lbl-m', style: { fontSize: '11px' } }, '棒＝各層に届いた勾配の大きさ（通常は 1 層ごとに 0.5 倍になると仮定したイメージ）'));
    d.stage.append(svg);
    new Player(d.root, {
      steps: 7, interval: 1700, holds: { 0: 3000 },
      onStep(i, { forward }) {
        rowsData.forEach(({ R, segs, skips, bars, vals }) => {
          for (let k = 0; k < N; k++) {
            const reached = i > 0 && k >= N - i;
            bars[k].style.transform = `scaleY(${reached ? R.g[k] : 0})`;
            show(vals[k], reached);
          }
          if (forward && i > 0) {
            const k = N - i;
            flow(segs[k], { color: 'var(--red)', reverse: true, dur: 700 });
            if (R.res) flow(skips[k], { color: 'var(--red)', reverse: true, dur: 700 });
          }
        });
        if (i === 0) return '順伝播ではデータが左から右へ流れます。残差接続では各層の入力が<b>迂回路（緑）を通って出力に足されます</b>（y = x + F(x)）。▶ で逆伝播（損失 → 入力側）を見てみましょう。';
        const k = N - i;
        const a = ROWS[0].g[k], b = ROWS[1].g[k];
        if (i === N) return `入力に近い層1に届いた勾配は、通常 <b>${a.toFixed(2)}</b>（ほぼ消失）に対し、残差接続 <b>${b.toFixed(2)}</b>。迂回路の「＋1」のおかげで勾配が減衰せず届くため、100 層を超えても学習が進みます。`;
        return `勾配が<b>層${k + 1}</b>まで戻りました。通常のネットワークでは層を通るたびに小さくなり <b>${a.toFixed(2)}</b>、残差接続では迂回路をそのまま通れるので <b>${b.toFixed(2)}</b>。`;
      }
    });
  }

  /* ------------------------------------------------------------------
     5.4 分類・検出・セグメンテーション
  ------------------------------------------------------------------ */
  function tasksDemo() {
    const d = demo('d-tasks'); if (!d) return;
    const W = 720, H = 262, PW = 220, PH = 160, PY = 36;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '猫と犬が写った同じ画像に対し、画像分類はラベル 1 つ、物体検出は矩形 2 つ、セグメンテーションはピクセルごとのラベルを出力する図' });
    function scene() {
      const cat = [
        s('path', { d: 'M88,128 C112,128 114,98 100,86', class: 'animal-tail' }),
        s('ellipse', { cx: 66, cy: 112, rx: 28, ry: 26, class: 'animal a-cat' }),
        s('polygon', { points: '42,66 44,44 57,57', class: 'animal a-cat' }), s('polygon', { points: '60,55 72,44 75,66', class: 'animal a-cat' }),
        s('circle', { cx: 58, cy: 72, r: 19, class: 'animal a-cat' })];
      const dog = [
        s('path', { d: 'M118,106 L102,90', class: 'animal-tail', style: { stroke: 'color-mix(in srgb, var(--ink) 24%, var(--paper))' } }),
        s('rect', { x: 128, y: 120, width: 9, height: 22, rx: 3, class: 'animal a-dog' }), s('rect', { x: 166, y: 120, width: 9, height: 22, rx: 3, class: 'animal a-dog' }),
        s('ellipse', { cx: 152, cy: 114, rx: 36, ry: 22, class: 'animal a-dog' }),
        s('circle', { cx: 182, cy: 78, r: 18, class: 'animal a-dog' }), s('ellipse', { cx: 196, cy: 88, rx: 11, ry: 8, class: 'animal a-dog' }),
        s('ellipse', { cx: 171, cy: 82, rx: 6, ry: 13, class: 'animal a-dog-ear' })];
      const eyes = [s('circle', { cx: 52, cy: 70, r: 2.6, class: 'animal-eye' }), s('circle', { cx: 64, cy: 70, r: 2.6, class: 'animal-eye' }), s('circle', { cx: 186, cy: 74, r: 2.6, class: 'animal-eye' }), s('circle', { cx: 205, cy: 86, r: 3, class: 'animal-eye' })];
      const g = s('g', {}, s('rect', { x: 0, y: 0, width: PW, height: PH, rx: 8, class: 'box' }), s('line', { x1: 8, x2: PW - 8, y1: 142, y2: 142, style: { stroke: 'var(--line)', strokeWidth: 2 } }), cat, dog, eyes);
      return { g, cat, dog };
    }
    const TITLES = ['画像分類', '物体検出', 'セグメンテーション'];
    const OUTS = ['出力：「猫」（画像全体に 1 つ）', '出力：矩形 ×2 ＋ ラベル・確信度', '出力：ピクセルごとのラベル'];
    const panels = TITLES.map((t, k) => {
      const x = 10 + k * 240;
      const sc = scene();
      const inner = s('g', { transform: `translate(${x},${PY})` }, sc.g);
      const outText = s('text', { x: x + PW / 2, y: PY + PH + 22, 'text-anchor': 'middle', class: 'lbl fade', style: { fontSize: '12px' } }, OUTS[k]);
      svg.append(s('text', { x: x + PW / 2, y: 24, 'text-anchor': 'middle', class: 'lbl-b' }, t), inner, outText);
      return { inner, sc, outText, x };
    });
    // 分類：画像全体の枠とラベル
    const cls = s('g', { class: 'fade' }, s('rect', { x: 2, y: 2, width: PW - 4, height: PH - 4, rx: 7, class: 'draw', style: { fill: 'none', stroke: 'var(--orange)', strokeWidth: 3 } }),
      s('rect', { x: 8, y: 8, width: 52, height: 22, rx: 5, style: { fill: 'var(--orange)' } }), s('text', { x: 34, y: 24, 'text-anchor': 'middle', class: 'lbl-b', style: { fill: '#fff', fontSize: '12px' } }, '猫'));
    panels[0].inner.append(cls);
    // 検出：矩形 2 つ
    const box = (x, y, w, hh, label, color) => {
      const r = s('rect', { x, y, width: w, height: hh, rx: 3, class: 'draw', style: { fill: 'none', stroke: color, strokeWidth: 2.5 } });
      return { r, g: s('g', { class: 'fade' }, r, s('rect', { x, y: y - 17, width: 58, height: 17, rx: 3, style: { fill: color } }), s('text', { x: x + 29, y: y - 4.5, 'text-anchor': 'middle', class: 'lbl-b', style: { fill: '#fff', fontSize: '11px' } }, label)) };
    };
    const bCat = box(33, 40, 82, 104, '猫 0.97', 'var(--orange)'), bDog = box(97, 56, 114, 90, '犬 0.94', 'var(--blue)');
    panels[1].inner.append(bCat.g, bDog.g);
    // セグメンテーション：セルごとに所属を判定
    const segG = s('g'), segCells = [];
    panels[2].inner.append(segG);
    d.stage.append(svg,
      h('div', { class: 'legend', style: { justifyContent: 'center', margin: '8px 0 0' } },
        h('span', {}, h('span', { class: 'swatch c-orange' }), '猫'), h('span', {}, h('span', { class: 'swatch c-blue' }), '犬'), h('span', {}, h('span', { class: 'swatch', style: { background: 'var(--track)' } }), '背景')));
    const inside = (shapes, x, y) => shapes.some(el => { const p = new DOMPoint(x, y); return el.isPointInFill(p) || (el.classList.contains('animal-tail') && el.isPointInStroke(p)); });
    const CS = 10;
    for (let r = 0; r < PH / CS; r++) for (let c = 0; c < PW / CS; c++) {
      const x = c * CS + CS / 2, y = r * CS + CS / 2;
      const who = inside(panels[2].sc.cat, x, y) ? 'cat' : inside(panels[2].sc.dog, x, y) ? 'dog' : 'bg';
      const rect = s('rect', { x: c * CS + .5, y: r * CS + .5, width: CS - 1, height: CS - 1, rx: 1.5, class: 'seg-cell seg-' + who, style: { transitionDelay: `${c * 28 + r * 6}ms` } });
      segCells.push(rect); segG.append(rect);
    }
    const CAPS = [
      '3 つとも同じ入力画像（猫と犬が写っている）です。違うのは<b>何を出力するか</b>です。',
      '<b>画像分類</b>：画像全体に対してラベルを 1 つだけ出力します。犬も写っているのに「猫」としか答えられません。',
      '<b>物体検出</b>：物体ごとに矩形（位置と大きさ x, y, w, h）とラベル・確信度を出力します。「どこに何があるか」がわかります。',
      '<b>セグメンテーション</b>：ピクセル 1 つ 1 つに「猫」「犬」「背景」のラベルを付けます。輪郭まで正確にわかる、最も細かい出力です。'
    ];
    new Player(d.root, {
      steps: 4, interval: 2600,
      onStep(i, { animate }) {
        show(cls, i >= 1); drawLine(cls.firstChild, i >= 1, animate);
        [bCat, bDog].forEach(b => { show(b.g, i >= 2); drawLine(b.r, i >= 2, animate); });
        segCells.forEach(c => c.classList.toggle('on', i >= 3));
        panels.forEach((p, k) => show(p.outText, i >= k + 1));
        return CAPS[i];
      }
    });
  }

  /* ------------------------------------------------------------------
     5.4 転移学習（特徴抽出 / ファインチューニング）
  ------------------------------------------------------------------ */
  function transferDemo() {
    const d = demo('d-transfer'); if (!d) return;
    const host = document.getElementById('transfer-svg'), pre = document.getElementById('transfer-code');
    const code = pre.querySelector('code');
    const COMMON = [
      ['load', 'import torch'], ['load', 'import torch.nn as nn'], ['load', 'import torchvision.models as models'], ['', ''],
      ['load', 'model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)'], ['', ''],
      ['freeze', '# 1. 特徴抽出部を凍結（勾配を計算しない）'], ['freeze', 'for p in model.parameters():'], ['freeze', '    p.requires_grad = False'], ['', ''],
      ['head', '# 2. 最終層を自分のクラス数に付け替える（この層だけ学習される）'], ['head', 'model.fc = nn.Linear(model.fc.in_features, 2)'], ['', '']
    ];
    const CODE = {
      fe: [...COMMON, ['opt', 'optimizer = torch.optim.Adam(model.fc.parameters(), lr=1e-3)']],
      ft: [...COMMON, ['opt', '# 3. 後半の層（layer4）の凍結を解除し、小さい学習率で更新する'], ['opt', 'for p in model.layer4.parameters():'], ['opt', '    p.requires_grad = True'], ['', ''],
        ['opt', 'optimizer = torch.optim.Adam(['], ['opt', '    {"params": model.fc.parameters(), "lr": 1e-3},'], ['opt', '    {"params": model.layer4.parameters(), "lr": 1e-4},'], ['opt', '])']]
    };
    let mode = 'fe', player;
    const renderCode = () => { code.innerHTML = DL.highlightPython(CODE[mode].map(l => l[1]).join('\n')); };
    const W = 720, H = 222, CY = 104;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '学習済み ResNet-18 の特徴抽出部を凍結し、最終層を 2 クラス用に付け替えて学習する図' });
    const NAMES = ['conv1', 'layer1', 'layer2', 'layer3', 'layer4'];
    const bx = k => 16 + k * 100;
    const lock = (x, y) => s('g', { class: 'fade lock', transform: `translate(${x},${y})` },
      s('path', { d: 'M3 8V5.5a4 4 0 0 1 8 0V8', style: { fill: 'none', stroke: 'var(--ink)', strokeWidth: 1.8 } }), s('rect', { x: 1, y: 8, width: 12, height: 9, rx: 2, style: { fill: 'var(--ink)' } }));
    const blocks = NAMES.map((n, k) => {
      const rect = s('rect', { x: bx(k), y: CY - 30, width: 78, height: 60, rx: 8, class: 'box' });
      const lk = lock(bx(k) + 60, CY - 42);
      svg.append(rect, s('text', { x: bx(k) + 39, y: CY + 5, 'text-anchor': 'middle', class: 'lbl lbl-mono', style: { fontSize: '12.5px' } }, n), lk);
      if (k < 4) svg.append(s('path', { d: `M${bx(k) + 80},${CY} H${bx(k + 1) - 3}`, class: 'ln' }));
      return { rect, lk };
    });
    svg.append(s('path', { d: `M${bx(4) + 80},${CY} H${536}`, class: 'ln' }));
    const brace = (x1, x2, label) => s('g', {}, s('path', { d: `M${x1},34 V28 H${x2} V34`, class: 'ln', style: { strokeWidth: 1.5 } }), s('text', { x: (x1 + x2) / 2, y: 20, 'text-anchor': 'middle', class: 'lbl-m' }, label));
    svg.append(brace(bx(0), bx(4) + 78, '特徴抽出部（畳み込み層）— エッジ・形・テクスチャ'), brace(540, 660, '識別部'));
    const head = (title, sub, cls) => {
      const g = s('g', { class: 'move' }, s('rect', { x: 540, y: CY - 30, width: 120, height: 60, rx: 8, class: 'box ' + cls }),
        s('text', { x: 600, y: CY - 6, 'text-anchor': 'middle', class: 'lbl lbl-mono', style: { fontSize: '12.5px' } }, title),
        s('text', { x: 600, y: CY + 14, 'text-anchor': 'middle', class: 'lbl-m', style: { fontSize: '11px' } }, sub));
      return g;
    };
    const oldHead = head('fc 512→1000', 'ImageNet 1000 クラス', 'c-violet tint');
    const oldLock = lock(642, CY - 42);
    const newHead = head('fc 512→2', '良品 / 不良品', 'c-orange tint');
    const lr4 = s('text', { x: bx(4) + 39, y: CY + 50, 'text-anchor': 'middle', class: 'lbl-m lbl-mono fade', style: { fontSize: '11px' } }, 'lr = 1e-4');
    const lrH = s('text', { x: 600, y: CY + 50, 'text-anchor': 'middle', class: 'lbl-m lbl-mono fade', style: { fontSize: '11px' } }, 'lr = 1e-3');
    const fwdPath = s('path', { d: `M${bx(0) - 6},${CY} H${660}`, style: { fill: 'none', stroke: 'none' } });
    const backFE = s('path', { d: `M660,${CY} H540`, style: { fill: 'none', stroke: 'none' } });
    const backFT = s('path', { d: `M660,${CY} H${bx(4)}`, style: { fill: 'none', stroke: 'none' } });
    const legend = s('g', { class: 'fade' },
      s('circle', { cx: 24, cy: H - 12, r: 5, style: { fill: 'var(--blue)' } }), s('text', { x: 34, y: H - 8, class: 'lbl-m', style: { fontSize: '11px' } }, '順伝播（データ）'),
      s('circle', { cx: 150, cy: H - 12, r: 5, style: { fill: 'var(--red)' } }), s('text', { x: 160, y: H - 8, class: 'lbl-m', style: { fontSize: '11px' } }, '逆伝播（勾配）— 凍結した層には流れない'));
    svg.append(oldHead, oldLock, newHead, lr4, lrH, legend, fwdPath, backFE, backFT);
    host.append(svg);
    d.options.append(segmented({ label: '方式', options: [['fe', '特徴抽出（最終層だけ学習）'], ['ft', 'ファインチューニング（後半も学習）']], value: 'fe', onChange: v => { mode = v; renderCode(); player.refresh(); } }));
    renderCode();
    const TAGS = ['load', 'freeze', 'head', 'head', 'opt', 'opt'];
    const CAPS = {
      fe: [
        'ImageNet（1000 クラス・約 120 万枚）で<b>学習済みの ResNet-18</b> を読み込みます。前半の層は、エッジや形、テクスチャといった<b>どの画像タスクにも共通する特徴</b>をすでに検出できます。',
        '全パラメータの <code>requires_grad</code> を False にして<b>凍結</b>します。凍結した層は勾配を計算せず、重みも更新されません。',
        'ImageNet の 1000 クラス用の識別部（<code>fc</code>）は、自分のタスクには不要なので<b>捨てます</b>。',
        '<b>2 クラス（良品 / 不良品）用の新しい fc</b> を付けます。新しく作った層は <code>requires_grad=True</code> なので、ここだけが学習対象です。',
        'オプティマイザにも<b>新しい fc のパラメータだけ</b>を渡します。',
        '学習：データは全層を流れますが、<b>勾配は新しい fc にしか流れません</b>。学習するパラメータが少ないので、数百枚のデータでも過学習しにくく、速く学習できます。'
      ],
      ft: [
        'ImageNet（1000 クラス・約 120 万枚）で<b>学習済みの ResNet-18</b> を読み込みます。',
        'まず全体を<b>凍結</b>します。',
        '1000 クラス用の識別部（<code>fc</code>）を<b>捨てます</b>。',
        '<b>2 クラス用の新しい fc</b> を付けます。',
        'ファインチューニングでは、タスク固有の特徴に近い<b>後半の層（layer4）の凍結も解除</b>し、学習済みの知識を壊さないよう<b>小さい学習率（1e-4）</b>で更新します。',
        '学習：勾配は fc と layer4 まで流れます。データがそこそこある場合は、こちらの方が精度が上がりやすくなります。'
      ]
    };
    player = new Player(d.root, {
      steps: 6, interval: 2600,
      onStep(i, { forward }) {
        const ft = mode === 'ft';
        blocks.forEach(({ rect, lk }, k) => {
          const unlocked = ft && k === 4 && i >= 4;
          const frozen = i >= 1 && !unlocked;
          rect.setAttribute('class', 'box ' + (unlocked ? 'c-orange tint' : frozen ? 'frozen' : 'c-violet tint'));
          show(lk, frozen);
        });
        show(oldLock, i === 1);
        oldHead.style.transform = i >= 2 ? 'translate(0px, 70px)' : 'translate(0px, 0px)';
        show(oldHead, i < 2);
        newHead.style.transform = i >= 3 ? 'translate(0px, 0px)' : 'translate(90px, 0px)';
        show(newHead, i >= 3);
        show(lr4, ft && i >= 4); show(lrH, i >= 4); show(legend, i >= 5);
        const tag = TAGS[i];
        const lines = CODE[mode].map((l, n) => l[0] === tag ? n : -1).filter(n => n >= 0);
        setCode(pre, lines);
        if (i === 5 && forward) {
          [0, 450, 900].forEach(delay => flow(fwdPath, { color: 'var(--blue)', dur: 1400, delay }));
          [1500, 1950].forEach(delay => flow(ft ? backFT : backFE, { color: 'var(--red)', dur: ft ? 1100 : 700, delay }));
        }
        return CAPS[mode][i];
      }
    });
  }

  /* ------------------------------------------------------------------
     おまけ：Stable Diffusion（潜在空間でのノイズ除去）
     表示する「潜在表現」はノイズの減り方を見せるためのイメージで、実際の 4 チャネルの潜在表現ではない。
  ------------------------------------------------------------------ */
  /** 生成結果として見せる猫の絵（128×128 基準で描いて S に拡大縮小） */
  function drawCat(ctx, S) {
    ctx.save(); ctx.scale(S / 128, S / 128);
    const poly = (pts, color) => { ctx.fillStyle = color; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
    const ell = (x, y, rx, ry, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    const bg = ctx.createLinearGradient(0, 0, 0, 128);
    bg.addColorStop(0, '#9fd3f5'); bg.addColorStop(.64, '#dcf0fb'); bg.addColorStop(.64, '#8cc56b'); bg.addColorStop(1, '#5f9c45');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 128, 128);
    poly([[24, 60], [32, 14], [60, 40]], '#e8923f'); poly([[104, 60], [96, 14], [68, 40]], '#e8923f');
    poly([[32, 49], [35, 26], [52, 41]], '#f5b3b8'); poly([[96, 49], [93, 26], [76, 41]], '#f5b3b8');
    ell(64, 76, 44, 38, '#e8923f');
    ctx.fillStyle = '#c46f25'; [[58, 40], [64, 38], [70, 40]].forEach(([x, y]) => ctx.fillRect(x - 1.5, y, 3, 13));
    ell(64, 92, 22, 15, '#fdebd8');
    ell(46, 70, 7, 9, '#2d2a26'); ell(82, 70, 7, 9, '#2d2a26');
    ell(48, 67, 2.2, 2.6, '#ffffff'); ell(84, 67, 2.2, 2.6, '#ffffff');
    poly([[59, 84], [69, 84], [64, 90]], '#d9667a');
    ctx.strokeStyle = '#5b3b2a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(64, 90); ctx.quadraticCurveTo(60, 97, 54, 95); ctx.moveTo(64, 90); ctx.quadraticCurveTo(68, 97, 74, 95);
    [[40, 88, 14, 84], [40, 93, 14, 95], [88, 88, 114, 84], [88, 93, 114, 95]].forEach(([a, b, c, e]) => { ctx.moveTo(a, b); ctx.lineTo(c, e); });
    ctx.stroke(); ctx.restore();
  }
  function diffusionDemo() {
    const d = demo('d-diffusion'); if (!d) return;
    const host = document.getElementById('diffusion-svg');
    const W = 720, H = 172, BY = 40, BH = 56, CY = BY + BH / 2;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'プロンプトをテキストエンコーダで変換し、U-Net が潜在空間のノイズを繰り返し取り除き、VAE デコーダで画像に戻す流れの図' });
    const arr = (x1, y1, x2, y2) => {
      const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
      const line = s('path', { d: `M${x1},${y1} L${x2 - dx * 7},${y2 - dy * 7}`, class: 'wire' });
      const head = s('path', { d: dx ? `M${x2 - dx * 9},${y2 - 5} L${x2},${y2} L${x2 - dx * 9},${y2 + 5}Z` : `M${x2 - 5},${y2 - dy * 9} L${x2},${y2} L${x2 + 5},${y2 - dy * 9}Z`, class: 'wire-head' });
      const g = s('g', { class: 'arr c-orange' }, line, head); g.line = line; svg.append(g); return g;
    };
    const A = { p2t: arr(140, CY, 160, CY), t2u: arr(276, CY, 318, CY), n2u: arr(377, 122, 377, BY + BH), u2v: arr(436, CY, 474, CY), v2i: arr(578, CY, 610, CY) };
    const loop = s('path', { d: `M352,${BY} C352,${BY - 34} 402,${BY - 34} 402,${BY - 2}`, class: 'wire' });
    const loopG = s('g', { class: 'arr c-orange' }, loop, s('path', { d: `M397,${BY - 11} L402,${BY - 1} L407,${BY - 11}Z`, class: 'wire-head' }),
      s('text', { x: 412, y: 16, class: 'lbl-m', style: { fontSize: '11.5px' } }, '繰り返す（図は 8 回、実際は 20〜50 回）'));
    svg.append(loopG);
    const box = (x, y, w, hh, title, sub, cls) => {
      const rect = s('rect', { x, y, width: w, height: hh, rx: 9, class: 'box tint ' + cls });
      svg.append(rect, s('text', { x: x + w / 2, y: y + hh / 2 - 3, 'text-anchor': 'middle', class: 'lbl-b', style: { fontSize: '13px' } }, title),
        s('text', { x: x + w / 2, y: y + hh / 2 + 14, 'text-anchor': 'middle', class: 'lbl-m', style: { fontSize: '11px' } }, sub));
      return rect;
    };
    const B = {
      prompt: box(8, BY, 132, BH, 'プロンプト', '"a photo of a cat"', 'c-muted'),
      text: box(160, BY, 116, BH, 'テキスト', 'エンコーダ（CLIP）', 'c-violet'),
      unet: box(318, BY, 118, BH, 'U-Net（CNN）', 'ノイズを予測', 'c-blue'),
      vae: box(474, BY, 104, BH, 'VAE（CNN）', 'デコーダ', 'c-aqua'),
      img: box(610, BY, 102, BH, '画像', '512×512×3', 'c-orange'),
      noise: box(318, 122, 118, 42, 'ランダムなノイズ', '潜在空間 64×64×4', 'c-muted')
    };
    host.append(svg);

    // 絵と潜在表現（イメージ）
    const L = 24, K = 8, T = 1000;
    const src = document.createElement('canvas'); src.width = src.height = 256; drawCat(src.getContext('2d'), 256);
    const small = document.createElement('canvas'); small.width = small.height = L;
    const sctx = small.getContext('2d'); sctx.imageSmoothingQuality = 'high'; sctx.drawImage(src, 0, 0, L, L);
    const x0 = sctx.getImageData(0, 0, L, L).data;
    let seed = 7;
    const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const gauss = () => { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); };
    const eps = Float32Array.from({ length: L * L * 3 }, gauss);
    const latent = h('canvas', { class: 'sd-canvas', width: L, height: L, role: 'img', 'aria-label': '潜在表現（ノイズの減り方のイメージ）' });
    const lctx = latent.getContext('2d'), frame = lctx.createImageData(L, L);
    const out = h('canvas', { class: 'sd-canvas smooth', width: 256, height: 256, role: 'img', 'aria-label': '生成された猫の画像' });
    out.getContext('2d').drawImage(src, 0, 0);
    const abar = t => { const f = u => Math.cos((u + .008) / 1.008 * Math.PI / 2) ** 2; return Math.max(0, Math.min(1, f(t / T) / f(0))); };
    function drawLatent(t) {
      const a = abar(t), sa = Math.sqrt(a), sn = Math.sqrt(1 - a);
      for (let p = 0, q = 0; p < L * L; p++) {
        for (let c = 0; c < 3; c++, q++) frame.data[p * 4 + c] = Math.max(0, Math.min(255, (sa * (x0[p * 4 + c] / 127.5 - 1) + sn * eps[q] + 1) * 127.5));
        frame.data[p * 4 + 3] = 255;
      }
      lctx.putImageData(frame, 0, 0);
      return sn;
    }
    const tV = h('b', { class: 'mono' }), nV = h('b', { class: 'mono' }), meter = h('span');
    const outWrap = h('div', { class: 'sd-col sd-out' }, h('div', { class: 'sd-frame' }, out), h('div', { class: 'lbl-sm', text: 'VAE デコーダの出力（512×512 の画像）' }));
    d.stage.append(h('div', { class: 'sd-row' },
      h('div', { class: 'sd-col' }, latent, h('div', { class: 'lbl-sm', html: 'U-Net が扱う潜在表現<br>（64×64×4 を見える形にしたイメージ）' }),
        h('div', { class: 'sd-meter' }, h('span', { class: 'note' }, 't = ', tV), h('div', { class: 'meter c-red', style: { flex: 1 } }, meter), h('span', { class: 'note' }, 'ノイズ ', nV))),
      h('div', { class: 'op', text: '→' }), outWrap));
    const tOf = k => Math.round(T * (1 - k / K));
    new Player(d.root, {
      steps: K + 3, interval: 1400, holds: { 0: 2600, 1: 2400, [K + 1]: 2200 },
      onStep(i, { forward }) {
        const k = Math.max(0, i - 1), t = i === 0 ? T : tOf(Math.min(k, K));
        const sn = drawLatent(t);
        latent.style.opacity = i === 0 ? .2 : 1;
        tV.textContent = i === 0 ? '—' : t; nV.textContent = i === 0 ? '—' : Math.round(sn * 100) + '%';
        meter.style.width = (i === 0 ? 0 : sn * 100) + '%';
        outWrap.classList.toggle('on', i === K + 2);
        const hot = i === 0 ? ['prompt', 'text'] : i === 1 ? ['noise', 'unet'] : i <= K + 1 ? ['unet'] : ['vae', 'img'];
        Object.entries(B).forEach(([key, r]) => r.classList.toggle('hot', hot.includes(key)));
        const on = i === 0 ? ['p2t'] : i === 1 ? ['n2u'] : i <= K + 1 ? ['loop'] : ['u2v', 'v2i'];
        Object.entries(A).forEach(([key, a]) => a.classList.toggle('on', on.includes(key)));
        loopG.classList.toggle('on', on.includes('loop'));
        if (forward) {
          if (i === 0) flow(A.p2t.line, { color: 'var(--orange)' });
          else if (i === 1) flow(A.n2u.line, { color: 'var(--orange)' });
          else if (i <= K + 1) flow(loop, { color: 'var(--orange)', dur: 600 });
          else { flow(A.u2v.line, { color: 'var(--orange)', dur: 500 }); flow(A.v2i.line, { color: 'var(--orange)', dur: 500, delay: 500 }); }
        }
        if (i === 0) return 'プロンプトを<b>テキストエンコーダ</b>でベクトルの列（Stable Diffusion 1.x では最大 77 トークン × 768 次元）に変換します。これが U-Net への「指示書」になります。';
        if (i === 1) return '潜在空間（64×64×4）に、完全にランダムなノイズ <b>z<sub>T</sub></b>（t = 1000）を用意します。ここが出発点です。毎回違うノイズから始めるので、同じプロンプトでも毎回違う絵になります。';
        if (i === K + 2) return '最後に <b>VAE のデコーダ</b>（CNN）で、64×64×4 の潜在表現を 512×512 の画像に拡大・復元して完成です。※ 左の図はノイズの減り方を見せるためのイメージです。実際の潜在表現は 4 チャネルなので、そのままでは画像として見えません。';
        return `ステップ ${k}/${K}（t = ${t}）：<b>U-Net</b> が、いまの潜在表現に含まれるノイズを予測し、その一部を取り除きます。プロンプトの情報は毎ステップ参照されます。` + (k === K ? '<br>ノイズを取り除き終えました。ただし、これはまだ小さな潜在表現です。' : '');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    [flattenDemo, paramsDemo, shiftDemo, convDemo, channelsDemo, hierarchyDemo, poolDemo, pipelineDemo, modelsDemo, residualDemo, tasksDemo, transferDemo, diffusionDemo]
      .forEach(fn => { try { fn(); } catch (e) { console.error(`[${fn.name}]`, e); } });
  });
})();
