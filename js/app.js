(function () {
  'use strict';

  const { useState, useMemo, useCallback, useRef } = React;

  // ---- 2-Step Minimal Onboarding Flow ----
  function OnboardingFlow({ onFinish }) {
    const Store = window.WealthStore;
    const [step, setStep] = useState(1);
    const [currency, setCurrency] = useState('MOP');

    return (
      <div className="h-full w-full bg-black text-white flex flex-col justify-between px-6 safe-top" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}>
        <div className="pt-8 space-y-6">
          <div className="flex items-center gap-2">
            <span className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/15'}`} />
            <span className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/15'}`} />
          </div>

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-[28px] font-bold tracking-tight">選擇主計價幣種</h1>
                <p className="text-[14px] text-zinc-400 mt-1.5">所有跨幣種總資產與報表將自動折算為此幣種，日後可隨時調整。</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {Store.CURRENCIES.map((c) => {
                  const sel = currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCurrency(c.code)}
                      className={`p-4 rounded-2xl border text-left transition ${
                        sel ? 'bg-white text-black border-white' : 'bg-[#141417] text-white border-white/10'
                      }`}
                    >
                      <div className="text-[18px] font-bold">{c.code}</div>
                      <div className={`text-[12px] mt-0.5 ${sel ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {c.name} · {c.symbol}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h1 className="text-[28px] font-bold tracking-tight">選擇初始帳本</h1>
                <p className="text-[14px] text-zinc-400 mt-1.5">所有帳目僅儲存於本機裝置，支援隨時 JSON 備份與還原。</p>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => onFinish(currency, true)}
                  className="w-full p-5 rounded-2xl bg-white text-black text-left active:scale-[0.99] transition"
                >
                  <div className="text-[16px] font-bold">載入通用範例體驗</div>
                  <div className="text-[12px] text-zinc-600 mt-1">含多幣種銀行卡、電子錢包、信用卡、代墊與分流規則範例</div>
                </button>
                <button
                  type="button"
                  onClick={() => onFinish(currency, false)}
                  className="w-full p-5 rounded-2xl bg-[#141417] border border-white/15 text-white text-left active:scale-[0.99] transition"
                >
                  <div className="text-[16px] font-bold">建立空白帳本</div>
                  <div className="text-[12px] text-zinc-400 mt-1">從零開始建立屬於你的銀包與記帳流程</div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-2xl bg-white text-black text-[15px] font-bold"
            >
              下一步
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-3.5 rounded-2xl bg-white/10 text-zinc-300 text-[14px] font-medium"
            >
              返回上一步
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- Assets Sub-Tab 2: Credit Cards (Dynamic Cycle & Pay Hook) ----
  function CreditCardsTab({ state, onPayCard }) {
    const Store = window.WealthStore;
    const totalDebt = state.cards.reduce((s, c) => s + Store.convertToBase((c.unbilled || 0) + (c.billed || 0), c.currency, state), 0);

    return (
      <div className="space-y-3.5 pb-6">
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 mb-1">信用卡總待繳額</div>
            <div className="text-[24px] font-bold text-white tabular-nums">
              {Store.formatMoney(totalDebt, state.meta.baseCurrency)}
            </div>
          </div>
          <div className="text-[11px] text-zinc-500">共 {state.cards.length} 張卡片</div>
        </div>

        {state.cards.length === 0 ? (
          <div className="rounded-2xl bg-[#111114] border border-white/[0.08] py-10 text-center text-[13px] text-zinc-500">
            尚未設定信用卡（完整卡務與找數管理將於階段 2 接入）。
          </div>
        ) : (
          state.cards.map((card) => {
            const cycle = Store.getCreditCardCycle(card);
            const spent = Store.round2((card.unbilled || 0) + (card.billed || 0));
            const ratio = card.creditLimit > 0 ? Math.min(100, Math.round((spent / card.creditLimit) * 100)) : 0;
            const theme = Store.CARD_THEMES.find((t) => t.id === card.theme) || Store.CARD_THEMES[1];
            return (
              <div
                key={card.id}
                className="rounded-2xl p-4 border border-white/[0.12] space-y-3"
                style={{ background: theme.bg }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[15px] font-bold text-white">{card.name}</div>
                    <div className="text-[11px] text-white/60 mt-0.5">
                      尾號 {card.last4} · 截數區間 {cycle.periodLabel}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-black/35 border border-white/15 text-[11px] font-semibold text-amber-300 whitespace-nowrap">
                    {cycle.daysToDue} 天後到期 ({cycle.dueLabel})
                  </span>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[11px] text-white/60">本期累積待繳</div>
                    <div className="text-[22px] font-bold text-white tabular-nums">
                      {Store.formatMoney(spent, card.currency)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPayCard(card.id)}
                    className="px-3.5 py-1.5 rounded-full bg-white text-black text-[12px] font-bold active:scale-95 transition"
                  >
                    找數還款
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-black/35 overflow-hidden">
                    <div className="h-full bg-white/85 rounded-full" style={{ width: `${ratio}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-white/55 tabular-nums">
                    <span>額度使用率 {ratio}%</span>
                    <span>額度 {Store.formatMoney(card.creditLimit, card.currency)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // ---- Assets Sub-Tab 3: Fixed Deposits & Investments ----
  function InvestmentsTab({ state }) {
    const Store = window.WealthStore;
    const totalInv = state.investments.reduce(
      (s, x) => s + Store.convertToBase(x.currentValue || x.principal || 0, x.currency, state),
      0
    );

    return (
      <div className="space-y-3.5 pb-6">
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 mb-1">定存與投資市值</div>
            <div className="text-[24px] font-bold text-white tabular-nums">
              {Store.formatMoney(totalInv, state.meta.baseCurrency)}
            </div>
          </div>
          <div className="text-[11px] text-zinc-500">{state.investments.length} 項持倉</div>
        </div>

        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          {state.investments.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-zinc-500">
              尚未建立定存或投資部位（將於階段 2 接入完整定存／美債與券商季報歸檔）。
            </div>
          ) : (
            state.investments.map((inv) => {
              const pnl = Store.round2((inv.currentValue || 0) - (inv.principal || 0));
              return (
                <div key={inv.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-white truncate">{inv.name}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {inv.type === 'FIXED_DEPOSIT'
                        ? `定期存款 · 年利率 ${inv.apr}% · 到期 ${inv.maturityDate}`
                        : `投資標的 · ${inv.currency}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[14px] font-semibold text-white tabular-nums">
                      {Store.formatMoney(inv.currentValue, inv.currency)}
                    </div>
                    <div className={`text-[11px] tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {Store.formatMoney(pnl, inv.currency, { showPlus: true })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ---- Reports View (Live Store KPIs) ----
  function ReportsView({ state }) {
    const Store = window.WealthStore;
    const metrics = useMemo(() => Store.getSummaryMetrics(state), [state]);
    const thisMonth = Store.todayISO().slice(0, 7);

    const monthStats = useMemo(() => {
      let inc = 0;
      let exp = 0;
      state.transactions.forEach((tx) => {
        if (!tx.date || !tx.date.startsWith(thisMonth)) return;
        // 嚴格隔離：LOAN_SETTLEMENT、TRANSFER、RECEIVABLE/PAYABLE 不計入純收支
        if (tx.type === 'INCOME') inc += Store.convertToBase(tx.amount, tx.currency, state);
        if (tx.type === 'EXPENSE') exp += Store.convertToBase(tx.amount, tx.currency, state);
      });
      const net = Store.round2(inc - exp);
      const savingsRate = inc > 0 ? Math.round((net / inc) * 100) : 0;
      return { inc: Store.round2(inc), exp: Store.round2(exp), net, savingsRate };
    }, [state, thisMonth]);

    const poolBreakdown = useMemo(() => {
      const totals = {};
      state.pools.forEach((p) => { totals[p.id] = 0; });
      state.accounts.forEach((a) => {
        (a.balances || []).forEach((b) => {
          const val = Store.convertToBase(b.amount, b.currency, state);
          const pid = b.poolId || 'pool_liquid';
          totals[pid] = Store.round2((totals[pid] || 0) + val);
        });
      });
      const grand = Object.values(totals).reduce((s, v) => s + Math.max(0, v), 0) || 1;
      return state.pools.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        amount: totals[p.id] || 0,
        pct: Math.round((Math.max(0, totals[p.id] || 0) / grand) * 100)
      }));
    }, [state]);

    return (
      <div className="space-y-4 pb-6">
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] text-zinc-400">總淨資產</div>
              <div className="text-[28px] font-bold text-white tabular-nums tracking-tight mt-0.5">
                {Store.formatMoney(metrics.totalNetWorth, state.meta.baseCurrency)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-zinc-500">待收回代墊</div>
              <div className="text-[13px] font-semibold text-amber-300 tabular-nums">
                {Store.formatMoney(metrics.pendingReceivables, state.meta.baseCurrency)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.06] text-[12px]">
            <div>
              <div className="text-zinc-500 text-[11px]">可動用現金</div>
              <div className="text-emerald-400 font-semibold tabular-nums mt-0.5">
                {Store.formatMoney(metrics.liquidCash, state.meta.baseCurrency)}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[11px]">鎖定與投資</div>
              <div className="text-zinc-200 font-semibold tabular-nums mt-0.5">
                {Store.formatMoney(metrics.lockedAndInvestments, state.meta.baseCurrency)}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[11px]">信用待繳</div>
              <div className="text-rose-400 font-semibold tabular-nums mt-0.5">
                {Store.formatMoney(metrics.cardDebt, state.meta.baseCurrency)}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Cashflow */}
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-white">本月純收支 ({thisMonth})</span>
            <span className="text-[11px] text-zinc-400 tabular-nums">儲蓄率 {monthStats.savingsRate}%</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-black/45 border border-white/[0.06]">
              <div className="text-[11px] text-zinc-400">本月純收入</div>
              <div className="text-[17px] font-bold text-emerald-400 tabular-nums mt-1">
                {Store.formatMoney(monthStats.inc, state.meta.baseCurrency)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/45 border border-white/[0.06]">
              <div className="text-[11px] text-zinc-400">本月純支出</div>
              <div className="text-[17px] font-bold text-white tabular-nums mt-1">
                {Store.formatMoney(monthStats.exp, state.meta.baseCurrency)}
              </div>
            </div>
          </div>
        </div>

        {/* Pool Distribution */}
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
          <div className="text-[14px] font-semibold text-white">銀包資金池分佈</div>
          <div className="space-y-3">
            {poolBreakdown.map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-zinc-300">{p.name}</span>
                  <span className="text-white font-semibold tabular-nums">
                    {Store.formatMoney(p.amount, state.meta.baseCurrency)} ({p.pct}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Settings View ----
  function SettingsView({ state, showToast }) {
    const { Icon, BottomSheet, NumericInput } = window.WealthUI;
    const Store = window.WealthStore;

    const [diagOpen, setDiagOpen] = useState(false);
    const [fxOpen, setFxOpen] = useState(false);
    const fileInputRef = useRef(null);

    const diagnostics = useMemo(() => (diagOpen ? Store.runDiagnostics() : []), [diagOpen, state]);
    const vpDiag = typeof window !== 'undefined' ? (window.__VIEWPORT_DIAG__ || {}) : {};

    const handleExportJSON = () => {
      const raw = Store.exportJSON();
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wealth-backup-${Store.todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('已匯出 JSON 帳本備份');
    };

    const handleImportFile = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          Store.importJSON(String(reader.result || ''));
          showToast('已成功還原帳本資料');
        } catch (err) {
          showToast('匯入失敗：JSON 格式不正確');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    return (
      <div className="space-y-4 pb-6">
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-white">主計價幣種</div>
              <div className="text-[11px] text-zinc-500">總資產與報表基準幣種</div>
            </div>
            <select
              value={state.meta.baseCurrency}
              onChange={(e) => { Store.setBaseCurrency(e.target.value); showToast(`主幣種已切換為 ${e.target.value}`); }}
              className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] font-semibold text-white outline-none"
            >
              {Store.CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setFxOpen(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-white/[0.04]"
          >
            <div>
              <div className="text-[14px] font-medium text-white">匯率換算表</div>
              <div className="text-[11px] text-zinc-500">自訂外幣對 {state.meta.baseCurrency} 匯率</div>
            </div>
            <Icon name="chevronRight" size={16} className="text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={() => Store.togglePrivacy()}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-white/[0.04]"
          >
            <div>
              <div className="text-[14px] font-medium text-white">隱私遮罩模式</div>
              <div className="text-[11px] text-zinc-500">隱藏畫面中所有金額數值</div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${state.meta.privacyMode ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
              {state.meta.privacyMode ? '已開啟' : '關閉'}
            </span>
          </button>
        </div>

        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          <button
            type="button"
            onClick={() => setDiagOpen(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-white/[0.04]"
          >
            <div>
              <div className="text-[14px] font-medium text-white">帳務一致性與視區診斷</div>
              <div className="text-[11px] text-zinc-500">檢查帳務閉環與 iOS 獨立全螢幕高度</div>
            </div>
            <Icon name="chevronRight" size={16} className="text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-white/[0.04]"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="download" size={16} className="text-zinc-300" />
              <span className="text-[14px] font-medium text-white">匯出 JSON 帳本備份</span>
            </div>
            <Icon name="chevronRight" size={16} className="text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-white/[0.04]"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="upload" size={16} className="text-zinc-300" />
              <span className="text-[14px] font-medium text-white">從 JSON 還原帳本</span>
            </div>
            <Icon name="chevronRight" size={16} className="text-zinc-500" />
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />

          <button
            type="button"
            onClick={() => Store.resetOnboarding()}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-white/[0.04]"
          >
            <span className="text-[14px] font-medium text-amber-300">重新執行初始引導（切換空白 / 範例）</span>
            <Icon name="chevronRight" size={16} className="text-zinc-500" />
          </button>
        </div>

        <div className="text-center text-[11px] text-zinc-600 pt-2">
          Wealth PWA · Schema v{Store.SCHEMA_VERSION} · {Store.APP_VERSION}
        </div>

        {/* FX Rate Editor Sheet */}
        <BottomSheet open={fxOpen} title={`外幣對 ${state.meta.baseCurrency} 匯率`} onClose={() => setFxOpen(false)}>
          <div className="space-y-3">
            {Store.CURRENCIES.filter((c) => c.code !== state.meta.baseCurrency).map((c) => (
              <div key={c.code} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/45 border border-white/[0.06]">
                <div>
                  <div className="text-[14px] font-semibold text-white">1 {c.code}</div>
                  <div className="text-[11px] text-zinc-500">{c.name}</div>
                </div>
                <NumericInput
                  size="sm"
                  value={state.meta.fxRates[c.code] || 1}
                  currency={state.meta.baseCurrency}
                  label={`1 ${c.code} 兌 ${state.meta.baseCurrency}`}
                  onChange={(val) => {
                    if (val > 0) {
                      Store.updateFxRate(c.code, val);
                      showToast(`已更新 ${c.code} 匯率`);
                    }
                  }}
                  className="!w-[150px]"
                />
              </div>
            ))}
          </div>
        </BottomSheet>

        {/* Diagnostics Sheet */}
        <BottomSheet open={diagOpen} title="帳務一致性與視區診斷" onClose={() => setDiagOpen(false)}>
          <div className="space-y-3">
            {diagnostics.map((item, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-black/45 border border-white/[0.08] flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13px] font-semibold text-white">{item.label}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{item.detail}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${item.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  {item.ok ? '通過' : '異常'}
                </span>
              </div>
            ))}
            <div className="p-3.5 rounded-xl bg-black/45 border border-white/[0.08] text-[12px] text-zinc-400 space-y-1 tabular-nums">
              <div className="text-white font-semibold mb-1">裝置視區讀數</div>
              <div>模式：{vpDiag.isStandalone ? 'PWA 獨立主畫面' : '瀏覽器模式'} ({vpDiag.isIOS ? 'iOS' : 'Non-iOS'})</div>
              <div>innerHeight：{vpDiag.innerHeight || window.innerHeight}px · screen.height：{vpDiag.screenHeight || window.screen.height}px</div>
              <div>鎖定高度 (--app-height)：{vpDiag.appliedHeight || window.innerHeight}px</div>
            </div>
          </div>
        </BottomSheet>
      </div>
    );
  }

  // ---- Main App Shell (ALL Hooks Strictly Unconditional at Top — Fixes React #310) ----
  function AppShell() {
    const {
      Icon,
      useWealthStore,
      useHorizontalSwipe,
      useLongPress,
      QuickPopoverMenu,
      SegmentedControl,
      Toast
    } = window.WealthUI;
    const Store = window.WealthStore;
    const { WalletView } = window.WealthWallet;
    const { LedgerView, TransactionEditorSheet } = window.WealthLedger;

    // ALL hooks unconditionally declared before any early return
    const state = useWealthStore();
    const [activeTab, setActiveTab] = useState('LEDGER'); // LEDGER | ASSETS | REPORTS | SETTINGS
    const [assetSubTab, setAssetSubTab] = useState('WALLET'); // WALLET | CARDS | WEALTH
    const [toastMsg, setToastMsg] = useState('');
    const toastTimerRef = useRef(null);

    const [editorState, setEditorState] = useState({
      open: false,
      initialType: 'EXPENSE',
      editingTx: null,
      prefillToCardId: null
    });

    const [quickMenu, setQuickMenu] = useState(null); // { type: 'ASSETS' | 'ADD', anchorX: number }
    const [highlightedQuickKey, setHighlightedQuickKey] = useState(null);

    const showToast = useCallback((msg) => {
      setToastMsg(msg);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastMsg(''), 2200);
    }, []);

    const ASSET_ORDER = ['WALLET', 'CARDS', 'WEALTH'];

    const swipeHandlers = useHorizontalSwipe(
      useCallback(() => {
        if (activeTab !== 'ASSETS') return;
        setAssetSubTab((cur) => {
          const idx = ASSET_ORDER.indexOf(cur);
          return ASSET_ORDER[Math.min(ASSET_ORDER.length - 1, idx + 1)];
        });
      }, [activeTab]),
      useCallback(() => {
        if (activeTab !== 'ASSETS') return;
        setAssetSubTab((cur) => {
          const idx = ASSET_ORDER.indexOf(cur);
          return ASSET_ORDER[Math.max(0, idx - 1)];
        });
      }, [activeTab])
    );

    const handleQuickSelect = useCallback((key) => {
      setQuickMenu(null);
      setHighlightedQuickKey(null);
      if (key === 'WALLET' || key === 'CARDS' || key === 'WEALTH') {
        setActiveTab('ASSETS');
        setAssetSubTab(key);
        return;
      }
      if (key === 'EXPENSE' || key === 'INCOME' || key === 'TRANSFER' || key === 'RECEIVABLE') {
        setEditorState({ open: true, initialType: key, editingTx: null, prefillToCardId: null });
      }
    }, []);

    const assetsBtnPress = useLongPress({
      onShortTap: () => {
        if (activeTab === 'ASSETS') {
          setAssetSubTab((cur) => {
            const idx = ASSET_ORDER.indexOf(cur);
            return ASSET_ORDER[(idx + 1) % ASSET_ORDER.length];
          });
        } else {
          setActiveTab('ASSETS');
        }
      },
      onLongPress: (anchorX) => {
        setHighlightedQuickKey(null);
        setQuickMenu({ type: 'ASSETS', anchorX });
      },
      onDragOverKey: (k) => setHighlightedQuickKey(k),
      onDragRelease: (k) => handleQuickSelect(k)
    });

    const addBtnPress = useLongPress({
      onShortTap: () => {
        setEditorState({ open: true, initialType: 'EXPENSE', editingTx: null, prefillToCardId: null });
      },
      onLongPress: (anchorX) => {
        setHighlightedQuickKey(null);
        setQuickMenu({ type: 'ADD', anchorX });
      },
      onDragOverKey: (k) => setHighlightedQuickKey(k),
      onDragRelease: (k) => handleQuickSelect(k)
    });

    // Safe early return AFTER all hooks
    if (!state.meta.onboardingDone) {
      return (
        <OnboardingFlow
          onFinish={(cur, useDemo) => {
            Store.completeOnboarding(cur, useDemo);
            showToast(useDemo ? '已載入通用範例帳本' : '空白帳本已就緒');
          }}
        />
      );
    }

    const pageTitle = activeTab === 'ASSETS'
      ? '資產'
      : activeTab === 'REPORTS'
      ? '報表'
      : activeTab === 'SETTINGS'
      ? '設定'
      : null;

    return (
      <div className="fixed inset-0 flex flex-col bg-black text-white overflow-hidden" style={{ height: 'var(--app-height, 100dvh)' }}>
        {/* Main Scroll Area */}
        <main
          {...(activeTab === 'ASSETS' ? swipeHandlers : {})}
          className="app-scroll-main flex-1 overflow-y-auto px-4 safe-top max-w-[480px] w-full mx-auto"
        >
          {pageTitle && (
            <div className="pt-1 pb-3 flex items-center justify-between">
              <h1 className="text-[24px] font-bold tracking-tight text-white">{pageTitle}</h1>
              <button
                type="button"
                onClick={() => Store.togglePrivacy()}
                className="w-9 h-9 rounded-full bg-[#141417] border border-white/[0.08] flex items-center justify-center text-zinc-300 active:bg-white/15"
              >
                <Icon name={state.meta.privacyMode ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
          )}

          {activeTab === 'LEDGER' && (
            <div className="pt-1">
              <LedgerView
                state={state}
                showToast={showToast}
                onEditTx={(tx) => setEditorState({ open: true, initialType: tx.type, editingTx: tx, prefillToCardId: null })}
              />
            </div>
          )}

          {activeTab === 'ASSETS' && (
            <div className="space-y-4">
              <SegmentedControl
                value={assetSubTab}
                onChange={setAssetSubTab}
                options={[
                  { value: 'WALLET', label: '銀包' },
                  { value: 'CARDS', label: '信用卡' },
                  { value: 'WEALTH', label: '定存投資' }
                ]}
              />
              {assetSubTab === 'WALLET' && <WalletView state={state} showToast={showToast} />}
              {assetSubTab === 'CARDS' && (
                <CreditCardsTab
                  state={state}
                  onPayCard={(cardId) => setEditorState({ open: true, initialType: 'TRANSFER', editingTx: null, prefillToCardId: cardId })}
                />
              )}
              {assetSubTab === 'WEALTH' && <InvestmentsTab state={state} />}
            </div>
          )}

          {activeTab === 'REPORTS' && <ReportsView state={state} />}
          {activeTab === 'SETTINGS' && <SettingsView state={state} showToast={showToast} />}
        </main>

        {/* Bottom Navigation Bar (Plan A: Centered +, Flush to Physical Screen Bottom) */}
        <nav className="shrink-0 z-40 bg-[#0B0B0D]/95 backdrop-blur-md border-t border-white/[0.08] safe-bottom-nav">
          <div className="max-w-[480px] mx-auto px-2 pt-2 grid grid-cols-5 items-center">
            <button
              type="button"
              onClick={() => setActiveTab('LEDGER')}
              className={`flex flex-col items-center justify-center gap-1 py-1 transition ${
                activeTab === 'LEDGER' ? 'text-white' : 'text-zinc-500'
              }`}
            >
              <Icon name="calendar" size={21} />
              <span className="text-[10px] font-medium">明細</span>
            </button>

            <button
              type="button"
              {...assetsBtnPress}
              className={`flex flex-col items-center justify-center gap-1 py-1 transition ${
                activeTab === 'ASSETS' ? 'text-white' : 'text-zinc-500'
              }`}
            >
              <Icon name="wallet" size={21} />
              <span className="text-[10px] font-medium">資產</span>
            </button>

            <div className="flex items-center justify-center">
              <button
                type="button"
                {...addBtnPress}
                aria-label="新增紀錄"
                className="w-[52px] h-[44px] rounded-[16px] bg-white text-black flex items-center justify-center shadow-[0_4px_18px_rgba(255,255,255,0.22)] active:scale-95 transition"
              >
                <Icon name="plus" size={24} strokeWidth={2.4} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('REPORTS')}
              className={`flex flex-col items-center justify-center gap-1 py-1 transition ${
                activeTab === 'REPORTS' ? 'text-white' : 'text-zinc-500'
              }`}
            >
              <Icon name="pie" size={21} />
              <span className="text-[10px] font-medium">報表</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex flex-col items-center justify-center gap-1 py-1 transition ${
                activeTab === 'SETTINGS' ? 'text-white' : 'text-zinc-500'
              }`}
            >
              <Icon name="settings" size={21} />
              <span className="text-[10px] font-medium">設定</span>
            </button>
          </div>
        </nav>

        {/* Viewport-Clamped Long-Press Quick Popover Menus */}
        <QuickPopoverMenu
          open={Boolean(quickMenu && quickMenu.type === 'ASSETS')}
          title="快速切換資產視角"
          anchorX={quickMenu ? quickMenu.anchorX : null}
          highlightedKey={highlightedQuickKey}
          onSelect={handleQuickSelect}
          onClose={() => { setQuickMenu(null); setHighlightedQuickKey(null); }}
          items={[
            { key: 'WALLET', label: '銀包卡包', icon: 'wallet', colorClass: 'text-emerald-400' },
            { key: 'CARDS', label: '信用卡', icon: 'card', colorClass: 'text-sky-400' },
            { key: 'WEALTH', label: '定存與投資', icon: 'trend', colorClass: 'text-amber-400' }
          ]}
        />

        <QuickPopoverMenu
          open={Boolean(quickMenu && quickMenu.type === 'ADD')}
          title="快速記帳類型"
          anchorX={quickMenu ? quickMenu.anchorX : null}
          highlightedKey={highlightedQuickKey}
          onSelect={handleQuickSelect}
          onClose={() => { setQuickMenu(null); setHighlightedQuickKey(null); }}
          items={[
            { key: 'EXPENSE', label: '記支出', icon: 'arrowUpRight', colorClass: 'text-rose-400' },
            { key: 'INCOME', label: '記收入', icon: 'arrowDownLeft', colorClass: 'text-emerald-400' },
            { key: 'TRANSFER', label: '帳戶轉帳', icon: 'swap', colorClass: 'text-sky-400' },
            { key: 'RECEIVABLE', label: '應收代墊', icon: 'users', colorClass: 'text-amber-400' }
          ]}
        />

        {/* Full-Screen Transaction Editor */}
        <TransactionEditorSheet
          open={editorState.open}
          initialType={editorState.initialType}
          editingTx={editorState.editingTx}
          prefillToCardId={editorState.prefillToCardId}
          state={state}
          showToast={showToast}
          onClose={() => setEditorState({ open: false, initialType: 'EXPENSE', editingTx: null, prefillToCardId: null })}
        />

        {/* Global Toast */}
        <Toast message={toastMsg} />
      </div>
    );
  }

  function RootApp() {
    const { EmergencyRecoveryBoundary, KeypadProvider } = window.WealthUI;
    return (
      <EmergencyRecoveryBoundary>
        <KeypadProvider>
          <AppShell />
        </KeypadProvider>
      </EmergencyRecoveryBoundary>
    );
  }

  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<RootApp />);
  }
})();
