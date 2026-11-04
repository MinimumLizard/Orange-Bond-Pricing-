/**
 * Page wiring for "Orange Bond pricing: an illustrative model".
 * All maths lives in src/model.js; all data in data/inputs.json (mirrored to
 * data/inputs.js so the page also works from file://). This file only reads
 * inputs, calls the model and renders.
 */
(function () {
  'use strict';

  const M = window.OBModel;
  const F = window.OBFormat;
  const DATA = window.OB_INPUTS;
  const I = DATA.inputs;
  const { history: H, base: B } = M.deriveBase(DATA);

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ------------------------------------------------------------------ sliders

  const govMid = `${I.gov_now_bid.instrument}, midpoint of ${F.rate(I.gov_now_offer.value / 100)} offer / ${F.rate(I.gov_now_bid.value / 100)} bid, ${F.date(I.gov_now_bid.source_date)}`;

  /** Slider definitions. `ui` values are what the slider shows; `toModel` converts them for model.js. */
  const SLIDERS = [
    { key: 'govNow', param: 'g', label: 'Government yield now', unit: '%, semi-annual basis', min: 9, max: 14, step: 0.01,
      base: B.govNow * 100, toModel: (v) => v / 100, fmt: (v) => F.rate(v / 100),
      help: `3-year match: ${govMid}.`, scale: ['9.00%', '14.00%'] },
    { key: 'unsecuredSpread', param: 'u', label: 'Unsecured spread', unit: 'percentage points', min: 0.5, max: 3, step: 0.01,
      base: H.unsecuredAvg * 100, toModel: (v) => v / 100, fmt: (v) => F.pts(v / 100),
      help: `Average of the Social Bond spreads: 4-year ${F.pts(H.social4.spread)}, 5-year ${F.pts(H.social5.spread)}.`, scale: ['0.50', '3.00'] },
    { key: 'guaranteedSpread', param: 'gs', label: 'Guaranteed spread', unit: 'percentage points', min: 0, max: 1.5, step: 0.01,
      base: H.green.spread * 100, toModel: (v) => v / 100, fmt: (v) => F.pts(v / 100),
      help: 'The Green Bond spread (with Seylan Bank guarantee).', scale: ['0.00', '1.50'] },
    { key: 'share', param: 'sh', label: 'Partial guarantee share', unit: '% of the full-guarantee benefit', min: 0, max: 100, step: 1,
      base: B.share * 100, toModel: (v) => v / 100, fmt: (v) => F.share(v / 100),
      help: 'Assumption. 0% gives the no-enhancement coupon; 100% gives the full-guarantee coupon.', scale: ['0%', '100%'] },
    { key: 'tenorAdj', param: 'ta', label: 'Tenor adjustment', unit: 'points added to the unsecured spread', min: -0.5, max: 0.5, step: 0.01,
      base: B.tenorAdj * 100, toModel: (v) => v / 100, fmt: (v) => F.pts(v / 100),
      help: 'Assumption. The Social spreads are 4–5 year; the Orange Bond is 3-year. Negative means a tighter 3-year spread.', scale: ['−0.50', '+0.50'] },
    { key: 'size', param: 's', label: 'Issue size', unit: 'LKR bn', min: 0.5, max: 3, step: 0.05,
      base: B.size / 1000, toModel: (v) => v * 1000, fmt: (v) => F.lkr(v * 1000),
      help: 'Board approval: up to LKR 1bn.', scale: ['LKR 0.5bn', 'LKR 3.0bn'] },
    { key: 'fee', param: 'f', label: 'Guarantee fee', unit: '% a year on the covered amount', min: 0, max: 2, step: 0.01,
      base: B.fee * 100, toModel: (v) => v / 100, fmt: (v) => F.rate(v / 100),
      help: 'Placeholder assumption with no public source. Replace it with a real quote.', scale: ['0.00%', '2.00%'] },
    { key: 'coverage', param: 'c', label: 'Coverage factor', unit: '× issue size', min: 1, max: 1.3, step: 0.01,
      base: B.coverage, toModel: (v) => v, fmt: (v) => F.round(v, 2).toFixed(2) + '×',
      help: 'Assumption: principal plus about one year\'s interest (the Green Bond precedent was 1.107×).', scale: ['1.00×', '1.30×'] },
  ];

  const state = {};
  SLIDERS.forEach((s) => (state[s.key] = s.base));

  const isBase = (s) => Math.abs(state[s.key] - s.base) < 1e-9;

  function params() {
    const p = { tenorYears: B.tenorYears, unsecuredHalfWidth: B.unsecuredHalfWidth };
    SLIDERS.forEach((s) => (p[s.key] = s.toModel(state[s.key])));
    return p;
  }

  // ------------------------------------------------------------------ URL state

  function readURL() {
    let q;
    try { q = new URLSearchParams(window.location.search); } catch (e) { return; }
    SLIDERS.forEach((s) => {
      if (!q.has(s.param)) return;
      const v = Number(q.get(s.param));
      if (Number.isFinite(v)) state[s.key] = Math.min(s.max, Math.max(s.min, v));
    });
  }

  function writeURL() {
    const q = new URLSearchParams();
    SLIDERS.forEach((s) => { if (!isBase(s)) q.set(s.param, String(F.round(state[s.key], 4))); });
    const qs = q.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    try { window.history.replaceState(null, '', url); } catch (e) { /* file:// in some browsers */ }
  }

  // ------------------------------------------------------------------ build sliders

  function buildSliders() {
    const form = $('#sliders');
    SLIDERS.forEach((s) => {
      const id = 'sl-' + s.key;
      const p = (s.base - s.min) / (s.max - s.min);
      const div = document.createElement('div');
      div.className = 'slider';
      div.innerHTML =
        `<div class="slider-top"><label for="${id}">${s.label} <span class="unit">(${s.unit})</span></label>` +
        `<output id="${id}-out" for="${id}" aria-live="off"></output></div>` +
        `<p class="slider-help" id="${id}-help">${s.help}</p>` +
        `<div class="track"><span class="base-tick${p > 0.85 ? ' flip' : ''}" style="left: calc(10px + (100% - 20px) * ${p.toFixed(5)})" aria-hidden="true"></span>` +
        `<input type="range" id="${id}" name="${s.param}" min="${s.min}" max="${s.max}" step="${s.step}" aria-describedby="${id}-help ${id}-base"></div>` +
        `<div class="slider-scale" aria-hidden="true"><span>${s.scale[0]}</span><span>${s.scale[1]}</span></div>` +
        `<p class="slider-base" id="${id}-base">Base case: ${s.fmt(s.base)}</p>`;
      form.appendChild(div);
      const input = $('#' + id, div);
      input.addEventListener('input', () => {
        let v = Number(input.value);
        if (Math.abs(v - s.base) < s.step / 2) v = s.base; // snap back to the exact base
        state[s.key] = v;
        update(true);
      });
    });
  }

  function syncSliders() {
    SLIDERS.forEach((s) => {
      const input = $('#sl-' + s.key);
      if (Number(input.value) !== state[s.key]) input.value = String(state[s.key]);
      const out = $('#sl-' + s.key + '-out');
      out.textContent = s.fmt(state[s.key]);
      out.classList.toggle('changed', !isBase(s));
      input.setAttribute('aria-valuetext', s.fmt(state[s.key]) + (isBase(s) ? ' (base case)' : ''));
    });
  }

  // ------------------------------------------------------------------ outputs

  function setOut(name, text, flash) {
    $$(`[data-out="${name}"]`).forEach((el) => {
      if (el.textContent !== text) {
        el.textContent = text;
        if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
      }
    });
  }

  let lastScenario = null;

  function update(fromUser) {
    const p = params();
    const s = M.scenario(p);
    lastScenario = s;
    const st = s.structures;

    setOut('gov', F.rate(p.govNow), fromUser);
    setOut('size', F.lkr(p.size), fromUser);
    setOut('share', F.share(p.share), fromUser);
    ['none', 'partial', 'full'].forEach((k) => {
      setOut(k + '-semi', F.rate(st[k].semi), fromUser);
      setOut(k + '-annual', F.rate(st[k].annual), fromUser);
      setOut(k + '-interest', F.lkr(st[k].interest), fromUser);
    });
    setOut('none-range', `${F.rate(st.none.low)} – ${F.rate(st.none.high)} (annual-pay ${F.rate(st.none.lowAnnual)} – ${F.rate(st.none.highAnnual)})`, fromUser);
    setOut('partial-range', `${F.rate(st.partial.low)} – ${F.rate(st.partial.high)} (annual-pay ${F.rate(st.partial.lowAnnual)} – ${F.rate(st.partial.highAnnual)})`, fromUser);

    const e = s.economics;
    setOut('gross-year', F.lkr(e.grossPerYear), fromUser);
    setOut('gross-tenor', F.lkr(e.grossOverTenor), fromUser);
    setOut('tenor', String(p.tenorYears), false);
    setOut('breakeven', F.rate(e.breakevenFee), fromUser);
    setOut('covered', F.lkr(e.covered), fromUser);
    setOut('coverage', F.round(p.coverage, 2).toFixed(2), fromUser);
    setOut('fee', F.rate(p.fee), fromUser);
    setOut('net-tenor', F.lkr(e.netOverTenor), fromUser);
    setOut('thumb', F.lkr(e.ruleOfThumb), fromUser);

    const good = e.netOverTenor >= 0;
    const net = $('#econ-net');
    net.classList.toggle('is-good', good);
    net.classList.toggle('is-bad', !good);
    setOut('net-verdict',
      (good ? 'Saving: the fee is ' + (Math.abs(p.fee - e.breakevenFee) < 1e-9 ? 'at' : 'below') + ' breakeven. '
            : 'Cost: the fee is above breakeven. ') +
      `Net ${F.lkr(e.netPerYear)} a year; ${F.lkr(e.netOverTenor)} over ${p.tenorYears} years, undiscounted.`, false);

    // Takeaway under the build chart
    const rise = p.govNow - H.govSocialAvg;
    const govChanged = !isBase(SLIDERS[0]);
    $('#build-takeaway').textContent =
      `Government yields have ${rise >= 0 ? 'risen' : 'fallen'} about ${F.round(Math.abs(rise) * 100, 1).toFixed(1)} points since the Social Bond priced ` +
      `(4- and 5-year matches averaged ${F.rate(H.govSocialAvg)} in Aug 2025; ${govChanged ? 'your assumed 3-year yield is' : 'the 3-year match is'} ${F.rate(p.govNow)} now). ` +
      (rise >= 0
        ? 'That is why the Orange coupon is higher than the Social coupons even though AFC\'s spread is assumed unchanged.'
        : 'At this assumed yield the Orange coupon would be lower than the Social coupons, with AFC\'s spread unchanged.');

    // Scenario note
    const changed = SLIDERS.filter((x) => !isBase(x));
    const note = $('#scenario-note');
    if (changed.length) {
      note.hidden = false;
      note.innerHTML = '<strong>Your scenario, not the base case.</strong> Changed: ' +
        changed.map((x) => `${x.label.toLowerCase()} ${x.fmt(state[x.key])} (base ${x.fmt(x.base)})`).join('; ') + '.';
    } else {
      note.hidden = true;
    }

    syncSliders();
    writeURL();
    renderBuildChart(p, s);
    renderBuildTable(p, s);
    renderGuarChart(p, s);
    if (fromUser) announce(s);
  }

  let liveTimer = null;
  function announce(s) {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      $('#live').textContent = `No enhancement ${F.rate(s.structures.none.semi)}, partial guarantee ${F.rate(s.structures.partial.semi)}, full guarantee ${F.rate(s.structures.full.semi)}. Breakeven fee ${F.rate(s.economics.breakevenFee)}.`;
    }, 500);
  }

  // ------------------------------------------------------------------ colours

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function palette() {
    return {
      gov: cssVar('--c-gov'), green: cssVar('--c-green'), social: cssVar('--c-social'), orange: cssVar('--c-orange'),
      ink: cssVar('--ink'), ink2: cssVar('--ink-2'), ink3: cssVar('--ink-3'), rule: cssVar('--rule'), surface: cssVar('--surface'),
      font: cssVar('--font') || 'system-ui, sans-serif',
    };
  }

  // ------------------------------------------------------------------ chart 1: build-up

  let buildChart = null;

  function rows(p, s) {
    const govNowDesc = isBase(SLIDERS[0])
      ? `${I.gov_now_bid.instrument}, mid of ${F.rate(I.gov_now_offer.value / 100)}/${F.rate(I.gov_now_bid.value / 100)} (Wealth Trust, ${F.date(I.gov_now_bid.source_date)})`
      : `Your assumed government yield (base: ${I.gov_now_bid.instrument}, ${F.rate(B.govNow)})`;
    return [
      { label: ['Green 3y', '(Feb 2025)'], name: 'Green 3y (Feb 2025)', gov: H.green.gov, spread: H.green.spread, kind: 'green',
        govDesc: `${I.gov_green.instrument} at ${F.rate(H.green.gov)} (Wealth Trust, ${F.date(I.gov_green.source_date)})`,
        paid: `${F.rate(H.green.couponQuoted)} paid semi-annually` },
      { label: ['Social 4y', '(Aug 2025)'], name: 'Social 4y (Aug 2025)', gov: H.social4.gov, spread: H.social4.spread, kind: 'social',
        govDesc: `${I.gov_social_4y.instrument} at ${F.rate(H.social4.gov)}, midpoint of quoted range (Daily FT/Wealth Trust, ${F.date(I.gov_social_4y.source_date)})`,
        paid: `${F.rate(H.social4.couponQuoted)} paid annually` },
      { label: ['Social 5y', '(Aug 2025)'], name: 'Social 5y (Aug 2025)', gov: H.social5.gov, spread: H.social5.spread, kind: 'social',
        govDesc: `${I.gov_social_5y.instrument} at ${F.rate(H.social5.gov)}, midpoint of quoted range (Daily FT/Wealth Trust, ${F.date(I.gov_social_5y.source_date)})`,
        paid: `${F.rate(H.social5.couponQuoted)} paid annually` },
      { label: ['Orange 3y', 'no enhancement'], name: 'Orange 3y: no enhancement', gov: p.govNow, spread: s.structures.none.spread, kind: 'orange',
        govDesc: govNowDesc, paid: `annual-pay equivalent ${F.rate(s.structures.none.annual)}` },
      { label: ['Orange 3y', 'partial DFI guar.'], name: 'Orange 3y: partial DFI guarantee', gov: p.govNow, spread: s.structures.partial.spread, kind: 'orange',
        govDesc: govNowDesc, paid: `annual-pay equivalent ${F.rate(s.structures.partial.annual)}` },
      { label: ['Orange 3y', 'full bank guar.'], name: 'Orange 3y: full bank guarantee', gov: p.govNow, spread: s.structures.full.spread, kind: 'orange',
        govDesc: govNowDesc, paid: `annual-pay equivalent ${F.rate(s.structures.full.annual)}` },
    ];
  }

  const segmentLabels = {
    id: 'segmentLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const pal = palette();
      const r = chart.$rows;
      if (!r) return;
      const small = chart.width < 520;
      ctx.save();
      ctx.font = `600 ${small ? 11 : 12}px ${pal.font}`;
      ctx.textBaseline = 'middle';
      const m0 = chart.getDatasetMeta(0);
      const m1 = chart.getDatasetMeta(1);
      r.forEach((row, i) => {
        const g = m0.data[i];
        const sp = m1.data[i];
        if (!g || !sp) return;
        // government segment
        const gTxt = F.rate(row.gov);
        const gW = Math.abs(g.x - g.base);
        if (ctx.measureText(gTxt).width + 12 < gW) {
          ctx.fillStyle = pal.ink;
          ctx.textAlign = 'right';
          ctx.fillText(gTxt, g.x - 8, g.y);
        }
        // spread segment
        const sTxt = F.ptsShort(row.spread);
        const sW = Math.abs(sp.x - sp.base);
        let inside = false;
        if (ctx.measureText(sTxt).width + 8 < sW) {
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText(sTxt, (sp.x + sp.base) / 2, sp.y);
          inside = true;
        }
        // total at bar end
        ctx.fillStyle = pal.ink;
        ctx.textAlign = 'left';
        ctx.font = `700 ${small ? 11.5 : 13}px ${pal.font}`;
        const total = F.rate(row.gov + row.spread);
        ctx.fillText(inside ? total : `${total} (${sTxt})`, sp.x + 6, sp.y);
        ctx.font = `600 ${small ? 11 : 12}px ${pal.font}`;
      });
      ctx.restore();
    },
  };

  function renderBuildChart(p, s) {
    const box = $('.chart-build');
    if (typeof window.Chart === 'undefined') {
      $('#build-chart').hidden = true;
      $('.chart-fallback', box).hidden = false;
      box.style.height = 'auto';
      return;
    }
    const pal = palette();
    const r = rows(p, s);
    const colour = { green: pal.green, social: pal.social, orange: pal.orange };
    const maxTotal = Math.max(...r.map((x) => x.gov + x.spread)) * 100;
    const xMax = Math.ceil((maxTotal + 2) / 2) * 2;

    const data = {
      labels: r.map((x) => x.label),
      datasets: [
        { label: 'Government yield at pricing', data: r.map((x) => x.gov * 100), backgroundColor: pal.gov,
          borderColor: pal.surface, borderWidth: { right: 2 }, borderSkipped: false, maxBarThickness: 24, borderRadius: 0 },
        { label: 'AFC spread', data: r.map((x) => x.spread * 100), backgroundColor: r.map((x) => colour[x.kind]),
          borderWidth: 0, maxBarThickness: 24, borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: false },
      ],
    };

    if (buildChart) {
      buildChart.$rows = r;
      buildChart.data.labels = data.labels;
      buildChart.data.datasets[0].data = data.datasets[0].data;
      buildChart.data.datasets[0].backgroundColor = pal.gov;
      buildChart.data.datasets[0].borderColor = pal.surface;
      buildChart.data.datasets[1].data = data.datasets[1].data;
      buildChart.data.datasets[1].backgroundColor = data.datasets[1].backgroundColor;
      buildChart.options.scales.x.max = xMax;
      styleBuildChart(buildChart, pal);
      buildChart.update('none');
      return;
    }

    window.Chart.defaults.font.family = pal.font;
    buildChart = new window.Chart($('#build-chart'), {
      type: 'bar',
      data,
      plugins: [segmentLabels],
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        responsive: true,
        animation: false,
        layout: { padding: { right: 8 } },
        interaction: { mode: 'nearest', axis: 'y', intersect: true },
        scales: {
          x: { stacked: true, min: 0, max: xMax, ticks: { callback: (v) => v + '%', stepSize: 2 }, grid: {}, border: { display: false },
               title: { display: true, text: 'Semi-annual basis, %' } },
          y: { stacked: true, grid: { display: false }, border: {}, ticks: { autoSkip: false } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => buildChart.$rows[items[0].dataIndex].name,
              label: (item) => {
                const row = buildChart.$rows[item.dataIndex];
                if (item.datasetIndex === 0) return [`Government yield ${F.rate(row.gov)}`, row.govDesc];
                return `AFC spread ${F.pts(row.spread)}`;
              },
              footer: (items) => {
                const row = buildChart.$rows[items[0].dataIndex];
                return [`Coupon ${F.rate(row.gov + row.spread)} (semi-annual basis)`, row.paid];
              },
            },
          },
        },
      },
    });
    buildChart.$rows = r;
    styleBuildChart(buildChart, pal);
    buildChart.update('none');
  }

  function styleBuildChart(chart, pal) {
    const small = chart.width < 520;
    const o = chart.options;
    o.layout.padding.right = small ? 92 : 8;
    o.scales.x.ticks.stepSize = small ? 4 : 2;
    o.scales.x.ticks.maxRotation = 0;
    o.scales.x.ticks.color = pal.ink3;
    o.scales.x.grid.color = pal.rule;
    o.scales.x.title.color = pal.ink3;
    o.scales.y.ticks.color = pal.ink2;
    o.scales.y.ticks.font = { size: small ? 11 : 12.5, weight: '500' };
    o.scales.y.border.color = pal.ink3;
    o.plugins.tooltip.backgroundColor = pal.ink;
    o.plugins.tooltip.titleColor = pal.surface;
    o.plugins.tooltip.bodyColor = pal.surface;
    o.plugins.tooltip.footerColor = pal.surface;
  }

  function renderBuildTable(p, s) {
    const r = rows(p, s);
    const tb = $('#build-table tbody');
    tb.innerHTML = r.map((x) =>
      `<tr><td data-label="Issue">${x.name}</td><td data-label="Government bond">${x.govDesc}</td>` +
      `<td class="num" data-label="Gov. yield">${F.rate(x.gov)}</td><td class="num" data-label="AFC spread">${F.pts(x.spread)}</td>` +
      `<td class="num" data-label="Coupon (semi-annual)">${F.rate(x.gov + x.spread)}</td><td data-label="As paid">${x.paid}</td></tr>`).join('');
  }

  // ------------------------------------------------------------------ chart 2: guarantee (SVG)

  function renderGuarChart(p, s) {
    const box = $('#guar-chart');
    const W = Math.max(300, Math.floor(box.clientWidth - 16));
    const small = W < 520;
    const fs = small ? 11 : 12.5;
    const labelW = small ? 92 : 168;
    const right = small ? 52 : 70;
    const top = 58;
    const rowH = small ? 34 : 38;
    const barH = small ? 16 : 20;
    const bars = [
      { name: 'Green 3y', sub: 'guaranteed', v: H.green.spread, cls: 'green' },
      { name: 'Social 4y', sub: 'unsecured', v: H.social4.spread, cls: 'social' },
      { name: 'Social 5y', sub: 'unsecured', v: H.social5.spread, cls: 'social' },
    ];
    const gU = s.unsecuredEffective;
    const gG = p.guaranteedSpread;
    // The axis is in percentage points; model values are decimals.
    const maxV = Math.max(2, ...bars.map((b) => b.v * 100), gU * 100, gG * 100) + 0.2;
    const xMax = Math.ceil(maxV * 2) / 2;
    const plotW = W - labelW - right;
    const x = (v) => labelW + (Math.max(0, v * 100) / xMax) * plotW;
    const H2 = top + bars.length * rowH + 64;
    const pal = palette();
    const col = { green: pal.green, social: pal.social };
    const parts = [];
    parts.push(`<svg width="${W}" height="${H2}" viewBox="0 0 ${W} ${H2}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="guar-title guar-desc">`);
    parts.push(`<title id="guar-title">Guaranteed versus unsecured spreads</title>`);
    parts.push(`<desc id="guar-desc">Green 3-year guaranteed spread ${F.pts(H.green.spread)}; Social 4-year unsecured ${F.pts(H.social4.spread)}; Social 5-year unsecured ${F.pts(H.social5.spread)}. Guarantee effect used: ${F.pts(s.guaranteeEffect)}, the unsecured spread ${F.pts(gU)} minus the guaranteed spread ${F.pts(gG)}.</desc>`);
    // grid + ticks
    const yAxis = top + bars.length * rowH + 4;
    for (let t = 0; t <= xMax + 1e-9; t += 0.5) {
      const xx = x(t / 100);
      parts.push(`<line class="g-grid" x1="${xx}" x2="${xx}" y1="${top - 6}" y2="${yAxis}"/>`);
      parts.push(`<text class="g-tick" x="${xx}" y="${yAxis + 16}" text-anchor="middle" font-size="${fs - 1}">${t.toFixed(1)}</text>`);
    }
    parts.push(`<text class="g-tick" x="${labelW + plotW / 2}" y="${yAxis + 34}" text-anchor="middle" font-size="${fs - 1}">${small ? 'Spread, percentage points' : 'Spread over tenor-matched government yield, percentage points'}</text>`);
    // bars
    bars.forEach((b, i) => {
      const cy = top + i * rowH + rowH / 2;
      const x0 = x(0);
      const x1 = x(b.v);
      const w = Math.max(0, x1 - x0);
      const r = Math.min(4, w);
      parts.push(`<path d="M${x0},${cy - barH / 2} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${barH - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - r} z" fill="${col[b.cls]}"><title>${b.name} (${b.sub}): ${F.pts(b.v)}</title></path>`);
      parts.push(`<text class="g-label" x="${labelW - 10}" y="${cy - 2}" text-anchor="end" font-size="${fs}">${b.name}</text>`);
      parts.push(`<text x="${labelW - 10}" y="${cy + fs - 1}" text-anchor="end" font-size="${fs - 1.5}">${b.sub}</text>`);
      parts.push(`<text class="g-val" x="${x1 + 6}" y="${cy + 4}" font-size="${fs}">${F.ptsShort(b.v)}</text>`);
    });
    // reference lines for the spreads used now, and the bracket
    const xg = x(gG);
    const xu = x(gU);
    parts.push(`<line class="g-ref" x1="${xg}" x2="${xg}" y1="${top - 14}" y2="${yAxis}"/>`);
    parts.push(`<line class="g-ref" x1="${xu}" x2="${xu}" y1="${top - 14}" y2="${yAxis}"/>`);
    const by = top - 14;
    parts.push(`<path class="g-bracket" d="M${xg},${by + 6} V${by} H${xu} V${by + 6}"/>`);
    const mid = (xg + xu) / 2;
    const effTxt = `Guarantee effect ${F.pts(s.guaranteeEffect)}`;
    const anchor = mid < labelW + 70 ? 'start' : mid > W - 90 ? 'end' : 'middle';
    parts.push(`<text class="g-effect" x="${anchor === 'start' ? Math.min(xg, xu) : anchor === 'end' ? Math.max(xg, xu) : mid}" y="${by - 8}" text-anchor="${anchor}" font-size="${fs}">${effTxt}</text>`);
    parts.push(`<text x="${labelW - 10}" y="${by - 8}" text-anchor="end" font-size="${fs - 1.5}">${small ? 'Used:' : 'Spreads used now:'}</text>`);
    parts.push('</svg>');
    box.innerHTML = parts.join('');
    box.setAttribute('aria-label', `Spread comparison. ${$('#guar-desc', box).textContent}`);
    const cap = document.createElement('p');
    cap.className = 'note';
    cap.style.margin = '6px 6px 2px';
    cap.innerHTML = `The vertical lines mark the spreads used now: guaranteed <strong>${F.pts(gG)}</strong> and unsecured <strong>${F.pts(gU)}</strong>` +
      (Math.abs(p.tenorAdj) > 1e-9 ? ` (including a tenor adjustment of ${F.pts(p.tenorAdj)})` : ' (the Social average)') + '. The bracket between them is the guarantee effect.';
    box.appendChild(cap);
  }

  // ------------------------------------------------------------------ data table

  const NAMES = {
    green_coupon: 'Green Bond coupon', green_tenor: 'Green Bond tenor', green_guarantee: 'Green Bond guarantee',
    green_rating_at_issue: 'Green Bond rating at issue', green_rating_final: 'Green Bond rating after issue',
    afc_rating_at_green: 'AFC entity rating at Green Bond issue', green_opening_date: 'Green Bond opening date',
    gov_green: 'Gov. yield at Green pricing (3y)', social_size: 'Social Bond size', social_rating: 'Social Bond rating',
    social_coupon_4y: 'Social Bond 4-year coupon', social_coupon_5y: 'Social Bond 5-year coupon',
    social_applications: 'Social Bond applications', social_investors: 'Social Bond key investors',
    social_dates: 'Social Bond pricing and opening dates', gov_social_4y: 'Gov. yield at Social pricing (4y)',
    gov_social_5y: 'Gov. yield at Social pricing (5y)', gov_now_bid: 'Gov. yield now (3y), bid',
    gov_now_offer: 'Gov. yield now (3y), offer', gov_auction_13oct: 'Auction 13 Oct 2026, 15.09.29 (reference)',
    gov_1030_oct: '15.10.30 range, mid-Oct 2026 (reference)', gov_auction_29oct: 'Auction 29 Oct 2026, 15.05.30 (reference)',
    orange_size: 'Orange Bond size', orange_tenor: 'Orange Bond tenor', orange_board_date: 'Orange Bond board approval',
    afc_rating_now: 'AFC entity rating now', coverage_factor: 'Coverage factor', partial_share: 'Partial guarantee share',
    tenor_adjustment: 'Tenor adjustment', guarantee_fee: 'Guarantee fee',
  };

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function fmtValue(item) {
    const v = item.value;
    if (typeof v !== 'number') return esc(v);
    if (item.unit === 'LKR m') return F.lkr(v);
    if (item.unit.startsWith('%')) return `${v}${esc(item.unit)}`;
    return `${v} ${esc(item.unit)}`;
  }

  function badge(status) {
    const map = { verified: ['✓ Verified', 'verified'], approximate: ['≈ Approximate', 'approximate'], unverified: ['! Unverified', 'unverified'] };
    const [t, c] = map[status] || [status, 'unverified'];
    return `<span class="badge badge-${c}">${t}</span>`;
  }

  function renderDataTable() {
    const tb = $('#data-table tbody');
    tb.innerHTML = Object.entries(I).map(([k, it], idx) => {
      const changed = it.user_value !== null && it.user_value !== undefined && typeof it.value === 'number' && typeof it.user_value === 'number' && it.user_value !== it.value;
      const user = (it.user_value === null || it.user_value === undefined) ? '' :
        `<div class="in-user">Your figure: ${esc(it.user_value)}${changed ? ' <span class="changed-flag">(changed)</span>' : ''}</div>`;
      const src = it.source_url
        ? `<a href="${esc(it.source_url)}" rel="noopener" target="_blank">${esc(it.source_name)}</a>`
        : esc(it.source_name);
      const qid = 'q-' + idx;
      const quote = it.quote ? `<blockquote>“${esc(it.quote)}”</blockquote>` : '<blockquote>No source quote: this is a model assumption.</blockquote>';
      return `<tr>` +
        `<td data-label="Input"><div class="in-name">${esc(NAMES[k] || k)}</div><div class="in-desc">${esc(it.description)}</div><div class="in-key">${esc(k)}</div></td>` +
        `<td data-label="Value"><div class="in-value">${fmtValue(it)}</div>${user}</td>` +
        `<td data-label="Status">${badge(it.status)}${it.kind === 'assumption' ? ' <span class="badge badge-assumption">Assumption</span>' : ''}</td>` +
        `<td data-label="Source">${src}</td>` +
        `<td data-label="Source date">${esc(F.date(it.source_date))}</td>` +
        `<td data-label="Quote and notes"><button type="button" class="quote-toggle" aria-expanded="false" aria-controls="${qid}">Show quote</button>` +
        `<div class="quote-box" id="${qid}" hidden>${quote}<p class="q-notes">${esc(it.notes)}</p></div></td>` +
        `</tr>`;
    }).join('');
    tb.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.quote-toggle');
      if (!btn) return;
      const box = document.getElementById(btn.getAttribute('aria-controls'));
      const open = box.hidden;
      box.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Hide quote' : 'Show quote';
    });
  }

  // ------------------------------------------------------------------ header + controls

  function renderHeader() {
    $('#as-of').textContent = DATA.meta.data_as_of_label;
    const counts = { verified: 0, approximate: 0, unverified: 0 };
    let assumptions = 0;
    Object.values(I).forEach((it) => { counts[it.status] = (counts[it.status] || 0) + 1; if (it.kind === 'assumption') assumptions++; });
    $('#status-summary').innerHTML =
      `${badge('verified')} ${counts.verified} &nbsp;${badge('approximate')} ${counts.approximate} &nbsp;${badge('unverified')} ${counts.unverified} ` +
      `<a href="#data-h">(${assumptions} are assumptions; see sources)</a>`;
  }

  function currentTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setupTheme() {
    const btn = $('#theme-toggle');
    const label = () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      $('.theme-label', btn).textContent = next === 'dark' ? 'Dark theme' : 'Light theme';
      btn.setAttribute('aria-label', `Switch to the ${next} theme`);
    };
    label();
    btn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('ob-theme', next); } catch (e) { /* storage unavailable */ }
      label();
      update(false);
    });
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => { if (!document.documentElement.getAttribute('data-theme')) { label(); update(false); } };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
  }

  function setupButtons() {
    $('#reset').addEventListener('click', () => {
      SLIDERS.forEach((s) => (state[s.key] = s.base));
      update(true);
      $('#live').textContent = 'Reset to the base case.';
    });
    $('#copy-link').addEventListener('click', async () => {
      const btn = $('#copy-link');
      const url = window.location.href;
      let ok = false;
      try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { ok = false; }
      btn.textContent = ok ? 'Link copied' : 'Copy the address bar URL';
      setTimeout(() => (btn.textContent = 'Copy link to this scenario'), 2000);
    });
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (lastScenario) {
        const p = params();
        renderGuarChart(p, lastScenario);
        if (buildChart) { styleBuildChart(buildChart, palette()); buildChart.update('none'); }
      }
    }, 120);
  });

  // ------------------------------------------------------------------ init

  readURL();
  renderHeader();
  buildSliders();
  renderDataTable();
  setupTheme();
  setupButtons();
  update(false);

  // Exposed for automated checks only (no behaviour depends on it).
  window.OBApp = { state, SLIDERS, base: B, history: H, scenario: () => lastScenario, chart: () => buildChart };
})();
