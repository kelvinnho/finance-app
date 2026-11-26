// mod1_wallet.js · Stage 2 r8
(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;

  const ACCOUNT_TYPES = [
    { value: 'BANK', label: '銀行活期', icon: 'home' },
    { value: 'EWALLET', label: '電子錢包', icon: 'sparkles' },
    { value: 'BROKER', label: '證券交割', icon: 'trend' },
    { value: 'CASH', label: '實體現金', icon: 'coins' }
  ];

  const ALLOC_PALETTE = ['#FBBF24', '#38BDF8', '#A78BFA', '#FB7185', '#FB923C', '#60A5FA'];

  function CardAuraLayers({ theme, lockedAlert }) {
    return (
      <>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: lockedAlert
              ? 'radial-gradient(circle at 86% 14%, rgba(251,113,133,0.34) 0%, rgba(244,63,94,0.12) 44%, transparent 72%)'
              : (theme.glow || 'radial-gradient(circle at 86% 14%, rgba(255,255,255,0.18) 0%, transparent 65%)')
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-45"
          style={{ background: 'linear-gradient(118deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 32%, transparent 55%)' }}
        />
        <div className="absolute -right-8 -bottom-10 w-36 h-36 rounded-full border border-white/[0.08] pointer-events-none" />
        <div className="absolute -right-2 -bottom-4 w-24 h-24 rounded-full border border-white/[0.06] pointer-events-none" />
        <div
          className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent to-transparent pointer-events-none ${
            lockedAlert ? 'via-rose-300/70' : 'via-white/40'
          }`}
        />
      </>
    );
  }

  function WalletView({ state, showToast, onFocusChange, resetSignal, onJumpToWealth }) {
    const { Icon, BottomSheet, NumericInput, useConfirm } = window.WealthUI;
    const { confirmDeductions } = useConfirm();
    const Store = window.WealthStore;

    const [focusedAccId, setFocusedAccId] = useState(null);
    const [selectedBalMap, setSelectedBalMap] = useState({});
    const [flipped, setFlipped] = useState(false);
    const [editingAllocId, setEditingAllocId] = useState(null);

    // Unified Draft Rebalance Sheet (Handles both Overflow Fix & Normal Multi-Item Rebalancing)
    const [rebalanceOpen, setRebalanceOpen] = useState(false);
    const [rebalanceDraft, setRebalanceDraft] = useState([]);

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
    const [allocDraft, setAllocDraft] = useState({ name: '', amount: 0 });

    const [editCardDraft, setEditCardDraft] = useState({
      name: '',
      subtitle: '',
      type: 'BANK',
      theme: 'obsidian',
      poolId: 'pool_liquid'
    });

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

    const activeBalanceId = activeBalance ? activeBalance.id : null;

    const syncEditDraftFromAcc = (acc, bal) => {
      if (!acc) return;
      const targetBal = bal || (acc.balances && acc.balances[0]) || null;
      setEditCardDraft({
        name: acc.name,
        subtitle: acc.subtitle || '',
        type: acc.type || 'BANK',
        theme: acc.theme || 'obsidian',
        poolId: (targetBal && targetBal.poolId) || (state.pools[0] && state.pools[0].id) || 'pool_liquid'
      });
    };

    // IMPORTANT: Depend strictly on primitive IDs (focusedAccId, activeBalanceId),
    // NEVER on focusedAcc object reference, so dragging sliders / clicking -1K / +1K / typing
    // will NEVER collapse or jump away!
    useEffect(() => {
      setEditingAllocId(null);
      setRebalanceOpen(false);
      if (!focusedAccId) {
        setFlipped(false);
      }
    }, [focusedAccId, activeBalanceId]);

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
        setEditingAllocId(null);
        setRebalanceOpen(false);
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

    const handleConfirmTopUp = async () => {
      if (!focusedAcc || !activeBalance || !topUpDraft.fromKey) {
        showToast('請先選擇扣款銀行戶口');
        return;
      }
      const amt = Number(topUpDraft.amount);
      if (amt <= 0) {
        showToast('增值金額須大於 0');
        return;
      }
      const [fromAccId, fromBalId] = topUpDraft.fromKey.split('::');
      const ok = await confirmDeductions([{ accountId: fromAccId, balanceId: fromBalId, delta: -amt }]);
      if (!ok) return;

      Store.topUpEWallet(fromAccId, fromBalId, focusedAcc.id, activeBalance.id, amt);
      setTopUpOpen(false);
      showToast(`已增值 ${Store.formatMoney(amt, activeBalance.currency)}`);
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

    // Virtual allocations & soft-lock overflow detection for focused account + active currency
    const activeAllocations = useMemo(() => {
      if (!focusedAcc || !activeBalance) return [];
      return (focusedAcc.allocations || []).filter((al) => al.currency === activeBalance.currency);
    }, [focusedAcc, activeBalance]);

    const focusedAccOverflow = useMemo(() => {
      if (!focusedAcc) return { hasOverflow: false, currencies: [], primaryOverflow: null };
      return Store.getAccountOverflowInfo(focusedAcc, state);
    }, [focusedAcc, state]);

    const allocStats = useMemo(() => {
      const total = activeBalance ? Store.round2(activeBalance.amount || 0) : 0;
      const capTotal = Math.max(0, total);
      const allocatedSum = Store.round2(activeAllocations.reduce((s, x) => s + Math.max(0, Number(x.amount || 0)), 0));
      const free = Math.max(0, Store.round2(capTotal - allocatedSum));
      const deficit = allocatedSum > capTotal + 0.01 ? Store.round2(allocatedSum - capTotal) : 0;
      const isSoftLocked = deficit > 0;
      const denom = capTotal > 0 ? capTotal : 1;

      const segments = [];
      if (!isSoftLocked) {
        if (free > 0 || activeAllocations.length === 0) {
          const freePct = capTotal > 0 ? Math.round((free / denom) * 100) : 0;
          segments.push({
            id: '__free__',
            name: '自由餘額',
            amount: free,
            pct: freePct,
            color: '#34D399',
            isFree: true
          });
        }

        activeAllocations.forEach((al, idx) => {
          const amt = Math.max(0, Store.round2(al.amount || 0));
          if (amt <= 0) return;
          const pct = capTotal > 0 ? Math.round((amt / denom) * 100) : 0;
          segments.push({
            id: al.id,
            name: al.name,
            amount: amt,
            pct,
            color: ALLOC_PALETTE[idx % ALLOC_PALETTE.length],
            isFree: false
          });
        });

        if (segments.length > 0 && capTotal > 0) {
          const sumPct = segments.reduce((s, x) => s + x.pct, 0);
          if (sumPct !== 100) {
            const largest = segments.reduce((best, cur) => (cur.amount > best.amount ? cur : best), segments[0]);
            largest.pct = Math.max(0, largest.pct + (100 - sumPct));
          }
        }
      }

      return { total, capTotal, allocatedSum, free, deficit, isSoftLocked, segments };
    }, [activeBalance, activeAllocations]);

    const freeAmount = allocStats.free;

    // ---- Unified Draft Rebalance Sheet Handlers ----
    const openRebalanceSheet = () => {
      if (!activeBalance || !activeAllocations.length) return;
      const items = activeAllocations.map((al, idx) => ({
        id: al.id,
        name: al.name,
        poolId: al.poolId || 'pool_reserve',
        origAmount: Math.max(0, Store.round2(al.amount || 0)),
        amount: Math.max(0, Store.round2(al.amount || 0)),
        pinned: false,
        deleted: false,
        color: ALLOC_PALETTE[idx % ALLOC_PALETTE.length]
      }));
      setRebalanceDraft(items);
      setRebalanceOpen(true);
    };

    const rebalanceMetrics = useMemo(() => {
      const capTotal = activeBalance ? Math.max(0, Store.round2(activeBalance.amount || 0)) : 0;
      const activeItems = rebalanceDraft.filter((x) => !x.deleted);
      const draftSum = Store.round2(activeItems.reduce((s, x) => s + Math.max(0, Number(x.amount || 0)), 0));
      const deficit = Store.round2(Math.max(0, draftSum - capTotal));
      const free = Store.round2(Math.max(0, capTotal - draftSum));
      const isBalanced = deficit <= 0.005;
      const hasChanges = rebalanceDraft.some((x) => x.deleted || Math.abs(x.amount - x.origAmount) > 0.005);
      const unpinnedCount = activeItems.filter((x) => !x.pinned).length;
      return { capTotal, activeItems, draftSum, deficit, free, isBalanced, hasChanges, unpinnedCount };
    }, [rebalanceDraft, activeBalance]);

    const updateRebalanceItem = (id, patch) => {
      setRebalanceDraft((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          return Object.assign({}, it, patch);
        })
      );
    };

    const restoreRebalanceItem = (id) => {
      setRebalanceDraft((prev) =>
        prev.map((it) => (it.id === id ? Object.assign({}, it, { amount: it.origAmount, deleted: false, pinned: false }) : it))
      );
    };

    const restoreAllRebalance = () => {
      setRebalanceDraft((prev) =>
        prev.map((it) => Object.assign({}, it, { amount: it.origAmount, deleted: false, pinned: false }))
      );
    };

    const zeroAllRebalance = () => {
      setRebalanceDraft((prev) =>
        prev.map((it) => (it.deleted ? it : Object.assign({}, it, { amount: 0, pinned: false })))
      );
    };

    const rebalanceRemainingProportional = () => {
      const capTotal = rebalanceMetrics.capTotal;
      const active = rebalanceDraft.filter((x) => !x.deleted);
      const unpinned = active.filter((x) => !x.pinned);
      if (unpinned.length === 0) {
        showToast('所有項目皆已固定，請先點「已固定」解鎖至少一項');
        return;
      }

      const pinnedSum = Store.round2(active.filter((x) => x.pinned).reduce((s, x) => s + Math.max(0, Number(x.amount || 0)), 0));
      const targetForUnpinned = Store.round2(capTotal - pinnedSum);

      if (targetForUnpinned <= 0.005) {
        setRebalanceDraft((prev) =>
          prev.map((it) => (!it.deleted && !it.pinned ? Object.assign({}, it, { amount: 0 }) : it))
        );
        if (pinnedSum > capTotal + 0.005) {
          showToast('已先將未固定項目歸零，已固定項目總和仍超出餘額');
        } else {
          showToast('已將未固定項目歸零並對齊總額');
        }
        return;
      }

      const curUnpinnedSum = Store.round2(unpinned.reduce((s, x) => s + Math.max(0, Number(x.amount || 0)), 0));
      const nextMap = {};
      let running = 0;

      unpinned.forEach((it, idx) => {
        if (idx === unpinned.length - 1) {
          nextMap[it.id] = Math.max(0, Store.round2(targetForUnpinned - running));
        } else {
          const share = curUnpinnedSum > 0
            ? Store.round2(targetForUnpinned * (it.amount / curUnpinnedSum))
            : Store.round2(targetForUnpinned / unpinned.length);
          nextMap[it.id] = Math.max(0, share);
          running = Store.round2(running + nextMap[it.id]);
        }
      });

      setRebalanceDraft((prev) =>
        prev.map((it) => (it.id in nextMap ? Object.assign({}, it, { amount: nextMap[it.id] }) : it))
      );
      showToast('已按比例同步配平未固定項目');
    };

    const handleCommitRebalance = () => {
      if (!focusedAcc || !activeBalance) return;
      if (!rebalanceMetrics.isBalanced) {
        showToast(`尚需調減 ${Store.formatMoney(rebalanceMetrics.deficit, activeBalance.currency)}`);
        return;
      }
      const wasLocked = allocStats.isSoftLocked;
      Store.replaceAccountAllocations(focusedAcc.id, activeBalance.currency, rebalanceDraft);
      setRebalanceOpen(false);
      setEditingAllocId(null);
      showToast(wasLocked ? '已修正份額並解除卡片鎖定' : '已儲存份額調配');
    };

    // Linked Fixed Deposits (Option 2A Read-Only Integration)
    const linkedDeposits = useMemo(() => {
      if (!focusedAcc) return { count: 0, items: [], totalBase: 0, byCurrency: {} };
      return Store.getAccountLinkedDeposits(focusedAcc.id, state);
    }, [focusedAcc, state]);

    // Overview Summary Bar: Unallocated Free vs Virtual Allocated
    const walletTotalBase = metrics.walletTotal;
    const freePct = walletTotalBase > 0
      ? Math.min(100, Math.max(0, Math.round((metrics.freeWallet / walletTotalBase) * 100)))
      : 100;

    return (
      <div className="space-y-4 pb-6">
        {/* Top Summary Card (Pure Liquid Total + Unallocated Free vs Virtual Allocated) */}
        {!focusedAcc && (
          <div className="relative rounded-[22px] bg-[#13141A] border border-white/[0.11] p-4 space-y-3 overflow-hidden shadow-lg">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 90% 8%, rgba(52,211,153,0.16) 0%, transparent 58%)' }}
            />
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11.5px] font-medium text-emerald-300/90">銀包活期總計</span>
                {metrics.overflowAccountCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-[10.5px] font-semibold text-rose-300 inline-flex items-center gap-1 whitespace-nowrap">
                    <Icon name="lock" size={10} /> {metrics.overflowAccountCount} 張卡份額超額
                  </span>
                ) : (
                  <span className="text-[10.5px] text-zinc-400 tabular-nums">
                    共 {state.accounts.length} 張卡片
                  </span>
                )}
              </div>
              <div className="text-[30px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
                {Store.formatMoney(walletTotalBase, state.meta.baseCurrency)}
              </div>
            </div>

            <div className="relative h-1.5 rounded-full bg-white/[0.08] overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300" style={{ width: `${freePct}%` }} />
              <div className="h-full bg-sky-400/80" style={{ width: `${Math.max(0, 100 - freePct)}%` }} />
            </div>

            <div className="relative pt-1 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-zinc-500">未劃分自由額</div>
                <div className="text-[14.5px] font-semibold text-emerald-300 tabular-nums mt-0.5 whitespace-nowrap">
                  {Store.formatMoney(metrics.freeWallet, state.meta.baseCurrency)}
                </div>
              </div>
              <div className="min-w-0 text-right">
                <div className="text-[11px] text-zinc-500">已劃分虛擬份額</div>
                <div className="text-[14.5px] font-semibold text-sky-200 tabular-nums mt-0.5 whitespace-nowrap">
                  {Store.formatMoney(metrics.allocatedWallet, state.meta.baseCurrency)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode A: Apple Wallet Stacked Card Pack */}
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
                  const theme = getThemeObj(acc.theme);
                  const typeMeta = getTypeMeta(acc.type);
                  const pool = getPoolObj(primaryBal.poolId);
                  const isLast = idx === state.accounts.length - 1;
                  const isForeignPrimary = primaryBal.currency !== state.meta.baseCurrency;
                  const baseEq = isForeignPrimary ? Store.convertToBase(primaryBal.amount, primaryBal.currency, state) : null;
                  const ov = Store.getAccountOverflowInfo(acc, state);

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        if (ov.hasOverflow && ov.primaryOverflow) {
                          setSelectedBalMap((prev) => Object.assign({}, prev, { [acc.id]: ov.primaryOverflow.balanceId }));
                        }
                        setFocusedAccId(acc.id);
                        setFlipped(false);
                      }}
                      style={{
                        background: theme.bg,
                        zIndex: idx + 1
                      }}
                      className={`relative block w-full rounded-[24px] border shadow-[0_-12px_30px_rgba(0,0,0,0.6)] text-left transition-transform active:scale-[0.985] overflow-hidden ${
                        ov.hasOverflow ? 'border-rose-400/75' : 'border-white/20'
                      } ${idx > 0 ? '-mt-12' : ''} ${isLast ? 'p-5 min-h-[164px]' : 'px-5 pt-4 pb-16 min-h-[142px]'}`}
                    >
                      <CardAuraLayers theme={theme} lockedAlert={ov.hasOverflow} />

                      <div className="relative flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-inner ${
                              ov.hasOverflow
                                ? 'bg-rose-500/25 border-rose-300/50 text-rose-200'
                                : 'bg-black/30 border-white/20'
                            }`}
                            style={ov.hasOverflow ? undefined : { color: theme.accent }}
                          >
                            <Icon name={ov.hasOverflow ? 'lock' : typeMeta.icon} size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[16px] font-bold text-white truncate leading-snug">{acc.name}</div>
                            <div className="text-[11.5px] text-white/75 truncate mt-0.5">
                              {acc.balances.map((b) => b.currency).join(' / ')} · {acc.subtitle || typeMeta.label}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-[18px] font-bold tabular-nums tracking-tight whitespace-nowrap ${
                            primaryBal.amount < 0 ? 'text-rose-300' : 'text-white'
                          }`}>
                            {Store.formatMoney(primaryBal.amount, primaryBal.currency)}
                          </div>
                          <div className="text-[10.5px] mt-0.5 whitespace-nowrap tabular-nums">
                            {ov.hasOverflow ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/30 border border-rose-300/50 text-rose-100 font-semibold inline-flex items-center gap-1">
                                <Icon name="lock" size={9} /> 份額超額 · 請修正
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

                      {isLast && (
                        <div className="relative mt-6 pt-3 border-t border-white/15 flex items-center justify-between gap-2">
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
                          <span className="text-[11px] text-white/70 shrink-0">
                            {ov.hasOverflow ? '點擊修正 ›' : '展開 ›'}
                          </span>
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

        {/* Mode B: Focused Wallet Card + Clean Allocation Management (No Recent Transactions Clutter) */}
        {focusedAcc && activeBalance && (() => {
          const theme = getThemeObj(focusedAcc.theme);
          const typeMeta = getTypeMeta(focusedAcc.type);
          const pool = getPoolObj(activeBalance.poolId);
          const isForeign = activeBalance.currency !== state.meta.baseCurrency;
          const baseEq = isForeign ? Store.convertToBase(activeBalance.amount, activeBalance.currency, state) : null;
          const isCardSoftLocked = allocStats.isSoftLocked;

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
                    syncEditDraftFromAcc(focusedAcc, activeBalance);
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
                  className={`rounded-[24px] p-5 border shadow-[0_18px_40px_rgba(0,0,0,0.65)] relative overflow-hidden space-y-4 ${
                    isCardSoftLocked ? 'border-rose-400/75' : 'border-white/20'
                  }`}
                  style={{ background: theme.bg }}
                >
                  <CardAuraLayers theme={theme} lockedAlert={isCardSoftLocked} />

                  {/* Row 1: Icon + Name + Integrated Pool Subtitle */}
                  <div className="relative flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${
                          isCardSoftLocked
                            ? 'bg-rose-500/25 border-rose-300/50 text-rose-200'
                            : 'bg-black/30 border-white/20'
                        }`}
                        style={isCardSoftLocked ? undefined : { color: theme.accent }}
                      >
                        <Icon name={isCardSoftLocked ? 'lock' : typeMeta.icon} size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[18px] font-bold text-white truncate leading-tight">{focusedAcc.name}</div>
                        <div className="text-[11.5px] text-white/75 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>{focusedAcc.subtitle || typeMeta.label}</span>
                          {pool && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/30 border border-white/15 text-[10.5px] text-white/90">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: pool.color }} />
                              {pool.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {focusedAcc.type === 'EWALLET' && (
                      <button
                        type="button"
                        onClick={openTopUpSheet}
                        className="px-3 py-1.5 rounded-full bg-white text-black text-[12px] font-bold active:scale-95 transition shrink-0 whitespace-nowrap"
                      >
                        由銀行增值
                      </button>
                    )}
                  </div>

                  {/* Row 2: Pure Currency Selector Pills */}
                  <div className="relative flex items-center gap-1.5 overflow-x-auto no-scrollbar" data-no-swipe="true">
                    {focusedAcc.balances.map((b) => {
                      const isSel = b.id === activeBalance.id;
                      const curOv = focusedAccOverflow.currencies.some((c) => c.balanceId === b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBalMap((prev) => Object.assign({}, prev, { [focusedAcc.id]: b.id }))}
                          className={`px-3 py-1 rounded-full text-[12px] font-semibold transition shrink-0 inline-flex items-center gap-1.5 ${
                            isSel
                              ? 'bg-white text-black shadow-sm'
                              : curOv
                              ? 'bg-rose-500/25 text-rose-100 border border-rose-300/60'
                              : 'bg-black/35 text-white/80 border border-white/15'
                          }`}
                        >
                          <span>{b.currency}</span>
                          {curOv && <span className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-rose-500' : 'bg-rose-300'}`} />}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const unused = Store.CURRENCIES.find((c) => !focusedAcc.balances.some((b) => b.currency === c.code));
                        setAddCurDraft({ currency: unused ? unused.code : 'USD', amount: 0, poolId: activeBalance.poolId || 'pool_liquid' });
                        setAddCurOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-full text-[12px] bg-black/25 text-white/75 border border-dashed border-white/30 shrink-0"
                    >
                      + 幣種
                    </button>
                  </div>

                  {/* Row 3: Hero Balance + Calibrate Button */}
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
                        活期總餘額 ({activeBalance.currency})
                        {baseEq != null && (
                          <span className="ml-1.5 text-white/80 tabular-nums">≈ {Store.formatMoney(baseEq, state.meta.baseCurrency)}</span>
                        )}
                      </div>
                      <div className={`text-[31px] font-bold tabular-nums tracking-tight leading-tight break-all ${
                        activeBalance.amount < 0 ? 'text-rose-300' : 'text-white'
                      }`}>
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

                  {/* Row 4: Actionable Soft-Lock Bar (One-Tap Rebalance Sheet) OR Dynamic % Strip */}
                  {isCardSoftLocked ? (
                    <div className="relative p-3 rounded-2xl bg-rose-500/20 border border-rose-300/55 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/30 text-rose-100 flex items-center justify-center shrink-0">
                          <Icon name="lock" size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-bold text-rose-100 tabular-nums truncate">
                            需調減 {Store.formatMoney(allocStats.deficit, activeBalance.currency)}
                          </div>
                          <div className="text-[11px] text-rose-200/80 tabular-nums truncate">
                            份額合計 {Store.formatMoney(allocStats.allocatedSum, activeBalance.currency)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openRebalanceSheet}
                        className="px-3.5 py-2 rounded-xl bg-rose-500 text-white text-[12.5px] font-bold shadow-lg active:scale-95 transition shrink-0 whitespace-nowrap"
                      >
                        立即配平
                      </button>
                    </div>
                  ) : (
                    activeAllocations.length > 0 && allocStats.segments.length > 0 && (
                      <div className="relative pt-1 space-y-2.5">
                        <div className="h-2 rounded-full bg-black/40 overflow-hidden flex gap-[1.5px]">
                          {allocStats.segments.map((seg) => (
                            seg.pct > 0 && (
                              <div
                                key={seg.id}
                                className="h-full transition-all first:rounded-l-full last:rounded-r-full"
                                style={{ width: `${seg.pct}%`, background: seg.color }}
                              />
                            )
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {allocStats.segments.map((seg) => (
                            <span
                              key={seg.id}
                              className="px-2.5 py-1 rounded-xl bg-black/35 border border-white/10 text-[11px] text-white/90 inline-flex items-center gap-1.5 tabular-nums"
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                              <span className="max-w-[110px] truncate">{seg.name}</span>
                              <strong className="text-white font-bold">{seg.pct}%</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                /* Card Back: Edit Settings (Includes Funding Pool Selector) */
                <div className="rounded-[24px] p-5 bg-[#191920] border border-white/15 shadow-2xl space-y-3.5">
                  <div className="text-[14.5px] font-semibold text-white">編輯帳戶卡片</div>
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
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">載體類型</label>
                      <select
                        value={editCardDraft.type}
                        onChange={(e) => setEditCardDraft((p) => Object.assign({}, p, { type: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                      >
                        {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-emerald-300 font-medium block mb-1">
                      歸屬資金池（{activeBalance.currency} 戶口）
                    </label>
                    <select
                      value={editCardDraft.poolId}
                      onChange={(e) => setEditCardDraft((p) => Object.assign({}, p, { poolId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-emerald-400/30 text-[13.5px] text-white outline-none"
                    >
                      {state.pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
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
                        Store.updateAccount(focusedAcc.id, {
                          name: editCardDraft.name,
                          subtitle: editCardDraft.subtitle,
                          type: editCardDraft.type,
                          theme: editCardDraft.theme
                        });
                        Store.calibrateBalance(focusedAcc.id, activeBalance.id, null, editCardDraft.poolId);
                        setFlipped(false);
                        showToast('卡片與資金池設定已儲存');
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

              {/* Elevated Card Options Tray (Linked Fixed Deposits + Virtual Allocations ONLY) */}
              <div
                className="rounded-[22px] bg-[#17171D] border border-white/[0.12] shadow-[0_10px_28px_rgba(0,0,0,0.45)] overflow-hidden"
                style={{ borderTop: `2px solid ${isCardSoftLocked ? '#FB7185' : (theme.accent + '88')}` }}
              >
                <div className="p-4 space-y-4">
                  {/* Option 2A: Read-Only Linked Fixed Deposits Info Row */}
                  {linkedDeposits.count > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onJumpToWealth) onJumpToWealth();
                      }}
                      className="w-full px-3.5 py-3 rounded-2xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-between gap-2.5 text-left active:bg-amber-500/20 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                          <Icon name="lock" size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-semibold text-amber-200 truncate">
                            關聯定期存款（{linkedDeposits.count} 筆 · 不計入活期）
                          </div>
                          <div className="text-[11px] text-amber-100/70 truncate tabular-nums mt-0.5">
                            {linkedDeposits.items[0].name}
                            {linkedDeposits.items[0].maturityDate ? ` · 到期 ${linkedDeposits.items[0].maturityDate}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-1">
                        <span className="text-[13.5px] font-bold text-amber-200 tabular-nums whitespace-nowrap">
                          {Store.formatMoney(linkedDeposits.totalBase, state.meta.baseCurrency)}
                        </span>
                        <Icon name="chevronRight" size={15} className="text-amber-300/80 shrink-0" />
                      </div>
                    </button>
                  )}

                  {/* Virtual Allocations Section: Strict Anti-Overdraft + Smooth Slider + Rebalance Trigger */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[14.5px] font-semibold text-white">虛擬份額切分 ({activeBalance.currency})</div>
                        <div className="text-[12px] text-zinc-400 mt-0.5 tabular-nums">
                          {isCardSoftLocked ? (
                            <span>份額總和 <strong className="text-rose-300 font-semibold">{Store.formatMoney(allocStats.allocatedSum, activeBalance.currency)}</strong></span>
                          ) : (
                            <span>自由餘額 <strong className="text-emerald-400 font-semibold">{Store.formatMoney(freeAmount, activeBalance.currency)}</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeAllocations.length > 0 && (
                          <button
                            type="button"
                            onClick={openRebalanceSheet}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition whitespace-nowrap ${
                              isCardSoftLocked
                                ? 'bg-rose-500 text-white'
                                : 'bg-white/[0.10] border border-white/15 text-zinc-100'
                            }`}
                          >
                            {isCardSoftLocked ? '配平修正' : '調配'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setAllocDraft({ name: '', amount: Math.min(5000, freeAmount) });
                            setAddAllocOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-full bg-white text-black text-[12px] font-bold active:scale-95 transition whitespace-nowrap"
                        >
                          + 份額
                        </button>
                      </div>
                    </div>

                    {activeAllocations.length === 0 ? (
                      <div className="py-4 px-3 rounded-2xl bg-[#111116] border border-white/[0.07] text-center text-[12px] text-zinc-400">
                        此幣種目前全額為自由活期，點右上「+ 份額」建立虛擬預留切分。
                      </div>
                    ) : (
                      <div className={`rounded-2xl bg-[#111116] border divide-y divide-white/[0.06] overflow-hidden ${
                        isCardSoftLocked ? 'border-rose-400/40' : 'border-white/[0.09]'
                      }`}>
                        {activeAllocations.map((al, idx) => {
                          const segColor = ALLOC_PALETTE[idx % ALLOC_PALETTE.length];
                          const isEditing = editingAllocId === al.id;
                          const otherSum = Store.round2(allocStats.allocatedSum - al.amount);
                          // Strict anti-overdraft ceiling in normal mode; reduce-only ceiling in overflow mode
                          const hardCeiling = Math.max(0, Store.round2(allocStats.capTotal - otherSum));
                          const isThisOverCeiling = al.amount > hardCeiling + 0.005;
                          const effectiveMax = isThisOverCeiling ? al.amount : hardCeiling;
                          const sliderMax = Math.max(effectiveMax, 0);
                          const sliderStep = sliderMax >= 1000 ? 100 : (sliderMax >= 100 ? 10 : 1);
                          const canIncrease = al.amount < hardCeiling - 0.005;

                          return (
                            <div key={al.id}>
                              {/* Compact Overview Row */}
                              <button
                                type="button"
                                onClick={() => setEditingAllocId(isEditing ? null : al.id)}
                                className={`w-full px-3.5 py-3 flex items-center justify-between gap-3 text-left transition ${
                                  isEditing ? 'bg-white/[0.05]' : 'active:bg-white/[0.04]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: segColor }} />
                                  <span className="text-[14px] font-semibold text-white truncate">{al.name}</span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-[15px] font-bold tabular-nums whitespace-nowrap ${
                                    al.amount <= 0 ? 'text-zinc-500' : 'text-white'
                                  }`}>
                                    {Store.formatMoney(al.amount, activeBalance.currency)}
                                  </span>
                                  <Icon
                                    name="chevronDown"
                                    size={14}
                                    className={`text-zinc-500 transition-transform ${isEditing ? 'rotate-180 text-white' : ''}`}
                                  />
                                </div>
                              </button>

                              {/* Expanded Inline Editor (Rock-Solid Open While Dragging / Clicking / Typing) */}
                              {isEditing && (
                                <div
                                  data-no-swipe="true"
                                  className="px-3.5 pb-3.5 pt-2.5 bg-white/[0.03] border-t border-white/[0.06] space-y-3"
                                >
                                  <input
                                    type="text"
                                    value={al.name}
                                    onChange={(e) => Store.updateAllocation(focusedAcc.id, al.id, { name: e.target.value })}
                                    placeholder="份額名稱"
                                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                                  />

                                  <NumericInput
                                    size="sm"
                                    value={al.amount}
                                    currency={activeBalance.currency}
                                    label={`調整「${al.name}」份額（上限 ${Store.formatMoney(effectiveMax, activeBalance.currency)}）`}
                                    quickAdds={[1000, 5000, 10000]}
                                    onChange={(val) => {
                                      const clamped = Math.max(0, Math.min(val, effectiveMax));
                                      if (val > effectiveMax + 0.005) {
                                        showToast(`已封頂於可用上限 ${Store.formatMoney(effectiveMax, activeBalance.currency)}`);
                                      }
                                      Store.updateAllocation(focusedAcc.id, al.id, { amount: clamped });
                                    }}
                                  />

                                  {/* Smooth Anti-Overdraft Capped Slider */}
                                  <div className="space-y-1">
                                    <input
                                      type="range"
                                      min={0}
                                      max={sliderMax > 0 ? sliderMax : 100}
                                      step={sliderStep}
                                      disabled={sliderMax <= 0}
                                      value={sliderMax > 0 ? Math.min(al.amount, sliderMax) : 0}
                                      onChange={(e) => {
                                        const raw = Number(e.target.value);
                                        const safeVal = Math.max(0, Math.min(raw, effectiveMax));
                                        Store.updateAllocation(focusedAcc.id, al.id, { amount: safeVal });
                                      }}
                                      className="w-full accent-white h-2 bg-white/10 rounded-lg cursor-pointer disabled:opacity-35"
                                    />
                                    <div className="flex items-center justify-between text-[10.5px] text-zinc-500 tabular-nums">
                                      <span>0</span>
                                      <span>
                                        {isThisOverCeiling
                                          ? '目前超額（僅可調低或點配平）'
                                          : `上限 ${Store.formatMoney(hardCeiling, activeBalance.currency)}`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Dynamic Context-Aware Quick Buttons */}
                                  <div className="flex items-center justify-between gap-2 text-[11.5px] flex-wrap">
                                    <div className="flex gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        disabled={al.amount <= 0}
                                        onClick={() => Store.updateAllocation(focusedAcc.id, al.id, { amount: Math.max(0, Store.round2(al.amount - 1000)) })}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.08] text-zinc-200 active:bg-white/15 disabled:opacity-35"
                                      >
                                        -1K
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!canIncrease}
                                        onClick={() => Store.updateAllocation(focusedAcc.id, al.id, { amount: Math.min(hardCeiling, Store.round2(al.amount + 1000)) })}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.08] text-zinc-200 active:bg-white/15 disabled:opacity-35"
                                      >
                                        +1K
                                      </button>

                                      {/* Dynamic Align / Fit Button */}
                                      {isCardSoftLocked ? (
                                        al.amount > allocStats.deficit + 0.005 ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const fit = Store.round2(al.amount - allocStats.deficit);
                                              Store.updateAllocation(focusedAcc.id, al.id, { amount: fit });
                                              showToast(`已扣至符合（${Store.formatMoney(fit, activeBalance.currency)}）`);
                                            }}
                                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 font-semibold tabular-nums"
                                          >
                                            扣至符合（➔ {Store.formatMoney(Store.round2(al.amount - allocStats.deficit), activeBalance.currency)}）
                                          </button>
                                        ) : null
                                      ) : freeAmount > 0.005 ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            Store.updateAllocation(focusedAcc.id, al.id, { amount: hardCeiling });
                                            showToast(`已補齊至 ${Store.formatMoney(hardCeiling, activeBalance.currency)}`);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-medium tabular-nums"
                                        >
                                          補齊至總額（➔ {Store.formatMoney(hardCeiling, activeBalance.currency)}）
                                        </button>
                                      ) : null}

                                      {al.amount > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            Store.updateAllocation(focusedAcc.id, al.id, { amount: 0 });
                                            showToast(`已將「${al.name}」歸零`);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/25"
                                        >
                                          {isCardSoftLocked && al.amount <= allocStats.deficit + 0.005 ? '全扣歸零' : '歸零'}
                                        </button>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        Store.deleteAllocation(focusedAcc.id, al.id);
                                        setEditingAllocId(null);
                                        showToast('已刪除份額');
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 flex items-center gap-1"
                                    >
                                      <Icon name="trash" size={13} /> 刪除
                                    </button>
                                  </div>
                                </div>
                              )}
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
                      const aOv = Store.getAccountOverflowInfo(a, state);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            if (aOv.hasOverflow && aOv.primaryOverflow) {
                              setSelectedBalMap((prev) => Object.assign({}, prev, { [a.id]: aOv.primaryOverflow.balanceId }));
                            }
                            setFocusedAccId(a.id);
                            setFlipped(false);
                          }}
                          className={`relative shrink-0 min-w-[144px] p-3 rounded-2xl border text-left active:scale-95 transition overflow-hidden ${
                            aOv.hasOverflow ? 'border-rose-400/70' : 'border-white/15'
                          }`}
                          style={{ background: th.bg }}
                        >
                          <div className="absolute inset-0 pointer-events-none" style={{ background: th.glow }} />
                          <div className="relative text-[12.5px] font-semibold text-white truncate flex items-center gap-1">
                            {aOv.hasOverflow && <Icon name="lock" size={11} className="text-rose-300 shrink-0" />}
                            <span className="truncate">{a.name}</span>
                          </div>
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

        {/* Sheet: Unified Draft Allocation Rebalance & Overflow Fix (獨立草稿調配頁) */}
        <BottomSheet
          open={rebalanceOpen && Boolean(focusedAcc && activeBalance)}
          title={allocStats.isSoftLocked ? '修正超額份額' : '虛擬份額調配'}
          subtitle={focusedAcc && activeBalance ? `${focusedAcc.name} · ${activeBalance.currency} 活期餘額 ${Store.formatMoney(activeBalance.amount, activeBalance.currency)}` : ''}
          maxHeight="90dvh"
          onClose={() => setRebalanceOpen(false)}
          footer={
            activeBalance ? (
              <button
                type="button"
                disabled={!rebalanceMetrics.isBalanced}
                onClick={handleCommitRebalance}
                className={`w-full py-3.5 rounded-2xl text-[15px] font-bold transition active:scale-[0.99] ${
                  rebalanceMetrics.isBalanced
                    ? 'bg-emerald-400 text-black'
                    : 'bg-white/10 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {rebalanceMetrics.isBalanced
                  ? (allocStats.isSoftLocked ? '確認修正並解除鎖定' : '儲存份額調配')
                  : `尚需調減 ${Store.formatMoney(rebalanceMetrics.deficit, activeBalance.currency)} 才可儲存`}
              </button>
            ) : null
          }
        >
          {focusedAcc && activeBalance && (
            <div className="space-y-4">
              {/* Live 3-Column Alignment Status Strip */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                rebalanceMetrics.isBalanced
                  ? 'bg-emerald-500/10 border-emerald-400/30'
                  : 'bg-rose-500/10 border-rose-400/35'
              }`}>
                <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
                  <div>
                    <div className="text-[10.5px] text-zinc-400">帳戶餘額</div>
                    <div className={`text-[13.5px] font-bold mt-0.5 ${activeBalance.amount < 0 ? 'text-rose-300' : 'text-white'}`}>
                      {Store.formatMoney(activeBalance.amount, activeBalance.currency)}
                    </div>
                  </div>
                  <div className="border-x border-white/[0.08]">
                    <div className="text-[10.5px] text-zinc-400">調整後總和</div>
                    <div className="text-[13.5px] font-bold text-white mt-0.5">
                      {Store.formatMoney(rebalanceMetrics.draftSum, activeBalance.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-zinc-400">
                      {rebalanceMetrics.isBalanced ? '剩餘自由額' : '尚需調減'}
                    </div>
                    <div className={`text-[13.5px] font-bold mt-0.5 ${
                      rebalanceMetrics.isBalanced ? 'text-emerald-300' : 'text-rose-300'
                    }`}>
                      {rebalanceMetrics.isBalanced
                        ? Store.formatMoney(rebalanceMetrics.free, activeBalance.currency)
                        : Store.formatMoney(rebalanceMetrics.deficit, activeBalance.currency)}
                    </div>
                  </div>
                </div>

                {activeBalance.amount < 0 && (
                  <div className="text-[11px] text-rose-200/90 text-center">
                    帳戶目前透支，請將所有份額歸零或刪除以解除鎖定。
                  </div>
                )}

                {/* Multi-Item Simultaneous Sync Controls */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center gap-2 flex-wrap">
                  {rebalanceMetrics.activeItems.length >= 2 && (
                    <button
                      type="button"
                      onClick={rebalanceRemainingProportional}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/[0.12] text-white text-[12px] font-semibold active:bg-white/20 whitespace-nowrap"
                    >
                      其餘按比例配平
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={zeroAllRebalance}
                    className="py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-400/25 text-amber-200 text-[12px] font-semibold active:bg-amber-500/25 whitespace-nowrap"
                  >
                    全部歸零
                  </button>
                  {rebalanceMetrics.hasChanges && (
                    <button
                      type="button"
                      onClick={restoreAllRebalance}
                      className="py-2 px-3 rounded-xl bg-white/[0.06] text-zinc-300 text-[12px] font-medium active:bg-white/15 whitespace-nowrap"
                    >
                      全部還原
                    </button>
                  )}
                </div>
              </div>

              {/* Per-Item Draft Cards with Dynamic Live Buttons & Before -> After Diff */}
              <div className="space-y-3">
                {rebalanceDraft.map((item) => {
                  const isChanged = !item.deleted && Math.abs(item.amount - item.origAmount) > 0.005;
                  const draftDeficit = rebalanceMetrics.deficit;
                  const draftFree = rebalanceMetrics.free;
                  const capTotal = rebalanceMetrics.capTotal;
                  const itemSliderMax = Math.max(100, Math.round(Math.max(item.origAmount, capTotal, item.amount)));
                  const itemSliderStep = itemSliderMax >= 1000 ? 100 : (itemSliderMax >= 100 ? 10 : 1);

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border space-y-2.5 transition ${
                        item.deleted
                          ? 'bg-rose-500/10 border-rose-400/25 opacity-75'
                          : isChanged
                          ? 'bg-[#1B1D24] border-emerald-400/35'
                          : 'bg-[#111116] border-white/[0.09]'
                      }`}
                    >
                      {/* Header Row: Color Dot + Name + Pin Toggle / Delete / Restore */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                          <span className={`text-[14.5px] font-semibold truncate ${item.deleted ? 'line-through text-zinc-400' : 'text-white'}`}>
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.deleted ? (
                            <button
                              type="button"
                              onClick={() => restoreRebalanceItem(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-white/15 text-white text-[11.5px] font-semibold"
                            >
                              還原
                            </button>
                          ) : (
                            <>
                              {rebalanceMetrics.activeItems.length >= 2 && (
                                <button
                                  type="button"
                                  onClick={() => updateRebalanceItem(item.id, { pinned: !item.pinned })}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
                                    item.pinned
                                      ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                                      : 'bg-white/[0.05] border-white/10 text-zinc-400'
                                  }`}
                                >
                                  {item.pinned ? '已固定' : '自動跟隨'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => updateRebalanceItem(item.id, { deleted: true, pinned: false })}
                                className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400"
                                title="刪除份額"
                              >
                                <Icon name="trash" size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Before -> After Diff Preview */}
                      <div className="flex items-center justify-between gap-2 text-[12.5px] tabular-nums">
                        {item.deleted ? (
                          <div className="text-rose-300">
                            <span className="line-through text-zinc-500 mr-1.5">{Store.formatMoney(item.origAmount, activeBalance.currency)}</span>
                            ➔ 將刪除（釋放 {Store.formatMoney(item.origAmount, activeBalance.currency)}）
                          </div>
                        ) : isChanged ? (
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-zinc-500 line-through">{Store.formatMoney(item.origAmount, activeBalance.currency)}</span>
                              <span className="text-amber-400 font-bold">➔</span>
                              <span className="text-emerald-300 font-bold text-[14px]">{Store.formatMoney(item.amount, activeBalance.currency)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => restoreRebalanceItem(item.id)}
                              className="text-[11px] text-zinc-400 underline underline-offset-2 shrink-0"
                            >
                              還原
                            </button>
                          </div>
                        ) : (
                          <div className="text-zinc-300 font-semibold">
                            目前 {Store.formatMoney(item.amount, activeBalance.currency)}
                          </div>
                        )}
                      </div>

                      {/* Draft Controls: Calculator + Slider + Dynamic Context-Aware Action Buttons */}
                      {!item.deleted && (
                        <div className="space-y-2.5 pt-0.5" data-no-swipe="true">
                          <NumericInput
                            size="sm"
                            value={item.amount}
                            currency={activeBalance.currency}
                            label={`調配「${item.name}」金額`}
                            quickAdds={[1000, 5000, 10000]}
                            onChange={(val) => updateRebalanceItem(item.id, { amount: Math.max(0, Store.round2(val)), pinned: true })}
                          />

                          <input
                            type="range"
                            min={0}
                            max={itemSliderMax}
                            step={itemSliderStep}
                            value={Math.min(item.amount, itemSliderMax)}
                            onChange={(e) => updateRebalanceItem(item.id, { amount: Math.max(0, Number(e.target.value)), pinned: true })}
                            className="w-full accent-white h-2 bg-white/10 rounded-lg cursor-pointer"
                          />

                          <div className="flex items-center gap-1.5 flex-wrap text-[11.5px]">
                            {draftDeficit > 0.005 ? (
                              item.amount > draftDeficit + 0.005 ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateRebalanceItem(item.id, {
                                      amount: Store.round2(item.amount - draftDeficit),
                                      pinned: true
                                    })}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-400 text-black font-bold tabular-nums active:scale-95 transition"
                                  >
                                    扣至符合（➔ {Store.formatMoney(Store.round2(item.amount - draftDeficit), activeBalance.currency)}）
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateRebalanceItem(item.id, { amount: 0, pinned: true })}
                                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 font-semibold active:scale-95 transition"
                                  >
                                    歸零
                                  </button>
                                </>
                              ) : item.amount > 0.005 ? (
                                <button
                                  type="button"
                                  onClick={() => updateRebalanceItem(item.id, { amount: 0, pinned: true })}
                                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-bold tabular-nums active:scale-95 transition"
                                >
                                  全扣歸零（抵消 {Store.formatMoney(item.amount, activeBalance.currency)}）
                                </button>
                              ) : (
                                <span className="text-[11px] text-zinc-500">已歸零</span>
                              )
                            ) : draftFree > 0.005 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => updateRebalanceItem(item.id, {
                                    amount: Store.round2(item.amount + draftFree),
                                    pinned: true
                                  })}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/35 text-emerald-200 font-semibold tabular-nums active:scale-95 transition"
                                >
                                  補齊至總額（➔ {Store.formatMoney(Store.round2(item.amount + draftFree), activeBalance.currency)}）
                                </button>
                                {item.amount > 0.005 && (
                                  <button
                                    type="button"
                                    onClick={() => updateRebalanceItem(item.id, { amount: 0, pinned: true })}
                                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.08] text-zinc-300 font-medium"
                                  >
                                    歸零
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-semibold">
                                  ✓ 總額已對齊
                                </span>
                                {item.amount > 0.005 && (
                                  <button
                                    type="button"
                                    onClick={() => updateRebalanceItem(item.id, { amount: 0, pinned: true })}
                                    className="px-2.5 py-1 rounded-lg bg-white/[0.08] text-zinc-300 font-medium"
                                  >
                                    歸零
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </BottomSheet>

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
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">歸屬資金池</label>
              <select
                value={addCurDraft.poolId}
                onChange={(e) => setAddCurDraft((p) => Object.assign({}, p, { poolId: e.target.value }))}
                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              >
                {state.pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
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

        {/* Sheet: Add Virtual Allocation (Strict Anti-Overdraft Capped to Free Balance) */}
        <BottomSheet
          open={addAllocOpen && Boolean(focusedAcc && activeBalance)}
          title="新增虛擬份額"
          subtitle={activeBalance ? `可分配自由餘額：${Store.formatMoney(freeAmount, activeBalance.currency)}` : ''}
          onClose={() => setAddAllocOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => {
                if (!allocDraft.name.trim()) {
                  showToast('請輸入份額名稱');
                  return;
                }
                const safeAmt = Math.max(0, Math.min(Number(allocDraft.amount || 0), freeAmount));
                Store.addAllocation(focusedAcc.id, activeBalance.currency, {
                  name: allocDraft.name,
                  amount: safeAmt,
                  locked: false
                });
                setAddAllocOpen(false);
                showToast('已新增虛擬份額');
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
                placeholder="例如：供樓份額、應急底倉、旅行基金"
                value={allocDraft.name}
                onChange={(e) => setAllocDraft((p) => Object.assign({}, p, { name: e.target.value }))}
                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] text-zinc-400">分配金額（上限 {activeBalance ? Store.formatMoney(freeAmount, activeBalance.currency) : ''}）</label>
                {activeBalance && freeAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAllocDraft((p) => Object.assign({}, p, { amount: freeAmount }))}
                    className="text-[11.5px] font-semibold text-emerald-300 tabular-nums"
                  >
                    帶入全部自由額
                  </button>
                )}
              </div>
              <NumericInput
                value={allocDraft.amount}
                currency={activeBalance ? activeBalance.currency : state.meta.baseCurrency}
                label={`份額金額（上限 ${activeBalance ? Store.formatMoney(freeAmount, activeBalance.currency) : ''}）`}
                quickAdds={[1000, 5000, 10000]}
                onChange={(val) => {
                  const clamped = Math.max(0, Math.min(val, freeAmount));
                  if (val > freeAmount + 0.005) {
                    showToast(`已封頂於目前自由餘額 ${Store.formatMoney(freeAmount, activeBalance.currency)}`);
                  }
                  setAllocDraft((p) => Object.assign({}, p, { amount: clamped }));
                }}
              />
            </div>

            {freeAmount > 0 ? (
              <div data-no-swipe="true">
                <input
                  type="range"
                  min={0}
                  max={freeAmount}
                  step={freeAmount >= 1000 ? 100 : (freeAmount >= 100 ? 10 : 1)}
                  value={Math.min(Number(allocDraft.amount || 0), freeAmount)}
                  onChange={(e) => setAllocDraft((p) => Object.assign({}, p, { amount: Number(e.target.value) }))}
                  className="w-full accent-white h-2 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2 text-[12px] text-zinc-400">
                <div>目前自由餘額為 0，可直接建立 0 元份額佔位，或先由現有份額調配騰出空間。</div>
                {activeAllocations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddAllocOpen(false);
                      openRebalanceSheet();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-[12px] font-semibold"
                  >
                    前往份額調配頁 ›
                  </button>
                )}
              </div>
            )}
          </div>
        </BottomSheet>
      </div>
    );
  }

  window.WealthWallet = { WalletView };
})();
