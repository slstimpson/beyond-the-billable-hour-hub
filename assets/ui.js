/*
 * Shared interface helpers: page chrome, input binding, SVG charts, printing.
 * No third-party libraries, no network calls, no analytics.
 * Every figure a visitor types stays in their own browser.
 */

import { fmt, pct, round, toNumber } from './calc.js?v=7';
export { fmt, pct, round, toNumber };

const PAGES = [
  { href: 'index.html', label: 'Hub' },
  { href: 'check.html', label: 'Three-minute check' },
  { href: 'cost-per-hour.html', label: 'Cost per hour' },
  { href: 'fees.html', label: 'Fees' },
  { href: 'cash-flow.html', label: 'Cash flow' },
  { href: 'ai.html', label: 'AI' },
  { href: 'scorecard.html', label: 'Scorecard' },
  { href: 'matters.html', label: 'Past matters' },
  { href: 'stage.html', label: 'Price a stage' },
  { href: 'money.html', label: 'Client money' },
  { href: 'bonus.html', label: 'Bonus' },
  { href: 'plan.html', label: '30 days' },
  { href: 'summary.html', label: 'Summary' },
  { href: 'resources.html', label: 'Resources' }
];

export function chrome(active) {
  const nav = PAGES.map((p) => {
    const current = p.href === active ? ' aria-current="page"' : '';
    return `<a href="${p.href}"${current}>${p.label}</a>`;
  }).join('');

  const header = `
  <a class="skip" href="#main">Skip to content</a>
  <header class="masthead">
    <div class="wrap masthead-bar">
      <a href="index.html" class="brand">Practice Economics Hub<span>Beyond the Billable Hour</span></a>
      <nav aria-label="Tools">${nav}</nav>
    </div>
  </header>`;

  const footer = `
  <footer class="site">
    <div class="wrap cols">
      <div>
        <img class="footer-brand" src="assets/brand/sls-lockup-white.png" alt="Stuart L. Stimpson, Attorney-at-Law" width="1307" height="360">
        <h4>Practice Economics Hub</h4>
        <p>A companion to <em>Beyond the Billable Hour: The Economics of Modern Legal Practice</em>, the keynote opening Theme 1, Practice Profitability and The Modern Law Firm, at the Jamaican Bar Association Continuing Legal Education Conference, 19 November 2026.</p>
      </div>
      <div>
        <h4>Your figures</h4>
        <p>Everything you type is calculated in this browser and is never sent anywhere. Closing the tab clears it. There is no account, no tracking and no analytics.</p>
      </div>
      <div>
        <h4>What this is not</h4>
        <p>Illustrative financial estimates for educational use. Not legal, accounting or tax advice, and not a fee scale. Default figures are the paper's hypothetical teaching assumptions, not Jamaican market rates.</p>
        <p><a href="resources.html">Sources and assumptions</a></p>
      </div>
    </div>
  </footer>`;

  const printBrand = '<div class="print-only print-brand">'
    + '<img src="assets/brand/sls-lockup.png" alt="Stuart L. Stimpson, Attorney-at-Law" width="1307" height="360">'
    + '</div>';
  document.body.insertAdjacentHTML('afterbegin', header + printBrand);
  document.body.insertAdjacentHTML('beforeend', footer);
}

/* --------------------------------------------------------------- inputs */

/** Reads every [data-field] control in a container into a plain object. */
export function readFields(root) {
  const out = {};
  root.querySelectorAll('[data-field]').forEach((el) => {
    const key = el.dataset.field;
    if (el.type === 'checkbox') out[key] = el.checked;
    else if (el.value === '') out[key] = '';
    else out[key] = el.type === 'number' || el.type === 'range' ? toNumber(el.value) : el.value;
  });
  return out;
}

export function writeFields(root, values) {
  root.querySelectorAll('[data-field]').forEach((el) => {
    const key = el.dataset.field;
    if (!(key in values)) return;
    if (el.type === 'checkbox') el.checked = Boolean(values[key]);
    else el.value = values[key];
    el.dispatchEvent(new Event('input', { bubbles: false }));
  });
}

/** Live recalculation on every keystroke, with range read-outs kept in step. */
export function bind(root, onChange) {
  const run = () => onChange(readFields(root));
  root.addEventListener('input', (e) => {
    const el = e.target;
    if (el.type === 'range' && el.dataset.output) {
      const out = document.getElementById(el.dataset.output);
      if (out) out.textContent = el.dataset.outputFormat === 'percent' ? `${el.value}%` : el.value;
    }
    run();
  });
  root.addEventListener('change', run);
  root.querySelectorAll('input[type="range"][data-output]').forEach((el) => {
    const out = document.getElementById(el.dataset.output);
    if (out) out.textContent = el.dataset.outputFormat === 'percent' ? `${el.value}%` : el.value;
  });
  run();
}

/* ------------------------------------------------------------- rendering */

export function figure({ label, value, note, headline, tone }) {
  const toneClass = tone ? ` ${tone}` : '';
  return `<div class="figure${headline ? ' headline' : ''}">
    <span class="label">${label}</span>
    <span class="value${toneClass}">${value}</span>
    ${note ? `<span class="note">${note}</span>` : ''}
  </div>`;
}

export function toneOf(value) {
  if (value === null || !Number.isFinite(value)) return '';
  return value < 0 ? 'neg' : 'pos';
}

export function workings(lines) {
  return `<details class="working">
    <summary>Show the calculation</summary>
    <ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
  </details>`;
}


/* Shown before anything is entered. A calculator that opens on somebody
   else's numbers invites the reader to treat them as a benchmark, so the
   tools start empty and the paper's example is one button away. */
export function emptyState(lead, hint) {
  return `<div class="empty-state">
    <p class="empty-lead">${lead}</p>
    <p class="empty-hint">${hint}</p>
  </div>`;
}

export function blank(value) {
  return value === '' || value === null || value === undefined || Number.isNaN(value);
}

/* ---------------------------------------------------------------- charts */

const PALETTE = {
  hourly: '#0e2033',
  capped: '#8a94a3',
  fixed: '#0b7f9b',
  hybrid: '#16a3c4',
  cash: '#0b7f9b',
  negative: '#a8382f'
};
export { PALETTE };

function scaleTicks(min, max, count = 4) {
  if (min === max) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

/** Grouped vertical bars. series: [{key,label,colour}], rows: [{label, values{}}] */
export function groupedBars(rows, series, { height = 230, format = fmt } = {}) {
  const W = 680, H = height, padL = 58, padR = 10, padT = 14, padB = 42;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const values = rows.flatMap((r) => series.map((s) => r.values[s.key] ?? 0));
  const max = Math.max(0, ...values), min = Math.min(0, ...values);
  const span = (max - min) || 1;
  const y = (v) => padT + plotH - ((v - min) / span) * plotH;
  const groupW = plotW / rows.length;
  const barW = Math.min(26, (groupW - 14) / series.length);

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Comparison chart" preserveAspectRatio="xMidYMid meet">`;
  scaleTicks(min, max).forEach((t) => {
    svg += `<line class="axis-line" x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    svg += `<text x="${padL - 6}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${shortMoney(t)}</text>`;
  });
  if (min < 0) svg += `<line class="zero-line" x1="${padL}" x2="${W - padR}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>`;

  rows.forEach((row, ri) => {
    const gx = padL + groupW * ri + (groupW - barW * series.length) / 2;
    series.forEach((s, si) => {
      const v = row.values[s.key] ?? 0;
      const top = Math.min(y(v), y(0)), h = Math.max(1, Math.abs(y(v) - y(0)));
      const x = gx + si * barW;
      svg += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="${s.colour}" rx="1"><title>${s.label}, ${row.label}: ${format(v)}</title></rect>`;
    });
    svg += `<text x="${(padL + groupW * ri + groupW / 2).toFixed(1)}" y="${H - padB + 18}" text-anchor="middle">${row.label}</text>`;
  });
  svg += '</svg>';
  return svg + legend(series);
}

/** A single line with optional shaded area, used for the cash curve. */
export function lineChart(points, { height = 240, label = 'Cash at month end', colour = PALETTE.cash, format = fmt } = {}) {
  const W = 680, H = height, padL = 62, padR = 12, padT = 14, padB = 36;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const vals = points.map((p) => p.value);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const span = (max - min) || 1;
  const x = (i) => padL + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const y = (v) => padT + plotH - ((v - min) / span) * plotH;

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">`;
  scaleTicks(min, max).forEach((t) => {
    svg += `<line class="axis-line" x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    svg += `<text x="${padL - 6}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${shortMoney(t)}</text>`;
  });
  if (min < 0) svg += `<line class="zero-line" x1="${padL}" x2="${W - padR}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>`;

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)} L${x(0).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)} Z`;
  svg += `<path d="${area}" fill="${colour}" opacity=".10"/>`;
  svg += `<path d="${d}" fill="none" stroke="${colour}" stroke-width="2.5" stroke-linejoin="round"/>`;

  points.forEach((p, i) => {
    const neg = p.value < 0;
    svg += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="${neg ? 4.5 : 3}" fill="${neg ? PALETTE.negative : colour}"><title>${p.label}: ${format(p.value)}</title></circle>`;
    if (points.length <= 14 || i % 2 === 0) {
      svg += `<text x="${x(i).toFixed(1)}" y="${H - padB + 18}" text-anchor="middle">${p.label}</text>`;
    }
  });
  svg += '</svg>';
  return svg;
}

/** Several lines on one set of axes, for the collection-delay comparison. */
export function multiLine(series, { height = 240, format = fmt } = {}) {
  const W = 680, H = height, padL = 62, padR = 12, padT = 14, padB = 36;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const all = series.flatMap((s) => s.points.map((p) => p.value));
  const max = Math.max(0, ...all), min = Math.min(0, ...all);
  const span = (max - min) || 1;
  const n = Math.max(...series.map((s) => s.points.length));
  const x = (i) => padL + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v) => padT + plotH - ((v - min) / span) * plotH;

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Comparison of collection delays" preserveAspectRatio="xMidYMid meet">`;
  scaleTicks(min, max).forEach((t) => {
    svg += `<line class="axis-line" x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    svg += `<text x="${padL - 6}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${shortMoney(t)}</text>`;
  });
  if (min < 0) svg += `<line class="zero-line" x1="${padL}" x2="${W - padR}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>`;

  series.forEach((s) => {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    svg += `<path d="${d}" fill="none" stroke="${s.colour}" stroke-width="${s.emphasis ? 3 : 2}" stroke-dasharray="${s.dash || ''}" stroke-linejoin="round"/>`;
    s.points.forEach((p, i) => {
      if (p.value < 0) svg += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="4" fill="${PALETTE.negative}"><title>${s.label}, ${p.label}: ${format(p.value)}</title></circle>`;
    });
  });
  for (let i = 0; i < n; i += 1) {
    if (n <= 14 || i % 2 === 0) svg += `<text x="${x(i).toFixed(1)}" y="${H - padB + 18}" text-anchor="middle">${i + 1}</text>`;
  }
  svg += '</svg>';
  return svg + legend(series.map((s) => ({ label: s.label, colour: s.colour })));
}

/** Horizontal bars, used where labels are long. */
export function horizontalBars(rows, { height, format = fmt } = {}) {
  const W = 680, rowH = 34, padL = 150, padR = 60, padT = 8;
  const H = height || padT * 2 + rows.length * rowH;
  const plotW = W - padL - padR;
  const vals = rows.map((r) => r.value);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const span = (max - min) || 1;
  const x = (v) => padL + ((v - min) / span) * plotW;

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Comparison" preserveAspectRatio="xMidYMid meet">`;
  if (min < 0) svg += `<line class="zero-line" x1="${x(0).toFixed(1)}" x2="${x(0).toFixed(1)}" y1="${padT}" y2="${H - padT}"/>`;
  rows.forEach((r, i) => {
    const yPos = padT + i * rowH + 6;
    const start = Math.min(x(r.value), x(0)), w = Math.max(1, Math.abs(x(r.value) - x(0)));
    svg += `<text x="${padL - 8}" y="${yPos + 14}" text-anchor="end">${r.label}</text>`;
    svg += `<rect x="${start.toFixed(1)}" y="${yPos}" width="${w.toFixed(1)}" height="20" rx="2" fill="${r.colour || (r.value < 0 ? PALETTE.negative : PALETTE.fixed)}"><title>${r.label}: ${format(r.value)}</title></rect>`;
    svg += `<text x="${(start + w + 6).toFixed(1)}" y="${yPos + 14}">${format(r.value)}</text>`;
  });
  svg += '</svg>';
  return svg;
}

function legend(series) {
  return `<div class="legend">${series.map((s) => `<span><i style="background:${s.colour}"></i>${s.label}</span>`).join('')}</div>`;
}

function shortMoney(v) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${round(abs / 1000000, 1)}m`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
  return `${sign}${Math.round(abs)}`;
}


/* ------------------------------------------------------- printable report

   A calculator is only useful later if the figures behind it travel with it.
   In print the input panel is replaced by a compact record of what was
   entered, under a heading and a date, followed by the results as shown. */

export function fieldLabelText(el) {
  const field = el.closest('.field');
  const label = field ? field.querySelector('label') : null;
  if (!label) return el.dataset.field;
  let text = '';
  for (const node of label.childNodes) {
    if (node.nodeType === 3) text += node.textContent;
  }
  return text.replace(/\s+/g, ' ').trim() || el.dataset.field;
}

function fieldValueText(el) {
  if (el.type === 'range') return `${el.value}%`;
  if (el.tagName === 'SELECT') return el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value;
  if (el.value === '') return '\u2014';
  const n = toNumber(el.value, NaN);
  if (!Number.isFinite(n)) return el.value;
  // hours and counts are plain numbers; money carries its prefix in the markup
  const money = el.closest('.prefix') !== null;
  return money ? fmt(n) : String(n);
}

export function collectInputs(form) {
  return Array.from(form.querySelectorAll('[data-field]')).map((el) => ({
    label: fieldLabelText(el),
    value: fieldValueText(el)
  }));
}

export function collectFigures(root) {
  return Array.from((root || document).querySelectorAll('.figure')).map((el) => ({
    label: (el.querySelector('.label') || {}).textContent || '',
    value: (el.querySelector('.value') || {}).textContent || ''
  }));
}

/* Wires the Print and Copy buttons on a calculator page and keeps the printed
   record of the inputs in step with the form. Call the returned update()
   after every recalculation. */
export function setupReport(form, title) {
  const host = document.getElementById('printReport');
  if (!host) return function () {};

  function update() {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const inputs = collectInputs(form);
    host.innerHTML = `
      <h2 class="report-title">${title}</h2>
      <p class="report-meta">Practice Economics Hub, ${date}. Figures entered by the user. Illustrative estimates only, not legal, accounting or tax advice.</p>
      <table class="report-inputs">
        <thead><tr><th>What was entered</th><th>Value</th></tr></thead>
        <tbody>${inputs.map((i) => `<tr><td>${i.label}</td><td>${i.value}</td></tr>`).join('')}</tbody>
      </table>`;
    saveReport(title, collectFigures(document.getElementById('results')));
  }

  const printBtn = document.querySelector('[data-print]');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      update();
      // the calculation belongs on the printed record, not folded away
      document.querySelectorAll('details.working').forEach((d) => { d.open = true; });
      window.print();
    });
  }

  const copyBtn = document.querySelector('[data-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const lines = [
        title,
        `Practice Economics Hub, ${date}`,
        '',
        'What you entered',
        ...collectInputs(form).map((i) => `  ${i.label}: ${i.value}`),
        '',
        'Results',
        ...collectFigures().map((f) => `  ${f.label}: ${f.value}`),
        '',
        'Illustrative estimates only. Not legal, accounting or tax advice. A fee must still be',
        'fair and reasonable under Canon IV(f) in the circumstances of the actual matter.',
        'From "Beyond the Billable Hour", Stuart L. Stimpson, JAMBAR CLE 2026.'
      ].join('\n');
      copyToClipboard(lines, e.target);
    });
  }

  update();
  return update;
}

/* ------------------------------------------------------- session storage */

/*
 * sessionStorage, not localStorage: everything here disappears when the tab
 * closes and none of it is sent anywhere. What is kept for the life of the
 * tab: the diagnostic answers, the 30-day ticks, the cost of an hour (so the
 * other tools can offer it) and the headline results of each tool used, so
 * that the Summary page can gather them. Nothing identifying a client is
 * ever asked for.
 */
const KEY = 'bbh-hub';

export function remember(slice, value) {
  try {
    const all = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    all[slice] = value;
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) { /* private browsing or storage disabled: carry on without it */ }
}

export function recall(slice, fallback = null) {
  try {
    const all = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    return slice in all ? all[slice] : fallback;
  } catch (e) { return fallback; }
}

/** Keeps a tool's headline results for the Summary page. An empty list removes it. */
export function saveReport(title, figures, href) {
  const reports = recall('reports', {}) || {};
  const page = href || window.location.pathname.split('/').pop() || 'index.html';
  const clean = (figures || []).filter((f) => f && f.label && f.value && f.value !== '\u2014');
  if (clean.length === 0) delete reports[page];
  else reports[page] = { title, figures: clean.map((f) => ({ label: f.label.trim(), value: f.value.trim() })) };
  remember('reports', reports);
}

export function forgetAll() {
  try { sessionStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
}

/* ------------------------------------------------------------- utilities */

export function copyToClipboard(text, button) {
  const done = () => {
    if (!button) return;
    const original = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = original; }, 1800);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try { document.execCommand('copy'); done(); } catch (e) { /* the user can select it manually */ }
  document.body.removeChild(area);
}

/** ?demo=1 opens a tool with the paper's figures already in place. */
export function isDemo() {
  return new URLSearchParams(window.location.search).get('demo') === '1';
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
