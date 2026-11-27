// mod5_reports.js · Stage 4 r2 (Mobile-First Segmented Reports + Custom Date Range)
(function () {
  'use strict';

  const { useState, useMemo, useCallback, useRef } = React;

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toISO(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function parseISO(iso) {
    const p = String(iso || '').split('-').map(Number);
    if (p.length !== 3 || !p[0]) return new Date();
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function daysInclusive(startISO, endISO) {
    const a = parseISO(startISO);
    const b = parseISO(endISO);
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
  }

  function shiftISO(iso, deltaDays) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + deltaDays);
    return toISO(d);
  }

  function formatDisplayDate(iso) {
    if (!iso) return '未設定';
    const p = String(iso).split('-');
    if (p.length !== 3) return iso;
    return `${p[0]} / ${p[1]} / ${p[2]}`;
  }

  function formatCompactRange(startISO, endISO) {
    if (!startISO || !endISO) return '選擇區間';
    const a = startISO.split('-');
    const b = endISO.split('-');
    if (a.length !== 3 || b.length !== 3) return `${startISO}–${endISO}`;
    if (a[0] === b[0]) {
      return `${Number(a[1])}/${Number(a[2])} – ${Number(b[1])}/${Number(b[2])}`;
    }
    return `${a[0].slice(2)}/${Number(a[1])}/${Number(a[2])}–${b[0].slice(2)}/${Number(b[1])}/${Number(b[2])}`;
  }

  function formatCompactBase(val) {
    const abs = Math.abs(Number(val || 0));
    if (abs >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (abs >= 10000) return `${(val / 1000).toFixed(0)}k`;
    if (abs >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return `${Math.round(val)}`;
  }

  function buildPresetRanges() {
    const now = new Date();
    const today = toISO(now);
    const y = now.getFullYear();
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const d7 = new Date(y, now.getMonth(), now.getDate() - 6);
    const d30 = new Date(y, now.getMonth(), now.getDate() - 29);
    const d90 = new Date(y, now.getMonth(), now.getDate() - 89);
    const qStart = new Date(y, qStartMonth, 1);
    const ytdStart = new Date(y, 0, 1);
    const y1Start = new Date(y - 1, now.getMonth(), now.getDate() + 1);
    return [
      { id: '7d', label: '近 7 天', start: toISO(d7), end: today },
      { id: '30d', label: '近 30 天', start: toISO(d30), end: today },
      { id: '90d', label: '近 90 天', start: toISO(d90), end: today },
      { id: 'quarter', label: '本季至今', start: toISO(qStart), end: today },
      { id: 'ytd', label: '今年至今', start: toISO(ytdStart), end: today },
      { id: '1y', label: '近一年', start: toISO(y1Start), end: today }
    ];
  }

  // ---- Pure SVG Interactive Dual-Bar Trend Chart ----
  function CashflowBarChart({ series, selectedKey, onSelect, baseCurrency, privacyMode }) {
    const Store = window.WealthStore;
    if (!series || series.length === 0) return null;

    const maxVal = Math.max(
      1,
      ...series.map((s) => Math.max(s.inc || 0, s.exp || 0))
    );
    const activeItem = series.find((s) => s.key === selectedKey) || series[series.length - 1];
    const isDense = series.length > 8;
    const vbW = 340;
    const vbH = 148;
    const padL = 8;
    const padR = 8;
    const padT = 14;
    const padB = 26;
    const chartW = vbW - padL - padR;
    const chartH = vbH - padT - padB;
    const slotW = chartW / series.length;
    const barW = isDense ? Math.max(4.5, slotW * 0.30) : Math.min(14, slotW * 0.28);
    const gap = isDense ? 1.2 : 3;

    return (
      <div className="space-y-2.5">
        {activeItem && (
          <div className="px-3 py-2 rounded-xl bg-black/45 border border-white/[0.07] flex items-center justify-between gap-2 text-[11.5px] tabular-nums">
            <span className="font-semibold text-white shrink-0">{activeItem.fullLabel}</span>
            <div className="flex items-center gap-2.5 min-w-0 justify-end flex-wrap">
              <span className="text-emerald-400">收 {Store.formatMoney(activeItem.inc, baseCurrency)}</span>
              <span className="text-zinc-300">支 {Store.formatMoney(activeItem.exp, baseCurrency)}</span>
              <span className={activeItem.net >= 0 ? 'text-sky-300 font-semibold' : 'text-rose-400 font-semibold'}>
                淨 {Store.formatMoney(activeItem.net, baseCurrency, { showPlus: true })}
              </span>
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-auto select-none overflow-visible">
          {[0.25, 0.5, 0.75, 1].map((r) => {
            const y = padT + chartH * (1 - r);
            return (
              <line
                key={r}
                x1={padL}
                x2={vbW - padR}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}

          <line
            x1={padL}
            x2={vbW - padR}
            y1={padT + chartH}
            y2={padT + chartH}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {series.map((item, idx) => {
            const cx = padL + slotW * idx + slotW / 2;
            const incH = Math.max(item.inc > 0 ? 3 : 0, (item.inc / maxVal) * chartH);
            const expH = Math.max(item.exp > 0 ? 3 : 0, (item.exp / maxVal) * chartH);
            const isSel = activeItem && item.key === activeItem.key;
            const showTick = !isDense || series.length <= 12 || idx % 2 === 0 || idx === series.length - 1;

            return (
              <g
                key={item.key}
                onClick={() => onSelect && onSelect(item.key)}
                className="cursor-pointer"
              >
                {isSel && (
                  <rect
                    x={padL + slotW * idx + 1.5}
                    y={padT - 4}
                    width={Math.max(4, slotW - 3)}
                    height={chartH + 26}
                    rx="7"
                    fill="rgba(255,255,255,0.07)"
                  />
                )}
                <rect
                  x={cx - barW - gap / 2}
                  y={padT + chartH - incH}
                  width={barW}
                  height={incH}
                  rx={Math.min(4, barW / 2)}
                  fill={isSel ? '#34D399' : 'rgba(52,211,153,0.58)'}
                />
                <rect
                  x={cx + gap / 2}
                  y={padT + chartH - expH}
                  width={barW}
                  height={expH}
                  rx={Math.min(4, barW / 2)}
                  fill={isSel ? '#F4F4F5' : 'rgba(212,212,216,0.42)'}
                />
                {showTick && (
                  <text
                    x={cx}
                    y={vbH - 7}
                    textAnchor="middle"
                    fontSize={isDense ? '8' : '9.5'}
                    fontWeight={isSel ? '700' : '500'}
                    fill={isSel ? '#FFFFFF' : '#71717A'}
                  >
                    {item.shortLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex items-center justify-between text-[10.5px] text-zinc-500 px-1">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-emerald-400" /> 純收入
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-zinc-200" /> 純支出
            </span>
          </div>
          <span>{privacyMode ? '隱私模式' : `最高 ${formatCompactBase(maxVal)}`}</span>
        </div>
      </div>
    );
  }

  // ---- Pure SVG Interactive Donut Chart ----
  function CategoryDonut({ slices, total, activeId, onSelect, baseCurrency, centerTitle }) {
    const Store = window.WealthStore;
    const size = 136;
    const stroke = 16;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const activeSlice = slices.find((s) => s.id === activeId) || null;

    let accPct = 0;
    const segments = slices.map((s) => {
      const frac = total > 0 ? s.amount / total : 0;
      const len = frac * circ;
      const offset = -accPct * circ;
      accPct += frac;
      return { slice: s, len, offset };
    });

    return (
      <div className="flex items-center gap-3.5">
        <div className="relative w-[136px] h-[136px] shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={stroke}
            />
            {segments.map(({ slice, len, offset }) => {
              const isAct = activeId === slice.id;
              const gapLen = slices.length > 1 ? 2.2 : 0;
              const visLen = Math.max(0.5, len - gapLen);
              return (
                <circle
                  key={slice.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isAct ? stroke + 3 : stroke}
                  strokeDasharray={`${visLen} ${circ - visLen}`}
                  strokeDashoffset={offset}
                  opacity={activeId && !isAct ? 0.38 : 1}
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => onSelect && onSelect(slice)}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2.5 pointer-events-none">
            <div className="text-[10px] text-zinc-400 truncate max-w-[88px]">
              {activeSlice ? activeSlice.name : centerTitle}
            </div>
            <div className="text-[13.5px] font-bold text-white tabular-nums mt-0.5 leading-tight">
              {activeSlice
                ? `${activeSlice.pct}%`
                : Store.formatMoney(total, baseCurrency)}
            </div>
            {activeSlice && (
              <div className="text-[9.5px] text-zinc-300 tabular-nums mt-0.5 truncate max-w-[88px]">
                {Store.formatMoney(activeSlice.amount, baseCurrency)}
              </div>
            )}
          </div>
        </div>

        {/* Right Top 4 Legend */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {slices.slice(0, 4).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect && onSelect(s)}
              className="w-full flex items-center justify-between gap-2 text-left rounded-lg px-2 py-1 active:bg-white/10 transition"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[12px] text-zinc-200 truncate">{s.name}</span>
              </span>
              <span className="text-[11.5px] font-semibold text-zinc-300 tabular-nums shrink-0">
                {s.pct}%
              </span>
            </button>
          ))}
          {slices.length > 4 && (
            <div className="text-[10px] text-zinc-500 px-2">
              另有 {slices.length - 4} 項（點分類看明細）
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Pure SVG Snapshot Trend Line Chart ----
  function SnapshotTrendChart({ snapshots, baseCurrency }) {
    const Store = window.WealthStore;
    const chrono = useMemo(() => [...(snapshots || [])].reverse(), [snapshots]);
    const [activeIdx, setActiveIdx] = useState(chrono.length - 1);

    if (chrono.length < 2) return null;

    const safeIdx = Math.min(chrono.length - 1, Math.max(0, activeIdx));
    const activeSnap = chrono[safeIdx];
    const vals = chrono.map((s) => Number(s.totalValueBase || 0));
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const span = Math.max(1, maxV - minV);
    const yMin = Math.max(0, minV - span * 0.15);
    const yMax = maxV + span * 0.12;
    const ySpan = Math.max(1, yMax - yMin);

    const vbW = 340;
    const vbH = 128;
    const padL = 12;
    const padR = 12;
    const padT = 14;
    const padB = 22;
    const plotW = vbW - padL - padR;
    const plotH = vbH - padT - padB;

    const pts = chrono.map((s, idx) => {
      const x = padL + (chrono.length === 1 ? plotW / 2 : (idx / (chrono.length - 1)) * plotW);
      const y = padT + plotH - ((Number(s.totalValueBase || 0) - yMin) / ySpan) * plotH;
      return { x, y, s, idx };
    });

    const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

    return (
      <div className="space-y-2">
        {activeSnap && (
          <div className="px-3 py-2 rounded-xl bg-black/45 border border-white/[0.07] flex items-center justify-between gap-2 text-[11.5px] tabular-nums">
            <span className="text-zinc-300 truncate">{activeSnap.label} ({activeSnap.date})</span>
            <span className="text-emerald-300 font-bold shrink-0">
              {Store.formatMoney(activeSnap.totalValueBase, baseCurrency)}
            </span>
          </div>
        )}

        <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-auto select-none">
          <defs>
            <linearGradient id="snapAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          <line x1={padL} x2={vbW - padR} y1={padT + plotH} y2={padT + plotH} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
          <path d={areaD} fill="url(#snapAreaGrad)" />
          <path d={lineD} fill="none" stroke="#34D399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

          {pts.map((p) => {
            const isSel = p.idx === safeIdx;
            return (
              <g key={p.s.id} onClick={() => setActiveIdx(p.idx)} className="cursor-pointer">
                <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                {isSel && <circle cx={p.x} cy={p.y} r="7" fill="rgba(52,211,153,0.25)" />}
                <circle cx={p.x} cy={p.y} r={isSel ? '4.2' : '3'} fill={isSel ? '#34D399' : '#0B0B0D'} stroke="#34D399" strokeWidth="2" />
                <text x={p.x} y={vbH - 5} textAnchor="middle" fontSize="9" fontWeight={isSel ? '700' : '500'} fill={isSel ? '#FFFFFF' : '#71717A'}>
                  {(p.s.date || '').slice(2, 7)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // ---- Compact Sub-View Pill Bar ----
  function SubViewPills({ options, value, onChange }) {
    return (
      <div className="flex items-center gap-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`flex-1 py-2 px-2 rounded-xl text-[12px] font-semibold transition whitespace-nowrap border ${
                active
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-[#141417] text-zinc-400 border-white/[0.08] active:bg-white/10'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  // ---- Main Mobile-First Reports View (Module 5 · Stage 4 r2) ----
  function ReportsView({ state }) {
    const { Icon, SegmentedControl, BottomSheet, useHorizontalSwipe } = window.WealthUI;
    const Store = window.WealthStore;
    const baseCur = state.meta.baseCurrency;
    const now = new Date();
    const todayStr = Store.todayISO();
    const bodyScrollRef = useRef(null);

    // Top 3 Main Tabs: CASHFLOW | NETWORTH | INVEST
    const [reportTab, setReportTab] = useState('CASHFLOW');

    // Dedicated Sub-View State for Each Main Tab (Eliminates Infinite Scrolling!)
    const [cfSubView, setCfSubView] = useState('CATEGORY'); // CATEGORY | TREND | POOLS
    const [nwSubView, setNwSubView] = useState('OVERVIEW'); // OVERVIEW | CURRENCY | POOLS
    const [invSubView, setInvSubView] = useState('RANKING'); // RANKING | TREND | REALIZED

    // Cashflow Period States (MONTH | YEAR | CUSTOM)
    const [cfGranularity, setCfGranularity] = useState('MONTH');
    const [cfYear, setCfYear] = useState(now.getFullYear());
    const [cfMonth, setCfMonth] = useState(now.getMonth());
    const [cfCustomStart, setCfCustomStart] = useState(() => shiftISO(todayStr, -29));
    const [cfCustomEnd, setCfCustomEnd] = useState(todayStr);
    const [cfTypeTab, setCfTypeTab] = useState('EXPENSE'); // EXPENSE | INCOME
    const [selectedBarKey, setSelectedBarKey] = useState(null);

    // Investment Performance Scope States (ALL | THIS_YEAR | LAST_YEAR | CUSTOM)
    const [invScope, setInvScope] = useState('ALL');
    const [invCustomStart, setInvCustomStart] = useState(() => `${now.getFullYear()}-01-01`);
    const [invCustomEnd, setInvCustomEnd] = useState(todayStr);

    // Custom Date Range Picker BottomSheet (Shared for Cashflow & Invest)
    const [rangeSheetFor, setRangeSheetFor] = useState(null); // 'CASHFLOW' | 'INVEST' | null
    const [rangeDraft, setRangeDraft] = useState({ start: cfCustomStart, end: cfCustomEnd });

    // Drill-Down BottomSheets (Zero vertical bloat on main screen!)
    const [detailCat, setDetailCat] = useState(null);
    const [detailPool, setDetailPool] = useState(null);

    const presets = useMemo(() => buildPresetRanges(), []);
    const metrics = useMemo(() => Store.getSummaryMetrics(state), [state]);

    const scrollBodyTop = () => {
      if (bodyScrollRef.current) bodyScrollRef.current.scrollTop = 0;
    };

    // Horizontal swipe inside the sub-view area cycles smoothly between sub-views
    const CF_SUBS = ['CATEGORY', 'TREND', 'POOLS'];
    const NW_SUBS = ['OVERVIEW', 'CURRENCY', 'POOLS'];
    const INV_SUBS = ['RANKING', 'TREND', 'REALIZED'];

    const subSwipeHandlers = useHorizontalSwipe(
      useCallback(() => {
        if (reportTab === 'CASHFLOW') {
          setCfSubView((c) => CF_SUBS[Math.min(CF_SUBS.length - 1, CF_SUBS.indexOf(c) + 1)]);
        } else if (reportTab === 'NETWORTH') {
          setNwSubView((c) => NW_SUBS[Math.min(NW_SUBS.length - 1, NW_SUBS.indexOf(c) + 1)]);
        } else {
          setInvSubView((c) => INV_SUBS[Math.min(INV_SUBS.length - 1, INV_SUBS.indexOf(c) + 1)]);
        }
        scrollBodyTop();
      }, [reportTab]),
      useCallback(() => {
        if (reportTab === 'CASHFLOW') {
          setCfSubView((c) => CF_SUBS[Math.max(0, CF_SUBS.indexOf(c) - 1)]);
        } else if (reportTab === 'NETWORTH') {
          setNwSubView((c) => NW_SUBS[Math.max(0, NW_SUBS.indexOf(c) - 1)]);
        } else {
          setInvSubView((c) => INV_SUBS[Math.max(0, INV_SUBS.indexOf(c) - 1)]);
        }
        scrollBodyTop();
      }, [reportTab])
    );

    const openRangeSheet = (target) => {
      if (target === 'INVEST') {
        setRangeDraft({ start: invCustomStart, end: invCustomEnd });
      } else {
        setRangeDraft({ start: cfCustomStart, end: cfCustomEnd });
      }
      setRangeSheetFor(target);
    };

    const applyRangeDraft = () => {
      let s = rangeDraft.start || todayStr;
      let e = rangeDraft.end || todayStr;
      if (s > e) {
        const tmp = s;
        s = e;
        e = tmp;
      }
      if (rangeSheetFor === 'INVEST') {
        setInvCustomStart(s);
        setInvCustomEnd(e);
        setInvScope('CUSTOM');
      } else {
        setCfCustomStart(s);
        setCfCustomEnd(e);
        setCfGranularity('CUSTOM');
        setSelectedBarKey(null);
      }
      setRangeSheetFor(null);
    };

    const shiftPeriod = (delta) => {
      setSelectedBarKey(null);
      if (cfGranularity === 'YEAR') {
        setCfYear((y) => y + delta);
      } else if (cfGranularity === 'MONTH') {
        const d = new Date(cfYear, cfMonth + delta, 1);
        setCfYear(d.getFullYear());
        setCfMonth(d.getMonth());
      } else {
        const span = daysInclusive(cfCustomStart, cfCustomEnd);
        setCfCustomStart((s) => shiftISO(s, delta * span));
        setCfCustomEnd((e) => shiftISO(e, delta * span));
      }
    };

    // Active & Previous Date Windows for Cashflow
    const cfWindow = useMemo(() => {
      if (cfGranularity === 'YEAR') {
        return {
          start: `${cfYear}-01-01`,
          end: `${cfYear}-12-31`,
          prevStart: `${cfYear - 1}-01-01`,
          prevEnd: `${cfYear - 1}-12-31`,
          title: `${cfYear}年`,
          days: daysInclusive(`${cfYear}-01-01`, `${cfYear}-12-31`)
        };
      }
      if (cfGranularity === 'MONTH') {
        const startD = new Date(cfYear, cfMonth, 1);
        const endD = new Date(cfYear, cfMonth + 1, 0);
        const pStartD = new Date(cfYear, cfMonth - 1, 1);
        const pEndD = new Date(cfYear, cfMonth, 0);
        const s = toISO(startD);
        const e = toISO(endD);
        return {
          start: s,
          end: e,
          prevStart: toISO(pStartD),
          prevEnd: toISO(pEndD),
          title: `${cfYear}年${cfMonth + 1}月`,
          days: daysInclusive(s, e)
        };
      }
      const s = cfCustomStart <= cfCustomEnd ? cfCustomStart : cfCustomEnd;
      const e = cfCustomStart <= cfCustomEnd ? cfCustomEnd : cfCustomStart;
      const span = daysInclusive(s, e);
      return {
        start: s,
        end: e,
        prevStart: shiftISO(s, -span),
        prevEnd: shiftISO(s, -1),
        title: formatCompactRange(s, e),
        days: span
      };
    }, [cfGranularity, cfYear, cfMonth, cfCustomStart, cfCustomEnd]);

    // ---- 1. Cashflow Data Computations (Supports Month / Year / Arbitrary Custom Date Range!) ----
    const cashflowData = useMemo(() => {
      let inc = 0;
      let exp = 0;
      let prevInc = 0;
      let prevExp = 0;
      let expTxCount = 0;
      let incTxCount = 0;
      const dailyExpMap = {};
      const catMap = new Map();
      const poolMap = new Map();

      const catLookup = (id) => (state.categories || []).find((c) => c.id === id);
      const poolLookup = (id) => (state.pools || []).find((p) => p.id === id);

      (state.transactions || []).forEach((tx) => {
        if (!tx.date) return;
        if (tx.type !== 'INCOME' && tx.type !== 'EXPENSE') return;
        const amtBase = Store.convertToBase(tx.amount, tx.currency, state);

        if (tx.date >= cfWindow.prevStart && tx.date <= cfWindow.prevEnd) {
          if (tx.type === 'INCOME') prevInc = Store.round2(prevInc + amtBase);
          else prevExp = Store.round2(prevExp + amtBase);
        }

        if (tx.date < cfWindow.start || tx.date > cfWindow.end) return;

        if (tx.type === 'INCOME') {
          inc = Store.round2(inc + amtBase);
          incTxCount += 1;
        } else {
          exp = Store.round2(exp + amtBase);
          expTxCount += 1;
          dailyExpMap[tx.date] = Store.round2((dailyExpMap[tx.date] || 0) + amtBase);
        }

        if (tx.type === 'EXPENSE') {
          const pid = tx.poolId || (state.pools[0] && state.pools[0].id) || 'pool_liquid';
          const pObj = poolLookup(pid) || { id: pid, name: '一般資金池', color: '#9CA3AF' };
          if (!poolMap.has(pid)) {
            poolMap.set(pid, { id: pid, name: pObj.name, color: pObj.color || '#9CA3AF', amount: 0, count: 0, txs: [] });
          }
          const pe = poolMap.get(pid);
          pe.amount = Store.round2(pe.amount + amtBase);
          pe.count += 1;
          pe.txs.push({
            id: tx.id,
            title: tx.title,
            date: tx.date,
            amount: tx.amount,
            currency: tx.currency,
            amountBase: amtBase
          });
        }

        if (tx.type === cfTypeTab) {
          const cid = tx.categoryId || '__uncat__';
          const cObj = catLookup(cid) || { id: cid, name: '未分類', icon: 'tag', color: '#71717A' };
          if (!catMap.has(cid)) {
            catMap.set(cid, {
              id: cid,
              name: cObj.name,
              icon: cObj.icon || 'tag',
              color: cObj.color || '#9CA3AF',
              amount: 0,
              count: 0,
              subs: new Map(),
              txs: []
            });
          }
          const entry = catMap.get(cid);
          entry.amount = Store.round2(entry.amount + amtBase);
          entry.count += 1;
          entry.txs.push({
            id: tx.id,
            title: tx.title,
            subCategoryName: tx.subCategoryName || '',
            date: tx.date,
            amount: tx.amount,
            currency: tx.currency,
            amountBase: amtBase
          });
          const subName = tx.subCategoryName || tx.title || '一般項目';
          entry.subs.set(subName, Store.round2((entry.subs.get(subName) || 0) + amtBase));
        }
      });

      const net = Store.round2(inc - exp);
      const savingsRate = inc > 0 ? Math.round((net / inc) * 100) : 0;
      const expDeltaPct = prevExp > 0 ? Math.round(((exp - prevExp) / prevExp) * 100) : null;
      const incDeltaPct = prevInc > 0 ? Math.round(((inc - prevInc) / prevInc) * 100) : null;
      const avgDailyExp = Store.round2(exp / Math.max(1, cfWindow.days));

      let peakExpDay = null;
      let peakExpVal = 0;
      Object.keys(dailyExpMap).forEach((d) => {
        if (dailyExpMap[d] > peakExpVal) {
          peakExpVal = dailyExpMap[d];
          peakExpDay = d;
        }
      });

      const targetTotal = cfTypeTab === 'EXPENSE' ? exp : inc;
      const categories = Array.from(catMap.values())
        .sort((a, b) => b.amount - a.amount)
        .map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          amount: c.amount,
          count: c.count,
          pct: targetTotal > 0 ? Math.round((c.amount / targetTotal) * 100) : 0,
          subList: Array.from(c.subs.entries())
            .map(([name, amount]) => ({
              name,
              amount,
              pct: c.amount > 0 ? Math.round((amount / c.amount) * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount),
          txs: c.txs.sort((a, b) => (a.date < b.date ? 1 : -1))
        }));

      const poolSpending = Array.from(poolMap.values())
        .sort((a, b) => b.amount - a.amount)
        .map((p) => Object.assign({}, p, {
          pct: exp > 0 ? Math.round((p.amount / exp) * 100) : 0,
          txs: p.txs.sort((a, b) => (a.date < b.date ? 1 : -1))
        }));

      return {
        inc,
        exp,
        net,
        savingsRate,
        expDeltaPct,
        incDeltaPct,
        expTxCount,
        incTxCount,
        avgDailyExp,
        peakExpDay,
        peakExpVal,
        targetTotal,
        categories,
        poolSpending
      };
    }, [state, cfWindow, cfTypeTab]);

    // Adaptive Trend Series (6-Month / 12-Month / Smart Daily-Weekly-Monthly for Custom Range!)
    const trendData = useMemo(() => {
      const slots = [];
      let chartTitle = '近 6 個月收支趨勢';

      if (cfGranularity === 'YEAR') {
        chartTitle = `${cfYear}年 逐月收支趨勢`;
        for (let m = 0; m < 12; m++) {
          const s = toISO(new Date(cfYear, m, 1));
          const e = toISO(new Date(cfYear, m + 1, 0));
          slots.push({ key: `${cfYear}-${pad2(m + 1)}`, start: s, end: e, shortLabel: `${m + 1}月`, fullLabel: `${cfYear}年${m + 1}月`, inc: 0, exp: 0, net: 0 });
        }
      } else if (cfGranularity === 'MONTH') {
        chartTitle = '近 6 個月收支趨勢';
        for (let i = 5; i >= 0; i--) {
          const d = new Date(cfYear, cfMonth - i, 1);
          const s = toISO(d);
          const e = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
          slots.push({ key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`, start: s, end: e, shortLabel: `${d.getMonth() + 1}月`, fullLabel: `${d.getFullYear()}年${d.getMonth() + 1}月`, inc: 0, exp: 0, net: 0 });
        }
      } else {
        const span = cfWindow.days;
        if (span <= 14) {
          chartTitle = `逐日收支趨勢（${span} 天）`;
          for (let i = 0; i < span; i++) {
            const iso = shiftISO(cfWindow.start, i);
            const parts = iso.split('-');
            slots.push({ key: iso, start: iso, end: iso, shortLabel: `${Number(parts[1])}/${Number(parts[2])}`, fullLabel: iso, inc: 0, exp: 0, net: 0 });
          }
        } else if (span <= 62) {
          const bucketCount = Math.min(10, Math.max(4, Math.ceil(span / 7)));
          const step = Math.ceil(span / bucketCount);
          chartTitle = `分段收支趨勢（${span} 天）`;
          let cur = cfWindow.start;
          let idx = 0;
          while (cur <= cfWindow.end && idx < 12) {
            const nxtEnd = shiftISO(cur, step - 1);
            const bEnd = nxtEnd > cfWindow.end ? cfWindow.end : nxtEnd;
            const sp = cur.split('-');
            slots.push({
              key: `${cur}_${bEnd}`,
              start: cur,
              end: bEnd,
              shortLabel: `${Number(sp[1])}/${Number(sp[2])}`,
              fullLabel: formatCompactRange(cur, bEnd),
              inc: 0,
              exp: 0,
              net: 0
            });
            cur = shiftISO(bEnd, 1);
            idx++;
          }
        } else {
          chartTitle = `區間逐月趨勢（${span} 天）`;
          const sD = parseISO(cfWindow.start);
          const eD = parseISO(cfWindow.end);
          let y = sD.getFullYear();
          let m = sD.getMonth();
          let guard = 0;
          while ((y < eD.getFullYear() || (y === eD.getFullYear() && m <= eD.getMonth())) && guard < 18) {
            const ms = toISO(new Date(y, m, 1));
            const me = toISO(new Date(y, m + 1, 0));
            const bStart = ms < cfWindow.start ? cfWindow.start : ms;
            const bEnd = me > cfWindow.end ? cfWindow.end : me;
            slots.push({
              key: `${y}-${pad2(m + 1)}`,
              start: bStart,
              end: bEnd,
              shortLabel: `${m + 1}月`,
              fullLabel: `${y}年${m + 1}月`,
              inc: 0,
              exp: 0,
              net: 0
            });
            m++;
            if (m > 11) { m = 0; y++; }
            guard++;
          }
        }
      }

      if (slots.length > 0) {
        const minDate = slots[0].start;
        const maxDate = slots[slots.length - 1].end;
        (state.transactions || []).forEach((tx) => {
          if (!tx.date || (tx.type !== 'INCOME' && tx.type !== 'EXPENSE')) return;
          if (tx.date < minDate || tx.date > maxDate) return;
          const slot = slots.find((sl) => tx.date >= sl.start && tx.date <= sl.end);
          if (!slot) return;
          const amtBase = Store.convertToBase(tx.amount, tx.currency, state);
          if (tx.type === 'INCOME') slot.inc = Store.round2(slot.inc + amtBase);
          else slot.exp = Store.round2(slot.exp + amtBase);
        });
        slots.forEach((s) => { s.net = Store.round2(s.inc - s.exp); });
      }

      return { chartTitle, series: slots };
    }, [state, cfGranularity, cfYear, cfMonth, cfWindow]);

    // ---- 2. Net Worth & Balance Sheet Data ----
    const balanceSheet = useMemo(() => {
      let fdTotal = 0;
      let tbillTotal = 0;
      let equityTotal = 0;

      const curMap = new Map();
      const addCur = (cur, amount) => {
        const code = cur || baseCur;
        const val = Store.round2(amount || 0);
        if (!curMap.has(code)) curMap.set(code, { code, nativeTotal: 0, baseTotal: 0 });
        const e = curMap.get(code);
        e.nativeTotal = Store.round2(e.nativeTotal + val);
        e.baseTotal = Store.round2(e.baseTotal + Store.convertToBase(val, code, state));
      };

      const poolTotals = {};
      (state.pools || []).forEach((p) => { poolTotals[p.id] = 0; });

      (state.accounts || []).forEach((acc) => {
        const allocByCur = {};
        (acc.allocations || []).forEach((al) => {
          const amt = Math.max(0, Store.round2(al.amount || 0));
          allocByCur[al.currency] = Store.round2((allocByCur[al.currency] || 0) + amt);
          const pid = al.poolId || 'pool_reserve';
          poolTotals[pid] = Store.round2((poolTotals[pid] || 0) + Store.convertToBase(amt, al.currency, state));
        });

        (acc.balances || []).forEach((b) => {
          const amt = Store.round2(b.amount || 0);
          addCur(b.currency, amt);
          const allocCur = allocByCur[b.currency] || 0;
          const freeAmt = Store.round2(amt - allocCur);
          const pid = b.poolId || (state.pools[0] && state.pools[0].id) || 'pool_liquid';
          poolTotals[pid] = Store.round2((poolTotals[pid] || 0) + Store.convertToBase(freeAmt, b.currency, state));
        });
      });

      (state.investments || []).forEach((inv) => {
        if (inv.status === 'CLOSED') return;
        const m = Store.getInvestmentMetrics(inv);
        const valB = Store.convertToBase(m.marketValue, inv.currency, state);
        addCur(inv.currency, m.marketValue);
        if (inv.type === 'FIXED_DEPOSIT') fdTotal = Store.round2(fdTotal + valB);
        else if (inv.type === 'TBILL') tbillTotal = Store.round2(tbillTotal + valB);
        else equityTotal = Store.round2(equityTotal + valB);
      });

      const grossAssets = Store.round2(metrics.walletTotal + fdTotal + tbillTotal + equityTotal + metrics.pendingReceivables);
      const totalLiabilities = Store.round2(metrics.cardDebt + metrics.pendingPayables);
      const debtRatio = grossAssets > 0 ? Math.round((totalLiabilities / grossAssets) * 100) : 0;

      const assetBaseSum = Math.max(1, metrics.walletTotal + fdTotal + tbillTotal + equityTotal);
      const pctWallet = Math.round((Math.max(0, metrics.walletTotal) / assetBaseSum) * 100);
      const pctFd = Math.round((fdTotal / assetBaseSum) * 100);
      const pctTbill = Math.round((tbillTotal / assetBaseSum) * 100);
      const pctEquity = Math.max(0, 100 - pctWallet - pctFd - pctTbill);

      const curTotalPos = Array.from(curMap.values()).reduce((s, x) => s + Math.max(0, x.baseTotal), 0) || 1;
      const currencies = Array.from(curMap.values())
        .filter((x) => Math.abs(x.nativeTotal) > 0.01)
        .sort((a, b) => b.baseTotal - a.baseTotal)
        .map((x) => Object.assign({}, x, {
          pct: Math.round((Math.max(0, x.baseTotal) / curTotalPos) * 100)
        }));

      const poolGrand = Object.values(poolTotals).reduce((s, v) => s + Math.max(0, v), 0) || 1;
      const walletPools = (state.pools || []).map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        amount: Store.round2(poolTotals[p.id] || 0),
        pct: Math.round((Math.max(0, poolTotals[p.id] || 0) / poolGrand) * 100)
      })).sort((a, b) => b.amount - a.amount);

      return {
        fdTotal,
        tbillTotal,
        equityTotal,
        grossAssets,
        totalLiabilities,
        debtRatio,
        pctWallet,
        pctFd,
        pctTbill,
        pctEquity,
        currencies,
        walletPools
      };
    }, [state, metrics, baseCur]);

    // ---- 3. Investment Performance Analytics (Supports ALL / THIS_YEAR / LAST_YEAR / CUSTOM!) ----
    const curYearStr = String(now.getFullYear());
    const lastYearStr = String(now.getFullYear() - 1);

    const invWindow = useMemo(() => {
      if (invScope === 'THIS_YEAR') return { bounded: true, start: `${curYearStr}-01-01`, end: `${curYearStr}-12-31`, label: `${curYearStr}年` };
      if (invScope === 'LAST_YEAR') return { bounded: true, start: `${lastYearStr}-01-01`, end: `${lastYearStr}-12-31`, label: `${lastYearStr}年` };
      if (invScope === 'CUSTOM') {
        const s = invCustomStart <= invCustomEnd ? invCustomStart : invCustomEnd;
        const e = invCustomStart <= invCustomEnd ? invCustomEnd : invCustomStart;
        return { bounded: true, start: s, end: e, label: formatCompactRange(s, e) };
      }
      return { bounded: false, start: null, end: null, label: '全期累計' };
    }, [invScope, curYearStr, lastYearStr, invCustomStart, invCustomEnd]);

    const investPerf = useMemo(() => {
      const inRange = (d) => {
        if (!invWindow.bounded) return true;
        if (!d) return false;
        return d >= invWindow.start && d <= invWindow.end;
      };

      let activeCostBase = 0;
      let activeValBase = 0;
      let unrealizedBase = 0;
      let expectedTermIntBase = 0;
      let realizedCapBase = 0;
      let dividendIntBase = 0;
      let totalFeesBase = 0;
      let hiddenCounted = 0;

      const activeRanking = [];
      const realizedItems = [];

      (state.investments || []).forEach((inv) => {
        const m = Store.getInvestmentMetrics(inv);
        const cur = inv.currency || baseCur;
        const isClosed = inv.status === 'CLOSED';
        const isHidden = Boolean(inv.hiddenFromArchive);

        if (!isClosed) {
          const priB = Store.convertToBase(m.principal, cur, state);
          const valB = Store.convertToBase(m.marketValue, cur, state);
          activeCostBase = Store.round2(activeCostBase + priB);
          activeValBase = Store.round2(activeValBase + valB);

          if (inv.type === 'FIXED_DEPOSIT') {
            expectedTermIntBase = Store.round2(expectedTermIntBase + Store.convertToBase(m.expectedInterest, cur, state));
          } else {
            const pnlB = Store.convertToBase(m.pnl, cur, state);
            unrealizedBase = Store.round2(unrealizedBase + pnlB);
            if (inv.type === 'TBILL') {
              expectedTermIntBase = Store.round2(expectedTermIntBase + Store.convertToBase(m.expectedInterest, cur, state));
            }
            activeRanking.push({
              id: inv.id,
              name: inv.name,
              ticker: inv.ticker,
              type: inv.type,
              currency: cur,
              principal: m.principal,
              marketValue: m.marketValue,
              pnl: m.pnl,
              pnlPct: m.pnlPct,
              pnlBase: pnlB,
              valBase: valB
            });
          }
        }

        const feeDate = inv.closedDate || inv.lastUpdated || '';
        if ((inv.cumulativeFees || 0) > 0 && inRange(feeDate)) {
          totalFeesBase = Store.round2(totalFeesBase + Store.convertToBase(inv.cumulativeFees, cur, state));
        }

        const refDate = inv.closedDate || inv.lastUpdated || '';
        if (inv.type === 'STOCK_ETF' && (inv.realizedPnl || 0) !== 0 && inRange(refDate)) {
          const rB = Store.convertToBase(inv.realizedPnl, cur, state);
          realizedCapBase = Store.round2(realizedCapBase + rB);
          if (isHidden) hiddenCounted++;
          realizedItems.push({
            id: `inv_cap_${inv.id}`,
            title: inv.ticker ? `${inv.ticker} · ${inv.name}` : inv.name,
            date: refDate,
            currency: cur,
            amount: inv.realizedPnl,
            amountBase: rB,
            badge: isHidden ? '已隱藏歸檔' : (isClosed ? '已清倉' : '部分賣出'),
            badgeCls: isHidden ? 'bg-violet-500/20 text-violet-300' : 'bg-white/10 text-zinc-300'
          });
        }

        if (!invWindow.bounded && (inv.cumulativeDividends || 0) > 0) {
          const dB = Store.convertToBase(inv.cumulativeDividends, cur, state);
          dividendIntBase = Store.round2(dividendIntBase + dB);
          if (isClosed && (inv.type === 'FIXED_DEPOSIT' || inv.type === 'TBILL')) {
            if (isHidden) hiddenCounted++;
            realizedItems.push({
              id: `inv_int_${inv.id}`,
              title: inv.name,
              date: refDate,
              currency: cur,
              amount: inv.cumulativeDividends,
              amountBase: dB,
              badge: isHidden ? '已隱藏歸檔' : '定存/美債息',
              badgeCls: isHidden ? 'bg-violet-500/20 text-violet-300' : 'bg-amber-500/20 text-amber-300'
            });
          }
        }
      });

      (state.transactions || []).forEach((tx) => {
        const txDate = tx.date || '';
        if (!inRange(txDate)) return;

        if (tx.type === 'INVEST_SETTLEMENT') {
          const pnl = tx.realizedPnl != null ? tx.realizedPnl : (tx.amount || 0);
          const pnlB = Store.convertToBase(pnl, tx.currency, state);
          realizedCapBase = Store.round2(realizedCapBase + pnlB);
          realizedItems.push({
            id: tx.id,
            title: tx.title || `結算：${tx.ticker || ''}`,
            date: txDate,
            currency: tx.currency,
            amount: pnl,
            amountBase: pnlB,
            badge: '結單流水',
            badgeCls: 'bg-sky-500/20 text-sky-300'
          });
        } else if (invWindow.bounded && tx.type === 'INCOME' && tx.categoryId === 'cat_dividend' && tx.subCategoryId !== 'sub_dv_1') {
          const dB = Store.convertToBase(tx.amount, tx.currency, state);
          dividendIntBase = Store.round2(dividendIntBase + dB);
          realizedItems.push({
            id: tx.id,
            title: tx.title,
            date: txDate,
            currency: tx.currency,
            amount: tx.amount,
            amountBase: dB,
            badge: tx.subCategoryName || '收息',
            badgeCls: 'bg-emerald-500/15 text-emerald-300'
          });
        }
      });

      const realizedTotalBase = Store.round2(realizedCapBase + dividendIntBase);
      const grandReturnBase = invWindow.bounded
        ? realizedTotalBase
        : Store.round2(unrealizedBase + realizedTotalBase);

      activeRanking.sort((a, b) => b.pnlBase - a.pnlBase);
      realizedItems.sort((a, b) => (a.date < b.date ? 1 : -1));
      const maxAbsPnl = Math.max(1, ...activeRanking.map((r) => Math.abs(r.pnlBase)));

      return {
        isBounded: invWindow.bounded,
        activeCostBase,
        activeValBase,
        unrealizedBase,
        expectedTermIntBase,
        realizedCapBase,
        dividendIntBase,
        realizedTotalBase,
        grandReturnBase,
        totalFeesBase,
        hiddenCounted,
        activeRanking,
        maxAbsPnl,
        realizedItems
      };
    }, [state, invWindow, baseCur]);

    const latestSnap = (state.wealthSnapshots || [])[0] || null;

    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {/* ================= FROZEN TOP HEADER & CONTEXT CONTROLS ================= */}
        <div className="shrink-0 space-y-2.5 pb-2.5 border-b border-white/[0.06] bg-black z-10">
          {/* Row 1: Unified 3-Tab Switcher + Privacy Eye (Saves Full Header Row on Mobile!) */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <SegmentedControl
                value={reportTab}
                onChange={(next) => { setReportTab(next); scrollBodyTop(); }}
                options={[
                  { value: 'CASHFLOW', label: '收支' },
                  { value: 'NETWORTH', label: '資產' },
                  { value: 'INVEST', label: '投資' }
                ]}
              />
            </div>
            <button
              type="button"
              onClick={() => Store.togglePrivacy()}
              aria-label="切換隱私遮罩"
              className="w-9 h-9 rounded-full bg-[#141417] border border-white/[0.08] flex items-center justify-center text-zinc-300 active:bg-white/15 shrink-0"
            >
              <Icon name={state.meta.privacyMode ? 'eyeOff' : 'eye'} size={15} />
            </button>
          </div>

          {/* Row 2A: Cashflow Period Controls (Month / Year / Custom Range) */}
          {reportTab === 'CASHFLOW' && (
            <div className="flex items-center justify-between gap-2">
              <div className="p-0.5 rounded-xl bg-[#141417] border border-white/[0.08] flex gap-0.5 shrink-0">
                {[
                  { v: 'MONTH', l: '月' },
                  { v: 'YEAR', l: '年' },
                  { v: 'CUSTOM', l: '自訂' }
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => {
                      if (opt.v === 'CUSTOM') {
                        openRangeSheet('CASHFLOW');
                      } else {
                        setCfGranularity(opt.v);
                        setSelectedBarKey(null);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold transition ${
                      cfGranularity === opt.v ? 'bg-white text-black' : 'text-zinc-400'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 min-w-0">
                <button
                  type="button"
                  onClick={() => shiftPeriod(-1)}
                  className="w-7 h-7 rounded-full bg-[#141417] border border-white/[0.08] flex items-center justify-center text-zinc-300 active:bg-white/15 shrink-0"
                >
                  <Icon name="chevronLeft" size={14} />
                </button>

                {cfGranularity === 'CUSTOM' ? (
                  <button
                    type="button"
                    onClick={() => openRangeSheet('CASHFLOW')}
                    className="px-2.5 h-7 rounded-full bg-sky-500/15 border border-sky-400/35 text-[12px] font-semibold text-sky-200 tabular-nums whitespace-nowrap flex items-center gap-1 active:bg-sky-500/25 truncate"
                  >
                    <span>{cfWindow.title}</span>
                    <span className="text-[10px] opacity-80">▾</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openRangeSheet('CASHFLOW')}
                    className="px-2 h-7 text-[13px] font-semibold text-white tabular-nums whitespace-nowrap active:opacity-75"
                  >
                    {cfWindow.title}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => shiftPeriod(1)}
                  className="w-7 h-7 rounded-full bg-[#141417] border border-white/[0.08] flex items-center justify-center text-zinc-300 active:bg-white/15 shrink-0"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Row 2B: Investment Scope Controls (All / This Year / Last Year / Custom Range) */}
          {reportTab === 'INVEST' && (
            <div className="flex items-center justify-between gap-2">
              <div className="p-0.5 rounded-xl bg-[#141417] border border-white/[0.08] flex gap-0.5 shrink-0">
                {[
                  { v: 'ALL', l: '全期' },
                  { v: 'THIS_YEAR', l: `${curYearStr}` },
                  { v: 'LAST_YEAR', l: `${lastYearStr}` },
                  { v: 'CUSTOM', l: '自訂' }
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => {
                      if (opt.v === 'CUSTOM') {
                        openRangeSheet('INVEST');
                      } else {
                        setInvScope(opt.v);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition tabular-nums ${
                      invScope === opt.v ? 'bg-white text-black' : 'text-zinc-400'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>

              {invScope === 'CUSTOM' && (
                <button
                  type="button"
                  onClick={() => openRangeSheet('INVEST')}
                  className="px-2.5 h-7 rounded-full bg-sky-500/15 border border-sky-400/35 text-[11.5px] font-semibold text-sky-200 tabular-nums whitespace-nowrap flex items-center gap-1 truncate"
                >
                  <span>{invWindow.label}</span>
                  <span className="text-[10px]">▾</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ================= SCROLLABLE SEGMENTED CONTENT AREA (SWIPEABLE!) ================= */}
        <div
          ref={bodyScrollRef}
          {...subSwipeHandlers}
          className="flex-1 min-h-0 overflow-y-auto app-scroll-main pt-3 pb-6 space-y-3"
        >
          {/* ========================================================== */}
          {/* TAB 1: CASHFLOW (Compact Hero + 3 Single-Screen Sub-Views) */}
          {/* ========================================================== */}
          {reportTab === 'CASHFLOW' && (
            <>
              {/* Compact Hero KPI Card */}
              <div className="relative rounded-[20px] bg-[#13141A] border border-white/[0.11] p-3.5 space-y-2.5 overflow-hidden shadow-md">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 88% 10%, rgba(52,211,153,0.16) 0%, rgba(56,189,248,0.06) 48%, transparent 72%)' }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-zinc-400">
                      {cfWindow.title} 淨結餘{cfGranularity === 'CUSTOM' ? ` (${cfWindow.days}天)` : ''}
                    </div>
                    <div className={`text-[24px] font-bold tabular-nums tracking-tight leading-tight break-all mt-0.5 ${
                      cashflowData.net >= 0 ? 'text-white' : 'text-rose-400'
                    }`}>
                      {Store.formatMoney(cashflowData.net, baseCur, { showPlus: true })}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums shrink-0 ${
                    cashflowData.savingsRate >= 30
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : cashflowData.savingsRate >= 0
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                  }`}>
                    儲蓄率 {cashflowData.savingsRate}%
                  </span>
                </div>

                <div className="relative grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-[12px]">
                  <div className="flex items-baseline justify-between gap-1.5 bg-black/35 rounded-xl px-2.5 py-2 border border-white/[0.06]">
                    <span className="text-[11px] text-zinc-400 shrink-0">純收入</span>
                    <div className="text-right min-w-0">
                      <div className="text-[14px] font-bold text-emerald-400 tabular-nums truncate">
                        {Store.formatMoney(cashflowData.inc, baseCur)}
                      </div>
                      {cashflowData.incDeltaPct != null && (
                        <div className={`text-[9.5px] tabular-nums ${cashflowData.incDeltaPct >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                          較上期 {cashflowData.incDeltaPct >= 0 ? '+' : ''}{cashflowData.incDeltaPct}%
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-1.5 bg-black/35 rounded-xl px-2.5 py-2 border border-white/[0.06]">
                    <span className="text-[11px] text-zinc-400 shrink-0">純支出</span>
                    <div className="text-right min-w-0">
                      <div className="text-[14px] font-bold text-white tabular-nums truncate">
                        {Store.formatMoney(cashflowData.exp, baseCur)}
                      </div>
                      {cashflowData.expDeltaPct != null && (
                        <div className={`text-[9.5px] tabular-nums ${cashflowData.expDeltaPct <= 0 ? 'text-emerald-400/80' : 'text-amber-300/90'}`}>
                          較上期 {cashflowData.expDeltaPct >= 0 ? '+' : ''}{cashflowData.expDeltaPct}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-View Pill Switcher */}
              <SubViewPills
                value={cfSubView}
                onChange={setCfSubView}
                options={[
                  { value: 'CATEGORY', label: '分類佔比' },
                  { value: 'TREND', label: '收支趨勢' },
                  { value: 'POOLS', label: '資金池歸屬' }
                ]}
              />

              {/* SUB-VIEW 1.1: Category Donut + Compact List (Tap -> Drill-Down Sheet) */}
              {cfSubView === 'CATEGORY' && (
                <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-white">分類結構（點選看明細）</span>
                    <div className="p-0.5 rounded-xl bg-black/60 border border-white/[0.08] flex gap-0.5">
                      {[
                        { v: 'EXPENSE', l: '支出' },
                        { v: 'INCOME', l: '收入' }
                      ].map((t) => (
                        <button
                          key={t.v}
                          type="button"
                          onClick={() => setCfTypeTab(t.v)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                            cfTypeTab === t.v ? 'bg-white text-black' : 'text-zinc-400'
                          }`}
                        >
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {cashflowData.categories.length === 0 ? (
                    <div className="py-8 text-center text-[12.5px] text-zinc-500">
                      此區間尚無{cfTypeTab === 'EXPENSE' ? '純支出' : '純收入'}紀錄
                    </div>
                  ) : (
                    <>
                      <CategoryDonut
                        slices={cashflowData.categories}
                        total={cashflowData.targetTotal}
                        activeId={detailCat ? detailCat.id : null}
                        onSelect={(cat) => setDetailCat(cat)}
                        baseCurrency={baseCur}
                        centerTitle={cfTypeTab === 'EXPENSE' ? '總支出' : '總收入'}
                      />

                      <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                        {cashflowData.categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setDetailCat(cat)}
                            className="w-full py-2.5 flex items-center justify-between gap-2.5 text-left active:bg-white/[0.04] transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className="w-7 h-7 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0"
                                style={{ color: cat.color }}
                              >
                                <Icon name={cat.icon} size={14} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-semibold text-white truncate">{cat.name}</span>
                                  <span className="text-[10.5px] text-zinc-500 tabular-nums shrink-0">{cat.count}筆</span>
                                </div>
                                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mt-1.5">
                                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, cat.pct)}%`, background: cat.color }} />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                              <div className="text-right">
                                <div className="text-[13px] font-bold text-white">{Store.formatMoney(cat.amount, baseCur)}</div>
                                <div className="text-[10px] text-zinc-400">{cat.pct}%</div>
                              </div>
                              <Icon name="chevronRight" size={14} className="text-zinc-600" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* SUB-VIEW 1.2: Adaptive Dual-Bar Trend + Period Pulse Tiles */}
              {cfSubView === 'TREND' && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13.5px] font-semibold text-white">{trendData.chartTitle}</span>
                      <span className="text-[10.5px] text-zinc-500">點柱體查看詳情</span>
                    </div>
                    <CashflowBarChart
                      series={trendData.series}
                      selectedKey={selectedBarKey}
                      onSelect={setSelectedBarKey}
                      baseCurrency={baseCur}
                      privacyMode={state.meta.privacyMode}
                    />
                  </div>

                  {/* Period Pulse Mini-Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-2xl bg-[#111114] border border-white/[0.08]">
                      <div className="text-[10.5px] text-zinc-500">日均純支出</div>
                      <div className="text-[13.5px] font-bold text-white tabular-nums mt-1 truncate">
                        {Store.formatMoney(cashflowData.avgDailyExp, baseCur)}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#111114] border border-white/[0.08]">
                      <div className="text-[10.5px] text-zinc-500">純收支筆數</div>
                      <div className="text-[13.5px] font-bold text-zinc-200 tabular-nums mt-1">
                        {cashflowData.incTxCount + cashflowData.expTxCount} 筆
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#111114] border border-white/[0.08]">
                      <div className="text-[10.5px] text-zinc-500">最高消費日</div>
                      <div className="text-[12.5px] font-bold text-amber-300 tabular-nums mt-1 truncate">
                        {cashflowData.peakExpDay ? cashflowData.peakExpDay.slice(5) : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 1.3: Funding Pool Spending Attribution */}
              {cfSubView === 'POOLS' && (
                <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-semibold text-white">資金池消費歸屬</span>
                    <span className="text-[11px] text-zinc-500">點選查看消費明細</span>
                  </div>
                  {cashflowData.poolSpending.length === 0 ? (
                    <div className="py-8 text-center text-[12.5px] text-zinc-500">此區間尚無純支出歸屬紀錄</div>
                  ) : (
                    <div className="space-y-2.5">
                      {cashflowData.poolSpending.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setDetailPool(p)}
                          className="w-full p-3 rounded-2xl bg-black/40 border border-white/[0.07] space-y-2 text-left active:bg-white/[0.06] transition"
                        >
                          <div className="flex items-center justify-between text-[13px] tabular-nums">
                            <span className="flex items-center gap-2 text-white font-semibold">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                              {p.name}
                              <span className="text-[11px] font-normal text-zinc-500">({p.count}筆)</span>
                            </span>
                            <span className="flex items-center gap-1 font-bold text-white">
                              {Store.formatMoney(p.amount, baseCur)}
                              <span className="text-[11px] font-medium text-zinc-400">({p.pct}%)</span>
                              <Icon name="chevronRight" size={14} className="text-zinc-500" />
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(2, p.pct)}%`, background: p.color }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ========================================================== */}
          {/* TAB 2: NET WORTH (Compact Hero + 3 Single-Screen Sub-Views) */}
          {/* ========================================================== */}
          {reportTab === 'NETWORTH' && (
            <>
              {/* Compact Hero Net Worth Card */}
              <div className="relative rounded-[20px] bg-[#13141A] border border-white/[0.11] p-3.5 space-y-2.5 overflow-hidden shadow-md">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 86% 12%, rgba(96,165,250,0.18) 0%, rgba(167,139,250,0.08) 46%, transparent 72%)' }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-sky-200/90">總淨資產 ({baseCur})</div>
                    <div className="text-[26px] font-bold text-white tabular-nums tracking-tight leading-tight break-all mt-0.5">
                      {Store.formatMoney(metrics.totalNetWorth, baseCur)}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/10 text-[11px] font-semibold text-zinc-300 tabular-nums shrink-0">
                    負債率 {balanceSheet.debtRatio}%
                  </span>
                </div>

                <div className="relative space-y-1.5">
                  <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden flex gap-[1.5px]">
                    {balanceSheet.pctWallet > 0 && <div className="h-full bg-emerald-400" style={{ width: `${balanceSheet.pctWallet}%` }} />}
                    {balanceSheet.pctFd > 0 && <div className="h-full bg-amber-400" style={{ width: `${balanceSheet.pctFd}%` }} />}
                    {balanceSheet.pctTbill > 0 && <div className="h-full bg-sky-400" style={{ width: `${balanceSheet.pctTbill}%` }} />}
                    {balanceSheet.pctEquity > 0 && <div className="h-full bg-violet-400" style={{ width: `${balanceSheet.pctEquity}%` }} />}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[10px] text-zinc-400 tabular-nums">
                    <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 活期 {balanceSheet.pctWallet}%</span>
                    {balanceSheet.fdTotal > 0 && <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 定期 {balanceSheet.pctFd}%</span>}
                    {balanceSheet.tbillTotal > 0 && <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> 美債 {balanceSheet.pctTbill}%</span>}
                    {balanceSheet.equityTotal > 0 && <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> 投資 {balanceSheet.pctEquity}%</span>}
                  </div>
                </div>
              </div>

              <SubViewPills
                value={nwSubView}
                onChange={setNwSubView}
                options={[
                  { value: 'OVERVIEW', label: '資產負債' },
                  { value: 'CURRENCY', label: '幣種敞口' },
                  { value: 'POOLS', label: '銀包資金池' }
                ]}
              />

              {/* SUB-VIEW 2.1: Assets vs Liabilities Balance Sheet */}
              {nwSubView === 'OVERVIEW' && (
                <div className="space-y-2.5">
                  <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-zinc-300">總資產明細</span>
                      <span className="font-bold text-white tabular-nums">{Store.formatMoney(balanceSheet.grossAssets, baseCur)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                        <div className="text-[10.5px] text-zinc-400">銀包活期</div>
                        <div className="text-[14.5px] font-bold text-emerald-400 tabular-nums mt-0.5">
                          {Store.formatMoney(metrics.walletTotal, baseCur)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                        <div className="text-[10.5px] text-zinc-400">定期 / 美債</div>
                        <div className="text-[14.5px] font-bold text-amber-300 tabular-nums mt-0.5">
                          {Store.formatMoney(Store.round2(balanceSheet.fdTotal + balanceSheet.tbillTotal), baseCur)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                        <div className="text-[10.5px] text-zinc-400">股票 / ETF</div>
                        <div className="text-[14.5px] font-bold text-violet-300 tabular-nums mt-0.5">
                          {Store.formatMoney(balanceSheet.equityTotal, baseCur)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                        <div className="text-[10.5px] text-zinc-400">待收回代墊</div>
                        <div className="text-[14.5px] font-bold text-sky-300 tabular-nums mt-0.5">
                          {Store.formatMoney(metrics.pendingReceivables, baseCur)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-zinc-300">負債明細</span>
                      <span className="font-bold text-rose-400 tabular-nums">{Store.formatMoney(balanceSheet.totalLiabilities, baseCur)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                        <div className="text-[10.5px] text-zinc-400">信用卡待繳</div>
                        <div className="text-[14.5px] font-bold text-rose-400 tabular-nums mt-0.5">
                          {Store.formatMoney(metrics.cardDebt, baseCur)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                        <div className="text-[10.5px] text-zinc-400">待償還借貸</div>
                        <div className="text-[14.5px] font-bold text-amber-300 tabular-nums mt-0.5">
                          {Store.formatMoney(metrics.pendingPayables, baseCur)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2.2: Multi-Currency Exposure */}
              {nwSubView === 'CURRENCY' && (
                <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-semibold text-white">多幣種資產敞口</span>
                    <span className="text-[11px] text-zinc-500">含活期、定期與持倉</span>
                  </div>
                  {balanceSheet.currencies.length === 0 ? (
                    <div className="py-8 text-center text-[12.5px] text-zinc-500">尚無資產資料</div>
                  ) : (
                    <div className="space-y-3">
                      {balanceSheet.currencies.map((c, idx) => {
                        const col = Store.POOL_COLORS[idx % Store.POOL_COLORS.length];
                        return (
                          <div key={c.code} className="space-y-1.5">
                            <div className="flex items-baseline justify-between gap-2 text-[12.5px] tabular-nums">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10.5px] font-bold text-white">{c.code}</span>
                                <span className="text-zinc-200 font-medium truncate">{Store.formatMoney(c.nativeTotal, c.code)}</span>
                              </div>
                              <span className="text-white font-semibold shrink-0">
                                {c.code !== baseCur && `≈ ${Store.formatMoney(c.baseTotal, baseCur)} · `}{c.pct}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(2, c.pct)}%`, background: col }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 2.3: Wallet Funding Pools */}
              {nwSubView === 'POOLS' && (
                <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-semibold text-white">銀包資金池現存分佈</span>
                    <span className="text-[11px] text-zinc-500">已計入戶口切分額</span>
                  </div>
                  <div className="space-y-3">
                    {balanceSheet.walletPools.map((p) => (
                      <div key={p.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12.5px] tabular-nums">
                          <span className="flex items-center gap-1.5 text-zinc-200 font-medium">
                            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                            {p.name}
                          </span>
                          <span className="text-white font-semibold">
                            {Store.formatMoney(p.amount, baseCur)} ({p.pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(p.amount > 0 ? 2 : 0, p.pct)}%`, background: p.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================== */}
          {/* TAB 3: INVESTMENT PERFORMANCE (Compact Hero + 3 Sub-Views) */}
          {/* ========================================================== */}
          {reportTab === 'INVEST' && (
            <>
              {/* Compact Hero Investment Return Card */}
              <div className="relative rounded-[20px] bg-[#13141A] border border-white/[0.11] p-3.5 space-y-2.5 overflow-hidden shadow-md">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 90% 10%, rgba(251,191,36,0.16) 0%, rgba(52,211,153,0.10) 48%, transparent 72%)' }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-amber-200/90">
                      {investPerf.isBounded
                        ? `${invWindow.label} 已實現總收益 (${baseCur})`
                        : `定存與投資綜合總損益 (${baseCur})`}
                    </div>
                    <div className={`text-[24px] font-bold tabular-nums tracking-tight leading-tight break-all mt-0.5 ${
                      investPerf.grandReturnBase >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {Store.formatMoney(investPerf.grandReturnBase, baseCur, { showPlus: true })}
                    </div>
                  </div>
                  {investPerf.hiddenCounted > 0 && (
                    <span className="px-2 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-[10px] font-semibold text-violet-200 shrink-0 whitespace-nowrap">
                      含 {investPerf.hiddenCounted} 筆隱藏
                    </span>
                  )}
                </div>

                <div className="relative grid grid-cols-3 gap-1.5 pt-2 border-t border-white/[0.06] text-center tabular-nums">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/[0.06]">
                    <div className="text-[10px] text-zinc-400">未實現</div>
                    <div className={`text-[12.5px] font-bold mt-0.5 truncate ${investPerf.unrealizedBase >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {Store.formatMoney(investPerf.unrealizedBase, baseCur, { showPlus: true })}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/[0.06]">
                    <div className="text-[10px] text-zinc-400">已實現</div>
                    <div className={`text-[12.5px] font-bold mt-0.5 truncate ${investPerf.realizedCapBase >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {Store.formatMoney(investPerf.realizedCapBase, baseCur, { showPlus: true })}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/[0.06]">
                    <div className="text-[10px] text-zinc-400">已收息</div>
                    <div className="text-[12.5px] font-bold text-amber-300 mt-0.5 truncate">
                      {Store.formatMoney(investPerf.dividendIntBase, baseCur, { showPlus: true })}
                    </div>
                  </div>
                </div>
              </div>

              <SubViewPills
                value={invSubView}
                onChange={setInvSubView}
                options={[
                  { value: 'RANKING', label: `盈虧排行 (${investPerf.activeRanking.length})` },
                  { value: 'TREND', label: '走勢摘要' },
                  { value: 'REALIZED', label: `已實現 (${investPerf.realizedItems.length})` }
                ]}
              />

              {/* SUB-VIEW 3.1: Active Holdings P&L Ranking */}
              {invSubView === 'RANKING' && (
                <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-white">活躍持倉未實現損益</span>
                    {investPerf.expectedTermIntBase > 0 && (
                      <span className="text-amber-300 tabular-nums">
                        定期預估息 +{Store.formatMoney(investPerf.expectedTermIntBase, baseCur).replace(/^[A-Z$¥]+\s*/, '')}
                      </span>
                    )}
                  </div>
                  {investPerf.activeRanking.length === 0 ? (
                    <div className="py-8 text-center text-[12.5px] text-zinc-500">尚無股票／ETF 或美債活躍持倉</div>
                  ) : (
                    <div className="space-y-3">
                      {investPerf.activeRanking.map((r) => {
                        const barPct = Math.max(4, Math.round((Math.abs(r.pnlBase) / investPerf.maxAbsPnl) * 100));
                        const isPos = r.pnl >= 0;
                        return (
                          <div key={r.id} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2 text-[12.5px] tabular-nums">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-white shrink-0">{r.ticker || r.name}</span>
                                {r.ticker && <span className="text-[11px] text-zinc-500 truncate">{r.name}</span>}
                              </div>
                              <span className={`font-bold shrink-0 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {Store.formatMoney(r.pnl, r.currency, { showPlus: true })} ({isPos ? '+' : ''}{r.pnlPct}%)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className={`h-full rounded-full ${isPos ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="text-[10.5px] text-zinc-500 tabular-nums shrink-0">
                                值 {Store.formatMoney(r.marketValue, r.currency)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 3.2: Snapshot Trend & Latest Broker Statement Summary */}
              {invSubView === 'TREND' && (
                <div className="space-y-3">
                  {(state.wealthSnapshots || []).length >= 2 ? (
                    <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[13.5px] font-semibold text-white">結單歸檔市值走勢</span>
                        <span className="text-[11px] text-zinc-500">{state.wealthSnapshots.length} 期歸檔</span>
                      </div>
                      <SnapshotTrendChart snapshots={state.wealthSnapshots} baseCurrency={baseCur} />
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-6 text-center text-[12.5px] text-zinc-500">
                      累積 2 期以上結單同步後，將自動繪製市值走勢折線圖。
                    </div>
                  )}

                  {latestSnap && latestSnap.periodSummary && (
                    <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-white truncate">{latestSnap.label}</span>
                        {latestSnap.periodSummary.twrPct != null && (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums shrink-0 ${
                            latestSnap.periodSummary.twrPct >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            TWR {latestSnap.periodSummary.twrPct >= 0 ? '+' : ''}{latestSnap.periodSummary.twrPct}%
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11.5px] tabular-nums">
                        {(latestSnap.periodSummary.netDividends || []).map((d, i) => (
                          <div key={`nd_${i}`} className="px-3 py-2 rounded-xl bg-black/45 border border-white/[0.06] flex justify-between gap-1">
                            <span className="text-zinc-400">期內淨股息</span>
                            <span className="text-emerald-300 font-semibold">{Store.formatMoney(d.net, d.currency, { showPlus: true })}</span>
                          </div>
                        ))}
                        {(latestSnap.periodSummary.realizedPnl || []).map((r, i) => (
                          <div key={`rp_${i}`} className="px-3 py-2 rounded-xl bg-black/45 border border-white/[0.06] flex justify-between gap-1">
                            <span className="text-zinc-400">結單已實現</span>
                            <span className={`font-semibold ${r.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {Store.formatMoney(r.amount, r.currency, { showPlus: true })}
                            </span>
                          </div>
                        ))}
                        {(latestSnap.periodSummary.commissions || []).map((c, i) => (
                          <div key={`cm_${i}`} className="px-3 py-2 rounded-xl bg-black/45 border border-white/[0.06] flex justify-between gap-1">
                            <span className="text-zinc-400">期內佣金</span>
                            <span className="text-zinc-300 font-semibold">{Store.formatMoney(c.amount, c.currency)}</span>
                          </div>
                        ))}
                        {(latestSnap.periodSummary.brokerInterest || []).length > 0 && (
                          <div className="px-3 py-2 rounded-xl bg-black/45 border border-white/[0.06] flex justify-between gap-1">
                            <span className="text-zinc-400">券商利息</span>
                            <span className="text-amber-300 font-semibold">
                              {latestSnap.periodSummary.brokerInterest.map((bi) => Store.formatMoney(bi.amount, bi.currency)).join(' + ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {investPerf.totalFeesBase > 0 && (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-[#111114] border border-white/[0.08] flex items-center justify-between text-[12px] tabular-nums">
                      <span className="text-zinc-400">區間手續費 / 稅費累計</span>
                      <span className="text-zinc-200 font-semibold">-{Store.formatMoney(investPerf.totalFeesBase, baseCur)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 3.3: Realized & Closed Settlement Items */}
              {invSubView === 'REALIZED' && (
                <div className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
                  {investPerf.realizedItems.length === 0 ? (
                    <div className="py-10 text-center text-[12.5px] text-zinc-500">
                      此區間尚無已實現平倉、收息或結算紀錄
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.06]">
                      {investPerf.realizedItems.map((it) => (
                        <div key={it.id} className="px-4 py-3 flex items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13px] font-semibold text-zinc-200 truncate">{it.title}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold shrink-0 ${it.badgeCls}`}>
                                {it.badge}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 tabular-nums mt-0.5">{it.date}</div>
                          </div>
                          <span className={`text-[13.5px] font-bold tabular-nums shrink-0 ${it.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {Store.formatMoney(it.amount, it.currency, { showPlus: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ================= SHEET A: CUSTOM DATE RANGE PICKER ================= */}
        <BottomSheet
          open={Boolean(rangeSheetFor)}
          title="自訂分析日期區間"
          subtitle={`已選 ${daysInclusive(rangeDraft.start <= rangeDraft.end ? rangeDraft.start : rangeDraft.end, rangeDraft.start <= rangeDraft.end ? rangeDraft.end : rangeDraft.start)} 天`}
          onClose={() => setRangeSheetFor(null)}
          footer={
            <button
              type="button"
              onClick={applyRangeDraft}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold active:scale-[0.99] transition"
            >
              套用日期區間
            </button>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[12px] text-zinc-400">快捷區間</div>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((p) => {
                  const sel = rangeDraft.start === p.start && rangeDraft.end === p.end;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRangeDraft({ start: p.start, end: p.end })}
                      className={`py-2.5 rounded-xl text-[12.5px] font-semibold border transition ${
                        sel ? 'bg-white text-black border-white' : 'bg-black/45 text-zinc-200 border-white/[0.08] active:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="text-[12px] text-zinc-400 block mb-1.5">開始日期</label>
                <div className="relative h-[46px] rounded-xl bg-black/60 border border-white/[0.12] px-3 flex items-center justify-between gap-1.5 overflow-hidden">
                  <span className="text-[13.5px] font-semibold text-white tabular-nums truncate">
                    {formatDisplayDate(rangeDraft.start)}
                  </span>
                  <Icon name="calendar" size={15} className="text-zinc-400 shrink-0" />
                  <input
                    type="date"
                    value={rangeDraft.start}
                    onChange={(e) => { if (e.target.value) setRangeDraft((p) => Object.assign({}, p, { start: e.target.value })); }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label className="text-[12px] text-zinc-400 block mb-1.5">結束日期</label>
                <div className="relative h-[46px] rounded-xl bg-black/60 border border-white/[0.12] px-3 flex items-center justify-between gap-1.5 overflow-hidden">
                  <span className="text-[13.5px] font-semibold text-white tabular-nums truncate">
                    {formatDisplayDate(rangeDraft.end)}
                  </span>
                  <Icon name="calendar" size={15} className="text-zinc-400 shrink-0" />
                  <input
                    type="date"
                    value={rangeDraft.end}
                    onChange={(e) => { if (e.target.value) setRangeDraft((p) => Object.assign({}, p, { end: e.target.value })); }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {rangeDraft.start > rangeDraft.end && (
              <div className="text-[11.5px] text-amber-300">
                開始日期晚於結束日期，套用時將自動為您對調。
              </div>
            )}
          </div>
        </BottomSheet>

        {/* ================= SHEET B: CATEGORY DRILL-DOWN DETAIL ================= */}
        <BottomSheet
          open={Boolean(detailCat)}
          title={detailCat ? `${detailCat.name} · ${cfWindow.title}` : '分類明細'}
          subtitle={detailCat ? `共 ${detailCat.count} 筆 · ${Store.formatMoney(detailCat.amount, baseCur)} (${detailCat.pct}%)` : ''}
          onClose={() => setDetailCat(null)}
        >
          {detailCat && (
            <div className="space-y-4">
              {detailCat.subList.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.08] space-y-2.5">
                  <div className="text-[11.5px] font-semibold text-zinc-400">小類別分佈</div>
                  {detailCat.subList.map((sub) => (
                    <div key={sub.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[12.5px] tabular-nums">
                        <span className="text-zinc-200 truncate">{sub.name}</span>
                        <span className="text-white font-semibold shrink-0">
                          {Store.formatMoney(sub.amount, baseCur)} ({sub.pct}%)
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, sub.pct)}%`, background: detailCat.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl bg-black/45 border border-white/[0.08] overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-white/[0.06] text-[11.5px] font-semibold text-zinc-400">
                  全部紀錄 ({detailCat.txs.length})
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {detailCat.txs.map((t) => (
                    <div key={t.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-[12.5px] tabular-nums">
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{t.title}</div>
                        <div className="text-[11px] text-zinc-500">{t.date}</div>
                      </div>
                      <span className="text-white font-semibold shrink-0">
                        {Store.formatMoney(t.amount, t.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </BottomSheet>

        {/* ================= SHEET C: POOL SPENDING DRILL-DOWN DETAIL ================= */}
        <BottomSheet
          open={Boolean(detailPool)}
          title={detailPool ? `${detailPool.name} · ${cfWindow.title}` : '資金池消費'}
          subtitle={detailPool ? `共 ${detailPool.count} 筆 · ${Store.formatMoney(detailPool.amount, baseCur)} (${detailPool.pct}%)` : ''}
          onClose={() => setDetailPool(null)}
        >
          {detailPool && (
            <div className="rounded-2xl bg-black/45 border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
              {detailPool.txs.map((t) => (
                <div key={t.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-[12.5px] tabular-nums">
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{t.title}</div>
                    <div className="text-[11px] text-zinc-500">{t.date}</div>
                  </div>
                  <span className="text-white font-semibold shrink-0">
                    {Store.formatMoney(t.amount, t.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </BottomSheet>
      </div>
    );
  }

  window.WealthReports = { ReportsView };
})();
