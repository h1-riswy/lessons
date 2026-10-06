/* 第6章 RNN・LSTM・GRU — アニメーション図解
   各デモは HTML 側の .demo（id 指定）に中身を組み立てる。「記憶の割合」などイメージ図の値はその旨を明記している。 */
(() => {
  'use strict';
  const { h, s, Player, demo, flow, countUp, segmented, slider, fmt, onVisible, clamp } = window.DL;
  const show = (el, on) => { el.style.opacity = on ? 1 : 0; };
  const WORD_COLORS = ['var(--blue)', 'var(--orange)', 'var(--aqua)', 'var(--yellow)', 'var(--magenta)'];

  /* ---------- SVG 部品 ---------- */
  /** 軸に沿った矢印（線＋矢じり）。class に c-xxx を付けると on 時の色になる */
  function arrow(x1, y1, x2, y2, cls = '') {
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    const line = s('path', { d: `M${x1},${y1} L${x2 - dx * 7},${y2 - dy * 7}`, class: 'wire' });
    const head = s('path', { d: dx ? `M${x2 - dx * 9},${y2 - 5} L${x2},${y2} L${x2 - dx * 9},${y2 + 5}Z` : `M${x2 - 5},${y2 - dy * 9} L${x2},${y2} L${x2 + 5},${y2 - dy * 9}Z`, class: 'wire-head' });
    const g = s('g', { class: 'arr ' + cls }, line, head);
    g.line = line;
    return g;
  }
  /** 配線（背景色の縁取り付き。交差しても前後関係が読める） */
  function wire(parent, d, cls = '', halo = false) {
    const line = s('path', { d, class: 'wire ' + cls });
    if (halo) parent.append(s('path', { d, class: 'halo' }));
    parent.append(line);
    return line;
  }
  function node(parent, x, y, sym, r = 13) {
    const g = s('g', { class: 'node' }, s('circle', { cx: x, cy: y, r }), s('text', { x, y: y + 5, 'text-anchor': 'middle' }, sym));
    parent.append(g); return g;
  }
  function gate(parent, x, y, label, cls, w = 50) {
    const rect = s('rect', { x: x - w / 2, y: y - 15, width: w, height: 30, rx: 7, class: 'gate ' + cls });
    const g = s('g', {}, rect, s('text', { x, y: y + 5, 'text-anchor': 'middle', class: 'lbl-b', style: { fontSize: '13px' } }, label));
    parent.append(g); g.rect = rect; return g;
  }
  /** 数値チップ */
  function vchip(parent, x, y, text, anchor = 'start') {
    const w = [...text].length * 7.3 + 14;
    const rx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    const g = s('g', { class: 'fade vchip', style: { opacity: 0 } }, s('rect', { x: rx, y: y - 13, width: w, height: 21, rx: 6 }), s('text', { x: rx + 7, y: y + 2, class: 'lbl-mono' }, text));
    parent.append(g); return g;
  }
  /** 式パネル。tex は TeX 記法（KaTeX で描画される） */
  function eqPanel(host, rows) {
    return rows.map(([tex, desc, c]) => {
      const el = h('div', { class: 'eq-row ' + (c || '') }, h('span', { class: 'swatch' }), h('span', { class: 'm', text: tex }), h('span', { class: 'eq-desc', text: desc }));
      host.append(el); return el;
    });
  }
  const tokBox = (x, y, text, color, w) => {
    w = w || Math.max(46, [...text].length * (/[^\x00-\x7f]/.test(text) ? 14 : 8.5) + 18);
    const rect = s('rect', { x: x - w / 2, y, width: w, height: 28, rx: 7, class: 'tok-box', style: { '--c': color || 'var(--muted)' } });
    const label = s('text', { x, y: y + 19, 'text-anchor': 'middle', class: 'lbl', style: { fontSize: '13px' } }, text);
    const g = s('g', { class: 'fade' }, rect, label); g.rect = rect; g.label = label; return g;
  };

  /* ------------------------------------------------------------------
     導入：語順で意味が変わる
  ------------------------------------------------------------------ */
  function orderDemo() {
    const d = demo('d-order'); if (!d) return;
    const words = ['犬', 'が', '人', 'を', '噛んだ'];
    const toks = words.map(w => h('span', { class: 'token', text: w }));
    const sent = h('div', { class: 'row', style: { gap: '8px', justifyContent: 'flex-start' } }, toks);
    const bag = h('div', { class: 'row', style: { gap: '6px', justifyContent: 'flex-start' } }, [...words].sort().map(w => h('span', { class: 'token', style: { fontSize: '.8rem', padding: '2px 8px' }, text: w })));
    const meaning = h('div', { class: 'stat', style: { flex: 1 } });
    d.stage.append(h('div', { class: 'order-grid' },
      h('div', { class: 'lbl-sm', text: '文' }), sent,
      h('div', { class: 'lbl-sm', text: '単語の集合' }), h('div', { class: 'row', style: { justifyContent: 'flex-start', gap: '10px' } }, bag, h('span', { class: 'note', text: '← 並べ替えても変わらない' })),
      h('div', { class: 'lbl-sm', text: '意味' }), meaning));
    new Player(d.root, {
      steps: 2, interval: 2600,
      onStep(i) {
        const dx = toks[2].offsetLeft - toks[0].offsetLeft;
        toks[0].style.transform = i ? `translateX(${dx}px)` : ''; toks[2].style.transform = i ? `translateX(${-dx}px)` : '';
        toks[0].classList.toggle('cur', i === 1); toks[2].classList.toggle('cur', i === 1);
        meaning.innerHTML = i
          ? '<div class="k">人が犬を噛んだ</div><div class="v" style="font-size:1rem">噛んだのは<b>人</b>、噛まれたのは<b>犬</b></div>'
          : '<div class="k">犬が人を噛んだ</div><div class="v" style="font-size:1rem">噛んだのは<b>犬</b>、噛まれたのは<b>人</b></div>';
        return i ? '「犬」と「人」を入れ替えると、単語の集合は同じなのに<b>意味は正反対</b>になりました。順番そのものが情報なのです。' : '「犬が人を噛んだ」。▶ で 2 つの単語の順番を入れ替えます。';
      }
    });
  }

  /* ------------------------------------------------------------------
     6.1 RNN の展開と 1 ステップの計算
  ------------------------------------------------------------------ */
  function unrollDemo() {
    const d = demo('d-unroll'); if (!d) return;
    const W = 720, H = 350, CX = [120, 280, 440, 600], MID = 360, CY = 182, CW = 110;
    const WORDS = ['I', 'love', 'deep', 'learning'], DECAY = .6;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'ループ構造の RNN を 4 時刻分に展開し、単語を 1 つずつ読んで隠れ状態を更新していく図' });
    // 展開後の横矢印（隠れ状態の受け渡し）
    const hArrows = [], hLabels = [];
    const hx = [[20, CX[0] - CW / 2 - 2]].concat(CX.slice(0, 3).map((x, t) => [x + CW / 2 + 2, CX[t + 1] - CW / 2 - 2]), [[CX[3] + CW / 2 + 2, W - 6]]);
    hx.forEach(([a, b], t) => {
      const ar = arrow(a, CY, b, CY, 'c-violet fade'); hArrows.push(ar); svg.append(ar);
      const lb = s('text', { x: (a + b) / 2, y: CY - 10, 'text-anchor': 'middle', class: 'lbl-m lbl-mono fade', style: { fontSize: '12px' } }, t === 0 ? 'h₀=0' : `h${'₀₁₂₃₄'[t]}`);
      hLabels.push(lb); svg.append(lb);
    });
    // 入力・出力（展開後）
    const ins = [], outs = [], toks = [];
    CX.forEach((x, t) => {
      const ia = arrow(x, 290, x, 216, 'fade'); ia.style.setProperty('--c', WORD_COLORS[t]); ia.classList.add('colored'); ins.push(ia);
      const oa = arrow(x, 148, x, 98, 'c-violet fade'); outs.push(oa);
      const tk = tokBox(x, 292, WORDS[t], WORD_COLORS[t], 84); toks.push(tk);
      const ot = s('text', { x, y: 88, 'text-anchor': 'middle', class: 'lbl-b lbl-mono fade', style: { fontSize: '13px' } }, `y${'₁₂₃₄'[t]}`); oa.label = ot;
      svg.append(ia, oa, tk, ot);
    });
    // 折りたたみ時の表示
    const folded = s('g', { class: 'fade' },
      s('path', { d: `M${MID + 55},166 C${MID + 112},148 ${MID + 112},216 ${MID + 62},199`, class: 'wire', style: { stroke: 'var(--violet)', opacity: 1, strokeWidth: 2.5 } }),
      s('path', { d: `M${MID + 70},194 L${MID + 57},199 L${MID + 68},207Z`, style: { fill: 'var(--violet)' } }),
      s('text', { x: MID + 112, y: 186, class: 'lbl-b lbl-mono' }, 'h'),
      s('text', { x: MID + 94, y: 238, class: 'lbl-m', style: { fontSize: '11.5px' } }, '記憶を次の自分へ戻す'),
      arrow(MID, 290, MID, 216), s('text', { x: MID, y: 312, 'text-anchor': 'middle', class: 'lbl-b lbl-mono' }, 'xₜ'),
      arrow(MID, 148, MID, 98), s('text', { x: MID, y: 88, 'text-anchor': 'middle', class: 'lbl-b lbl-mono' }, 'yₜ'));
    folded.querySelectorAll('.arr').forEach(a => a.classList.add('on', 'c-muted'));
    // セル
    const cells = CX.map((x, t) => {
      const rect = s('rect', { x: x - CW / 2, y: 150, width: CW, height: 64, rx: 12, class: 'box c-violet tint' });
      const bar = s('g');
      const g = s('g', { class: 'move' }, rect,
        s('text', { x: x - 4, y: 174, 'text-anchor': 'middle', class: 'lbl-b', style: { fontSize: '13px' } }, 'RNN'),
        s('circle', { cx: x + 40, cy: 168, r: 10, class: 'wbadge' }), s('text', { x: x + 40, y: 172, 'text-anchor': 'middle', class: 'lbl-b', style: { fontSize: '10.5px' } }, 'W'),
        s('rect', { x: x - 45, y: 188, width: 90, height: 14, rx: 3, style: { fill: 'var(--track)' } }), bar);
      svg.append(g);
      return { g, rect, bar, x };
    });
    svg.append(folded);
    d.stage.append(svg);
    const comp = t => { const raw = [...Array(t + 1)].map((_, k) => Math.pow(DECAY, t - k)); const sum = raw.reduce((a, b) => a + b, 0); return raw.map(v => v / sum); };
    function drawBar(cell, t) {
      cell.bar.replaceChildren();
      if (t < 0) return;
      let x = cell.x - 45;
      comp(t).forEach((p, k) => { const w = p * 90; cell.bar.append(s('rect', { x: x + .5, y: 188, width: Math.max(0, w - 1), height: 14, rx: 2, style: { fill: WORD_COLORS[k] } })); x += w; });
    }
    const legend = h('div', { class: 'legend', style: { justifyContent: 'center' } }, WORDS.map((w, k) => h('span', {}, h('span', { class: 'swatch', style: { '--c': WORD_COLORS[k] } }), `"${w}"`)), h('span', { text: '— セル内の帯：記憶に占める各単語の割合（イメージ）' }));
    d.stage.append(legend);
    new Player(d.root, {
      steps: 7, interval: 2400, holds: { 0: 2600, 1: 2800 },
      onStep(i, { forward }) {
        const unrolled = i >= 1, t = i - 2;
        cells.forEach((c, k) => {
          c.g.style.transform = unrolled ? 'translate(0px, 0px)' : `translate(${MID - c.x}px, 0px)`;
          show(c.g, unrolled || k === 0);
          c.rect.classList.toggle('hot', k === t);
          drawBar(c, i >= 2 ? (k <= t || i === 6 ? k : -1) : -1);
        });
        show(folded, !unrolled);
        hArrows.forEach((a, k) => { show(a, unrolled); a.classList.toggle('on', k === t); });
        hLabels.forEach(l => show(l, unrolled));
        toks.forEach((tk, k) => { show(tk, unrolled); tk.style.opacity = !unrolled ? 0 : (i >= 2 && i < 6 && k > t) ? .4 : 1; tk.rect.classList.toggle('hot', k === t); });
        ins.forEach((a, k) => { show(a, unrolled); a.classList.toggle('on', k === t); });
        outs.forEach((a, k) => { const vis = i >= 2 && (k <= t || i === 6); show(a, vis); show(a.label, vis); a.classList.toggle('on', k === t); });
        if (forward && t >= 0 && t < 4) {
          flow(ins[t].line, { color: WORD_COLORS[t], dur: 650 });
          flow(hArrows[t].line, { color: 'var(--violet)', dur: 650 });
          flow(outs[t].line, { color: 'var(--violet)', dur: 500, delay: 650 });
        }
        if (i === 0) return 'RNN のセルは 1 つだけ。出力した記憶 <b>h</b> を、次の時刻の自分への入力として戻します（ループ）。▶ で時間方向に展開します。';
        if (i === 1) return '時間方向に<b>展開</b>すると 4 つのセルが並びますが、実体は同じ 1 つのセルです。右上の <b>W</b> はどれも同じ重み（W<sub>x</sub>, W<sub>h</sub> を全時刻で共有）です。';
        if (i === 6) return '4 語を読み終えました。最後の h₄ には全単語の情報が入っていますが、<b>古い単語ほど割合が小さい</b>ことに注目してください。これが次節の「勾配消失」「長期依存」の問題につながります。';
        return `<b>"${WORDS[t]}"</b> を読む：h<sub>${t + 1}</sub> = tanh(W<sub>x</sub>·x<sub>${t + 1}</sub> ＋ W<sub>h</sub>·h<sub>${t}</sub> ＋ b)。` + (t === 0 ? '最初の記憶 h₀ は 0 です。' : '前の記憶に新しい単語を混ぜて、記憶を更新します。');
      }
    });
  }

  /* ------------------------------------------------------------------
     6.1 入出力パターン
  ------------------------------------------------------------------ */
  function patternsDemo() {
    const d = demo('d-patterns'); if (!d) return;
    const W = 640, H = 262, CX = [110, 250, 390, 530], CY = 131;
    const PAT = {
      m2o: { name: 'many-to-one', task: '感情分析：文 → ポジティブ / ネガティブ', ins: ['この', '映画', '最高', '！'], outs: [null, null, null, 'ポジティブ'], desc: '系列全体を読んでから、最後に 1 つだけ出力します。' },
      o2m: { name: 'one-to-many', task: '画像キャプション生成：画像 → 文', ins: ['画像', null, null, null], outs: ['猫', 'が', '寝て', 'いる'], desc: '1 つの入力から、系列を生成します。' },
      m2m: { name: 'many-to-many', task: '品詞タグ付け：各単語 → 品詞', ins: ['I', 'love', 'deep', 'learning'], outs: ['代名詞', '動詞', '形容詞', '名詞'], desc: '各時刻に入力があり、各時刻で出力します。' }
    };
    let key = 'm2o', player, E;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'RNN の入出力パターン（many-to-one, one-to-many, many-to-many）の図' });
    d.stage.append(svg);
    function build() {
      const P = PAT[key];
      svg.replaceChildren();
      const hA = [], inA = [], outA = [], inT = [], outT = [], cells = [];
      CX.forEach((x, t) => {
        if (t > 0) { const a = arrow(CX[t - 1] + 46, CY, x - 46, CY, 'c-violet'); hA[t] = a; svg.append(a); }
        const rect = s('rect', { x: x - 45, y: CY - 22, width: 90, height: 44, rx: 10, class: 'box c-violet tint' });
        cells.push(rect); svg.append(rect, s('text', { x, y: CY + 5, 'text-anchor': 'middle', class: 'lbl-b', style: { fontSize: '13px' } }, 'RNN'));
        if (P.ins[t]) { const a = arrow(x, 220, x, CY + 24, 'c-blue'); inA[t] = a; const tk = tokBox(x, 222, P.ins[t], 'var(--blue)'); inT[t] = tk; svg.append(a, tk); }
        if (P.outs[t]) { const a = arrow(x, CY - 24, x, 48, 'c-orange'); outA[t] = a; const tk = tokBox(x, 14, P.outs[t], 'var(--orange)'); outT[t] = tk; svg.append(a, tk); }
      });
      return { P, hA, inA, outA, inT, outT, cells };
    }
    d.options.append(segmented({ label: 'パターン', options: Object.entries(PAT).map(([k, v]) => [k, v.name]), value: key, onChange: v => { key = v; E = build(); player.setSteps(5); } }));
    E = build();
    player = new Player(d.root, {
      steps: 5, interval: 1500, holds: { 0: 1800 },
      onStep(i, { forward }) {
        const t = i - 1, { P, hA, inA, outA, inT, outT, cells } = E;
        cells.forEach((c, k) => c.classList.toggle('hot', k === t));
        inT.forEach((tk, k) => tk && show(tk, true));
        inA.forEach((a, k) => a && a.classList.toggle('on', k === t));
        hA.forEach((a, k) => a && a.classList.toggle('on', k === t));
        outA.forEach((a, k) => { if (!a) return; const vis = i > 0 && k <= t; show(a, vis); show(outT[k], vis); a.classList.toggle('on', k === t); });
        if (forward && t >= 0) {
          if (inA[t]) flow(inA[t].line, { color: 'var(--blue)', dur: 550 });
          if (hA[t]) flow(hA[t].line, { color: 'var(--violet)', dur: 550 });
          if (outA[t]) flow(outA[t].line, { color: 'var(--orange)', dur: 450, delay: 550 });
        }
        if (i === 0) return `<b>${P.name}</b>：${P.desc}`;
        if (i === 4) return `<b>${P.name}</b> の例 — ${P.task}`;
        return `時刻 ${i}：${P.ins[t] ? `入力「${P.ins[t]}」と` : '入力はなく、'}前の記憶から新しい記憶を作ります。${P.outs[t] ? `この時刻で「${P.outs[t]}」を出力。` : 'この時刻では出力しません。'}`;
      }
    });
  }

  /* ------------------------------------------------------------------
     6.2 BPTT：勾配消失・爆発
  ------------------------------------------------------------------ */
  function bpttDemo() {
    const d = demo('d-bptt'); if (!d) return;
    const K = 50, CLIP = 5;
    let w = .9, clip = false, player;
    const W = 700, H = 262, X0 = 66, X1 = 690, YT = 18, YB = 214, YC = (YT + YB) / 2;
    const yv = v => YC - clamp(Math.log10(v), -3, 3) * (YC - YT) / 3;
    const slot = (X1 - X0) / (K + 1);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '時間をさかのぼるにつれて勾配が倍率 w の累乗で変化する様子を対数目盛りで示すグラフ' });
    for (let e = -3; e <= 3; e++) {
      const y = yv(Math.pow(10, e));
      svg.append(s('line', { x1: X0, x2: X1, y1: y, y2: y, style: { stroke: e === 0 ? 'var(--muted)' : 'var(--line)', strokeWidth: e === 0 ? 1.5 : 1 } }),
        s('text', { x: X0 - 8, y: y + 4, 'text-anchor': 'end', class: 'lbl-m lbl-mono', style: { fontSize: '11px' } }, ['0.001', '0.01', '0.1', '1', '10', '100', '1000'][e + 3]));
    }
    svg.append(s('text', { x: X0 + 8, y: YT + 14, class: 'lbl-m', style: { fontSize: '11.5px' } }, '爆発（1 より大きい）'),
      s('text', { x: X0 + 8, y: YB - 6, class: 'lbl-m', style: { fontSize: '11.5px' } }, '消失（1 より小さい）'));
    [0, 10, 20, 30, 40, 50].forEach(k => svg.append(s('text', { x: X1 - (k + .5) * slot, y: YB + 18, 'text-anchor': 'middle', class: 'lbl-m lbl-mono', style: { fontSize: '11px' } }, k)));
    svg.append(s('text', { x: (X0 + X1) / 2, y: H - 6, 'text-anchor': 'middle', class: 'lbl-m', style: { fontSize: '11.5px' } }, '← さかのぼったステップ数 k（右端 0 ＝ 損失を計算した時刻）'));
    const clipLine = s('g', { class: 'fade' }, s('line', { x1: X0, x2: X1, y1: yv(CLIP), y2: yv(CLIP), style: { stroke: 'var(--orange)', strokeWidth: 2 } }),
      s('text', { x: X1, y: yv(CLIP) - 6, 'text-anchor': 'end', class: 'lbl-b', style: { fontSize: '11.5px' } }, 'クリッピング上限'));
    const bars = [...Array(K + 1)].map((_, k) => { const r = s('rect', { x: X1 - (k + 1) * slot + 2, width: slot - 4, rx: 2, class: 'fade', style: { fill: 'var(--red)' } }); const over = s('path', { class: 'fade', style: { fill: 'var(--red)' } }); svg.append(r, over); return { r, over, k }; });
    svg.append(clipLine);
    const valOf = k => { let v = Math.pow(w, k); if (clip) v = Math.min(v, CLIP); return v; };
    function drawBars() {
      bars.forEach(({ r, over, k }) => {
        const v = valOf(k), y = yv(v);
        r.setAttribute('y', Math.min(y, YC)); r.setAttribute('height', Math.max(1.5, Math.abs(YC - y)));
        const cx = X1 - (k + .5) * slot, lg = Math.log10(v);
        over.setAttribute('d', lg > 3 ? `M${cx - 5},${YT + 2} L${cx},${YT - 6} L${cx + 5},${YT + 2}Z` : lg < -3 ? `M${cx - 5},${YB - 2} L${cx},${YB + 6} L${cx + 5},${YB - 2}Z` : '');
      });
      show(clipLine, clip);
    }
    const sci = v => {
      if (v >= 1e4 || v < 1e-3) { const e = Math.floor(Math.log10(v)); return `${(v / Math.pow(10, e)).toFixed(1)}×10<sup>${e}</sup>`; }
      return v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toPrecision(2);
    };
    const tW = h('div', { class: 'v' }), tV = h('div', { class: 'v' }), tS = h('div', { class: 'v', style: { fontSize: '1rem' } });
    const sl = slider({ label: '1 ステップあたりの倍率 w', min: .5, max: 1.5, step: .01, value: w, format: v => v.toFixed(2), onInput: v => { w = v; update(); } });
    const preset = (v, label) => h('button', { type: 'button', class: 'btn', onclick: () => { w = v; sl.set(v); update(); player.touched = true; player.pause(); player.go(10); } }, label);
    d.options.append(sl, preset(.9, '0.9'), preset(1, '1.0'), preset(1.1, '1.1'),
      segmented({ label: 'クリッピング', options: [[false, 'オフ'], [true, 'オン']], value: false, onChange: v => { clip = v; update(); } }));
    d.stage.append(h('div', { class: 'svg-stage hscroll', style: { '--minw': '520px' } }, svg),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('div', { class: 'k' }, '倍率 w'), tW, h('div', { class: 'd', text: '1 ステップさかのぼるごとに掛かる' })),
        h('div', { class: 'stat' }, h('div', { class: 'k' }, '50 ステップ前に届く勾配'), tV, h('div', { class: 'd', html: 'w<sup>50</sup>（クリッピング時は上限あり）' })),
        h('div', { class: 'stat' }, h('div', { class: 'k' }, '学習への影響'), tS, h('div', { class: 'd', text: '遠い過去のパラメータの更新' }))));
    function update() {
      drawBars();
      const v50 = valOf(50);
      tW.textContent = w.toFixed(2); tV.innerHTML = sci(v50);
      tS.textContent = clip && Math.pow(w, 50) > CLIP ? '上限で抑えられ、発散しない' : v50 < .01 ? 'ほぼ 0：更新されない（消失）' : v50 > 100 ? '巨大：NaN の危険（爆発）' : 'ほぼ保たれる';
      player?.refresh();
    }
    player = new Player(d.root, {
      steps: 11, interval: 650, holds: { 0: 1600 },
      onStep(i) {
        bars.forEach(({ r, over, k }) => { const vis = k <= i * 5; show(r, vis); show(over, vis); });
        const k = i * 5;
        if (i === 0) return '右端（k = 0）で計算した損失の勾配 1 を、時間をさかのぼって伝えていきます。1 ステップ戻るごとに、同じ重みの影響（倍率 w）が掛け算されます。';
        const tail = i === 10 ? (valOf(50) < .01 ? '<br>50 ステップ前にはほぼ何も届きません（<b>勾配消失</b>）。w を 1.1 にすると逆に発散します。' : valOf(50) > 100 ? '<br>勾配が発散しました（<b>勾配爆発</b>）。「クリッピング」をオンにしてみましょう。' : '<br>w がちょうど 1 付近なら保たれますが、学習中にこの状態を保つのは困難です。') : '';
        return `${k} ステップ前まで戻りました：w<sup>${k}</sup> = <b>${sci(valOf(k))}</b>${tail}`;
      }
    });
    update();
  }

  /* ------------------------------------------------------------------
     6.2 長期依存：「フランス」の記憶
  ------------------------------------------------------------------ */
  function longdepDemo() {
    const d = demo('d-longdep'); if (!d) return;
    let model = 'rnn', player;
    const A = ['私', 'は', 'フランス', 'で', '生まれ育ち', '、', 'そこ', 'での', '生活', 'は'];
    const C = ['だから', '私', 'は', '流暢な', '＿＿＿', 'を', '話す'];
    const FILL = 50;
    const aT = A.map(w => h('span', { class: 'token', text: w })), cT = C.map(w => h('span', { class: 'token', text: w }));
    const key = aT[2], blank = cT[4];
    const dots = [...Array(FILL)].map(() => h('span'));
    const meterFill = h('span'), meterVal = h('b'), meterNote = h('span', { class: 'note' });
    d.options.append(segmented({ label: 'モデル', options: [['rnn', '素の RNN'], ['lstm', 'LSTM']], value: 'rnn', onChange: v => { model = v; player.refresh(); } }));
    d.stage.append(
      h('div', { class: 'sent' }, aT, h('span', { class: 'dots', title: '中略（約 50 単語）' }, dots), cT),
      h('div', { class: 'lbl-sm', style: { textAlign: 'left', marginTop: '4px' }, text: '点々は間にある約 50 単語を表します' }),
      h('div', { class: 'stat', style: { marginTop: '14px' } },
        h('div', { class: 'k' }, '「フランス」の記憶の強さ（イメージ）'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, h('div', { class: 'meter c-orange', style: { flex: 1 } }, meterFill), meterVal),
        meterNote));
    const STEPS = [[0, 0, 0], [2, 0, 0], [3, 0, 0], [6, 0, 0], [10, 0, 0], [10, 10, 0], [10, 20, 0], [10, 30, 0], [10, 40, 0], [10, 50, 0], [10, 50, 4], [10, 50, 4]];
    player = new Player(d.root, {
      steps: STEPS.length, interval: 1300, holds: { 0: 2400, 2: 2000, 10: 1800 },
      onStep(i) {
        const [a, f, c] = STEPS[i];
        const dist = a >= 3 ? (a - 3) + f + c : -1;
        const m = dist < 0 ? 0 : Math.pow(model === 'rnn' ? .85 : .995, dist);
        aT.forEach((t, k) => t.style.opacity = k < a ? 1 : .35);
        dots.forEach((t, k) => t.classList.toggle('on', k < f));
        cT.forEach((t, k) => t.style.opacity = k < c ? 1 : .35);
        key.style.background = `color-mix(in srgb, var(--orange) ${Math.round(m * 60)}%, var(--paper))`;
        key.style.borderColor = dist >= 0 ? 'var(--orange)' : '';
        const done = i === STEPS.length - 1;
        blank.textContent = done ? (model === 'rnn' ? '？？？' : 'フランス語') : '＿＿＿';
        blank.style.opacity = done ? 1 : .35;
        blank.classList.toggle('cur', done);
        meterFill.style.width = (m * 100) + '%';
        meterVal.textContent = dist < 0 ? '—' : (m * 100 < 1 && m > 0 ? '< 1' : Math.round(m * 100)) + '%';
        meterNote.textContent = model === 'rnn' ? '素の RNN：毎ステップ新しい単語で記憶が上書きされ、急速に薄れる' : 'LSTM：忘却ゲートがほぼ 1 のまま、セル状態に保持し続ける';
        if (i === 0) return '文を 1 語ずつ読み進めます。最後の空欄を埋めるには、<b>文頭近くの「フランス」を最後まで覚えておく</b>必要があります。';
        if (i === 2) return '「フランス」を読みました。この時点の記憶の強さは 100%。';
        if (done) return model === 'rnn'
          ? '空欄の予測：手がかりの「フランス」がほぼ消えているため、<b>正しく予測できません</b>。学習時も、この位置の誤差が「フランス」まで届かない（勾配消失）ので、関係性を学べません。'
          : '空欄の予測：セル状態に残っていた「フランス」を手がかりに、<b>「フランス語」</b>と予測できます。';
        if (dist > 0) return `「フランス」から ${dist} 語進みました。記憶の強さは ${meterVal.textContent}。` + (model === 'rnn' ? ' 素の RNN では、古い情報が指数的に薄れていきます。' : ' LSTM は必要な情報をセル状態に残し続けます。');
        return '文を読み進めています。';
      }
    });
  }

  /* ------------------------------------------------------------------
     6.3 LSTM セル
  ------------------------------------------------------------------ */
  function lstmDemo() {
    const d = demo('d-lstm'); if (!d) return;
    const host = document.getElementById('lstm-svg'), eqHost = document.getElementById('lstm-eqs');
    const svg = s('svg', { viewBox: '0 0 720 370', role: 'img', 'aria-label': 'LSTM セルの内部構造。セル状態の上を情報が流れ、忘却・入力・出力ゲートが通す量を調整する図' });
    svg.append(s('rect', { x: 110, y: 48, width: 500, height: 272, rx: 18, class: 'cellbox' }));
    const P = {};
    const L = svg; // 配線は描画順が重要：配線 → ノード/ゲート
    P.cin = wire(L, 'M20,96 H186', 'c-aqua'); P.c1 = wire(L, 'M214,96 H326', 'c-aqua'); P.cout = wire(L, 'M354,96 H700', 'c-aqua');
    P.hin = wire(L, 'M20,290 H150', 'c-violet'); P.xin = wire(L, 'M150,356 V290', 'c-violet'); P.bus = wire(L, 'M150,290 H480', 'c-violet');
    P.tf = wire(L, 'M200,290 V225', 'c-orange'); P.ti = wire(L, 'M290,290 V225', 'c-blue'); P.tg = wire(L, 'M390,290 V225', 'c-yellow'); P.to = wire(L, 'M480,290 V225', 'c-magenta');
    P.fx = wire(L, 'M200,195 V110', 'c-orange');
    P.ix = wire(L, 'M290,195 V150 H326', 'c-blue'); P.gx = wire(L, 'M390,195 V150 H354', 'c-yellow'); P.xplus = wire(L, 'M340,136 V110', 'c-blue');
    P.ct = wire(L, 'M560,96 V137', 'c-aqua'); P.tanhx = wire(L, 'M560,163 V196', 'c-aqua'); P.ox = wire(L, 'M505,210 H546', 'c-magenta');
    P.hout = wire(L, 'M560,224 V290 H700', 'c-violet'); P.hup = wire(L, 'M640,290 V16', 'c-violet', true);
    node(L, 200, 96, '×'); node(L, 340, 96, '+'); node(L, 340, 150, '×'); node(L, 560, 210, '×');
    const G = { f: gate(L, 200, 210, 'σ', 'c-orange'), i: gate(L, 290, 210, 'σ', 'c-blue'), g: gate(L, 390, 210, 'tanh', 'c-yellow'), o: gate(L, 480, 210, 'σ', 'c-magenta'), c: gate(L, 560, 150, 'tanh', 'c-aqua', 52) };
    [['忘却 f', 194], ['入力 i', 284], ['候補 g̃', 384], ['出力 o', 474]].forEach(([t, x]) => L.append(s('text', { x, y: 266, 'text-anchor': 'end', class: 'lbl-m', style: { fontSize: '11.5px' } }, t)));
    [['Cₜ₋₁', 22, 86, 'start'], ['Cₜ', 698, 86, 'end'], ['hₜ₋₁', 22, 280, 'start'], ['hₜ', 698, 280, 'end'], ['xₜ', 160, 352, 'start'], ['hₜ（出力）', 650, 22, 'start']].forEach(([t, x, y, a]) => L.append(s('text', { x, y, 'text-anchor': a, class: 'lbl-b lbl-mono' }, t)));
    L.append(s('text', { x: 476, y: 82, 'text-anchor': 'middle', class: 'lbl-m', style: { fontSize: '11.5px' } }, 'セル状態 C（長期記憶のベルトコンベア）'));
    const V = { Cp: .8, f: .1, i: .9, g: -.7, o: .9 };
    V.C = V.f * V.Cp + V.i * V.g; V.tc = Math.tanh(V.C); V.h = V.o * V.tc;
    const n2 = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
    const CH = {
      f: vchip(L, 194, 168, `f = ${n2(V.f)}`, 'end'),
      fc: vchip(L, 257, 74, `${V.Cp}×${V.f} = ${n2(V.f * V.Cp)}`, 'middle'),
      i: vchip(L, 284, 176, `i = ${n2(V.i)}`, 'end'),
      g: vchip(L, 398, 176, `g̃ = ${n2(V.g)}`),
      ig: vchip(L, 348, 130, `i×g̃ = ${n2(V.i * V.g)}`),
      C: vchip(L, 480, 118, `Cₜ = ${n2(V.f * V.Cp)} + (${n2(V.i * V.g)}) = ${n2(V.C)}`, 'middle'),
      o: vchip(L, 500, 236, `o = ${n2(V.o)}`),
      tc: vchip(L, 532, 150, `tanh(Cₜ) = ${n2(V.tc)}`, 'end'),
      h: vchip(L, 606, 316, `hₜ = ${n2(V.h)}`)
    };
    host.append(svg);
    const EQ = eqPanel(eqHost, [
      ['f_t = \\sigma(W_f [h_{t-1}, x_t] + b_f)', '忘却ゲート：古い記憶をどれだけ残すか', 'c-orange'],
      ['i_t = \\sigma(W_i [h_{t-1}, x_t] + b_i)', '入力ゲート：新しい情報をどれだけ書き込むか', 'c-blue'],
      ['\\tilde{g}_t = \\tanh(W_g [h_{t-1}, x_t] + b_g)', '書き込む内容の候補', 'c-yellow'],
      ['C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{g}_t', 'セル状態の更新（掛け算と足し算だけ）', 'c-aqua'],
      ['o_t = \\sigma(W_o [h_{t-1}, x_t] + b_o)', '出力ゲート：記憶のどこを出力に使うか', 'c-magenta'],
      ['h_t = o_t \\odot \\tanh(C_t)', '出力（次の時刻への短期記憶）', 'c-violet']
    ]);
    const STEPS = [
      { on: [], gates: [], chips: [], eq: [], cap: '上の太い線が<b>セル状態 C</b>（長期記憶のベルトコンベア）、下の線が<b>隠れ状態 h</b>（短期記憶・出力）です。σ のゲートは 0〜1 の値を出し、掛け算（×）で「どれだけ通すか」を決めます。' },
      { on: ['hin', 'xin', 'bus', 'tf', 'ti', 'tg', 'to'], gates: [], chips: [], eq: [0, 1, 2, 4], flows: [['hin', 'var(--violet)'], ['xin', 'var(--violet)'], ['tf', 'var(--orange)', 600], ['ti', 'var(--blue)', 600], ['tg', 'var(--yellow)', 600], ['to', 'var(--magenta)', 600]], cap: '前の出力 h<sub>t−1</sub> と新しい入力 x<sub>t</sub>（例：新しい主語 "dogs"）をまとめて、4 つの小さなネットワーク（3 つのゲートと候補）に入れます。' },
      { on: ['cin', 'fx', 'c1'], gates: ['f'], chips: ['f', 'fc'], eq: [0], flows: [['fx', 'var(--orange)'], ['cin', 'var(--aqua)'], ['c1', 'var(--aqua)', 650]], cap: '<b>忘却ゲート</b> f = 0.10：古い記憶「主語は単数」（C<sub>t−1</sub> = 0.8）の 9 割を捨て、0.08 だけ残します。' },
      { on: ['ix', 'gx', 'xplus'], gates: ['i', 'g'], chips: ['i', 'g', 'ig'], eq: [1, 2], flows: [['ix', 'var(--blue)'], ['gx', 'var(--yellow)'], ['xplus', 'var(--blue)', 650]], cap: '<b>候補</b> g̃ = −0.70（「主語は複数」という新情報）を、<b>入力ゲート</b> i = 0.90 でほぼ全開にして書き込みます：0.9 × (−0.7) = −0.63。' },
      { on: ['c1', 'xplus', 'cout'], gates: [], chips: ['C'], eq: [3], flows: [['cout', 'var(--aqua)', 900]], cap: 'C<sub>t</sub> = 0.08 + (−0.63) = <b>−0.55</b>。セル状態の更新は<b>掛け算と足し算だけ</b>。f が 1 に近い限り、情報も勾配もほぼそのまま次の時刻へ運ばれます。' },
      { on: ['ct', 'tanhx', 'ox', 'to', 'hout', 'hup'], gates: ['o', 'c'], chips: ['o', 'tc', 'h'], eq: [4, 5], flows: [['ct', 'var(--aqua)'], ['tanhx', 'var(--aqua)', 500, 450], ['ox', 'var(--magenta)'], ['hout', 'var(--violet)', 700, 900], ['hup', 'var(--violet)', 700, 900]], cap: '<b>出力ゲート</b> o = 0.90 で、tanh(C<sub>t</sub>) = −0.50 のうち今必要な分を取り出し、h<sub>t</sub> = <b>−0.45</b> を出力します。' },
      { on: ['cout', 'hout'], gates: [], chips: ['C', 'h'], eq: [3, 5], flows: [['cout', 'var(--aqua)', 900], ['hout', 'var(--violet)', 900]], cap: 'C<sub>t</sub> と h<sub>t</sub> が次の時刻へ渡されます。これを系列の長さだけ繰り返します。' }
    ];
    new Player(d.root, {
      steps: STEPS.length, interval: 3000,
      onStep(i, { forward }) {
        const st = STEPS[i];
        Object.entries(P).forEach(([k, p]) => p.classList.toggle('on', st.on.includes(k)));
        Object.entries(G).forEach(([k, g]) => g.rect.classList.toggle('on', st.gates.includes(k)));
        Object.entries(CH).forEach(([k, c]) => show(c, st.chips.includes(k)));
        EQ.forEach((el, k) => el.classList.toggle('on', st.eq.includes(k)));
        if (forward) (st.flows || []).forEach(([k, color, dur = 650, delay = 0]) => flow(P[k], { color, dur, delay }));
        return st.cap;
      }
    });
  }

  /* ------------------------------------------------------------------
     6.3 ゲートを操作する
  ------------------------------------------------------------------ */
  function lstmPlayDemo() {
    const d = demo('d-lstm-play'); if (!d) return;
    const Cp = .8, G = -.7, R = 1.6;
    const st = { f: .1, i: .9, o: .9 };
    const sliders = {};
    const mk = (k, label) => { sliders[k] = slider({ label, min: 0, max: 1, step: .05, value: st[k], format: v => v.toFixed(2), onInput: v => { st[k] = v; update(); } }); return sliders[k]; };
    const preset = (label, v) => h('button', { type: 'button', class: 'btn', onclick: () => { Object.assign(st, v); Object.entries(v).forEach(([k, x]) => sliders[k].set(x)); update(); } }, label);
    d.options.append(mk('f', '忘却 f'), mk('i', '入力 i'), mk('o', '出力 o'));
    const presets = h('div', { class: 'row', style: { justifyContent: 'flex-start', gap: '8px', marginBottom: '12px' } }, h('span', { class: 'note', text: 'プリセット：' }),
      preset('保持', { f: 1, i: 0, o: .9 }), preset('上書き', { f: 0, i: 1, o: .9 }), preset('追記', { f: 1, i: 1, o: .9 }), preset('出力しない', { o: 0 }));
    const ROWS = [
      ['Cₜ₋₁ 古い記憶（主語は単数）', () => Cp],
      ['f × Cₜ₋₁ 残す分', () => st.f * Cp],
      ['g̃ 新しい候補（主語は複数）', () => G],
      ['i × g̃ 書き込む分', () => st.i * G],
      ['Cₜ ＝ 残す分 ＋ 書き込む分', () => st.f * Cp + st.i * G],
      ['hₜ ＝ o × tanh(Cₜ) 出力', () => st.o * Math.tanh(st.f * Cp + st.i * G)]
    ];
    const rows = ROWS.map(([label, fn], k) => {
      const bar = h('span', { class: 'fillbar' }), val = h('span', { class: 'mono val' });
      const el = h('div', { class: 'dbar' + (k >= 4 ? ' strong' : '') }, h('span', { class: 'dlabel', text: label }), h('span', { class: 'track' }, bar), val);
      return { el, bar, val, fn };
    });
    const msg = h('p', { class: 'demo-caption', 'aria-live': 'polite', style: { borderTop: 0, background: 'none', padding: '10px 0 0', minHeight: 0 } });
    d.stage.append(presets, h('div', { class: 'dbars' }, rows.map(r => r.el)),
      h('div', { class: 'legend', style: { justifyContent: 'flex-end', margin: '6px 0 0' } }, h('span', {}, h('span', { class: 'swatch c-blue' }), '正の値'), h('span', {}, h('span', { class: 'swatch c-red' }), '負の値'), h('span', { text: '（中央の縦線が 0、範囲 ±1.6）' })), msg);
    function update() {
      rows.forEach(({ bar, val, fn }) => {
        const v = fn(), w = Math.min(Math.abs(v), R) / R * 50;
        bar.style.left = (v >= 0 ? 50 : 50 - w) + '%'; bar.style.width = w + '%';
        bar.style.background = v >= 0 ? 'var(--blue)' : 'var(--red)';
        val.textContent = (v < 0 ? '−' : '＋') + Math.abs(v).toFixed(2);
      });
      const { f, i, o } = st;
      let t = f >= .8 && i <= .2 ? '古い記憶をほぼそのまま<b>保持</b>しています（新しい情報は無視）。長期記憶はこの状態で運ばれます。'
        : f <= .2 && i >= .8 ? '古い記憶を捨てて、新しい情報で<b>上書き</b>しています。'
          : f >= .8 && i >= .8 ? '古い記憶を残したまま新しい情報を<b>追記</b>しています（この例では符号が逆なので打ち消し合います）。'
            : f <= .2 && i <= .2 ? '古い記憶も新しい情報も捨てて、記憶を<b>リセット</b>しています。'
              : '古い記憶と新しい情報を、ゲートの値に応じた割合で混ぜています。';
      if (o <= .2) t += ' 出力ゲートが閉じているので、記憶は保ったまま<b>今は外に出しません</b>。';
      msg.innerHTML = t;
    }
    update();
  }

  /* ------------------------------------------------------------------
     6.3 GRU セル
  ------------------------------------------------------------------ */
  function gruDemo() {
    const d = demo('d-gru'); if (!d) return;
    const host = document.getElementById('gru-svg'), eqHost = document.getElementById('gru-eqs');
    const svg = s('svg', { viewBox: '0 0 720 370', role: 'img', 'aria-label': 'GRU セルの内部構造。更新ゲートとリセットゲートで、古い記憶と新しい候補を混ぜる図' });
    svg.append(s('rect', { x: 70, y: 40, width: 540, height: 298, rx: 18, class: 'cellbox' }));
    const L = svg, P = {};
    P.hin = wire(L, 'M20,80 H206', 'c-violet'); P.hmid = wire(L, 'M234,80 H546', 'c-violet'); P.hout = wire(L, 'M574,80 H700', 'c-violet'); P.hup = wire(L, 'M640,80 V14', 'c-violet');
    P.hdown = wire(L, 'M100,80 V290', 'c-violet'); P.xin = wire(L, 'M100,356 V290', 'c-violet'); P.bus = wire(L, 'M100,290 H300', 'c-violet');
    P.zt = wire(L, 'M220,290 V225', 'c-blue'); P.rt = wire(L, 'M300,290 V225', 'c-orange');
    P.z1 = wire(L, 'M220,195 V153', 'c-blue'); P.oneA = wire(L, 'M220,127 V94', 'c-blue');
    P.zB = wire(L, 'M220,172 H546', 'c-blue');
    P.rR = wire(L, 'M325,210 H380 V236', 'c-orange'); P.bR = wire(L, 'M300,290 H380 V264', 'c-violet');
    P.Rc = wire(L, 'M394,250 H443', 'c-yellow'); P.xc = wire(L, 'M100,322 H470 V265', 'c-violet');
    P.cB = wire(L, 'M497,250 H560 V186', 'c-yellow'); P.Bp = wire(L, 'M560,158 V94', 'c-yellow');
    node(L, 220, 80, '×'); node(L, 560, 80, '+'); node(L, 220, 140, '1−'); node(L, 560, 172, '×'); node(L, 380, 250, '×');
    const G = { z: gate(L, 220, 210, 'σ', 'c-blue'), r: gate(L, 300, 210, 'σ', 'c-orange'), c: gate(L, 470, 250, 'tanh', 'c-yellow', 54) };
    [['更新 z', 214, 266, 'end'], ['リセット r', 294, 266, 'end'], ['候補 h̃', 470, 226, 'middle']].forEach(([t, x, y, a]) => L.append(s('text', { x, y, 'text-anchor': a, class: 'lbl-m', style: { fontSize: '11.5px' } }, t)));
    [['hₜ₋₁', 22, 70, 'start'], ['hₜ', 698, 70, 'end'], ['hₜ（出力）', 650, 24, 'start'], ['xₜ', 110, 366, 'start']].forEach(([t, x, y, a]) => L.append(s('text', { x, y, 'text-anchor': a, class: 'lbl-b lbl-mono' }, t)));
    L.append(s('text', { x: 390, y: 68, 'text-anchor': 'middle', class: 'lbl-m', style: { fontSize: '11.5px' } }, '隠れ状態 h（GRU の記憶の本線）'));
    const V = { hp: .8, z: .7, r: .2 };
    V.rh = V.r * V.hp; V.c = Math.tanh(-1.2 + 1.5 * V.rh); V.keep = (1 - V.z) * V.hp; V.add = V.z * V.c; V.h = V.keep + V.add;
    const n2 = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
    const CH = {
      z: vchip(L, 212, 172, `z = ${n2(V.z)}`, 'end'),
      r: vchip(L, 326, 196, `r = ${n2(V.r)}`),
      oz: vchip(L, 238, 132, `1−z = ${n2(1 - V.z)}`),
      rh: vchip(L, 392, 276, `r×h = ${n2(V.rh)}`),
      c: vchip(L, 500, 276, `h̃ = ${n2(V.c)}`),
      keep: vchip(L, 390, 102, `(1−z)×hₜ₋₁ = ${n2(V.keep)}`, 'middle'),
      add: vchip(L, 548, 130, `z×h̃ = ${n2(V.add)}`, 'end'),
      h: vchip(L, 606, 104, `hₜ = ${n2(V.h)}`)
    };
    host.append(svg);
    const EQ = eqPanel(eqHost, [
      ['z_t = \\sigma(W_z [h_{t-1}, x_t])', '更新ゲート：新しい候補をどれだけ取り込むか', 'c-blue'],
      ['r_t = \\sigma(W_r [h_{t-1}, x_t])', 'リセットゲート：候補を作るとき過去をどれだけ使うか', 'c-orange'],
      ['\\tilde{h}_t = \\tanh(W [r_t \\odot h_{t-1}, x_t])', '新しい記憶の候補', 'c-yellow'],
      ['h_t = (1 - z_t) \\odot h_{t-1} + z_t \\odot \\tilde{h}_t', '古い記憶と候補を z で混ぜる', 'c-violet']
    ]);
    const STEPS = [
      { on: [], gates: [], chips: [], eq: [], cap: 'GRU には<b>セル状態がなく</b>、上の線（隠れ状態 h）が記憶の本線です。ゲートは<b>更新 z</b> と<b>リセット r</b> の 2 つだけです。' },
      { on: ['hdown', 'xin', 'bus', 'zt', 'rt'], gates: ['z', 'r'], chips: ['z', 'r'], eq: [0, 1], flows: [['hdown', 'var(--violet)'], ['xin', 'var(--violet)'], ['zt', 'var(--blue)', 500, 600], ['rt', 'var(--orange)', 500, 600]], cap: 'h<sub>t−1</sub> と x<sub>t</sub> から、更新ゲート <b>z = 0.70</b> とリセットゲート <b>r = 0.20</b> を計算します。' },
      { on: ['rR', 'bR', 'Rc', 'xc'], gates: ['r', 'c'], chips: ['r', 'rh', 'c'], eq: [1, 2], flows: [['rR', 'var(--orange)'], ['bR', 'var(--violet)'], ['xc', 'var(--violet)', 900], ['Rc', 'var(--yellow)', 400, 650]], cap: '<b>リセットゲート</b> r = 0.20 で過去の記憶を 2 割に絞ってから、新しい入力と合わせて<b>候補 h̃ = −0.74</b> を作ります。r が 0 に近いほど「過去を無視して作り直す」ことになります。' },
      { on: ['hin', 'z1', 'oneA', 'zB', 'cB'], gates: ['z', 'c'], chips: ['z', 'oz', 'c'], eq: [0, 3], flows: [['z1', 'var(--blue)', 450], ['oneA', 'var(--blue)', 400, 450], ['zB', 'var(--blue)', 900], ['cB', 'var(--yellow)', 700], ['hin', 'var(--violet)', 800]], cap: '<b>更新ゲート</b>で混ぜる割合を決めます：古い記憶は <b>(1 − z) = 0.30 倍</b>、新しい候補は <b>z = 0.70 倍</b>。' },
      { on: ['hmid', 'Bp'], gates: [], chips: ['keep', 'add', 'h'], eq: [3], flows: [['hmid', 'var(--violet)', 800], ['Bp', 'var(--yellow)', 500]], cap: '足し合わせて h<sub>t</sub> = 0.24 + (−0.52) = <b>−0.28</b>。LSTM の「忘却」と「入力」を、<b>1 つの z で同時に決めている</b>のが GRU の簡略化のポイントです。' },
      { on: ['hout', 'hup'], gates: [], chips: ['h'], eq: [3], flows: [['hout', 'var(--violet)'], ['hup', 'var(--violet)']], cap: 'h<sub>t</sub> が次の時刻と出力に渡されます。LSTM より部品が少ない分、パラメータも計算も少なく済みます。' }
    ];
    new Player(d.root, {
      steps: STEPS.length, interval: 3000,
      onStep(i, { forward }) {
        const st = STEPS[i];
        Object.entries(P).forEach(([k, p]) => p.classList.toggle('on', st.on.includes(k)));
        Object.entries(G).forEach(([k, g]) => g.rect.classList.toggle('on', st.gates.includes(k)));
        Object.entries(CH).forEach(([k, c]) => show(c, st.chips.includes(k)));
        EQ.forEach((el, k) => el.classList.toggle('on', st.eq.includes(k)));
        if (forward) (st.flows || []).forEach(([k, color, dur = 650, delay = 0]) => flow(P[k], { color, dur, delay }));
        return st.cap;
      }
    });
  }

  /* ------------------------------------------------------------------
     6.3 パラメータ数の比較
  ------------------------------------------------------------------ */
  function compareDemo() {
    const d = demo('d-compare'); if (!d) return;
    const X = 64, Hd = 128, unit = Hd * (X + Hd) + 2 * Hd;
    const ROWS = [['nn.RNN', 1, '重み 1 組'], ['nn.GRU', 3, 'ゲート 2 つ + 候補 = 3 組'], ['nn.LSTM', 4, 'ゲート 3 つ + 候補 = 4 組']];
    const max = unit * 4;
    const bars = ROWS.map(([name, k, note]) => {
      const fill = h('span', { class: 'fillbar', style: { '--c': 'var(--blue)' } }), val = h('span', { class: 'val' });
      const el = h('div', { class: 'hbar' }, h('span', { class: 'mono', html: `${name}<br><span class="note">${note}</span>` }), h('span', { class: 'track' }, fill, val));
      return { el, fill, val, v: unit * k };
    });
    d.stage.append(h('div', { class: 'hbars' }, bars.map(b => b.el)),
      h('p', { class: 'note', style: { margin: '12px 0 0' }, html: `1 組 = 128 × (64 + 128) の重み + バイアス 2 × 128 = ${fmt(unit)}。GRU は RNN の <b>3 倍</b>、LSTM は <b>4 倍</b>で、GRU は LSTM の <b>3/4</b> です。` }));
    const set = on => bars.forEach(b => { const pct = on ? b.v / max * 78 : 0; b.fill.style.width = pct + '%'; b.val.style.left = `calc(${pct}% + 8px)`; b.val.textContent = fmt(b.v); });
    set(false);
    onVisible(d.root, () => set(true));
  }

  /* ------------------------------------------------------------------
     6.3 双方向 RNN
  ------------------------------------------------------------------ */
  function bidirDemo() {
    const d = demo('d-bidir'); if (!d) return;
    const WORDS = ['He', 'sat', 'on', 'the', 'bank', 'of', 'the', 'river'], N = WORDS.length, BANK = 4;
    const W = 720, H = 318, X = t => 58 + t * 86, YF = 196, YB = 132, YO = 58;
    let mode = 'full', player;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '順方向と逆方向の RNN が文を読み、各単語の位置で 2 つの隠れ状態を連結する図' });
    const fA = [], bA = [], fC = [], bC = [], outs = [], toks = [], inL = [];
    for (let t = 0; t < N; t++) {
      const x = X(t);
      inL.push(s('path', { d: `M${x},${268} V${YB + 14}`, class: 'wire', style: { opacity: .35 } }));
      svg.append(inL[t], s('path', { d: `M${x},${YB - 14} V${YO + 14}`, class: 'wire', style: { opacity: .35 } }));
    }
    for (let t = 0; t < N; t++) {
      const x = X(t);
      if (t > 0) { fA[t] = arrow(X(t - 1) + 24, YF, x - 24, YF, 'c-blue'); svg.append(fA[t]); }
      if (t < N - 1) { bA[t] = arrow(X(t + 1) - 24, YB, x + 24, YB, 'c-orange'); svg.append(bA[t]); }
    }
    svg.append(arrow(20, YF, X(0) - 24, YF, 'c-blue'), arrow(W - 12, YB, X(N - 1) + 24, YB, 'c-orange'));
    for (let t = 0; t < N; t++) {
      const x = X(t);
      fC.push(s('rect', { x: x - 22, y: YF - 14, width: 44, height: 28, rx: 7, class: 'box c-blue tint' }));
      bC.push(s('rect', { x: x - 22, y: YB - 14, width: 44, height: 28, rx: 7, class: 'box c-orange tint' }));
      const oL = s('rect', { x: x - 26, y: YO - 12, width: 26, height: 24, rx: 4, class: 'half' }), oR = s('rect', { x: x, y: YO - 12, width: 26, height: 24, rx: 4, class: 'half' });
      outs.push({ oL, oR });
      const tk = tokBox(x, 270, WORDS[t], 'var(--muted)', 74); toks.push(tk);
      svg.append(fC[t], bC[t], oL, oR, tk);
    }
    svg.append(s('text', { x: 8, y: YF + 32, class: 'lbl-m', style: { fontSize: '11.5px' } }, '順方向 →（前から読む）'),
      s('text', { x: W - 8, y: YB - 22, 'text-anchor': 'end', class: 'lbl-m', style: { fontSize: '11.5px' } }, '← 逆方向（後ろから読む）'),
      s('text', { x: 8, y: YO - 22, class: 'lbl-m', style: { fontSize: '11.5px' } }, '各時刻の出力 [→h ; ←h]（128 + 128 = 256 次元）'));
    const bankTag = s('g', { class: 'fade' }, s('rect', { x: X(BANK) - 80, y: 4, width: 160, height: 24, rx: 6, style: { fill: 'var(--ink)' } }), s('text', { x: X(BANK), y: 21, 'text-anchor': 'middle', class: 'lbl-b', style: { fill: 'var(--paper)', fontSize: '12px' } }, 'bank ＝ 土手（川岸）'));
    const wait = s('text', { x: W / 2, y: YB - 22, 'text-anchor': 'middle', class: 'lbl-b fade', style: { fontSize: '12px' } }, '⏳ 未来の単語がまだ届いていないので、逆方向は動けない');
    svg.append(bankTag, wait);
    d.options.append(segmented({ label: '入力', options: [['full', '文全体が揃っている'], ['rt', 'リアルタイム（1 語ずつ届く）']], value: 'full', onChange: v => { mode = v; player.refresh(); } }));
    d.stage.append(svg);
    player = new Player(d.root, {
      steps: N + 2, interval: 1300, holds: { 0: 2200 },
      onStep(i, { forward }) {
        const rt = mode === 'rt', s_ = Math.min(i, N);
        for (let t = 0; t < N; t++) {
          const fDone = t < s_, bDone = !rt && i >= 1 && t >= N - s_;
          fC[t].classList.toggle('hot', i >= 1 && i <= N && t === i - 1);
          bC[t].classList.toggle('hot', !rt && i >= 1 && i <= N && t === N - i);
          bC[t].style.opacity = rt ? .35 : 1;
          outs[t].oL.style.fill = fDone ? 'var(--blue)' : ''; outs[t].oR.style.fill = bDone ? 'var(--orange)' : '';
          toks[t].style.opacity = rt && t >= s_ && i <= N ? .15 : 1;
          toks[t].rect.classList.toggle('hot', i === N + 1 && t === BANK && !rt);
          if (fA[t]) fA[t].classList.toggle('on', t === i - 1);
          if (bA[t]) bA[t].classList.toggle('on', !rt && t === N - i);
        }
        show(bankTag, i === N + 1 && !rt); show(wait, rt && i <= N);
        if (forward && i >= 1 && i <= N) {
          if (fA[i - 1]) flow(fA[i - 1].line, { color: 'var(--blue)', dur: 600 });
          if (!rt && bA[N - i]) flow(bA[N - i].line, { color: 'var(--orange)', dur: 600 });
        }
        if (i === 0) return rt ? 'リアルタイム処理では、単語が 1 つずつ届きます。逆方向の RNN は「文の最後」から読み始めるので…' : '2 つの RNN を用意し、1 つは前から、もう 1 つは後ろから同時に文を読みます。';
        if (i === N + 1) return rt
          ? '文が終わるまで逆方向の RNN は 1 歩も進めませんでした。双方向にするには<b>系列全体が揃っている必要がある</b>ため、リアルタイム処理では使えません（全体を待つと遅延が大きくなります）。'
          : '全位置で [順方向 ; 逆方向] が揃いました。"bank" の位置には、前の文脈 "He sat on the" と後ろの文脈 "of the river" の両方が入っているので、<b>「土手」</b>だと判断できます。出力次元は 128 × 2 = 256 です。';
        if (rt) return `単語 ${i} 個目 "${WORDS[i - 1]}" が届きました。順方向は進めますが、逆方向はまだ待機中です。`;
        return `順方向は "${WORDS[i - 1]}" まで、逆方向は "${WORDS[N - i]}" まで読みました。上の出力は、青（前の文脈）とオレンジ（後ろの文脈）の両方が揃った位置から完成していきます。`;
      }
    });
  }

  /* ------------------------------------------------------------------
     6.4 Seq2Seq
  ------------------------------------------------------------------ */
  function seq2seqDemo() {
    const d = demo('d-seq2seq'); if (!d) return;
    const SRC = ['私', 'は', '猫', 'が', '好き'], TGT_IN = ['<sos>', 'I', 'like', 'cats'], TGT_OUT = ['I', 'like', 'cats', '<eos>'];
    const W = 740, H = 300, CY = 168, EX = k => 44 + k * 66, DX = k => 468 + k * 78, CTX = 394;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Encoder が「私は猫が好き」を読んで文脈ベクトルに圧縮し、Decoder が I like cats を 1 語ずつ生成する図' });
    svg.append(s('text', { x: EX(2), y: 34, 'text-anchor': 'middle', class: 'lbl-b' }, 'Encoder（入力を理解する）'), s('text', { x: DX(1.5), y: 34, 'text-anchor': 'middle', class: 'lbl-b' }, 'Decoder（出力を生成する）'));
    const encA = [], encC = [], encBar = [], encTok = [], decA = [], decC = [], decIn = [], decOut = [], outA = [], fb = [], inA = [];
    SRC.forEach((w, k) => {
      if (k > 0) { encA[k] = arrow(EX(k - 1) + 25, CY, EX(k) - 25, CY, 'c-violet'); svg.append(encA[k]); }
      inA[k] = arrow(EX(k), 244, EX(k), CY + 22, 'fade'); inA[k].style.setProperty('--c', WORD_COLORS[k]); svg.append(inA[k]);
    });
    const toCtx = arrow(EX(4) + 25, CY, CTX - 30, CY, 'c-violet'); svg.append(toCtx);
    const fromCtx = arrow(CTX + 30, CY, DX(0) - 27, CY, 'c-violet'); svg.append(fromCtx);
    TGT_IN.forEach((w, k) => {
      if (k > 0) { decA[k] = arrow(DX(k - 1) + 27, CY, DX(k) - 27, CY, 'c-violet'); svg.append(decA[k]); }
      outA[k] = arrow(DX(k), CY - 22, DX(k), 92, 'c-orange'); svg.append(outA[k]);
      if (k > 0) { fb[k] = s('path', { d: `M${DX(k - 1) + 20},74 C${DX(k - 1) + 48},74 ${DX(k - 1) + 36},262 ${DX(k) - 20},262`, class: 'wire fbw c-orange', style: { strokeDasharray: '4 4' } }); svg.append(fb[k]); }
    });
    SRC.forEach((w, k) => {
      const rect = s('rect', { x: EX(k) - 25, y: CY - 20, width: 50, height: 40, rx: 8, class: 'box c-violet tint' });
      const bar = s('g'); encC.push(rect); encBar.push(bar);
      const tk = tokBox(EX(k), 246, w, WORD_COLORS[k], 50); encTok.push(tk);
      svg.append(rect, s('rect', { x: EX(k) - 19, y: CY - 5, width: 38, height: 10, rx: 2, style: { fill: 'var(--track)' } }), bar, tk);
    });
    const ctxCells = [...Array(6)].map((_, k) => s('rect', { x: CTX - 14, y: CY - 45 + k * 15, width: 28, height: 13, rx: 2, class: 'ctx-cell' }));
    const ctxBox = s('rect', { x: CTX - 22, y: CY - 52, width: 44, height: 104, rx: 8, class: 'box' });
    svg.append(ctxBox, ...ctxCells, s('text', { x: CTX, y: CY + 72, 'text-anchor': 'middle', class: 'lbl-m', style: { fontSize: '11.5px' } }, '文脈ベクトル'), s('text', { x: CTX, y: CY + 87, 'text-anchor': 'middle', class: 'lbl-m', style: { fontSize: '11.5px' } }, '（固定長）'));
    TGT_IN.forEach((w, k) => {
      const rect = s('rect', { x: DX(k) - 25, y: CY - 20, width: 50, height: 40, rx: 8, class: 'box c-violet tint' }); decC.push(rect);
      const ti = tokBox(DX(k), 246, w, k === 0 ? 'var(--muted)' : 'var(--orange)', 58); decIn.push(ti);
      const to = tokBox(DX(k), 60, TGT_OUT[k], 'var(--orange)', 58); decOut.push(to);
      svg.append(rect, ti, to);
    });
    d.stage.append(svg);
    const drawEnc = (k, upto) => {
      encBar[k].replaceChildren();
      if (upto < 0) return;
      const raw = [...Array(upto + 1)].map((_, j) => Math.pow(.6, upto - j)), sum = raw.reduce((a, b) => a + b, 0);
      let x = EX(k) - 19;
      raw.forEach((r, j) => { const w = r / sum * 38; encBar[k].append(s('rect', { x, y: CY - 5, width: Math.max(0, w - .6), height: 10, rx: 1.5, style: { fill: WORD_COLORS[j] } })); x += w; });
    };
    new Player(d.root, {
      steps: 12, interval: 1500, holds: { 0: 2400, 6: 2600 },
      onStep(i, { forward }) {
        const e = i - 1, dk = i - 7;
        SRC.forEach((_, k) => {
          drawEnc(k, i >= 1 && k <= Math.min(e, 4) ? k : -1);
          encC[k].classList.toggle('hot', k === e);
          encTok[k].style.opacity = i >= 1 && k > e && e < 5 ? .4 : 1;
          inA[k].classList.toggle('on', k === e);
          if (encA[k]) encA[k].classList.toggle('on', k === e);
        });
        toCtx.classList.toggle('on', i === 6);
        ctxCells.forEach((c, k) => { c.style.fill = i >= 6 ? `color-mix(in srgb, ${WORD_COLORS[k % 5]} ${40 + (k * 7) % 30}%, ${WORD_COLORS[(k + 2) % 5]})` : ''; });
        ctxBox.classList.toggle('hot', i === 6);
        fromCtx.classList.toggle('on', i === 7);
        TGT_IN.forEach((_, k) => {
          const vis = dk >= k;
          decC[k].classList.toggle('hot', k === dk);
          show(decIn[k], vis); show(decOut[k], vis); show(outA[k], vis);
          outA[k].classList.toggle('on', k === dk);
          if (decA[k]) decA[k].classList.toggle('on', k === dk);
          if (fb[k]) { fb[k].classList.toggle('on', k === dk); fb[k].style.opacity = vis ? 1 : 0; }
        });
        if (forward) {
          if (e >= 0 && e < 5) { flow(inA[e].line, { color: WORD_COLORS[e], dur: 550 }); if (encA[e]) flow(encA[e].line, { color: 'var(--violet)', dur: 550 }); }
          if (i === 6) flow(toCtx.line, { color: 'var(--violet)', dur: 700 });
          if (dk >= 0 && dk < 4) {
            if (dk === 0) flow(fromCtx.line, { color: 'var(--violet)', dur: 600 });
            else { flow(fb[dk], { color: 'var(--orange)', dur: 700 }); flow(decA[dk].line, { color: 'var(--violet)', dur: 600 }); }
            flow(outA[dk].line, { color: 'var(--orange)', dur: 450, delay: 650 });
          }
        }
        if (i === 0) return 'Encoder が入力文を 1 語ずつ読み、Decoder が訳文を 1 語ずつ生成します。';
        if (e >= 0 && e < 5) return `Encoder が「${SRC[e]}」を読み、記憶を更新します。` + (e === 4 ? '入力文を読み切りました。' : '');
        if (i === 6) return '読み終えた最終状態が<b>文脈ベクトル</b>。入力文全体の意味が、この<b>固定長の 1 本のベクトル</b>に押し込められます。';
        if (i === 11) return '<code>&lt;eos&gt;</code>（文の終わり）が出たら生成を止めます。入力 5 語 → 出力 3 語のように、<b>長さが違っても扱える</b>のが Seq2Seq の強みです。';
        return dk === 0
          ? 'Decoder は文脈ベクトルを初期状態として受け取り、開始記号 <code>&lt;sos&gt;</code> から「I」を生成します。'
          : `直前に生成した「${TGT_IN[dk]}」を次の入力にして（点線）、「${TGT_OUT[dk]}」を生成します。自分の出力を次の入力に使う<b>自己回帰</b>です。`;
      }
    });
  }

  /* ------------------------------------------------------------------
     6.4 固定長ボトルネック
  ------------------------------------------------------------------ */
  function bottleneckDemo() {
    const d = demo('d-bottleneck'); if (!d) return;
    const DIM = 512;
    let n = 5;
    const toks = h('div', { class: 'bn-toks' }), box = h('div', { class: 'bn-box' }, [...Array(16)].map(() => h('span')));
    const per = h('div', { class: 'v' }), meterFill = h('span'), nV = h('div', { class: 'v' });
    const sl = slider({ label: '入力文の長さ', min: 5, max: 100, step: 1, value: n, format: v => `${v} 語`, onInput: v => { n = v; update(); } });
    d.options.append(sl);
    d.stage.append(h('div', { class: 'bn-row' }, h('div', { class: 'col', style: { flex: 1, minWidth: 0 } }, toks, h('div', { class: 'lbl-sm', text: '入力文の単語' })), h('div', { class: 'op', text: '→' }), h('div', { class: 'col' }, box, h('div', { class: 'lbl-sm', text: `文脈ベクトル ${DIM} 次元（固定）` }))),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('div', { class: 'k' }, '入力の長さ'), nV, h('div', { class: 'd', text: 'スライダーで変更' })),
        h('div', { class: 'stat' }, h('div', { class: 'k' }, '1 単語あたりに使える次元（目安）'), per, h('div', { class: 'meter c-violet', style: { marginTop: '6px' } }, meterFill), h('div', { class: 'd', text: `${DIM} ÷ 単語数` }))));
    function update() {
      toks.replaceChildren(...[...Array(n)].map((_, k) => h('span', { style: { background: WORD_COLORS[k % 5] } })));
      nV.textContent = `${n} 語`;
      const p = DIM / n; per.textContent = `≈ ${p >= 10 ? Math.round(p) : p.toFixed(1)} 次元`;
      meterFill.style.width = (p / (DIM / 5) * 100) + '%';
      box.classList.toggle('full', n >= 40);
    }
    update();
    // 画面に入ったら短い文 → 長い文へ自動で動かす
    onVisible(d.root, () => {
      if (DL.reduced()) return;
      let v = 5; const id = setInterval(() => { v += 3; if (v > 60) { clearInterval(id); return; } n = v; sl.set(v); update(); }, 90);
      sl.input.addEventListener('input', () => clearInterval(id), { once: true });
    });
  }

  /* ------------------------------------------------------------------
     6.4 逐次処理 vs 並列処理
  ------------------------------------------------------------------ */
  function parallelDemo() {
    const d = demo('d-parallel'); if (!d) return;
    const N = 12;
    const lane = (title, sub) => {
      const toks = [...Array(N)].map((_, k) => h('span', { class: 'pl-tok', text: `x${k + 1}` }));
      const cores = [...Array(N)].map(() => h('span', { class: 'pl-core' }));
      const status = h('span', { class: 'mono pl-status' });
      const el = h('div', { class: 'pl-lane' }, h('div', { class: 'pl-head' }, h('b', { text: title }), h('span', { class: 'note', text: sub }), status),
        h('div', { class: 'pl-toks' }, toks), h('div', { class: 'pl-cores' }, h('span', { class: 'note', text: 'GPU コア' }), cores));
      return { el, toks, cores, status };
    };
    const rnn = lane('RNN（逐次処理）', 'h_t の計算に h_(t−1) が必要');
    const par = lane('並列処理（CNN / Transformer）', '各位置の計算が独立');
    const clock = h('div', { class: 'v' });
    d.stage.append(rnn.el, par.el, h('div', { class: 'stats' }, h('div', { class: 'stat' }, h('div', { class: 'k' }, '経過ステップ'), clock, h('div', { class: 'd', text: '1 ステップ＝ GPU が 1 回同時計算する時間' }))));
    new Player(d.root, {
      steps: N + 2, interval: 700, holds: { 0: 1800, 1: 1600 },
      onStep(i) {
        rnn.toks.forEach((t, k) => { t.classList.toggle('done', k < i - 1); t.classList.toggle('busy', k === i - 1); });
        rnn.cores.forEach((c, k) => c.classList.toggle('busy', i >= 1 && i <= N && k === 0));
        par.toks.forEach(t => { t.classList.toggle('busy', i === 1); t.classList.toggle('done', i >= 2); });
        par.cores.forEach(c => c.classList.toggle('busy', i === 1));
        rnn.status.textContent = i >= 1 && i <= N ? `完了 ${i - 1} / ${N}（計算中 1）` : `完了 ${i > N ? N : 0} / ${N}`;
        par.status.textContent = i === 1 ? `計算中 ${N}` : `完了 ${i >= 2 ? N : 0} / ${N}`;
        clock.textContent = `${Math.min(i, N)}`;
        if (i === 0) return '12 トークンの系列を処理します。上が RNN、下が並列処理です。下段の四角は GPU のコア（計算ユニット）です。';
        if (i === 1) return '並列処理は<b>全トークンを同時に計算</b>し、1 ステップで終わります。RNN はまだ 1 つ目を計算中で、コアは 1 つしか使えていません。';
        if (i > N) return `RNN は <b>${N} ステップ</b>かかりました（並列処理は 1 ステップ）。系列が 1,000 トークンなら 1,000 ステップ。GPU のコアがいくつあっても、ほとんどが待っているだけです。これが 2017 年の Transformer 登場の直接的な動機です。`;
        return `RNN は x${i} を計算中。前の結果 h<sub>${i - 1}</sub> を待たないと次に進めないので、1 つずつしか計算できません。`;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    [orderDemo, unrollDemo, patternsDemo, bpttDemo, longdepDemo, lstmDemo, lstmPlayDemo, gruDemo, compareDemo, bidirDemo, seq2seqDemo, bottleneckDemo, parallelDemo]
      .forEach(fn => { try { fn(); } catch (e) { console.error(`[${fn.name}]`, e); } });
  });
})();
