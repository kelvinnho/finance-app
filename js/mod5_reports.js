// mod5_reports.js · Stage 4 r1
(function () {
  'use strict';

  const { useState, useMemo } = React;

  function formatCompactBase(val) {
    const abs = Math.abs(Number(val || 0));
    if (abs >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (abs >= 10000) return `${(val / 1000).toFixed(0)}k`;
    if (abs >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return `${Math.round(val)}`;
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
    const isDense = series.length > 7;
    const vbW = 340;
    const vbH = 148;
    const padL = 8;
    const padR = 8;
    const padT = 14;
    const padB = 26;
    const chartW = vbW - padL - padR;
    const chartH = vbH - padT - padB;
    const slotW = chartW / series.length;
    const barW = isDense ? Math.max(5, slotW * 0.32) : Math.min(14, slotW * 0.28);
    const gap = isDense ? 1.5 : 3;

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
          {/* Subtle Horizontal Gridlines */}
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

          {/* Baseline */}
          <line
            x1={padL}
            x2={vbW - padR}
            y1={padT + chartH}
            y2={padT + chartH}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* Grouped Bars */}
          {series.map((item, idx) => {
            const cx = padL + slotW * idx + slotW / 2;
            const incH = Math.max(item.inc > 0 ? 3 : 0, (item.inc / maxVal) * chartH);
            const expH = Math.max(item.exp > 0 ? 3 : 0, (item.exp / maxVal) * chartH);
            const isSel = activeItem && item.key === activeItem.key;

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
                {/* Income Bar */}
                <rect
                  x={cx - barW - gap / 2}
                  y={padT + chartH - incH}
                  width={barW}
                  height={incH}
                  rx={Math.min(4, barW / 2)}
                  fill={isSel ? '#34D399' : 'rgba(52,211,153,0.58)'}
                />
                {/* Expense Bar */}
                <rect
                  x={cx + gap / 2}
                  y={padT + chartH - expH}
                  width={barW}
                  height={expH}
                  rx={Math.min(4, barW / 2)}
                  fill={isSel ? '#F4F4F5' : 'rgba(212,212,216,0.42)'}
                />
                {/* X-Axis Label */}
                <text
                  x={cx}
                  y={vbH - 7}
                  textAnchor="middle"
                  fontSize={isDense ? '8.5' : '10'}
                  fontWeight={isSel ? '700' : '500'}
                  fill={isSel ? '#FFFFFF' : '#71717A'}
                >
                  {item.shortLabel}
                </text>
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
    const size = 148;
    const stroke = 17;
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
      <div className="flex items-center gap-4">
        <div className="relative w-[148px] h-[148px] shrink-0">
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
                  onClick={() => onSelect(isAct ? null : slice.id)}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
            <div className="text-[10px] text-zinc-400 truncate max-w-[96px]">
              {activeSlice ? activeSlice.name : centerTitle}
            </div>
            <div className="text-[14px] font-bold text-white tabular-nums mt-0.5 leading-tight">
              {activeSlice
                ? `${activeSlice.pct}%`
                : Store.formatMoney(total, baseCurrency)}
            </div>
            {activeSlice && (
              <div className="text-[10px] text-zinc-300 tabular-nums mt-0.5 truncate max-w-[96px]">
                {Store.formatMoney(activeSlice.amount, baseCurrency)}
              </div>
            )}
          </div>
        </div>

        {/* Right Compact Legend (Top 5) */}
        <div className="flex-1 min-w-0 space-y-2">
          {slices.slice(0, 5).map((s) => {
            const isAct = activeId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(isAct ? null : s.id)}
                className={`w-full flex items-center justify-between gap-2 text-left rounded-lg px-2 py-1 transition ${
                  isAct ? 'bg-white/10' : 'active:bg-white/[0.05]'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-[12px] text-zinc-200 truncate">{s.name}</span>
                </span>
                <span className="text-[11.5px] font-semibold text-zinc-300 tabular-nums shrink-0">
                  {s.pct}%
                </span>
              </button>
            );
          })}
          {slices.length > 5 && (
            <div className="text-[10.5px] text-zinc-500 px-2">
              另有 {slices.length - 5} 項分類（見下方列表）
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
    const vbH = 132;
    const padL = 12;
    const padR = 12;
    const padT = 14;
    const padB = 24;
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
      <div className="space-y-2.5">
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

          <line
            x1={padL}
            x2={vbW - padR}
            y1={padT + plotH}
            y2={padT + plotH}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />

          <path d={areaD} fill="url(#snapAreaGrad)" />
          <path d={lineD} fill="none" stroke="#34D399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

          {pts.map((p) => {
            const isSel = p.idx === safeIdx;
            return (
              <g key={p.s.id} onClick={() => setActiveIdx(p.idx)} className="cursor-pointer">
                <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                {isSel && <circle cx={p.x} cy={p.y} r="7" fill="rgba(52,211,153,0.25)" />}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSel ? '4.2' : '3'}
                  fill={isSel ? '#34D399' : '#0B0B0D'}
                  stroke="#34D399"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={vbH - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={isSel ? '700' : '500'}
                  fill={isSel ? '#FFFFFF' : '#71717A'}
                >
                  {(p.s.date || '').slice(2, 7)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // ---- Main Reports View (Module 5) ----
  function ReportsView({ state }) {
    const { Icon, SegmentedControl } = window.WealthUI;
    const Store = window.WealthStore;
    const baseCur = state.meta.baseCurrency;
    const now = new Date();

    const [reportTab, setReportTab] = useState('CASHFLOW'); // CASHFLOW | NETWORTH | INVEST

    // Cashflow tab states
    const [cfGranularity, setCfGranularity] = useState('MONTH'); // MONTH | YEAR
    const [cfYear, setCfYear] = useState(now.getFullYear());
    const [cfMonth, setCfMonth] = useState(now.getMonth()); // 0..11
    const [cfTypeTab, setCfTypeTab] = useState('EXPENSE'); // EXPENSE | INCOME
    const [expandedCatId, setExpandedCatId] = useState(null);
    const [selectedBarKey, setSelectedBarKey] = useState(null);

    // Investment performance tab state
    const [invScope, setInvScope] = useState('ALL'); // ALL | THIS_YEAR | LAST_YEAR
    const [realizedExpanded, setRealizedExpanded] = useState(true);

    const metrics = useMemo(() => Store.getSummaryMetrics(state), [state]);

    const shiftPeriod = (delta) => {
      setExpandedCatId(null);
      setSelectedBarKey(null);
      if (cfGranularity === 'YEAR') {
        setCfYear((y) => y + delta);
      } else {
        const d = new Date(cfYear, cfMonth + delta, 1);
        setCfYear(d.getFullYear());
        setCfMonth(d.getMonth());
      }
    };

    const currentPrefix = cfGranularity === 'YEAR'
      ? `${cfYear}-`
      : `${cfYear}-${String(cfMonth + 1).padStart(2, '0')}`;

    const prevPrefix = useMemo(() => {
      if (cfGranularity === 'YEAR') return `${cfYear - 1}-`;
      const d = new Date(cfYear, cfMonth - 1, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }, [cfGranularity, cfYear, cfMonth]);

    const periodTitle = cfGranularity === 'YEAR'
      ? `${cfYear}年`
      : `${cfYear}年${cfMonth + 1}月`;

    // ---- 1. Cashflow Data Computations ----
    const cashflowData = useMemo(() => {
      let inc = 0;
      let exp = 0;
      let prevInc = 0;
      let prevExp = 0;
      const catMap = new Map();
      const poolMap = new Map();

      const catLookup = (id) => (state.categories || []).find((c) => c.id === id);
      const poolLookup = (id) => (state.pools || []).find((p) => p.id === id);

      (state.transactions || []).forEach((tx) => {
        if (!tx.date) return;
        if (tx.type !== 'INCOME' && tx.type !== 'EXPENSE') return;
        const amtBase = Store.convertToBase(tx.amount, tx.currency, state);

        if (tx.date.startsWith(prevPrefix)) {
          if (tx.type === 'INCOME') prevInc = Store.round2(prevInc + amtBase);
          else prevExp = Store.round2(prevExp + amtBase);
        }

        if (!tx.date.startsWith(currentPrefix)) return;

        if (tx.type === 'INCOME') inc = Store.round2(inc + amtBase);
        else exp = Store.round2(exp + amtBase);

        // Pool spending attribution (pure expenses only)
        if (tx.type === 'EXPENSE') {
          const pid = tx.poolId || (state.pools[0] && state.pools[0].id) || 'pool_liquid';
          const pObj = poolLookup(pid) || { id: pid, name: '一般資金池', color: '#9CA3AF' };
          if (!poolMap.has(pid)) {
            poolMap.set(pid, { id: pid, name: pObj.name, color: pObj.color || '#9CA3AF', amount: 0, count: 0 });
          }
          const pe = poolMap.get(pid);
          pe.amount = Store.round2(pe.amount + amtBase);
          pe.count += 1;
        }

        // Category + Sub-category breakdown for selected cfTypeTab
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
          topTxs: c.txs.sort((a, b) => b.amountBase - a.amountBase).slice(0, 5)
        }));

      const poolSpending = Array.from(poolMap.values())
        .sort((a, b) => b.amount - a.amount)
        .map((p) => Object.assign({}, p, {
          pct: exp > 0 ? Math.round((p.amount / exp) * 100) : 0
        }));

      return {
        inc,
        exp,
        net,
        savingsRate,
        prevInc,
        prevExp,
        expDeltaPct,
        incDeltaPct,
        targetTotal,
        categories,
        poolSpending
      };
    }, [state, currentPrefix, prevPrefix, cfTypeTab]);

    // Monthly Trend Series (6 months ending at selected month, OR 12 months in YEAR mode)
    const trendSeries = useMemo(() => {
      const slots = [];
      if (cfGranularity === 'YEAR') {
        for (let m = 0; m < 12; m++) {
          const key = `${cfYear}-${String(m + 1).padStart(2, '0')}`;
          slots.push({ key, shortLabel: `${m + 1}月`, fullLabel: `${cfYear}年${m + 1}月`, inc: 0, exp: 0, net: 0 });
        }
      } else {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(cfYear, cfMonth - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          slots.push({ key, shortLabel: `${d.getMonth() + 1}月`, fullLabel: `${d.getFullYear()}年${d.getMonth() + 1}月`, inc: 0, exp: 0, net: 0 });
        }
      }
      const map = new Map(slots.map((s) => [s.key, s]));
      (state.transactions || []).forEach((tx) => {
        if (!tx.date || (tx.type !== 'INCOME' && tx.type !== 'EXPENSE')) return;
        const ym = tx.date.slice(0, 7);
        const slot = map.get(ym);
        if (!slot) return;
        const amtBase = Store.convertToBase(tx.amount, tx.currency, state);
        if (tx.type === 'INCOME') slot.inc = Store.round2(slot.inc + amtBase);
        else slot.exp = Store.round2(slot.exp + amtBase);
      });
      slots.forEach((s) => { s.net = Store.round2(s.inc - s.exp); });
      return slots;
    }, [state, cfGranularity, cfYear, cfMonth]);

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

      // Wallet pool breakdown (respecting internal virtual allocations!)
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

    // ---- 3. Investment Performance Analytics (Includes Hidden Closed + Ledger INVEST_SETTLEMENT) ----
    const curYearStr = String(now.getFullYear());
    const lastYearStr = String(now.getFullYear() - 1);

    const investPerf = useMemo(() => {
      const yearFilter = invScope === 'THIS_YEAR' ? curYearStr : (invScope === 'LAST_YEAR' ? lastYearStr : null);

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

      // 1. Scan ALL investments (ACTIVE + CLOSED + hiddenFromArchive!)
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

        // Fees (all-time or by lastUpdated year)
        const feeDate = inv.closedDate || inv.lastUpdated || '';
        if ((inv.cumulativeFees || 0) > 0 && (!yearFilter || feeDate.startsWith(yearFilter))) {
          totalFeesBase = Store.round2(totalFeesBase + Store.convertToBase(inv.cumulativeFees, cur, state));
        }

        // Realized capital gains on STOCK_ETF (note: for FD/TBILL, realizedPnl == maturity interest, counted in dividendIntBase)
        const refDate = inv.closedDate || inv.lastUpdated || '';
        const matchesYear = !yearFilter || refDate.startsWith(yearFilter);

        if (inv.type === 'STOCK_ETF' && (inv.realizedPnl || 0) !== 0 && matchesYear) {
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

        // For All-Time Dividends & Term Interest from investments (includes hidden archived FDs & rollover interest)
        if (!yearFilter && (inv.cumulativeDividends || 0) > 0) {
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

      // 2. Scan transactions for INVEST_SETTLEMENT (e.g. META) and yearly dividend/interest INCOME
      (state.transactions || []).forEach((tx) => {
        const txDate = tx.date || '';
        const matchesYear = !yearFilter || txDate.startsWith(yearFilter);
        if (!matchesYear) return;

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
        } else if (yearFilter && tx.type === 'INCOME' && tx.categoryId === 'cat_dividend' && tx.subCategoryId !== 'sub_dv_1') {
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
      const grandReturnBase = yearFilter
        ? realizedTotalBase
        : Store.round2(unrealizedBase + realizedTotalBase);

      activeRanking.sort((a, b) => b.pnlBase - a.pnlBase);
      realizedItems.sort((a, b) => (a.date < b.date ? 1 : -1));

      const maxAbsPnl = Math.max(1, ...activeRanking.map((r) => Math.abs(r.pnlBase)));

      return {
        isYearly: Boolean(yearFilter),
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
    }, [state, invScope, curYearStr, lastYearStr, baseCur]);

    const latestSnap = (state.wealthSnapshots || [])[0] || null;

    return (
      <div className="space-y-4 pb-6">
        {/* Top 3-Tab Reports Switcher */}
        <SegmentedControl
          value={reportTab}
          onChange={setReportTab}
          options={[
            { value: 'CASHFLOW', label: '收支分析' },
            { value: 'NETWORTH', label: '資產結構' },
            { value: 'INVEST', label: '投資績效' }
          ]}
        />

        {/* ================= TAB 1: CASH FLOW & SPENDING ANALYTICS ================= */}
        {reportTab === 'CASHFLOW' && (
          <div className="space-y-4">
            {/* Period Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="p-0.5 rounded-xl bg-[#141417] border border-white/[0.08] flex gap-0.5 shrink-0">
                {[
                  { v: 'MONTH', l: '按月' },
                  { v: 'YEAR', l: '按年' }
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => {
                      setCfGranularity(opt.v);
                      setExpandedCatId(null);
                      setSelectedBarKey(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
                      cfGranularity === opt.v ? 'bg-white text-black' : 'text-zinc-400'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => shiftPeriod(-1)}
                  className="w-8 h-8 rounded-full bg-[#141417] border border-white/[0.08] flex items-center justify-center text-zinc-300 active:bg-white/15"
                >
                  <Icon name="chevronLeft" size={15} />
                </button>
                <span className="px-2.5 text-[13.5px] font-semibold text-white tabular-nums whitespace-nowrap">
                  {periodTitle}
                </span>
                <button
                  type="button"
                  onClick={() => shiftPeriod(1)}
                  className="w-8 h-8 rounded-full bg-[#141417] border border-white/[0.08] flex items-center justify-center text-zinc-300 active:bg-white/15"
                >
                  <Icon name="chevronRight" size={15} />
                </button>
              </div>
            </div>

            {/* Hero Net Cashflow Card */}
            <div className="relative rounded-[22px] bg-[#13141A] border border-white/[0.11] p-4 space-y-3 overflow-hidden shadow-lg">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 88% 10%, rgba(52,211,153,0.16) 0%, rgba(56,189,248,0.06) 48%, transparent 72%)' }}
              />
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11.5px] text-zinc-400 mb-0.5">
                    {periodTitle} 淨結餘 ({baseCur})
                  </div>
                  <div className={`text-[29px] font-bold tabular-nums tracking-tight leading-tight break-all ${
                    cashflowData.net >= 0 ? 'text-white' : 'text-rose-400'
                  }`}>
                    {Store.formatMoney(cashflowData.net, baseCur, { showPlus: true })}
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold tabular-nums shrink-0 ${
                  cashflowData.savingsRate >= 30
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : cashflowData.savingsRate >= 0
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}>
                  儲蓄率 {cashflowData.savingsRate}%
                </span>
              </div>

              <div className="relative grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-black/45 border border-white/[0.07]">
                  <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-400">
                    <span>純收入</span>
                    {cashflowData.incDeltaPct != null && (
                      <span className={`tabular-nums ${cashflowData.incDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {cashflowData.incDeltaPct >= 0 ? '+' : ''}{cashflowData.incDeltaPct}%
                      </span>
                    )}
                  </div>
                  <div className="text-[16.5px] font-bold text-emerald-400 tabular-nums mt-1 whitespace-nowrap">
                    {Store.formatMoney(cashflowData.inc, baseCur)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/45 border border-white/[0.07]">
                  <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-400">
                    <span>純支出</span>
                    {cashflowData.expDeltaPct != null && (
                      <span className={`tabular-nums ${cashflowData.expDeltaPct <= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                        {cashflowData.expDeltaPct >= 0 ? '+' : ''}{cashflowData.expDeltaPct}%
                      </span>
                    )}
                  </div>
                  <div className="text-[16.5px] font-bold text-white tabular-nums mt-1 whitespace-nowrap">
                    {Store.formatMoney(cashflowData.exp, baseCur)}
                  </div>
                </div>
              </div>

              <div className="relative text-[10.5px] text-zinc-500">
                已排除帳戶互轉、信用卡找數、代墊往來與定存本金調撥
              </div>
            </div>

            {/* Interactive Bar Trend Chart */}
            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-white">
                  {cfGranularity === 'YEAR' ? `${cfYear}年 逐月收支趨勢` : '近 6 個月收支趨勢'}
                </span>
                <span className="text-[11px] text-zinc-500">點選柱體查看數值</span>
              </div>
              <CashflowBarChart
                series={trendSeries}
                selectedKey={selectedBarKey}
                onSelect={setSelectedBarKey}
                baseCurrency={baseCur}
                privacyMode={state.meta.privacyMode}
              />
            </div>

            {/* Category Donut + Expandable Sub-Categories */}
            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold text-white">分類結構分析</span>
                <div className="p-0.5 rounded-xl bg-black/60 border border-white/[0.08] flex gap-0.5">
                  {[
                    { v: 'EXPENSE', l: '支出' },
                    { v: 'INCOME', l: '收入' }
                  ].map((t) => (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => { setCfTypeTab(t.v); setExpandedCatId(null); }}
                      className={`px-3 py-1 rounded-lg text-[11.5px] font-semibold transition ${
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
                  {periodTitle}尚無{cfTypeTab === 'EXPENSE' ? '純支出' : '純收入'}紀錄
                </div>
              ) : (
                <>
                  <CategoryDonut
                    slices={cashflowData.categories}
                    total={cashflowData.targetTotal}
                    activeId={expandedCatId}
                    onSelect={setExpandedCatId}
                    baseCurrency={baseCur}
                    centerTitle={cfTypeTab === 'EXPENSE' ? '總支出' : '總收入'}
                  />

                  <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                    {cashflowData.categories.map((cat) => {
                      const isExp = expandedCatId === cat.id;
                      return (
                        <div key={cat.id} className="py-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedCatId(isExp ? null : cat.id)}
                            className="w-full space-y-1.5 text-left active:opacity-80"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="w-7 h-7 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0"
                                  style={{ color: cat.color }}
                                >
                                  <Icon name={cat.icon} size={14} />
                                </span>
                                <div className="min-w-0">
                                  <span className="text-[13.5px] font-semibold text-white">{cat.name}</span>
                                  <span className="text-[11px] text-zinc-500 ml-1.5 tabular-nums">{cat.count} 筆</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0 tabular-nums">
                                <span className="text-[13.5px] font-bold text-white">
                                  {Store.formatMoney(cat.amount, baseCur)}
                                </span>
                                <span className="text-[11px] text-zinc-400 ml-1.5">{cat.pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(2, cat.pct)}%`, background: cat.color }} />
                            </div>
                          </button>

                          {isExp && (
                            <div className="mt-2.5 p-3 rounded-xl bg-black/45 border border-white/[0.07] space-y-2.5">
                              {cat.subList.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[10.5px] font-semibold text-zinc-400">小類別分佈</div>
                                  {cat.subList.map((sub) => (
                                    <div key={sub.name} className="flex items-center justify-between gap-2 text-[12px] tabular-nums">
                                      <span className="text-zinc-300 truncate">{sub.name}</span>
                                      <span className="text-zinc-200 font-medium shrink-0">
                                        {Store.formatMoney(sub.amount, baseCur)} ({sub.pct}%)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {cat.topTxs.length > 0 && (
                                <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                                  <div className="text-[10.5px] font-semibold text-zinc-400">主要紀錄（前 {cat.topTxs.length} 筆）</div>
                                  {cat.topTxs.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between gap-2 text-[11.5px] tabular-nums">
                                      <span className="text-zinc-400 truncate">
                                        {t.date.slice(5)} · <span className="text-zinc-200">{t.title}</span>
                                      </span>
                                      <span className="text-white font-semibold shrink-0">
                                        {Store.formatMoney(t.amount, t.currency)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Spending Attribution by Funding Pool */}
            {cashflowData.poolSpending.length > 0 && (
              <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-white">資金池消費歸屬</span>
                  <span className="text-[11px] text-zinc-500">個人 vs 家庭共同</span>
                </div>
                <div className="space-y-2.5">
                  {cashflowData.poolSpending.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[12.5px] tabular-nums">
                        <span className="flex items-center gap-1.5 text-zinc-200">
                          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                          {p.name}
                          <span className="text-[11px] text-zinc-500">({p.count} 筆)</span>
                        </span>
                        <span className="font-semibold text-white">
                          {Store.formatMoney(p.amount, baseCur)} ({p.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, p.pct)}%`, background: p.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: NET WORTH & BALANCE SHEET ================= */}
        {reportTab === 'NETWORTH' && (
          <div className="space-y-4">
            {/* Hero Balance Sheet Card */}
            <div className="relative rounded-[22px] bg-[#13141A] border border-white/[0.11] p-4 space-y-3.5 overflow-hidden shadow-lg">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 86% 12%, rgba(96,165,250,0.18) 0%, rgba(167,139,250,0.08) 46%, transparent 72%)' }}
              />
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11.5px] text-sky-200/90 mb-1">總淨資產 ({baseCur})</div>
                  <div className="text-[30px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
                    {Store.formatMoney(metrics.totalNetWorth, baseCur)}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/10 text-[11px] font-semibold text-zinc-300 tabular-nums shrink-0">
                  負債率 {balanceSheet.debtRatio}%
                </span>
              </div>

              {/* 4-Way Asset Class Stacked Bar */}
              <div className="relative space-y-1.5">
                <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden flex gap-[1.5px]">
                  {balanceSheet.pctWallet > 0 && <div className="h-full bg-emerald-400" style={{ width: `${balanceSheet.pctWallet}%` }} />}
                  {balanceSheet.pctFd > 0 && <div className="h-full bg-amber-400" style={{ width: `${balanceSheet.pctFd}%` }} />}
                  {balanceSheet.pctTbill > 0 && <div className="h-full bg-sky-400" style={{ width: `${balanceSheet.pctTbill}%` }} />}
                  {balanceSheet.pctEquity > 0 && <div className="h-full bg-violet-400" style={{ width: `${balanceSheet.pctEquity}%` }} />}
                </div>
                <div className="flex items-center gap-3 flex-wrap text-[10.5px] text-zinc-400 tabular-nums">
                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 活期 {balanceSheet.pctWallet}%</span>
                  {balanceSheet.fdTotal > 0 && <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 定期 {balanceSheet.pctFd}%</span>}
                  {balanceSheet.tbillTotal > 0 && <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> 美債 {balanceSheet.pctTbill}%</span>}
                  {balanceSheet.equityTotal > 0 && <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> 股/ETF {balanceSheet.pctEquity}%</span>}
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06] text-[12px]">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
                  <div className="text-[10.5px] text-zinc-400">銀包活期</div>
                  <div className="text-[14.5px] font-bold text-emerald-400 tabular-nums mt-0.5">
                    {Store.formatMoney(metrics.walletTotal, baseCur)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
                  <div className="text-[10.5px] text-zinc-400">定期 / 美債</div>
                  <div className="text-[14.5px] font-bold text-amber-300 tabular-nums mt-0.5">
                    {Store.formatMoney(Store.round2(balanceSheet.fdTotal + balanceSheet.tbillTotal), baseCur)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
                  <div className="text-[10.5px] text-zinc-400">股票 / ETF</div>
                  <div className="text-[14.5px] font-bold text-violet-300 tabular-nums mt-0.5">
                    {Store.formatMoney(balanceSheet.equityTotal, baseCur)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
                  <div className="text-[10.5px] text-zinc-400">總負債（卡數＋借貸）</div>
                  <div className="text-[14.5px] font-bold text-rose-400 tabular-nums mt-0.5">
                    {Store.formatMoney(balanceSheet.totalLiabilities, baseCur)}
                  </div>
                </div>
              </div>

              {(metrics.pendingReceivables > 0 || metrics.pendingPayables > 0) && (
                <div className="relative pt-1 flex items-center justify-between gap-2 text-[11px] text-zinc-400 tabular-nums">
                  <span>待收回代墊：{Store.formatMoney(metrics.pendingReceivables, baseCur)}</span>
                  <span>待還借貸：{Store.formatMoney(metrics.pendingPayables, baseCur)}</span>
                </div>
              )}
            </div>

            {/* Multi-Currency Asset Exposure */}
            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-white">多幣種資產敞口</span>
                <span className="text-[11px] text-zinc-500">含活期、定期與持倉</span>
              </div>
              {balanceSheet.currencies.length === 0 ? (
                <div className="py-6 text-center text-[12.5px] text-zinc-500">尚無資產資料</div>
              ) : (
                <div className="space-y-3">
                  {balanceSheet.currencies.map((c, idx) => {
                    const col = Store.POOL_COLORS[idx % Store.POOL_COLORS.length];
                    return (
                      <div key={c.code} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-[12.5px] tabular-nums">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10.5px] font-bold text-white">{c.code}</span>
                            <span className="text-zinc-300 truncate">{Store.formatMoney(c.nativeTotal, c.code)}</span>
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

            {/* Wallet Funding Pools Distribution */}
            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-white">銀包資金池分佈</span>
                <span className="text-[11px] text-zinc-500">已計入戶口內虛擬切分</span>
              </div>
              <div className="space-y-3">
                {balanceSheet.walletPools.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[12.5px] tabular-nums">
                      <span className="flex items-center gap-1.5 text-zinc-200">
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
          </div>
        )}

        {/* ================= TAB 3: INVESTMENT & YIELD PERFORMANCE ================= */}
        {reportTab === 'INVEST' && (
          <div className="space-y-4">
            {/* Scope Filter */}
            <SegmentedControl
              value={invScope}
              onChange={setInvScope}
              options={[
                { value: 'ALL', label: '全期累計' },
                { value: 'THIS_YEAR', label: `${curYearStr}年` },
                { value: 'LAST_YEAR', label: `${lastYearStr}年` }
              ]}
            />

            {/* Hero Investment Return Card */}
            <div className="relative rounded-[22px] bg-[#13141A] border border-white/[0.11] p-4 space-y-3 overflow-hidden shadow-lg">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 90% 10%, rgba(251,191,36,0.16) 0%, rgba(52,211,153,0.10) 48%, transparent 72%)' }}
              />
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11.5px] text-amber-200/90 mb-0.5">
                    {investPerf.isYearly
                      ? `${invScope === 'THIS_YEAR' ? curYearStr : lastYearStr}年 已實現總收益 (${baseCur})`
                      : `定存與投資綜合總損益 (${baseCur})`}
                  </div>
                  <div className={`text-[29px] font-bold tabular-nums tracking-tight leading-tight break-all ${
                    investPerf.grandReturnBase >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {Store.formatMoney(investPerf.grandReturnBase, baseCur, { showPlus: true })}
                  </div>
                </div>
                {investPerf.hiddenCounted > 0 && (
                  <span className="px-2 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-[10px] font-semibold text-violet-200 shrink-0 whitespace-nowrap">
                    含 {investPerf.hiddenCounted} 筆隱藏歸檔
                  </span>
                )}
              </div>

              <div className="relative grid grid-cols-2 gap-2.5 pt-1 text-[12px]">
                <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                  <div className="text-[10.5px] text-zinc-400">活躍持倉未實現</div>
                  <div className={`text-[14.5px] font-bold tabular-nums mt-0.5 ${
                    investPerf.unrealizedBase >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {Store.formatMoney(investPerf.unrealizedBase, baseCur, { showPlus: true })}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                  <div className="text-[10.5px] text-zinc-400">已實現買賣損益</div>
                  <div className={`text-[14.5px] font-bold tabular-nums mt-0.5 ${
                    investPerf.realizedCapBase >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {Store.formatMoney(investPerf.realizedCapBase, baseCur, { showPlus: true })}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                  <div className="text-[10.5px] text-zinc-400">已收定存息 / 股息</div>
                  <div className="text-[14.5px] font-bold text-amber-300 tabular-nums mt-0.5">
                    {Store.formatMoney(investPerf.dividendIntBase, baseCur, { showPlus: true })}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/45 border border-white/[0.06]">
                  <div className="text-[10.5px] text-zinc-400">
                    {investPerf.expectedTermIntBase > 0 ? '進行中定期預估息' : '累計手續費 / 稅費'}
                  </div>
                  <div className="text-[14.5px] font-bold text-zinc-200 tabular-nums mt-0.5">
                    {investPerf.expectedTermIntBase > 0
                      ? Store.formatMoney(investPerf.expectedTermIntBase, baseCur, { showPlus: true })
                      : Store.formatMoney(-investPerf.totalFeesBase, baseCur)}
                  </div>
                </div>
              </div>

              {investPerf.expectedTermIntBase > 0 && investPerf.totalFeesBase > 0 && (
                <div className="relative text-[11px] text-zinc-500 tabular-nums">
                  累計紀錄手續費／稅費：-{Store.formatMoney(investPerf.totalFeesBase, baseCur)}
                </div>
              )}
            </div>

            {/* Wealth Snapshot Net Value Trend */}
            {(state.wealthSnapshots || []).length >= 2 && (
              <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-white">結單歸檔市值走勢</span>
                  <span className="text-[11px] text-zinc-500">{state.wealthSnapshots.length} 期歸檔</span>
                </div>
                <SnapshotTrendChart snapshots={state.wealthSnapshots} baseCurrency={baseCur} />
              </div>
            )}

            {/* Latest Broker Statement Summary Strip (from IBKR Sync JSON) */}
            {latestSnap && latestSnap.periodSummary && (
              <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-white truncate">{latestSnap.label}</span>
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

            {/* Active Holdings P&L Ranking */}
            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-white">持倉盈虧排行</span>
                <span className="text-[11px] text-zinc-500">{investPerf.activeRanking.length} 項市值部位</span>
              </div>
              {investPerf.activeRanking.length === 0 ? (
                <div className="py-6 text-center text-[12.5px] text-zinc-500">尚無股票／ETF 或美債活躍持倉</div>
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
                            <div
                              className={`h-full rounded-full ${isPos ? 'bg-emerald-400' : 'bg-rose-400'}`}
                              style={{ width: `${barPct}%` }}
                            />
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

            {/* Historical Realized & Closed Performance Ledger (Includes Hidden Closed + META Ledger Settlement) */}
            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
              <button
                type="button"
                onClick={() => setRealizedExpanded((p) => !p)}
                className="w-full px-4 py-3 flex items-center justify-between text-[13px] font-semibold text-white active:bg-white/[0.04]"
              >
                <span>已實現與歷史結算明細 ({investPerf.realizedItems.length})</span>
                <Icon name="chevronDown" size={14} className={`text-zinc-400 transition-transform ${realizedExpanded ? 'rotate-180' : ''}`} />
              </button>
              {realizedExpanded && (
                <div className="border-t border-white/[0.06]">
                  {investPerf.realizedItems.length === 0 ? (
                    <div className="py-6 text-center text-[12px] text-zinc-500">
                      此區間尚無已實現平倉或結算紀錄
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
            </div>
          </div>
        )}
      </div>
    );
  }

  window.WealthReports = { ReportsView };
})();
