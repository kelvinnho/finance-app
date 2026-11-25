// mod1_wallet.js · Stage 2 r5
(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;

  const ACCOUNT_TYPES = [
    { value: 'BANK', label: '銀行活期', icon: 'home' },
    { value: 'EWALLET', label: '電子錢包', icon: 'sparkles' },
    { value: 'BROKER', label: '證券交割', icon: 'trend' },
    { value: 'CASH', label: '實體現金', icon: 'coins' }
  ];

  function CardAuraLayers({ theme }) {
    return (
      <>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: theme.glow || 'radial-gradient(circle at 86% 14%, rgba(255,255,255,0.18) 0%, transparent 65%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-45"
          style={{ background: 'linear-gradient(118deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 32%, transparent 55%)' }}
        />
        <div className="absolute -right-8 -bottom-10 w-36 h-36 rounded-full border border-white/[0.08] pointer-events-none" />
        <div className="absolute -right-2 -bottom-4 w-24 h-24 rounded-full border border-white/[0.06] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
      </>
    );
  }

  function WalletView({ state, showToast, onFocusChange, resetSignal }) {
    const { Icon, BottomSheet, NumericInput } = window.WealthUI;
    const Store = window.WealthStore;

    const [focusedAccId, setFocusedAccId] = useState(null);
    const [selectedBalMap, setSelectedBalMap] = useState({});
    const [flipped, setFlipped] = useState(false);

    // BottomSheet States
    const [addAccOpen, setAddAccOpen] = useState(false);
    const [newAcc, setNewAcc] = useState({
      name: '',
      subtitle: '活期帳戶',
      type: 'BANK',
      theme: 'sapphire',
      currency: state.meta.baseCurrency,
      initialAmount: 0,
      poolId: 'pool_liquid'
    });

    const [calibOpen, setCalibOpen] = useState(false);
    const [calibDraft, setCalibDraft] = useState({ amount: 0, poolId: 'pool_liquid' });

    const [addCurOpen, setAddCurOpen] = useState(false);
    const [addCurDraft, setAddCurDraft] = useState({ currency: 'HKD', amount: 0, poolId: 'pool_liquid' });

    const [topUpOpen, setTopUpOpen] = useState(false);
    const [topUpDraft, setTopUpDraft] = useState({ fromKey: '', amount: 1000 });

    const [addAllocOpen, setAddAllocOpen] = useState(false);
    const [allocDraft, setAllocDraft] = useState({ name: '', amount: 5000, locked: true, poolId: 'pool_reserve' });

    const [editCardDraft, setEditCardDraft] = useState({ name: '', subtitle: '', type: 'BANK', theme: 'obsidian' });

    const metrics = useMemo(() => Store.getSummaryMetrics(state), [state]);

    const focusedAcc = useMemo(() => {
      if (!focusedAccId) return null;
      return state.accounts.find((a) => a.id === focusedAccId) || null;
    }, [state.accounts, focusedAccId]);

    const activeBalance = useMemo(() => {
      if (!focusedAcc || !focusedAcc.balances.length) return null;
      const pickedId = selectedBalMap[focusedAcc.id];
      return focusedAcc.balances.find((b) => b.id === pickedId) || focusedAcc.balances[0];
    }, [focusedAcc, selectedBalMap]);

    const syncEditDraftFromAcc = (acc) => {
      if (!acc) return;
      setEditCardDraft({
        name: acc.name,
        subtitle: acc.subtitle || '',
        type: acc.type || 'BANK',
        theme: acc.theme || 'obsidian'
      });
    };

    useEffect(() => {
      if (focusedAcc) {
        syncEditDraftFromAcc(focusedAcc);
      } else {
        setFlipped(false);
      }
    }, [focusedAcc]);

    const isAccFocused = Boolean(focusedAcc);
    useEffect(() => {
      if (onFocusChange) onFocusChange(isAccFocused);
    }, [isAccFocused, onFocusChange]);

    useEffect(() => {
      return () => {
        if (onFocusChange) onFocusChange(false);
      };
    }, [onFocusChange]);

    useEffect(() => {
      if (resetSignal > 0) {
        setFocusedAccId(null);
        setFlipped(false);
      }
    }, [resetSignal]);

    // Available Bank funding options for E-Wallet top-up
    const bankSources = useMemo(() => {
      const list = [];
      state.accounts.forEach((a) => {
        if (a.type === 'EWALLET') return;
        a.balances.forEach((b) => {
          list.push({
            key: `${a.id}::${b.id}`,
            accId: a.id,
            balId: b.id,
            currency: b.currency,
            label: `${a.name} · ${a.subtitle || b.currency} (${Store.formatMoney(b.amount, b.currency)})`
          });
        });
      });
      return list;
    }, [state.accounts]);

    const openTopUpSheet = () => {
      if (!activeBalance) return;
      const matching = bankSources.find((s) => s.currency === activeBalance.currency) || bankSources[0];
      setTopUpDraft({
        fromKey: matching ? matching.key : '',
        amount: 1000
      });
      setTopUpOpen(true);
    };

    const handleConfirmTopUp = () => {
      if (!focusedAcc || !activeBalance || !topUpDraft.fromKey) {
        showToast('請先選擇扣款銀行戶口');
        return;
      }
      if (Number(topUpDraft.amount) <= 0) {
        showToast('增值金額須大於 0');
        return;
      }
      const [fromAccId, fromBalId] = topUpDraft.fromKey.split('::');
      Store.topUpEWallet(fromAccId, fromBalId, focusedAcc.id, activeBalance.id, Number(topUpDraft.amount));
      setTopUpOpen(false);
      showToast(`已增值 ${Store.formatMoney(topUpDraft.amount, activeBalance.currency)}`);
    };

    const handleCreateAccount = () => {
      if (!newAcc.name.trim()) {
        showToast('請輸入帳戶名稱');
        return;
      }
      const created = Store.addAccount(newAcc);
      setAddAccOpen(false);
      setNewAcc({
        name: '',
        subtitle: '活期帳戶',
        type: 'BANK',
        theme: 'sapphire',
        currency: state.meta.baseCurrency,
        initialAmount: 0,
        poolId: 'pool_liquid'
      });
      setFocusedAccId(created.id);
      showToast(`已新增 ${created.name}`);
    };

    const getThemeObj = (id) => Store.CARD_THEMES.find((t) => t.id === id) || Store.CARD_THEMES[0];
    const getTypeMeta = (t) => ACCOUNT_TYPES.find((x) => x.value === t) || ACCOUNT_TYPES[0];
    const getPoolObj = (id) => state.pools.find((x) => x.id === id) || null;
    const poolName = (id) => {
      const p = getPoolObj(id);
      return p ? p.name : '未指定';
    };

    // Helper: compute Free / Locked / Goal split for any account + currency
    const getBalanceSplit = (acc, bal) => {
      if (!acc || !bal) return { total: 0, locked: 0, goal: 0, free: 0, lockedPct: 0, goalPct: 0, freePct: 100 };
      const total = Math.max(0, Store.round2(bal.amount || 0));
      const als = (acc.allocations || []).filter((al) => al.currency === bal.currency);
      const locked = Store.round2(als.filter((a) => a.locked).reduce((s, x) => s + Number(x.amount || 0), 0));
      const goal = Store.round2(als.filter((a) => !a.locked).reduce((s, x) => s + Number(x.amount || 0), 0));
      const free = Math.max(0, Store.round2(total - locked - goal));
      const denom = total > 0 ? total : 1;
      const lockedPct = Math.min(100, Math.round((locked / denom) * 100));
      const goalPct = Math.min(100 - lockedPct, Math.round((goal / denom) * 100));
      const freePct = Math.max(0, 100 - lockedPct - goalPct);
      return { total, locked, goal, free, lockedPct, goalPct, freePct };
    };

    // Allocations & Recent Transactions for focused account & currency
    const activeAllocations = useMemo(() => {
      if (!focusedAcc || !activeBalance) return [];
      return (focusedAcc.allocations || []).filter((al) => al.currency === activeBalance.currency);
    }, [focusedAcc, activeBalance]);

    const activeSplit = useMemo(() => getBalanceSplit(focusedAcc, activeBalance), [focusedAcc, activeBalance]);
    const freeAmount = activeSplit.free;

    const accountTransactions = useMemo(() => {
      if (!focusedAcc) return [];
      return (state.transactions || [])
        .filter((tx) => {
          const isFrom = tx.accountKind !== 'CARD' && tx.accountId === focusedAcc.id;
          const isTo = tx.toAccountKind !== 'CARD' && tx.toAccountId === focusedAcc.id;
          return isFrom || isTo;
        })
        .slice(0, 12);
    }, [focusedAcc, state.transactions]);

    // Total wallet liquidity ratio for Overview summary bar
    const walletTotalBase = Store.round2(metrics.liquidCash + metrics.lockedWallet);
    const liquidPct = walletTotalBase > 0 ? Math.min(100, Math.max(0, Math.round((metrics.liquidCash / walletTotalBase) * 100))) : 100;

    return (
      <div className="space-y-4 pb-6">
        {/* Top Summary Card (Luminous Glassmorphic Depth + Liquidity Ratio Bar) */}
        {!focusedAcc && (
          <div className="relative rounded-[22px] bg-[#13141A] border border-white/[0.11] p-4 space-y-3 overflow-hidden shadow-lg">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 90% 8%, rgba(52,211,153,0.16) 0%, transparent 58%)' }}
            />
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11.5px] font-medium text-emerald-300/90">活期與錢包可動用</span>
                <span className="text-[10.5px] text-zinc-400 tabular-nums">
                  {state.accounts.length} 張卡片 · 可用佔 {liquidPct}%
                </span>
              </div>
              <div className="text-[30px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
                {Store.formatMoney(metrics.liquidCash, state.meta.baseCurrency)}
              </div>
            </div>

            {/* Visual Liquidity Bar */}
            <div className="relative h-1.5 rounded-full bg-white/[0.08] overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300" style={{ width: `${liquidPct}%` }} />
              <div className="h-full bg-amber-400/80" style={{ width: `${Math.max(0, 100 - liquidPct)}%` }} />
            </div>

            <div className="relative pt-1 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-zinc-500">凍結與定存鎖定</div>
                <div className="text-[14.5px] font-semibold text-amber-200 tabular-nums mt-0.5 whitespace-nowrap">
                  {Store.formatMoney(metrics.lockedAndInvestments, state.meta.baseCurrency)}
                </div>
              </div>
              <div className="min-w-0 text-right">
                <div className="text-[11px] text-zinc-500">銀包總餘額（含凍結）</div>
                <div className="text-[14.5px] font-semibold text-white tabular-nums mt-0.5 whitespace-nowrap">
                  {Store.formatMoney(walletTotalBase, state.meta.baseCurrency)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode A: Apple Wallet Luminous Stacked Card Pack (Rich At-A-Glance Card Info) */}
        {!focusedAcc && (
          <div className="space-y-4">
            {state.accounts.length === 0 ? (
              <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-8 text-center text-[13px] text-zinc-500">
                尚未建立任何銀包帳戶，點擊下方新增。
              </div>
            ) : (
              <div className="relative pt-1">
                {state.accounts.map((acc, idx) => {
                  const primaryBal = acc.balances[0] || { currency: state.meta.baseCurrency, amount: 0 };
                  const extraBals = acc.balances.slice(1);
                  const split = getBalanceSplit(acc, primaryBal);
                  const isDefault = (acc.balances || []).some((b) => b.isDefaultPayment);
                  const theme = getThemeObj(acc.theme);
                  const typeMeta = getTypeMeta(acc.type);
                  const pool = getPoolObj(primaryBal.poolId);
                  const isLast = idx === state.accounts.length - 1;
                  const isForeignPrimary = primaryBal.currency !== state.meta.baseCurrency;
                  const baseEq = isForeignPrimary ? Store.convertToBase(primaryBal.amount, primaryBal.currency, state) : null;

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => { setFocusedAccId(acc.id); setFlipped(false); }}
                      style={{
                        background: theme.bg,
                        zIndex: idx + 1
                      }}
                      className={`relative block w-full rounded-[24px] border border-white/20 shadow-[0_-12px_30px_rgba(0,0,0,0.6)] text-left transition-transform active:scale-[0.985] overflow-hidden ${
                        idx > 0 ? '-mt-12' : ''
                      } ${isLast ? 'p-5 min-h-[176px]' : 'px-5 pt-4 pb-16 min-h-[146px]'}`}
                    >
                      <CardAuraLayers theme={theme} />

                      {/* Card Top Row (Always Visible in Deck) */}
                      <div className="relative flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl bg-black/30 border border-white/20 flex items-center justify-center shrink-0 mt-0.5 shadow-inner"
                            style={{ color: theme.accent }}
                          >
                            <Icon name={typeMeta.icon} size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[16px] font-bold text-white truncate">{acc.name}</span>
                              {isDefault && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-400/25 border border-amber-300/40 text-[9.5px] font-bold text-amber-200 shrink-0">
                                  主戶
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-white/75 truncate mt-0.5 flex items-center gap-1.5">
                              <span>{acc.balances.map((b) => b.currency).join(' / ')}</span>
                              <span className="opacity-50">·</span>
                              <span className="truncate">{acc.subtitle || typeMeta.label}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[18px] font-bold text-white tabular-nums tracking-tight whitespace-nowrap">
                            {Store.formatMoney(primaryBal.amount, primaryBal.currency)}
                          </div>
                          <div className="text-[10.5px] mt-0.5 whitespace-nowrap tabular-nums">
                            {split.locked > 0 ? (
                              <span className="text-amber-200 font-medium">
                                可用 {Store.formatMoney(split.free, primaryBal.currency)} · 鎖 {Store.formatMoney(split.locked, primaryBal.currency)}
                              </span>
                            ) : extraBals.length > 0 ? (
                              <span className="text-sky-200 font-medium">
                                ＋ {Store.formatMoney(extraBals[0].amount, extraBals[0].currency)}
                              </span>
                            ) : baseEq != null ? (
                              <span className="text-white/75">
                                ≈ {Store.formatMoney(baseEq, state.meta.baseCurrency)}
                              </span>
                            ) : (
                              <span className="text-white/70 inline-flex items-center gap-1">
                                {pool && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: pool.color }} />}
                                {pool ? pool.name : typeMeta.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rich Bottom Strip for Front-Most Card */}
                      {isLast && (
                        <div className="relative mt-5 space-y-2.5">
                          {(split.locked > 0 || split.goal > 0) && (
                            <div className="space-y-1">
                              <div className="h-1.5 rounded-full bg-black/40 overflow-hidden flex">
                                <div className="h-full bg-emerald-400" style={{ width: `${split.freePct}%` }} />
                                <div className="h-full bg-sky-400" style={{ width: `${split.goalPct}%` }} />
                                <div className="h-full bg-amber-400" style={{ width: `${split.lockedPct}%` }} />
                              </div>
                            </div>
                          )}
                          <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-lg bg-black/35 border border-white/10 text-[11px] text-white/85">
                                {typeMeta.label}
                              </span>
                              {pool && (
                                <span className="px-2 py-0.5 rounded-lg bg-black/35 border border-white/10 text-[11px] text-white/85 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: pool.color }} />
                                  {pool.name}
                                </span>
                              )}
                              {extraBals.map((eb) => (
                                <span key={eb.id} className="px-2 py-0.5 rounded-lg bg-black/35 border border-white/10 text-[11px] text-sky-200 tabular-nums">
                                  {Store.formatMoney(eb.amount, eb.currency)}
                                </span>
                              ))}
                            </div>
                            <span className="text-[11px] text-white/70 shrink-0">展開 ›</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setAddAccOpen(true)}
              className="w-full py-3.5 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-[13.5px] font-medium text-zinc-300 flex items-center justify-center gap-1.5 active:bg-white/[0.06]"
            >
              <Icon name="plus" size={16} /> 新增銀包 / 銀行帳戶
            </button>
          </div>
        )}

        {/* Mode B: Focused Luminous Apple Wallet Card + Slicing + Recent Activity */}
        {focusedAcc && activeBalance && (() => {
          const theme = getThemeObj(focusedAcc.theme);
          const typeMeta = getTypeMeta(focusedAcc.type);
          const pool = getPoolObj(activeBalance.poolId);
          const isForeign = activeBalance.currency !== state.meta.baseCurrency;
          const baseEq = isForeign ? Store.convertToBase(activeBalance.amount, activeBalance.currency, state) : null;

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFocusedAccId(null)}
                  className="inline-flex items-center gap-1 text-[13.5px] text-zinc-400 active:text-white"
                >
                  <Icon name="chevronLeft" size={16} /> 全部帳戶
                </button>
                <button
                  type="button"
                  onClick={() => {
                    syncEditDraftFromAcc(focusedAcc);
                    setFlipped((prev) => !prev);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#1C1C22] border border-white/10 text-[12px] font-medium text-zinc-200 active:bg-white/15"
                >
                  {flipped ? '取消並返回正面' : '卡片設定'}
                </button>
              </div>

              {/* Card Front or Back */}
              {!flipped ? (
                <div
                  className="rounded-[24px] p-5 border border-white/20 shadow-[0_18px_40px_rgba(0,0,0,0.65)] relative overflow-hidden space-y-4"
                  style={{ background: theme.bg }}
                >
                  <CardAuraLayers theme={theme} />

                  {/* Header */}
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-2xl bg-black/30 border border-white/20 flex items-center justify-center shrink-0 shadow-inner"
                        style={{ color: theme.accent }}
                      >
                        <Icon name={typeMeta.icon} size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[18px] font-bold text-white truncate leading-tight">{focusedAcc.name}</div>
                        <div className="text-[12px] text-white/70 mt-0.5 truncate">
                          {typeMeta.label}{focusedAcc.subtitle ? ` · ${focusedAcc.subtitle}` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        Store.setDefaultPaymentBalance(focusedAcc.id, activeBalance.id);
                        showToast('已設為預設找數來源');
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 border shrink-0 whitespace-nowrap transition ${
                        activeBalance.isDefaultPayment
                          ? 'bg-amber-400/25 border-amber-300/50 text-amber-200'
                          : 'bg-black/30 border-white/15 text-white/75 active:bg-black/45'
                      }`}
                    >
                      <Icon name="star" size={12} /> {activeBalance.isDefaultPayment ? '預設找數' : '設為預設'}
                    </button>
                  </div>

                  {/* Multi-Currency Pills (Display Currency + Balance Preview) */}
                  <div className="relative flex items-center gap-1.5 overflow-x-auto no-scrollbar" data-no-swipe="true">
                    {focusedAcc.balances.map((b) => {
                      const isSel = b.id === activeBalance.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBalMap((prev) => Object.assign({}, prev, { [focusedAcc.id]: b.id }))}
                          className={`px-3 py-1 rounded-full text-[12px] font-semibold transition shrink-0 tabular-nums ${
                            isSel
                              ? 'bg-white text-black shadow-sm'
                              : 'bg-black/35 text-white/80 border border-white/15'
                          }`}
                        >
                          {focusedAcc.balances.length > 1
                            ? `${b.currency} · ${Store.formatMoney(b.amount, b.currency)}`
                            : b.currency}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const unused = Store.CURRENCIES.find((c) => !focusedAcc.balances.some((b) => b.currency === c.code));
                        setAddCurDraft({ currency: unused ? unused.code : 'USD', amount: 0, poolId: 'pool_liquid' });
                        setAddCurOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-full text-[12px] bg-black/25 text-white/75 border border-dashed border-white/30 shrink-0"
                    >
                      + 幣種
                    </button>
                  </div>

                  {/* Hero Balance + Explicit Calibrate Trigger */}
                  <div className="relative flex items-end justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCalibDraft({ amount: activeBalance.amount, poolId: activeBalance.poolId || 'pool_liquid' });
                        setCalibOpen(true);
                      }}
                      className="text-left min-w-0 flex-1 active:opacity-80"
                    >
                      <div className="text-[11px] text-white/65 mb-0.5">
                        帳戶總餘額 ({activeBalance.currency})
                        {baseEq != null && (
                          <span className="ml-1.5 text-white/80 tabular-nums">≈ {Store.formatMoney(baseEq, state.meta.baseCurrency)}</span>
                        )}
                      </div>
                      <div className="text-[31px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
                        {Store.formatMoney(activeBalance.amount, activeBalance.currency)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalibDraft({ amount: activeBalance.amount, poolId: activeBalance.poolId || 'pool_liquid' });
                        setCalibOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-black/35 border border-white/15 text-[11.5px] font-medium text-white/85 shrink-0 active:bg-black/50"
                    >
                      校準
                    </button>
                  </div>

                  {/* 3-Column Glassmorphic Free / Locked / Goal Breakdown + Proportional Bar */}
                  <div className="relative space-y-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="px-2.5 py-2 rounded-xl bg-black/30 border border-white/10">
                        <div className="text-[10px] text-white/65">可動用自由</div>
                        <div className="text-[13px] font-bold text-emerald-300 tabular-nums mt-0.5 truncate">
                          {Store.formatMoney(activeSplit.free, activeBalance.currency)}
                        </div>
                      </div>
                      <div className="px-2.5 py-2 rounded-xl bg-black/30 border border-white/10">
                        <div className="text-[10px] text-white/65 flex items-center gap-1">
                          <Icon name="lock" size={9} className="text-amber-300" /> 凍結底倉
                        </div>
                        <div className="text-[13px] font-bold text-amber-300 tabular-nums mt-0.5 truncate">
                          {Store.formatMoney(activeSplit.locked, activeBalance.currency)}
                        </div>
                      </div>
                      <div className="px-2.5 py-2 rounded-xl bg-black/30 border border-white/10">
                        <div className="text-[10px] text-white/65">目標份額</div>
                        <div className="text-[13px] font-bold text-sky-300 tabular-nums mt-0.5 truncate">
                          {Store.formatMoney(activeSplit.goal, activeBalance.currency)}
                        </div>
                      </div>
                    </div>

                    <div className="h-1.5 rounded-full bg-black/40 overflow-hidden flex">
                      <div className="h-full bg-emerald-400 transition-all" style={{ width: `${activeSplit.freePct}%` }} />
                      <div className="h-full bg-sky-400 transition-all" style={{ width: `${activeSplit.goalPct}%` }} />
                      <div className="h-full bg-amber-400 transition-all" style={{ width: `${activeSplit.lockedPct}%` }} />
                    </div>
                  </div>

                  {/* Bottom Pool & Action Footer */}
                  <div className="relative pt-3 border-t border-white/15 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-black/35 border border-white/10 text-[11.5px] text-white/90 inline-flex items-center gap-1.5">
                      {pool && <span className="w-2 h-2 rounded-full" style={{ background: pool.color }} />}
                      {pool ? pool.name : '未指定資金池'}
                    </span>

                    {focusedAcc.type === 'EWALLET' ? (
                      <button
                        type="button"
                        onClick={openTopUpSheet}
                        className="px-3.5 py-1.5 rounded-full bg-white text-black text-[12px] font-bold active:scale-95 transition"
                      >
                        由銀行增值
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAllocDraft({ name: '', amount: Math.min(5000, freeAmount || 5000), locked: true, poolId: 'pool_reserve' });
                          setAddAllocOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-[12px] font-semibold active:bg-white/25 transition"
                      >
                        + 切分份額
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Card Back: Edit Settings */
                <div className="rounded-[24px] p-5 bg-[#191920] border border-white/15 shadow-2xl space-y-3.5">
                  <div className="text-[14px] font-semibold text-white">編輯帳戶卡片</div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">帳戶名稱</label>
                    <input
                      type="text"
                      value={editCardDraft.name}
                      onChange={(e) => setEditCardDraft((p) => Object.assign({}, p, { name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">帳戶備註</label>
                      <input
                        type="text"
                        value={editCardDraft.subtitle}
                        onChange={(e) => setEditCardDraft((p) => Object.assign({}, p, { subtitle: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">載體類型</label>
                      <select
                        value={editCardDraft.type}
                        onChange={(e) => setEditCardDraft((p) => Object.assign({}, p, { type: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                      >
                        {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1.5">卡面質感</label>
                    <div className="grid grid-cols-4 gap-2">
                      {Store.CARD_THEMES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setEditCardDraft((p) => Object.assign({}, p, { theme: t.id }))}
                          className={`py-2 rounded-xl text-[11px] font-medium border transition ${
                            editCardDraft.theme === t.id ? 'border-white text-white' : 'border-white/10 text-zinc-300'
                          }`}
                          style={{ background: t.bg }}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        Store.updateAccount(focusedAcc.id, editCardDraft);
                        setFlipped(false);
                        showToast('卡片設定已儲存');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-white text-black text-[13px] font-semibold"
                    >
                      儲存修改
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`確定刪除帳戶「${focusedAcc.name}」？`)) {
                          Store.deleteAccount(focusedAcc.id);
                          setFocusedAccId(null);
                          showToast('已刪除帳戶');
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[13px] font-medium"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )}

              {/* Elevated Card Options Tray (Allocations + Recent Account Activity) */}
              <div
                className="rounded-[22px] bg-[#17171D] border border-white/[0.12] shadow-[0_10px_28px_rgba(0,0,0,0.45)] overflow-hidden"
                style={{ borderTop: `2px solid ${theme.accent}88` }}
              >
                <div className="p-4 space-y-4">
                  {/* Allocations Slicing Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[14.5px] font-semibold text-white">戶口份額切分 ({activeBalance.currency})</div>
                        <div className="text-[12px] text-zinc-400 mt-0.5 tabular-nums">
                          自由餘額 {Store.formatMoney(freeAmount, activeBalance.currency)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAllocDraft({ name: '', amount: Math.min(5000, freeAmount || 5000), locked: true, poolId: 'pool_reserve' });
                          setAddAllocOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-full bg-white text-black text-[12px] font-bold active:scale-95 transition shrink-0"
                      >
                        + 份額
                      </button>
                    </div>

                    {activeAllocations.length === 0 ? (
                      <div className="py-4 px-3 rounded-2xl bg-[#111116] border border-white/[0.07] text-center text-[12px] text-zinc-400">
                        此幣種目前全額為自由活期，可新增份額來劃分凍結底倉或專項目標。
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeAllocations.map((al) => {
                          const maxForThis = Math.max(al.amount, Store.round2(al.amount + freeAmount));
                          return (
                            <div key={al.id} className="p-3.5 rounded-2xl bg-[#111116] border border-white/[0.09] space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => Store.updateAllocation(focusedAcc.id, al.id, { locked: !al.locked })}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                      al.locked ? 'bg-amber-400/20 text-amber-300' : 'bg-sky-400/15 text-sky-300'
                                    }`}
                                    title={al.locked ? '已凍結底倉' : '目標份額'}
                                  >
                                    <Icon name={al.locked ? 'lock' : 'unlock'} size={14} />
                                  </button>
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-semibold text-white truncate">{al.name}</div>
                                    <div className="text-[11px] text-zinc-500">{al.locked ? '凍結底倉' : '目標份額'}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <NumericInput
                                    size="sm"
                                    value={al.amount}
                                    currency={activeBalance.currency}
                                    label={`調整「${al.name}」份額`}
                                    quickAdds={[1000, 5000, 10000]}
                                    onChange={(val) => Store.updateAllocation(focusedAcc.id, al.id, { amount: Math.min(val, maxForThis) })}
                                    className="!w-auto min-w-[110px]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => Store.deleteAllocation(focusedAcc.id, al.id)}
                                    className="w-7 h-7 rounded-lg bg-white/[0.05] text-zinc-400 flex items-center justify-center"
                                  >
                                    <Icon name="trash" size={14} />
                                  </button>
                                </div>
                              </div>

                              <div data-no-swipe="true">
                                <input
                                  type="range"
                                  min={0}
                                  max={Math.max(100, Math.round(maxForThis))}
                                  step={100}
                                  value={Math.min(al.amount, Math.max(100, Math.round(maxForThis)))}
                                  onChange={(e) => Store.updateAllocation(focusedAcc.id, al.id, { amount: Number(e.target.value) })}
                                  className="w-full accent-white h-1.5 bg-white/10 rounded-lg cursor-pointer"
                                />
                              </div>

                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => Store.updateAllocation(focusedAcc.id, al.id, { amount: Math.max(0, al.amount - 1000) })}
                                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-zinc-300 active:bg-white/15"
                                  >
                                    -1K
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => Store.updateAllocation(focusedAcc.id, al.id, { amount: Math.min(maxForThis, al.amount + 1000) })}
                                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-zinc-300 active:bg-white/15"
                                  >
                                    +1K
                                  </button>
                                </div>
                                {freeAmount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      Store.absorbFreeAmount(focusedAcc.id, activeBalance.currency, al.id);
                                      showToast('已吸納剩餘自由額');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                                  >
                                    吸納自由額
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Account Recent Transactions */}
                  <div className="rounded-2xl bg-[#111116] border border-white/[0.08] overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                      <span className="text-[12.5px] font-semibold text-zinc-300">本戶近期流水</span>
                      <span className="text-[11px] text-zinc-500 tabular-nums">{accountTransactions.length} 筆</span>
                    </div>
                    {accountTransactions.length === 0 ? (
                      <div className="py-5 text-center text-[12px] text-zinc-500">暫無交易流水</div>
                    ) : (
                      <div className="divide-y divide-white/[0.06]">
                        {accountTransactions.map((tx) => {
                          const isToThis = tx.toAccountKind !== 'CARD' && tx.toAccountId === focusedAcc.id;
                          const isInflow = isToThis
                            || tx.type === 'INCOME'
                            || tx.type === 'PAYABLE'
                            || (tx.type === 'LOAN_SETTLEMENT' && tx.settlementDirection === 'IN');
                          const dispAmt = isToThis && tx.settledAmount != null ? tx.settledAmount : tx.amount;
                          const dispCur = isToThis && tx.settledCurrency ? tx.settledCurrency : tx.currency;
                          return (
                            <div key={tx.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2.5">
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-white truncate">{tx.title}</div>
                                <div className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">{tx.date} · {tx.time || ''}</div>
                              </div>
                              <div className={`text-[13px] font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                                isInflow ? 'text-emerald-400' : 'text-white'
                              }`}>
                                {Store.formatMoney(isInflow ? dispAmt : -dispAmt, dispCur, { showPlus: isInflow })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Stacked Card Dock for Quick Switching */}
              {state.accounts.length > 1 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-500 px-1">快速切換其他帳戶</div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-no-swipe="true">
                    {state.accounts.filter((a) => a.id !== focusedAcc.id).map((a) => {
                      const th = getThemeObj(a.theme);
                      const b0 = a.balances[0];
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => { setFocusedAccId(a.id); setFlipped(false); }}
                          className="relative shrink-0 min-w-[144px] p-3 rounded-2xl border border-white/15 text-left active:scale-95 transition overflow-hidden"
                          style={{ background: th.bg }}
                        >
                          <div className="absolute inset-0 pointer-events-none" style={{ background: th.glow }} />
                          <div className="relative text-[12.5px] font-semibold text-white truncate">{a.name}</div>
                          <div className="relative text-[11px] text-white/75 tabular-nums mt-1">
                            {b0 ? Store.formatMoney(b0.amount, b0.currency) : '-'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Sheet: Add Account */}
        <BottomSheet
          open={addAccOpen}
          title="新增銀包 / 銀行帳戶"
          onClose={() => setAddAccOpen(false)}
          footer={
            <button
              type="button"
              onClick={handleCreateAccount}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold active:scale-[0.99] transition"
            >
              建立帳戶
            </button>
          }
        >
          <div className="space-y-3.5">
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">帳戶名稱</label>
              <input
                type="text"
                placeholder="例如：日常銀行、電子錢包"
                value={newAcc.name}
                onChange={(e) => setNewAcc((p) => Object.assign({}, p, { name: e.target.value }))}
                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">載體類型</label>
                <select
                  value={newAcc.type}
                  onChange={(e) => setNewAcc((p) => Object.assign({}, p, { type: e.target.value }))}
                  className="w-full px-3 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                >
                  {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">初始幣種</label>
                <select
                  value={newAcc.currency}
                  onChange={(e) => setNewAcc((p) => Object.assign({}, p, { currency: e.target.value }))}
                  className="w-full px-3 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                >
                  {Store.CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">初始餘額</label>
              <NumericInput
                value={newAcc.initialAmount}
                currency={newAcc.currency}
                label="輸入初始餘額"
                quickAdds={[1000, 5000, 10000]}
                onChange={(val) => setNewAcc((p) => Object.assign({}, p, { initialAmount: val }))}
              />
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">歸屬資金池</label>
              <select
                value={newAcc.poolId}
                onChange={(e) => setNewAcc((p) => Object.assign({}, p, { poolId: e.target.value }))}
                className="w-full px-3 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              >
                {state.pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">卡面質感</label>
              <div className="grid grid-cols-4 gap-2">
                {Store.CARD_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewAcc((p) => Object.assign({}, p, { theme: t.id }))}
                    className={`py-2 rounded-xl text-[11px] font-medium border transition ${
                      newAcc.theme === t.id ? 'border-white text-white' : 'border-white/10 text-zinc-300'
                    }`}
                    style={{ background: t.bg }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </BottomSheet>

        {/* Sheet: Calibrate Balance */}
        <BottomSheet
          open={calibOpen && Boolean(focusedAcc && activeBalance)}
          title={focusedAcc ? `${focusedAcc.name} · 餘額校準` : '餘額校準'}
          subtitle={activeBalance ? `幣種 ${activeBalance.currency}` : ''}
          onClose={() => setCalibOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => {
                Store.calibrateBalance(focusedAcc.id, activeBalance.id, calibDraft.amount, calibDraft.poolId);
                setCalibOpen(false);
                showToast('餘額已校準');
              }}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold"
            >
              儲存校準餘額
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">最新實際餘額</label>
              <NumericInput
                size="lg"
                value={calibDraft.amount}
                currency={activeBalance ? activeBalance.currency : state.meta.baseCurrency}
                label="校準實際餘額"
                onChange={(val) => setCalibDraft((p) => Object.assign({}, p, { amount: val }))}
              />
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">歸屬資金池</label>
              <select
                value={calibDraft.poolId}
                onChange={(e) => setCalibDraft((p) => Object.assign({}, p, { poolId: e.target.value }))}
                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              >
                {state.pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </BottomSheet>

        {/* Sheet: Add Currency */}
        <BottomSheet
          open={addCurOpen && Boolean(focusedAcc)}
          title="新增多幣種子戶口"
          onClose={() => setAddCurOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => {
                const ok = Store.addAccountCurrency(focusedAcc.id, addCurDraft.currency, addCurDraft.amount, addCurDraft.poolId);
                if (!ok) {
                  showToast('該幣種已存在於此帳戶');
                  return;
                }
                setAddCurOpen(false);
                showToast(`已新增 ${addCurDraft.currency} 戶口`);
              }}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold"
            >
              確認新增幣種
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">選擇幣種</label>
              <select
                value={addCurDraft.currency}
                onChange={(e) => setAddCurDraft((p) => Object.assign({}, p, { currency: e.target.value }))}
                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              >
                {Store.CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">初始餘額</label>
              <NumericInput
                value={addCurDraft.amount}
                currency={addCurDraft.currency}
                label="輸入子戶口初始餘額"
                onChange={(val) => setAddCurDraft((p) => Object.assign({}, p, { amount: val }))}
              />
            </div>
          </div>
        </BottomSheet>

        {/* Sheet: E-Wallet Top-Up */}
        <BottomSheet
          open={topUpOpen && Boolean(focusedAcc && activeBalance)}
          title={focusedAcc ? `${focusedAcc.name} · 增值` : '增值'}
          onClose={() => setTopUpOpen(false)}
          footer={
            <button
              type="button"
              onClick={handleConfirmTopUp}
              className="w-full py-3.5 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold active:scale-[0.99] transition"
            >
              確認扣款並增值
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">扣款銀行戶口</label>
              <select
                value={topUpDraft.fromKey}
                onChange={(e) => setTopUpDraft((p) => Object.assign({}, p, { fromKey: e.target.value }))}
                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              >
                {bankSources.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">
                增值金額 ({activeBalance ? activeBalance.currency : ''})
              </label>
              <NumericInput
                size="lg"
                value={topUpDraft.amount}
                currency={activeBalance ? activeBalance.currency : state.meta.baseCurrency}
                label="輸入增值金額"
                quickAdds={[200, 500, 1000, 2000]}
                onChange={(val) => setTopUpDraft((p) => Object.assign({}, p, { amount: val }))}
                className="!text-emerald-400"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[200, 500, 1000, 2000].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setTopUpDraft((p) => Object.assign({}, p, { amount: Store.round2(Number(p.amount || 0) + inc) }))}
                  className="py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-[13px] font-medium text-zinc-200 active:bg-white/15 tabular-nums"
                >
                  +{inc}
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>

        {/* Sheet: Add Sub-Allocation */}
        <BottomSheet
          open={addAllocOpen && Boolean(focusedAcc && activeBalance)}
          title="新增戶口內部份額"
          subtitle={activeBalance ? `可用未分配餘額：${Store.formatMoney(freeAmount, activeBalance.currency)}` : ''}
          onClose={() => setAddAllocOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => {
                if (!allocDraft.name.trim()) {
                  showToast('請輸入份額名稱');
                  return;
                }
                Store.addAllocation(focusedAcc.id, activeBalance.currency, allocDraft);
                setAddAllocOpen(false);
                showToast('已新增份額');
              }}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold"
            >
              建立份額
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">份額名稱</label>
              <input
                type="text"
                placeholder="例如：應急底倉、旅行基金"
                value={allocDraft.name}
                onChange={(e) => setAllocDraft((p) => Object.assign({}, p, { name: e.target.value }))}
                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">分配金額</label>
              <NumericInput
                value={allocDraft.amount}
                currency={activeBalance ? activeBalance.currency : state.meta.baseCurrency}
                label="份額分配金額"
                quickAdds={[1000, 5000, 10000]}
                onChange={(val) => setAllocDraft((p) => Object.assign({}, p, { amount: val }))}
              />
            </div>
            <button
              type="button"
              onClick={() => setAllocDraft((p) => Object.assign({}, p, { locked: !p.locked }))}
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/[0.12] flex items-center justify-between"
            >
              <span className="text-[13px] text-zinc-200">鎖定為「凍結底倉」（不計入日常可動用現金）</span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${allocDraft.locked ? 'bg-amber-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
                {allocDraft.locked ? '已鎖定' : '未鎖定'}
              </span>
            </button>
          </div>
        </BottomSheet>
      </div>
    );
  }

  window.WealthWallet = { WalletView };
})();
