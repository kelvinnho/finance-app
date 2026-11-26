(function () {
  'use strict';

  const { useState, useMemo, useCallback, useRef, useEffect } = React;

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
                  <div className="text-[12px] text-zinc-600 mt-1">含多幣種銀行卡、電子錢包、信用卡、分類小類與資金池設定</div>
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

  // ---- Assets Sub-Tab 3: Fixed Deposits & Investments ----
  function InvestmentsTab({ state }) {
    const Store = window.WealthStore;
    const totalInv = state.investments.reduce(
      (s, x) => s + Store.convertToBase(x.currentValue || x.principal || 0, x.currency, state),
      0
    );

    return (
      <div className="space-y-3.5 pb-6">
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-400">定存與投資市值</span>
            <span className="text-[11px] text-zinc-500 tabular-nums">{state.investments.length} 項持倉</span>
          </div>
          <div className="text-[28px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
            {Store.formatMoney(totalInv, state.meta.baseCurrency)}
          </div>
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

  // ---- Reports View ----
  function ReportsView({ state }) {
    const Store = window.WealthStore;
    const metrics = useMemo(() => Store.getSummaryMetrics(state), [state]);
    const thisMonth = Store.todayISO().slice(0, 7);

    const monthStats = useMemo(() => {
      let inc = 0;
      let exp = 0;
      state.transactions.forEach((tx) => {
        if (!tx.date || !tx.date.startsWith(thisMonth)) return;
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
          const pid = b.poolId || (state.pools[0] && state.pools[0].id) || 'pool_liquid';
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
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] text-zinc-400">總淨資產 ({state.meta.baseCurrency})</span>
              {metrics.pendingReceivables > 0 && (
                <span className="text-[11px] text-amber-300 tabular-nums whitespace-nowrap">
                  待收 {Store.formatMoney(metrics.pendingReceivables, state.meta.baseCurrency)}
                </span>
              )}
            </div>
            <div className="text-[28px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
              {Store.formatMoney(metrics.totalNetWorth, state.meta.baseCurrency)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06] text-[12px]">
            <div className="min-w-0">
              <div className="text-zinc-500 text-[11px]">銀包活期</div>
              <div className="text-emerald-400 font-semibold tabular-nums mt-0.5 whitespace-nowrap">
                {Store.formatMoney(metrics.walletTotal, state.meta.baseCurrency)}
              </div>
            </div>
            <div className="min-w-0 text-right">
              <div className="text-zinc-500 text-[11px]">定存與投資</div>
              <div className="text-zinc-200 font-semibold tabular-nums mt-0.5 whitespace-nowrap">
                {Store.formatMoney(metrics.investmentsTotal, state.meta.baseCurrency)}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-zinc-500 text-[11px]">信用卡待繳</div>
              <div className="text-rose-400 font-semibold tabular-nums mt-0.5 whitespace-nowrap">
                {Store.formatMoney(metrics.cardDebt, state.meta.baseCurrency)}
              </div>
            </div>
            <div className="min-w-0 text-right">
              <div className="text-zinc-500 text-[11px]">待還借貸</div>
              <div className="text-amber-300 font-semibold tabular-nums mt-0.5 whitespace-nowrap">
                {Store.formatMoney(metrics.pendingPayables, state.meta.baseCurrency)}
              </div>
            </div>
          </div>
        </div>

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

  // ---- Settings Sub-Sheet A: Categories & Sub-Categories Full Manager ----
  function CategoryManagerSheet({ open, state, onClose, showToast }) {
    const { Icon, BottomSheet, SegmentedControl } = window.WealthUI;
    const Store = window.WealthStore;

    const [catType, setCatType] = useState('EXPENSE');
    const [selectedCatId, setSelectedCatId] = useState(null);
    const [addingCat, setAddingCat] = useState(false);

    const [catDraft, setCatDraft] = useState({ name: '', icon: 'tag', color: '#38BDF8', defaultPoolId: 'pool_liquid' });
    const [newSubName, setNewSubName] = useState('');
    const [newSubPool, setNewSubPool] = useState('');

    const list = useMemo(() => state.categories.filter((c) => c.type === catType), [state.categories, catType]);
    const activeCat = useMemo(() => list.find((c) => c.id === selectedCatId) || null, [list, selectedCatId]);

    const poolName = (pid) => {
      const p = state.pools.find((x) => x.id === pid);
      return p ? p.name : '未指定';
    };

    const startNewCat = () => {
      setSelectedCatId(null);
      setAddingCat(true);
      setCatDraft({
        name: '',
        icon: catType === 'INCOME' ? 'coins' : 'tag',
        color: Store.POOL_COLORS[list.length % Store.POOL_COLORS.length],
        defaultPoolId: (state.pools[0] && state.pools[0].id) || 'pool_liquid'
      });
    };

    const handleAddCat = () => {
      if (!catDraft.name.trim()) {
        showToast('請輸入大類別名稱');
        return;
      }
      const created = Store.addCategory(Object.assign({}, catDraft, { type: catType }));
      setAddingCat(false);
      setSelectedCatId(created.id);
      showToast(`已新增分類「${created.name}」`);
    };

    const footerContent = addingCat ? (
      <div className="flex gap-2">
        <button type="button" onClick={() => setAddingCat(false)} className="px-5 py-3 rounded-2xl bg-white/10 text-zinc-200 text-[14px]">返回</button>
        <button type="button" onClick={handleAddCat} className="flex-1 py-3 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold">確認建立分類</button>
      </div>
    ) : activeCat ? (
      <button type="button" onClick={() => setSelectedCatId(null)} className="w-full py-3 rounded-2xl bg-white text-black text-[14px] font-bold">完成並返回分類列表</button>
    ) : (
      <button type="button" onClick={startNewCat} className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold flex items-center justify-center gap-1.5">
        <Icon name="plus" size={16} /> 新增{catType === 'INCOME' ? '收入' : '支出'}大類別
      </button>
    );

    return (
      <BottomSheet
        open={open}
        title="分類、小類別與資金池關聯"
        subtitle="點選任一大類設定預設小類與自動關聯的資金池"
        onClose={() => { setSelectedCatId(null); setAddingCat(false); onClose(); }}
        footer={footerContent}
      >
        <div className="space-y-4">
          {!activeCat && !addingCat && (
            <>
              <SegmentedControl
                value={catType}
                onChange={(v) => { setCatType(v); setSelectedCatId(null); }}
                options={[
                  { value: 'EXPENSE', label: '支出分類' },
                  { value: 'INCOME', label: '收入分類' }
                ]}
              />
              <div className="space-y-2">
                {list.map((cat) => {
                  const pObj = state.pools.find((p) => p.id === cat.defaultPoolId);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setSelectedCatId(cat.id); setNewSubName(''); setNewSubPool(''); }}
                      className="w-full p-3.5 rounded-2xl bg-black/45 border border-white/[0.08] flex items-center justify-between gap-3 text-left active:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0" style={{ color: cat.color }}>
                          <Icon name={cat.icon} size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-white truncate">{cat.name}</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5 truncate">
                            <span>{(cat.subcategories || []).length} 個小類</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              {pObj && <span className="w-1.5 h-1.5 rounded-full" style={{ background: pObj.color }} />}
                              預設池：{poolName(cat.defaultPoolId)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Icon name="chevronRight" size={16} className="text-zinc-500 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {addingCat && (
            <div className="space-y-3.5">
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">大類別名稱</label>
                <input
                  type="text"
                  placeholder="例如：日常飲食、子女教育"
                  value={catDraft.name}
                  onChange={(e) => setCatDraft((p) => Object.assign({}, p, { name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">預設自動關聯資金池</label>
                <select
                  value={catDraft.defaultPoolId}
                  onChange={(e) => setCatDraft((p) => Object.assign({}, p, { defaultPoolId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                >
                  {state.pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">圖示</label>
                <div className="grid grid-cols-6 gap-2">
                  {Store.CATEGORY_ICONS.map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setCatDraft((p) => Object.assign({}, p, { icon: ic.id }))}
                      className={`py-2.5 rounded-xl border flex flex-col items-center gap-1 ${
                        catDraft.icon === ic.id ? 'bg-white text-black border-white' : 'bg-black/50 text-zinc-300 border-white/10'
                      }`}
                    >
                      <Icon name={ic.id} size={16} />
                      <span className="text-[10px]">{ic.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">識別顏色</label>
                <div className="flex gap-2.5 flex-wrap">
                  {Store.POOL_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setCatDraft((p) => Object.assign({}, p, { color: col }))}
                      className={`w-8 h-8 rounded-full border-2 ${catDraft.color === col ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: col }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeCat && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-zinc-300">大類別基本設定</span>
                  {list.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`確定刪除大類別「${activeCat.name}」？`)) {
                          Store.deleteCategory(activeCat.id);
                          setSelectedCatId(null);
                          showToast('已刪除分類');
                        }
                      }}
                      className="text-[11px] text-rose-400"
                    >
                      刪除大類
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={activeCat.name}
                  onChange={(e) => Store.updateCategory(activeCat.id, { name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                />
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">此大類預設歸屬資金池</label>
                  <select
                    value={activeCat.defaultPoolId || ''}
                    onChange={(e) => {
                      Store.updateCategory(activeCat.id, { defaultPoolId: e.target.value });
                      showToast('已更新預設資金池');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                  >
                    {state.pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Sub-categories list + per-sub pool override */}
              <div className="space-y-2.5">
                <div className="text-[12px] font-semibold text-zinc-300">
                  預設小類別 ({(activeCat.subcategories || []).length})
                </div>
                {(activeCat.subcategories || []).map((sub) => (
                  <div key={sub.id} className="p-3 rounded-xl bg-black/45 border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-medium text-white truncate">{sub.name}</span>
                      <button
                        type="button"
                        onClick={() => Store.deleteSubcategory(activeCat.id, sub.id)}
                        className="p-1 text-zinc-500 active:text-rose-400"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                    <select
                      value={sub.defaultPoolId || ''}
                      onChange={(e) => {
                        Store.updateSubcategory(activeCat.id, sub.id, { defaultPoolId: e.target.value || null });
                        showToast(`已更新「${sub.name}」資金池關聯`);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-[12px] text-zinc-200 outline-none"
                    >
                      <option value="">繼承大類預設（{poolName(activeCat.defaultPoolId)}）</option>
                      {state.pools.map((p) => <option key={p.id} value={p.id}>獨立指定：{p.name}</option>)}
                    </select>
                  </div>
                ))}

                {/* Add new sub-category inline box */}
                <div className="p-3 rounded-xl bg-white/[0.04] border border-dashed border-white/15 space-y-2.5">
                  <div className="text-[11px] text-zinc-400">新增小類別快選項</div>
                  <input
                    type="text"
                    placeholder="輸入小類別名稱（如：午餐、泊車）"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newSubPool}
                      onChange={(e) => setNewSubPool(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.12] text-[12px] text-zinc-200 outline-none"
                    >
                      <option value="">繼承大類資金池</option>
                      {state.pools.map((p) => <option key={p.id} value={p.id}>指定：{p.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSubName.trim()) return;
                        Store.addSubcategory(activeCat.id, { name: newSubName, defaultPoolId: newSubPool || null });
                        setNewSubName('');
                        setNewSubPool('');
                        showToast('已新增小類別');
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-400 text-black text-[12px] font-bold shrink-0"
                    >
                      新增
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    );
  }

  // ---- Settings Sub-Sheet B: Funding Pools & Settlement Accounts Manager ----
  function PoolManagerSheet({ open, state, onClose, showToast }) {
    const { Icon, BottomSheet } = window.WealthUI;
    const Store = window.WealthStore;

    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState({ name: '', color: '#34D399', settlementKey: '', note: '' });

    const bankBalances = useMemo(() => {
      const list = [];
      state.accounts.forEach((a) => {
        (a.balances || []).forEach((b) => {
          list.push({
            key: `${a.id}::${b.id}`,
            accId: a.id,
            balId: b.id,
            label: `${a.name} · ${b.currency} (${Store.formatMoney(b.amount, b.currency)})`
          });
        });
      });
      return list;
    }, [state.accounts]);

    const startNew = () => {
      setEditingId('NEW');
      setDraft({
        name: '',
        color: Store.POOL_COLORS[state.pools.length % Store.POOL_COLORS.length],
        settlementKey: '',
        note: ''
      });
    };

    const startEdit = (p) => {
      setEditingId(p.id);
      setDraft({
        name: p.name,
        color: p.color || '#34D399',
        settlementKey: p.settlementAccountId ? `${p.settlementAccountId}::${p.settlementBalanceId || ''}` : '',
        note: p.note || ''
      });
    };

    const handleSave = () => {
      if (!draft.name.trim()) {
        showToast('請輸入資金池名稱');
        return;
      }
      const [accId, balId] = draft.settlementKey ? draft.settlementKey.split('::') : [null, null];
      const payload = {
        name: draft.name.trim(),
        color: draft.color,
        note: draft.note.trim(),
        settlementAccountId: accId || null,
        settlementBalanceId: balId || null
      };
      if (editingId === 'NEW') {
        Store.addPool(payload);
        showToast('已新增資金池');
      } else if (editingId) {
        Store.updatePool(editingId, payload);
        showToast('已更新資金池與找數綁定');
      }
      setEditingId(null);
    };

    const footerContent = editingId ? (
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditingId(null)} className="px-5 py-3 rounded-2xl bg-white/10 text-zinc-200 text-[14px]">返回</button>
        <button type="button" onClick={handleSave} className="flex-1 py-3 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold">儲存資金池設定</button>
      </div>
    ) : (
      <button type="button" onClick={startNew} className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold flex items-center justify-center gap-1.5">
        <Icon name="plus" size={16} /> 新增歸屬資金池
      </button>
    );

    return (
      <BottomSheet
        open={open}
        title="歸屬資金池與找數帳戶"
        subtitle="綁定各資金池對應的銀行找數戶口，支援信用卡交叉結算"
        onClose={() => { setEditingId(null); onClose(); }}
        footer={footerContent}
      >
        {!editingId ? (
          <div className="space-y-2.5">
            {state.pools.map((p) => {
              const settleLabel = Store.getPoolSettlementLabel(p.id, state);
              return (
                <div key={p.id} className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.08] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="text-[14px] font-semibold text-white truncate">{p.name}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 truncate">
                      找數戶口：<span className={settleLabel ? 'text-emerald-300 font-medium' : 'text-zinc-500'}>{settleLabel || '未綁定'}</span>
                    </div>
                    {p.note && <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{p.note}</div>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => startEdit(p)} className="p-2 rounded-xl bg-white/[0.06] text-zinc-200">
                      <Icon name="edit" size={15} />
                    </button>
                    {state.pools.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`確定刪除資金池「${p.name}」？`)) {
                            Store.deletePool(p.id);
                            showToast('已刪除資金池');
                          }
                        }}
                        className="p-2 rounded-xl bg-rose-500/15 text-rose-400"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">資金池名稱</label>
              <input
                type="text"
                placeholder="例如：日常開支、家庭共同、旅遊專項"
                value={draft.name}
                onChange={(e) => setDraft((p) => Object.assign({}, p, { name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">綁定預設找數銀行戶口</label>
              <select
                value={draft.settlementKey}
                onChange={(e) => setDraft((p) => Object.assign({}, p, { settlementKey: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              >
                <option value="">不指定（手動結算）</option>
                {bankBalances.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                刷信用卡消費並歸屬至此池時，系統即可自動彙總此戶口應撥付的找數金額。
              </p>
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">識別色</label>
              <div className="flex gap-2.5 flex-wrap">
                {Store.POOL_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setDraft((p) => Object.assign({}, p, { color: col }))}
                    className={`w-8 h-8 rounded-full border-2 ${draft.color === col ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: col }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">用途說明（選填）</label>
              <input
                type="text"
                placeholder="例如：管理費、水電與超市買菜"
                value={draft.note}
                onChange={(e) => setDraft((p) => Object.assign({}, p, { note: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
              />
            </div>
          </div>
        )}
      </BottomSheet>
    );
  }

  // ---- Settings View ----
  function SettingsView({ state, showToast }) {
    const { Icon, BottomSheet, NumericInput } = window.WealthUI;
    const Store = window.WealthStore;

    const [catMgrOpen, setCatMgrOpen] = useState(false);
    const [poolMgrOpen, setPoolMgrOpen] = useState(false);
    const [diagOpen, setDiagOpen] = useState(false);
    const [fxOpen, setFxOpen] = useState(false);
    const fileInputRef = useRef(null);

    const diagnostics = useMemo(() => (diagOpen ? Store.runDiagnostics() : []), [diagOpen, state]);
    const vpDiag = typeof window !== 'undefined' ? (window.__VIEWPORT_DIAG__ || {}) : {};
    const totalSubCount = useMemo(() => state.categories.reduce((s, c) => s + ((c.subcategories || []).length), 0), [state.categories]);

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
        {/* Group 1: Default Account, Categories & Attribution Pools */}
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          <div className="px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-white">預設記帳帳戶</div>
              <div className="text-[11px] text-zinc-500">按 ＋ 記支出／應收時自動帶出的帳戶</div>
            </div>
            <select
              value={Store.getDefaultExpenseSourceKey(state)}
              onChange={(e) => {
                Store.setDefaultExpenseSource(e.target.value);
                showToast('已更新預設記帳帳戶');
              }}
              className="max-w-[165px] px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/[0.12] text-[12.5px] font-semibold text-white outline-none truncate"
            >
              {state.cards.length > 0 && (
                <optgroup label="信用卡">
                  {state.cards.map((c) => (
                    <option key={c.id} value={`CARD::${c.id}::`}>
                      {c.name}{c.last4 ? ` (${c.last4})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {state.accounts.length > 0 && (
                <optgroup label="銀行・電子錢包">
                  {state.accounts.map((a) =>
                    (a.balances || []).map((b) => (
                      <option key={`${a.id}_${b.id}`} value={`ACCOUNT::${a.id}::${b.id}`}>
                        {a.balances.length > 1 ? `${a.name} (${b.currency})` : a.name}
                      </option>
                    ))
                  )}
                </optgroup>
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setCatMgrOpen(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-white/[0.04]"
          >
            <div>
              <div className="text-[14px] font-medium text-white">分類與預設小類別管理</div>
              <div className="text-[11px] text-zinc-500">
                共 {state.categories.length} 個大類 · {totalSubCount} 個小類快選項（支援自動關聯資金池）
              </div>
            </div>
            <Icon name="chevronRight" size={16} className="text-zinc-500 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setPoolMgrOpen(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-white/[0.04]"
          >
            <div>
              <div className="text-[14px] font-medium text-white">歸屬資金池與自動找數戶口</div>
              <div className="text-[11px] text-zinc-500">
                管理 {state.pools.length} 個資金池及對應的跨帳戶／信用卡結算銀行戶口
              </div>
            </div>
            <Icon name="chevronRight" size={16} className="text-zinc-500 shrink-0" />
          </button>
        </div>

        {/* Group 2: Currency & Privacy */}
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

        {/* Group 3: Diagnostics & Backup */}
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

        <CategoryManagerSheet open={catMgrOpen} state={state} onClose={() => setCatMgrOpen(false)} showToast={showToast} />
        <PoolManagerSheet open={poolMgrOpen} state={state} onClose={() => setPoolMgrOpen(false)} showToast={showToast} />

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

  // ---- Main App Shell ----
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
    const { CreditCardsView } = window.WealthCards;
    const { LedgerView, TransactionEditorSheet } = window.WealthLedger;

    const state = useWealthStore();
    const [activeTab, setActiveTab] = useState('LEDGER');
    const [assetSubTab, setAssetSubTab] = useState('WALLET');
    const [isAssetDetailFocused, setIsAssetDetailFocused] = useState(false);
    const [assetResetKey, setAssetResetKey] = useState(0);
    const [toastMsg, setToastMsg] = useState('');
    const toastTimerRef = useRef(null);
    const mainScrollRef = useRef(null);

    const [editorState, setEditorState] = useState({
      open: false,
      initialType: 'EXPENSE',
      editingTx: null,
      prefillToCardId: null
    });

    const [quickMenu, setQuickMenu] = useState(null);
    const [highlightedQuickKey, setHighlightedQuickKey] = useState(null);

    const showToast = useCallback((msg) => {
      setToastMsg(msg);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastMsg(''), 2200);
    }, []);

    const ASSET_ORDER = ['WALLET', 'CARDS', 'WEALTH'];

    useEffect(() => {
      if (activeTab !== 'ASSETS') {
        setIsAssetDetailFocused(false);
      }
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0;
      }
    }, [activeTab, assetSubTab]);

    const prevAssetFocusedRef = useRef(false);
    const handleAssetFocusChange = useCallback((focused) => {
      const next = Boolean(focused);
      setIsAssetDetailFocused(next);
      if (next !== prevAssetFocusedRef.current) {
        prevAssetFocusedRef.current = next;
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollTop = 0;
        }
      }
    }, []);

    const swipeHandlers = useHorizontalSwipe(
      useCallback(() => {
        if (activeTab !== 'ASSETS' || isAssetDetailFocused) return;
        setAssetSubTab((cur) => {
          const idx = ASSET_ORDER.indexOf(cur);
          return ASSET_ORDER[Math.min(ASSET_ORDER.length - 1, idx + 1)];
        });
      }, [activeTab, isAssetDetailFocused]),
      useCallback(() => {
        if (activeTab !== 'ASSETS' || isAssetDetailFocused) return;
        setAssetSubTab((cur) => {
          const idx = ASSET_ORDER.indexOf(cur);
          return ASSET_ORDER[Math.max(0, idx - 1)];
        });
      }, [activeTab, isAssetDetailFocused])
    );

    const handleQuickSelect = useCallback((key) => {
      setQuickMenu(null);
      setHighlightedQuickKey(null);
      if (key === 'WALLET' || key === 'CARDS' || key === 'WEALTH') {
        setActiveTab('ASSETS');
        setAssetSubTab(key);
        return;
      }
      if (key === 'EXPENSE' || key === 'INCOME' || key === 'TRANSFER' || key === 'RECEIVABLE' || key === 'PAYABLE') {
        setEditorState({ open: true, initialType: key, editingTx: null, prefillToCardId: null });
      }
    }, []);

    const assetsBtnPress = useLongPress({
      onShortTap: () => {
        if (activeTab === 'ASSETS') {
          if (isAssetDetailFocused) {
            setAssetResetKey((k) => k + 1);
            setIsAssetDetailFocused(false);
          } else {
            setAssetSubTab((cur) => {
              const idx = ASSET_ORDER.indexOf(cur);
              return ASSET_ORDER[(idx + 1) % ASSET_ORDER.length];
            });
          }
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

    const hideAssetsChrome = activeTab === 'ASSETS' && isAssetDetailFocused;
    const pageTitle = hideAssetsChrome
      ? null
      : activeTab === 'ASSETS'
      ? '資產'
      : activeTab === 'REPORTS'
      ? '報表'
      : activeTab === 'SETTINGS'
      ? '設定'
      : null;

    return (
      <div className="fixed inset-0 flex flex-col bg-black text-white overflow-hidden" style={{ height: 'var(--app-height, 100dvh)' }}>
        {/* Dedicated Non-Scrolling iOS Status Bar Safe Shield (Prevents Scroll Overlap) */}
        <div className="shrink-0 w-full bg-black z-30" style={{ height: 'env(safe-area-inset-top)' }} />

        <main
          ref={mainScrollRef}
          {...(activeTab === 'ASSETS' && !isAssetDetailFocused ? swipeHandlers : {})}
          className="app-scroll-main flex-1 overflow-y-auto px-4 pt-2.5 max-w-[480px] w-full mx-auto"
        >
          {pageTitle && (
            <div className="pt-0.5 pb-3 flex items-center justify-between">
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
            <div className="pt-0.5">
              <LedgerView
                state={state}
                showToast={showToast}
                onEditTx={(tx) => setEditorState({ open: true, initialType: tx.type, editingTx: tx, prefillToCardId: null })}
              />
            </div>
          )}

          {activeTab === 'ASSETS' && (
            <div className={hideAssetsChrome ? '' : 'space-y-4'}>
              {!hideAssetsChrome && (
                <SegmentedControl
                  value={assetSubTab}
                  onChange={(next) => {
                    setIsAssetDetailFocused(false);
                    setAssetSubTab(next);
                  }}
                  options={[
                    { value: 'WALLET', label: '銀包' },
                    { value: 'CARDS', label: '信用卡' },
                    { value: 'WEALTH', label: '定存投資' }
                  ]}
                />
              )}
              {assetSubTab === 'WALLET' && (
                <WalletView
                  state={state}
                  showToast={showToast}
                  onFocusChange={handleAssetFocusChange}
                  resetSignal={assetResetKey}
                  onJumpToWealth={() => {
                    setIsAssetDetailFocused(false);
                    setAssetSubTab('WEALTH');
                  }}
                />
              )}
              {assetSubTab === 'CARDS' && (
                <CreditCardsView
                  state={state}
                  showToast={showToast}
                  onFocusChange={handleAssetFocusChange}
                  resetSignal={assetResetKey}
                />
              )}
              {assetSubTab === 'WEALTH' && <InvestmentsTab state={state} />}
            </div>
          )}

          {activeTab === 'REPORTS' && <ReportsView state={state} />}
          {activeTab === 'SETTINGS' && <SettingsView state={state} showToast={showToast} />}
        </main>

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
            { key: 'RECEIVABLE', label: '應收代墊', icon: 'users', colorClass: 'text-amber-400' },
            { key: 'PAYABLE', label: '借貸款項', icon: 'coins', colorClass: 'text-violet-400' }
          ]}
        />

        <TransactionEditorSheet
          open={editorState.open}
          initialType={editorState.initialType}
          editingTx={editorState.editingTx}
          prefillToCardId={editorState.prefillToCardId}
          state={state}
          showToast={showToast}
          onClose={() => setEditorState({ open: false, initialType: 'EXPENSE', editingTx: null, prefillToCardId: null })}
        />

        <Toast message={toastMsg} />
      </div>
    );
  }

  function RootApp() {
    const { EmergencyRecoveryBoundary, KeypadProvider, ConfirmProvider } = window.WealthUI;
    return (
      <EmergencyRecoveryBoundary>
        <KeypadProvider>
          <ConfirmProvider>
            <AppShell />
          </ConfirmProvider>
        </KeypadProvider>
      </EmergencyRecoveryBoundary>
    );
  }

  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<RootApp />);
  }
})();
