(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;

  function CreditCardsView({ state, showToast }) {
    const { Icon, BottomSheet, NumericInput, SegmentedControl } = window.WealthUI;
    const Store = window.WealthStore;

    const [focusedCardId, setFocusedCardId] = useState(null);
    const [flipped, setFlipped] = useState(false);
    const [bucketFilter, setBucketFilter] = useState('ALL'); // ALL | BILLED | UNBILLED

    // Global cross-card settlement overview sheet
    const [globalSettleOpen, setGlobalSettleOpen] = useState(false);
    const [globalSettleBucket, setGlobalSettleBucket] = useState('ALL');

    // Add Card Sheet
    const [addCardOpen, setAddCardOpen] = useState(false);
    const [newCard, setNewCard] = useState({
      name: '',
      last4: '',
      currency: state.meta.baseCurrency,
      creditLimit: 50000,
      statementDay: 15,
      dueDay: 5,
      billed: 0,
      unbilled: 0,
      theme: 'titanium',
      autoPayKey: '',
      note: ''
    });

    // Edit Card Back Draft
    const [editDraft, setEditDraft] = useState({
      name: '',
      last4: '',
      currency: state.meta.baseCurrency,
      creditLimit: 50000,
      statementDay: 15,
      dueDay: 5,
      billed: 0,
      unbilled: 0,
      theme: 'titanium',
      autoPayKey: '',
      note: ''
    });

    // Pay Bill Sheet (Dual Mode: SINGLE | SPLIT)
    const [payOpen, setPayOpen] = useState(false);
    const [payMode, setPayMode] = useState('SINGLE'); // SINGLE | SPLIT
    const [singlePayKey, setSinglePayKey] = useState('');
    const [singlePayAmount, setSinglePayAmount] = useState(0);
    const [singlePayTarget, setSinglePayTarget] = useState('BILLED_FIRST');
    const [splitRows, setSplitRows] = useState([]);

    // All bank/ewallet balances available for card repayment
    const bankOptions = useMemo(() => {
      const list = [];
      (state.accounts || []).forEach((a) => {
        (a.balances || []).forEach((b) => {
          list.push({
            key: `${a.id}::${b.id}`,
            accountId: a.id,
            balanceId: b.id,
            currency: b.currency,
            amount: b.amount,
            isDefault: Boolean(b.isDefaultPayment),
            label: a.balances.length > 1
              ? `${a.name} (${b.currency}) · ${Store.formatMoney(b.amount, b.currency)}`
              : `${a.name} · ${Store.formatMoney(b.amount, b.currency)}`,
            shortLabel: a.balances.length > 1 ? `${a.name} (${b.currency})` : a.name
          });
        });
      });
      return list;
    }, [state.accounts]);

    const defaultBankKey = useMemo(() => {
      const def = bankOptions.find((b) => b.isDefault);
      return def ? def.key : (bankOptions[0] ? bankOptions[0].key : '');
    }, [bankOptions]);

    // Totals across all cards in base currency
    const cardTotals = useMemo(() => {
      let totalBilled = 0;
      let totalUnbilled = 0;
      (state.cards || []).forEach((c) => {
        totalBilled += Store.convertToBase(c.billed || 0, c.currency, state);
        totalUnbilled += Store.convertToBase(c.unbilled || 0, c.currency, state);
      });
      return {
        billed: Store.round2(totalBilled),
        unbilled: Store.round2(totalUnbilled),
        total: Store.round2(totalBilled + totalUnbilled)
      };
    }, [state]);

    const focusedCard = useMemo(() => {
      if (!focusedCardId) return null;
      return (state.cards || []).find((c) => c.id === focusedCardId) || null;
    }, [state.cards, focusedCardId]);

    useEffect(() => {
      if (focusedCard) {
        const autoKey = focusedCard.autoPayAccountId
          ? (bankOptions.find((b) =>
              b.accountId === focusedCard.autoPayAccountId &&
              (!focusedCard.autoPayBalanceId || b.balanceId === focusedCard.autoPayBalanceId)
            )?.key || defaultBankKey)
          : defaultBankKey;
        setEditDraft({
          name: focusedCard.name || '',
          last4: focusedCard.last4 || '',
          currency: focusedCard.currency || state.meta.baseCurrency,
          creditLimit: focusedCard.creditLimit || 50000,
          statementDay: focusedCard.statementDay || 15,
          dueDay: focusedCard.dueDay || 5,
          billed: focusedCard.billed || 0,
          unbilled: focusedCard.unbilled || 0,
          theme: focusedCard.theme || 'titanium',
          autoPayKey: autoKey,
          note: focusedCard.note || ''
        });
      } else {
        setFlipped(false);
      }
    }, [focusedCard, bankOptions, defaultBankKey]);

    const focusedBreakdown = useMemo(() => {
      if (!focusedCard) return { targetTotal: 0, pools: [], byBank: [] };
      return Store.getCardPoolBreakdown(focusedCard.id, bucketFilter, state);
    }, [focusedCard, bucketFilter, state]);

    const globalSummary = useMemo(() => {
      if (!globalSettleOpen) return { grandBase: 0, banks: [] };
      return Store.getAllCardsSettlementSummary(globalSettleBucket, state);
    }, [globalSettleOpen, globalSettleBucket, state]);

    const cardTransactions = useMemo(() => {
      if (!focusedCard) return [];
      return (state.transactions || [])
        .filter((tx) => {
          const isCharge = tx.accountKind === 'CARD' && tx.accountId === focusedCard.id;
          const isPayment = tx.toAccountKind === 'CARD' && tx.toAccountId === focusedCard.id;
          if (!isCharge && !isPayment) return false;
          if (isCharge && bucketFilter !== 'ALL') {
            const b = tx.billingBucket || 'UNBILLED';
            if (b !== bucketFilter) return false;
          }
          return true;
        })
        .slice(0, 30);
    }, [focusedCard, state.transactions, bucketFilter]);

    const getThemeObj = (id) => Store.CARD_THEMES.find((t) => t.id === id) || Store.CARD_THEMES[1];
    const getPoolObj = (pid) => (pid ? state.pools.find((p) => p.id === pid) : null);

    const openAddCard = () => {
      setNewCard({
        name: '',
        last4: '',
        currency: state.meta.baseCurrency,
        creditLimit: 50000,
        statementDay: 15,
        dueDay: 5,
        billed: 0,
        unbilled: 0,
        theme: Store.CARD_THEMES[(state.cards.length + 1) % Store.CARD_THEMES.length].id,
        autoPayKey: defaultBankKey,
        note: ''
      });
      setAddCardOpen(true);
    };

    const handleCreateCard = () => {
      if (!newCard.name.trim()) {
        showToast('請輸入信用卡名稱');
        return;
      }
      const [autoPayAccountId, autoPayBalanceId] = newCard.autoPayKey ? newCard.autoPayKey.split('::') : [null, null];
      const created = Store.addCard({
        name: newCard.name,
        last4: newCard.last4,
        currency: newCard.currency,
        creditLimit: newCard.creditLimit,
        statementDay: newCard.statementDay,
        dueDay: newCard.dueDay,
        billed: newCard.billed,
        unbilled: newCard.unbilled,
        theme: newCard.theme,
        autoPayAccountId,
        autoPayBalanceId,
        note: newCard.note
      });
      setAddCardOpen(false);
      setFocusedCardId(created.id);
      showToast(`已新增信用卡「${created.name}」`);
    };

    const handleSaveEditCard = () => {
      if (!focusedCard) return;
      const [autoPayAccountId, autoPayBalanceId] = editDraft.autoPayKey ? editDraft.autoPayKey.split('::') : [null, null];
      Store.updateCard(focusedCard.id, {
        name: editDraft.name,
        last4: editDraft.last4,
        currency: editDraft.currency,
        creditLimit: editDraft.creditLimit,
        statementDay: editDraft.statementDay,
        dueDay: editDraft.dueDay,
        billed: editDraft.billed,
        unbilled: editDraft.unbilled,
        theme: editDraft.theme,
        autoPayAccountId,
        autoPayBalanceId,
        note: editDraft.note
      });
      setFlipped(false);
      showToast('信用卡設定已儲存');
    };

    const openPayBillSheet = (preferredMode) => {
      if (!focusedCard) return;
      const totalDue = Store.round2((focusedCard.billed || 0) + (focusedCard.unbilled || 0));
      if (bankOptions.length === 0) {
        showToast('請先於「銀包」建立扣款銀行帳戶');
        return;
      }

      const defaultPayKey = focusedCard.autoPayAccountId
        ? (bankOptions.find((b) =>
            b.accountId === focusedCard.autoPayAccountId &&
            (!focusedCard.autoPayBalanceId || b.balanceId === focusedCard.autoPayBalanceId)
          )?.key || defaultBankKey)
        : defaultBankKey;

      const defaultAmt = (focusedCard.billed || 0) > 0 ? focusedCard.billed : totalDue;
      setSinglePayKey(defaultPayKey);
      setSinglePayAmount(defaultAmt);
      setSinglePayTarget((focusedCard.billed || 0) > 0 ? 'BILLED_FIRST' : 'UNBILLED_FIRST');

      // Build cross-pool split rows based on current breakdown (or ALL if current bucket is 0)
      const bd = focusedBreakdown.targetTotal > 0
        ? focusedBreakdown
        : Store.getCardPoolBreakdown(focusedCard.id, 'ALL', state);

      const rows = bd.byBank.map((b, i) => ({
        id: `row_${i}`,
        checked: true,
        bankKey: (b.accountId && b.balanceId) ? `${b.accountId}::${b.balanceId}` : defaultPayKey,
        amount: b.amount,
        poolLabels: b.pools.map((p) => p.name).join('、')
      }));

      setSplitRows(rows);
      setPayMode(preferredMode === 'SPLIT' && rows.length > 0 ? 'SPLIT' : 'SINGLE');
      setPayOpen(true);
    };

    const handleConfirmPayment = () => {
      if (!focusedCard) return;
      if (payMode === 'SINGLE') {
        if (!singlePayKey) {
          showToast('請選擇扣款銀行戶口');
          return;
        }
        if (Number(singlePayAmount) <= 0) {
          showToast('找數金額須大於 0');
          return;
        }
        const [accId, balId] = singlePayKey.split('::');
        const cnt = Store.payCardBill(
          focusedCard.id,
          [{ fromAccountId: accId, fromBalanceId: balId, amount: Number(singlePayAmount) }],
          singlePayTarget
        );
        if (cnt > 0) {
          setPayOpen(false);
          showToast(`已完成找數 ${Store.formatMoney(singlePayAmount, focusedCard.currency)}`);
        }
      } else {
        const activeRows = splitRows.filter((r) => r.checked && Number(r.amount) > 0 && r.bankKey);
        if (!activeRows.length) {
          showToast('請至少勾選一筆大於 0 的找數項目');
          return;
        }
        const payments = activeRows.map((r) => {
          const [accId, balId] = r.bankKey.split('::');
          return {
            fromAccountId: accId,
            fromBalanceId: balId,
            amount: Number(r.amount),
            note: r.poolLabels ? `跨池找數（${r.poolLabels}）` : '跨池找數還款'
          };
        });
        const target = bucketFilter === 'UNBILLED' ? 'UNBILLED_FIRST' : 'BILLED_FIRST';
        const cnt = Store.payCardBill(focusedCard.id, payments, target);
        if (cnt > 0) {
          setPayOpen(false);
          showToast(`已完成跨池拆單找數（共 ${cnt} 筆轉帳）`);
        }
      }
    };

    const focusedCycle = focusedCard ? Store.getCreditCardCycle(focusedCard) : null;
    const focusedTotal = focusedCard ? Store.round2((focusedCard.billed || 0) + (focusedCard.unbilled || 0)) : 0;
    const focusedRatio = focusedCard && focusedCard.creditLimit > 0
      ? Math.min(100, Math.round((focusedTotal / focusedCard.creditLimit) * 100))
      : 0;

    return (
      <div className="space-y-4 pb-6">
        {/* Top Summary Card (2-Tier Full-Width Hierarchy — Zero Truncation) */}
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] text-zinc-400">信用卡總待繳額</span>
              <span className="text-[10.5px] text-zinc-500 tabular-nums">共 {state.cards.length} 張卡片</span>
            </div>
            <div className="text-[28px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
              {Store.formatMoney(cardTotals.total, state.meta.baseCurrency)}
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/[0.06] grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-zinc-500">本期已出帳應繳</div>
              <div className={`text-[14.5px] font-semibold tabular-nums mt-0.5 whitespace-nowrap ${
                cardTotals.billed > 0 ? 'text-amber-300' : 'text-zinc-400'
              }`}>
                {Store.formatMoney(cardTotals.billed, state.meta.baseCurrency)}
              </div>
            </div>
            <div className="min-w-0 text-right">
              <div className="text-[11px] text-zinc-500">未出帳下期累積</div>
              <div className="text-[14.5px] font-semibold text-sky-300 tabular-nums mt-0.5 whitespace-nowrap">
                {Store.formatMoney(cardTotals.unbilled, state.meta.baseCurrency)}
              </div>
            </div>
          </div>
        </div>

        {/* Mode A: Apple Wallet Stacked Credit Card Deck */}
        {!focusedCard && (
          <div className="space-y-4">
            {/* Cross-Card Multi-Pool Settlement Summary Trigger */}
            {cardTotals.total > 0 && (
              <button
                type="button"
                onClick={() => { setGlobalSettleBucket('ALL'); setGlobalSettleOpen(true); }}
                className="w-full px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-between gap-2 text-left active:bg-emerald-500/20 transition"
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-emerald-300">各銀行戶口交叉找數總覽</div>
                  <div className="text-[11px] text-emerald-200/70 mt-0.5 truncate">
                    依歸屬資金池彙總全部信用卡應撥付金額
                  </div>
                </div>
                <Icon name="chevronRight" size={16} className="text-emerald-300 shrink-0" />
              </button>
            )}

            {state.cards.length === 0 ? (
              <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-8 text-center text-[13px] text-zinc-500">
                尚未建立任何信用卡，點擊下方新增你的第一張卡。
              </div>
            ) : (
              <div className="relative pt-1">
                {state.cards.map((card, idx) => {
                  const cycle = Store.getCreditCardCycle(card);
                  const spent = Store.round2((card.billed || 0) + (card.unbilled || 0));
                  const ratio = card.creditLimit > 0 ? Math.min(100, Math.round((spent / card.creditLimit) * 100)) : 0;
                  const theme = getThemeObj(card.theme);
                  const isLast = idx === state.cards.length - 1;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => { setFocusedCardId(card.id); setFlipped(false); setBucketFilter('ALL'); }}
                      style={{
                        background: theme.bg,
                        zIndex: idx + 1
                      }}
                      className={`relative block w-full rounded-[22px] border border-white/15 shadow-[0_-10px_28px_rgba(0,0,0,0.55)] text-left transition-transform active:scale-[0.985] overflow-hidden ${
                        idx > 0 ? '-mt-12' : ''
                      } ${isLast ? 'p-5 min-h-[166px]' : 'px-5 pt-4 pb-16 min-h-[140px]'}`}
                    >
                      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: theme.accent }} />
                            <span className="text-[16px] font-bold text-white truncate">{card.name}</span>
                          </div>
                          <div className="text-[11.5px] text-white/65 truncate mt-0.5 pl-[18px] tabular-nums">
                            {card.last4 ? `•••• ${card.last4}` : '信用卡'} · 每月{card.statementDay}日截 · {cycle.daysToDue}天後到期
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[17px] font-bold text-white tabular-nums tracking-tight whitespace-nowrap">
                            {Store.formatMoney(spent, card.currency)}
                          </div>
                          <div className="text-[10.5px] mt-0.5 whitespace-nowrap tabular-nums">
                            {(card.billed || 0) > 0
                              ? <span className="text-amber-300 font-medium">已出帳 {Store.formatMoney(card.billed, card.currency)}</span>
                              : <span className="text-white/60">未出帳 {ratio}%</span>}
                          </div>
                        </div>
                      </div>

                      {isLast && (
                        <div className="mt-6 space-y-2.5">
                          <div className="h-1.5 rounded-full bg-black/35 overflow-hidden">
                            <div className="h-full bg-white/85 rounded-full" style={{ width: `${ratio}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-white/65 tabular-nums">
                            <span>額度 {Store.formatMoney(card.creditLimit, card.currency)} ({ratio}%)</span>
                            <span>點擊展開與找數 ›</span>
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
              onClick={openAddCard}
              className="w-full py-3.5 rounded-2xl border border-dashed border-white/15 text-[13.5px] font-medium text-zinc-300 flex items-center justify-center gap-1.5 active:bg-white/[0.04]"
            >
              <Icon name="plus" size={16} /> 新增信用卡
            </button>
          </div>
        )}

        {/* Mode B: Focused Credit Card Detail + Cross-Pool Settlement */}
        {focusedCard && focusedCycle && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setFocusedCardId(null)}
                className="inline-flex items-center gap-1 text-[13.5px] text-zinc-400 active:text-white"
              >
                <Icon name="chevronLeft" size={16} /> 全部信用卡
              </button>
              <button
                type="button"
                onClick={() => setFlipped(!flipped)}
                className="px-3 py-1.5 rounded-full bg-white/[0.08] text-[12px] text-zinc-200 active:bg-white/15"
              >
                {flipped ? '返回正面' : '卡片設定'}
              </button>
            </div>

            {/* Card Front or Back */}
            {!flipped ? (
              <div
                className="rounded-[22px] p-5 border border-white/15 shadow-2xl relative overflow-hidden space-y-4"
                style={{ background: getThemeObj(focusedCard.theme).bg }}
              >
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[18px] font-bold text-white truncate">{focusedCard.name}</div>
                    <div className="text-[12px] text-white/65 mt-0.5 tabular-nums">
                      {focusedCard.last4 ? `•••• ${focusedCard.last4} · ` : ''}截數期 {focusedCycle.periodLabel}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-black/35 border border-white/15 text-[11px] font-semibold text-amber-300 whitespace-nowrap shrink-0">
                    {focusedCycle.daysToDue} 天後到期 ({focusedCycle.dueLabel})
                  </span>
                </div>

                <div>
                  <div className="text-[11px] text-white/60 mb-1">總累積待繳 ({focusedCard.currency})</div>
                  <div className="text-[30px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
                    {Store.formatMoney(focusedTotal, focusedCard.currency)}
                  </div>
                </div>

                {/* Billed vs Unbilled Breakdown Pills */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-[10.5px] text-white/60">本期已出帳應繳</div>
                    <div className="text-[14px] font-bold text-amber-300 tabular-nums mt-0.5">
                      {Store.formatMoney(focusedCard.billed || 0, focusedCard.currency)}
                    </div>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-[10.5px] text-white/60">未出帳下期累積</div>
                    <div className="text-[14px] font-bold text-sky-300 tabular-nums mt-0.5">
                      {Store.formatMoney(focusedCard.unbilled || 0, focusedCard.currency)}
                    </div>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-black/35 overflow-hidden">
                    <div className="h-full bg-white/90 rounded-full" style={{ width: `${focusedRatio}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-white/60 tabular-nums">
                    <span>已用額度 {focusedRatio}%</span>
                    <span>可用 {Store.formatMoney(Math.max(0, Store.round2((focusedCard.creditLimit || 0) - focusedTotal)), focusedCard.currency)}</span>
                  </div>
                </div>

                {focusedCard.note && (
                  <div className="text-[11.5px] text-white/75 bg-black/25 px-3 py-1.5 rounded-xl">
                    備註：{focusedCard.note}
                  </div>
                )}

                {/* Card Primary Actions */}
                <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPayBillSheet('SINGLE')}
                    disabled={focusedTotal <= 0}
                    className="flex-1 py-2.5 rounded-xl bg-white text-black text-[13.5px] font-bold active:scale-[0.98] transition disabled:opacity-40"
                  >
                    一鍵找數還款
                  </button>
                  {(focusedCard.unbilled || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`確定將「${focusedCard.name}」的未出帳金額 ${Store.formatMoney(focusedCard.unbilled, focusedCard.currency)} 結轉為本期已出帳？`)) {
                          const moved = Store.closeCardStatement(focusedCard.id);
                          if (moved > 0) showToast(`已結單出帳 ${Store.formatMoney(moved, focusedCard.currency)}`);
                        }
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-black/35 border border-white/20 text-white text-[12.5px] font-semibold active:bg-black/50 whitespace-nowrap"
                    >
                      截單出帳
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Card Back: Complete Settings & Balance Calibration */
              <div className="rounded-[22px] p-4 bg-[#141417] border border-white/15 space-y-3.5">
                <div className="text-[15px] font-semibold text-white">編輯信用卡與帳額校準</div>

                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-8">
                    <label className="text-[11px] text-zinc-400 block mb-1">卡片名稱</label>
                    <input
                      type="text"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft((p) => Object.assign({}, p, { name: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-[11px] text-zinc-400 block mb-1">尾號 4 碼</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="8821"
                      value={editDraft.last4}
                      onChange={(e) => setEditDraft((p) => Object.assign({}, p, { last4: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white tabular-nums outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">結算幣種</label>
                    <select
                      value={editDraft.currency}
                      onChange={(e) => setEditDraft((p) => Object.assign({}, p, { currency: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                    >
                      {Store.CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">信用額度</label>
                    <NumericInput
                      size="sm"
                      value={editDraft.creditLimit}
                      currency={editDraft.currency}
                      label="設定信用額度"
                      quickAdds={[10000, 20000, 50000]}
                      onChange={(val) => setEditDraft((p) => Object.assign({}, p, { creditLimit: val }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">每月截數日 (1–28)</label>
                    <select
                      value={editDraft.statementDay}
                      onChange={(e) => setEditDraft((p) => Object.assign({}, p, { statementDay: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>每月 {d} 日截數</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">每月還款到期日 (1–28)</label>
                    <select
                      value={editDraft.dueDay}
                      onChange={(e) => setEditDraft((p) => Object.assign({}, p, { dueDay: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>每月 {d} 日到期</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-amber-300 block mb-1">校準：本期已出帳</label>
                    <NumericInput
                      size="sm"
                      value={editDraft.billed}
                      currency={editDraft.currency}
                      label="校準本期已出帳金額"
                      onChange={(val) => setEditDraft((p) => Object.assign({}, p, { billed: val }))}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-sky-300 block mb-1">校準：未出帳下期</label>
                    <NumericInput
                      size="sm"
                      value={editDraft.unbilled}
                      currency={editDraft.currency}
                      label="校準未出帳下期金額"
                      onChange={(val) => setEditDraft((p) => Object.assign({}, p, { unbilled: val }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">預設找數銀行戶口（未分類餘額歸屬）</label>
                  <select
                    value={editDraft.autoPayKey}
                    onChange={(e) => setEditDraft((p) => Object.assign({}, p, { autoPayKey: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                  >
                    <option value="">自動採用預設找數戶口</option>
                    {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">回贈／用途備註</label>
                  <input
                    type="text"
                    placeholder="例如：餐飲 4%、海外免手續費"
                    value={editDraft.note}
                    onChange={(e) => setEditDraft((p) => Object.assign({}, p, { note: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1.5">卡面質感</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Store.CARD_THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditDraft((p) => Object.assign({}, p, { theme: t.id }))}
                        className={`py-2 rounded-xl text-[11px] font-medium border transition ${
                          editDraft.theme === t.id ? 'border-white text-white' : 'border-white/10 text-zinc-300'
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
                    onClick={handleSaveEditCard}
                    className="flex-1 py-3 rounded-xl bg-white text-black text-[13.5px] font-bold"
                  >
                    儲存卡片設定
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`確定刪除信用卡「${focusedCard.name}」？`)) {
                        Store.deleteCard(focusedCard.id);
                        setFocusedCardId(null);
                        showToast('已刪除信用卡');
                      }
                    }}
                    className="px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[13.5px] font-medium"
                  >
                    刪除
                  </button>
                </div>
              </div>
            )}

            {/* Cross-Pool Settlement Breakdown Panel */}
            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[14.5px] font-semibold text-white">跨資金池自動分攤找數</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">依每筆簽帳的歸屬資金池自動計算各銀行應付</div>
                </div>
              </div>

              <SegmentedControl
                value={bucketFilter}
                onChange={setBucketFilter}
                options={[
                  { value: 'ALL', label: '全部待繳' },
                  { value: 'BILLED', label: '本期已出帳' },
                  { value: 'UNBILLED', label: '未出帳下期' }
                ]}
              />

              {focusedBreakdown.targetTotal <= 0 ? (
                <div className="py-5 text-center text-[12.5px] text-zinc-500">
                  此帳期目前無待繳金額。
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Per-Pool Breakdown */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-zinc-400">資金池歸屬明細</div>
                    {focusedBreakdown.pools.map((p) => (
                      <div key={p.poolId} className="px-3 py-2.5 rounded-xl bg-black/45 border border-white/[0.06] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                            <span className="text-[13px] font-semibold text-white truncate">{p.poolName}</span>
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5 pl-4 truncate">
                            找數戶口：{p.bank ? p.bank.label : '未綁定'}
                          </div>
                        </div>
                        <span className="text-[13.5px] font-bold text-white tabular-nums whitespace-nowrap shrink-0">
                          {Store.formatMoney(p.amount, focusedCard.currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Grouped By Settlement Bank Account */}
                  <div className="pt-2.5 border-t border-white/[0.06] space-y-2">
                    <div className="text-[11px] font-medium text-emerald-300">各銀行戶口應撥付彙總</div>
                    {focusedBreakdown.byBank.map((b) => (
                      <div key={b.key} className="px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-bold text-white truncate">{b.label}</div>
                          <div className="text-[11px] text-emerald-200/75 truncate mt-0.5">
                            涵蓋：{b.pools.map((x) => x.name).join('、')}
                          </div>
                        </div>
                        <span className="text-[14.5px] font-bold text-emerald-300 tabular-nums whitespace-nowrap shrink-0">
                          {Store.formatMoney(b.amount, focusedCard.currency)}
                        </span>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => openPayBillSheet('SPLIT')}
                      className="w-full py-3 rounded-xl bg-emerald-400 text-black text-[13.5px] font-bold active:scale-[0.99] transition"
                    >
                      依資金池一鍵拆單找數 ({Store.formatMoney(focusedBreakdown.targetTotal, focusedCard.currency)})
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card Recent Transactions */}
            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[13.5px] font-semibold text-white">本卡近期交易</span>
                <span className="text-[11px] text-zinc-500 tabular-nums">{cardTransactions.length} 筆</span>
              </div>
              {cardTransactions.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-zinc-500">
                  尚無對應交易紀錄
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {cardTransactions.map((tx) => {
                    const isPayment = tx.toAccountKind === 'CARD' && tx.toAccountId === focusedCard.id;
                    const isRefund = !isPayment && tx.type === 'INCOME';
                    const pool = !isPayment ? getPoolObj(tx.poolId) : null;
                    return (
                      <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13.5px] font-semibold text-white truncate">{tx.title}</span>
                            {isPayment ? (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-500/15 text-emerald-300 shrink-0">找數</span>
                            ) : (
                              <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold shrink-0 ${
                                tx.billingBucket === 'BILLED' ? 'bg-amber-500/15 text-amber-300' : 'bg-sky-500/15 text-sky-300'
                              }`}>
                                {tx.billingBucket === 'BILLED' ? '本期' : '下期'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5 truncate">
                            <span>{tx.date}</span>
                            {pool && (
                              <span className="inline-flex items-center gap-1">
                                · <span className="w-1.5 h-1.5 rounded-full" style={{ background: pool.color }} />
                                {pool.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`text-[13.5px] font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                          isPayment || isRefund ? 'text-emerald-400' : 'text-white'
                        }`}>
                          {isPayment || isRefund
                            ? Store.formatMoney(tx.settledAmount != null ? tx.settledAmount : tx.amount, focusedCard.currency, { showPlus: true })
                            : Store.formatMoney(-(tx.settledAmount != null ? tx.settledAmount : tx.amount), focusedCard.currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Quick Switcher Dock */}
            {state.cards.length > 1 && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-zinc-500 px-1">快速切換其他信用卡</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-no-swipe="true">
                  {state.cards.filter((c) => c.id !== focusedCard.id).map((c) => {
                    const th = getThemeObj(c.theme);
                    const amt = Store.round2((c.billed || 0) + (c.unbilled || 0));
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setFocusedCardId(c.id); setFlipped(false); setBucketFilter('ALL'); }}
                        className="shrink-0 min-w-[146px] p-3 rounded-2xl border border-white/10 text-left active:scale-95 transition"
                        style={{ background: th.bg }}
                      >
                        <div className="text-[12.5px] font-semibold text-white truncate">{c.name}</div>
                        <div className="text-[11px] text-white/65 tabular-nums mt-1">
                          待繳 {Store.formatMoney(amt, c.currency)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sheet 1: Add New Credit Card */}
        <BottomSheet
          open={addCardOpen}
          title="新增信用卡"
          subtitle="設定截數日、到期日與預設找數戶口"
          onClose={() => setAddCardOpen(false)}
          footer={
            <button
              type="button"
              onClick={handleCreateCard}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold active:scale-[0.99] transition"
            >
              建立信用卡
            </button>
          }
        >
          <div className="space-y-3.5">
            <div className="grid grid-cols-12 gap-2.5">
              <div className="col-span-8">
                <label className="text-[12px] text-zinc-400 block mb-1">卡片名稱</label>
                <input
                  type="text"
                  placeholder="例如：大灣區雙幣卡、車主卡"
                  value={newCard.name}
                  onChange={(e) => setNewCard((p) => Object.assign({}, p, { name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                />
              </div>
              <div className="col-span-4">
                <label className="text-[12px] text-zinc-400 block mb-1">尾號 4 碼</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="8821"
                  value={newCard.last4}
                  onChange={(e) => setNewCard((p) => Object.assign({}, p, { last4: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white tabular-nums outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1">結算幣種</label>
                <select
                  value={newCard.currency}
                  onChange={(e) => setNewCard((p) => Object.assign({}, p, { currency: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                >
                  {Store.CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1">信用額度</label>
                <NumericInput
                  size="sm"
                  value={newCard.creditLimit}
                  currency={newCard.currency}
                  label="設定信用額度"
                  quickAdds={[10000, 30000, 50000]}
                  onChange={(val) => setNewCard((p) => Object.assign({}, p, { creditLimit: val }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1">每月截數日</label>
                <select
                  value={newCard.statementDay}
                  onChange={(e) => setNewCard((p) => Object.assign({}, p, { statementDay: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>每月 {d} 日截數</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1">還款到期日</label>
                <select
                  value={newCard.dueDay}
                  onChange={(e) => setNewCard((p) => Object.assign({}, p, { dueDay: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>每月 {d} 日到期</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[12px] text-amber-300 block mb-1">初始本期已出帳</label>
                <NumericInput
                  size="sm"
                  value={newCard.billed}
                  currency={newCard.currency}
                  label="初始本期已出帳"
                  onChange={(val) => setNewCard((p) => Object.assign({}, p, { billed: val }))}
                />
              </div>
              <div>
                <label className="text-[12px] text-sky-300 block mb-1">初始未出帳下期</label>
                <NumericInput
                  size="sm"
                  value={newCard.unbilled}
                  currency={newCard.currency}
                  label="初始未出帳下期"
                  onChange={(val) => setNewCard((p) => Object.assign({}, p, { unbilled: val }))}
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] text-zinc-400 block mb-1">預設找數銀行戶口</label>
              <select
                value={newCard.autoPayKey}
                onChange={(e) => setNewCard((p) => Object.assign({}, p, { autoPayKey: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
              >
                <option value="">自動採用預設找數戶口</option>
                {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[12px] text-zinc-400 block mb-1">卡面質感</label>
              <div className="grid grid-cols-4 gap-2">
                {Store.CARD_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewCard((p) => Object.assign({}, p, { theme: t.id }))}
                    className={`py-2 rounded-xl text-[11px] font-medium border transition ${
                      newCard.theme === t.id ? 'border-white text-white' : 'border-white/10 text-zinc-300'
                    }`}
                    style={{ background: t.bg }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[12px] text-zinc-400 block mb-1">回贈／用途備註（選填）</label>
              <input
                type="text"
                placeholder="例如：餐飲 4% 回贈、免年費條件"
                value={newCard.note}
                onChange={(e) => setNewCard((p) => Object.assign({}, p, { note: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
              />
            </div>
          </div>
        </BottomSheet>

        {/* Sheet 2: Smart Card Bill Payment (Single Bank OR Cross-Pool Split Settlement) */}
        <BottomSheet
          open={payOpen && Boolean(focusedCard)}
          title={focusedCard ? `找數還款 · ${focusedCard.name}` : '找數還款'}
          subtitle={focusedCard ? `總待繳 ${Store.formatMoney(focusedTotal, focusedCard.currency)}（已出帳 ${Store.formatMoney(focusedCard.billed || 0, focusedCard.currency)}）` : ''}
          onClose={() => setPayOpen(false)}
          footer={
            <button
              type="button"
              onClick={handleConfirmPayment}
              className="w-full py-3.5 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold active:scale-[0.99] transition"
            >
              {payMode === 'SINGLE'
                ? `確認找數 ${focusedCard ? Store.formatMoney(singlePayAmount, focusedCard.currency) : ''}`
                : `執行跨池拆單找數 (${splitRows.filter((r) => r.checked && Number(r.amount) > 0).length} 筆)`}
            </button>
          }
        >
          <div className="space-y-4">
            <SegmentedControl
              value={payMode}
              onChange={setPayMode}
              options={[
                { value: 'SINGLE', label: '單一銀行找數' },
                { value: 'SPLIT', label: '跨池自動拆單' }
              ]}
            />

            {payMode === 'SINGLE' && focusedCard && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1.5">扣款銀行／錢包戶口</label>
                  <select
                    value={singlePayKey}
                    onChange={(e) => setSinglePayKey(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                  >
                    {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1.5">
                    找數金額 ({focusedCard.currency})
                  </label>
                  <NumericInput
                    size="lg"
                    value={singlePayAmount}
                    currency={focusedCard.currency}
                    label={`輸入找數金額 (${focusedCard.currency})`}
                    onChange={(val) => setSinglePayAmount(val)}
                    className="!text-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(focusedCard.billed || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSinglePayAmount(focusedCard.billed); setSinglePayTarget('BILLED_FIRST'); }}
                      className="py-2.5 px-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-[12.5px] font-semibold text-amber-300 tabular-nums"
                    >
                      清本期 {Store.formatMoney(focusedCard.billed, focusedCard.currency)}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setSinglePayAmount(focusedTotal); setSinglePayTarget('BILLED_FIRST'); }}
                    className={`py-2.5 px-3 rounded-xl bg-white/[0.08] border border-white/15 text-[12.5px] font-semibold text-white tabular-nums ${
                      (focusedCard.billed || 0) > 0 ? '' : 'col-span-2'
                    }`}
                  >
                    清全部 {Store.formatMoney(focusedTotal, focusedCard.currency)}
                  </button>
                </div>
              </div>
            )}

            {payMode === 'SPLIT' && focusedCard && (
              <div className="space-y-2.5">
                {splitRows.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-zinc-500">目前無可拆單金額。</div>
                ) : (
                  splitRows.map((row, idx) => (
                    <div
                      key={row.id}
                      className={`p-3.5 rounded-2xl border space-y-2.5 transition ${
                        row.checked ? 'bg-black/50 border-white/15' : 'bg-black/25 border-white/[0.05] opacity-55'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSplitRows((prev) => prev.map((r, i) => i === idx ? Object.assign({}, r, { checked: !r.checked }) : r))}
                          className="flex items-center gap-2 text-left min-w-0 flex-1"
                        >
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            row.checked ? 'bg-emerald-400 border-emerald-400 text-black' : 'border-white/25'
                          }`}>
                            {row.checked && <Icon name="check" size={13} strokeWidth={2.5} />}
                          </span>
                          <span className="text-[12px] text-zinc-300 truncate">
                            資金池：{row.poolLabels || '一般'}
                          </span>
                        </button>
                      </div>

                      <select
                        value={row.bankKey}
                        onChange={(e) => setSplitRows((prev) => prev.map((r, i) => i === idx ? Object.assign({}, r, { bankKey: e.target.value }) : r))}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                      >
                        {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                      </select>

                      <NumericInput
                        size="sm"
                        value={row.amount}
                        currency={focusedCard.currency}
                        label="調整此戶口找數金額"
                        onChange={(val) => setSplitRows((prev) => prev.map((r, i) => i === idx ? Object.assign({}, r, { amount: val }) : r))}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </BottomSheet>

        {/* Sheet 3: Global Cross-Card Bank Settlement Overview */}
        <BottomSheet
          open={globalSettleOpen}
          title="全信用卡 · 各銀行找數總覽"
          subtitle="依歸屬資金池彙總每個銀行戶口應準備的找數資金"
          onClose={() => setGlobalSettleOpen(false)}
        >
          <div className="space-y-4">
            <SegmentedControl
              value={globalSettleBucket}
              onChange={setGlobalSettleBucket}
              options={[
                { value: 'ALL', label: '全部待繳' },
                { value: 'BILLED', label: '僅本期已出帳' },
                { value: 'UNBILLED', label: '僅未出帳下期' }
              ]}
            />

            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.08] flex items-center justify-between">
              <span className="text-[12.5px] text-zinc-400">彙總應準備金額（折算 {state.meta.baseCurrency}）</span>
              <span className="text-[17px] font-bold text-white tabular-nums">
                {Store.formatMoney(globalSummary.grandBase, state.meta.baseCurrency)}
              </span>
            </div>

            {globalSummary.banks.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-zinc-500">
                此帳期目前沒有待繳信用卡帳款。
              </div>
            ) : (
              <div className="space-y-3">
                {globalSummary.banks.map((bank) => (
                  <div key={bank.key} className="rounded-2xl bg-black/45 border border-white/[0.08] overflow-hidden">
                    <div className="px-4 py-3 bg-white/[0.04] border-b border-white/[0.06] flex items-center justify-between gap-2">
                      <span className="text-[14px] font-bold text-white truncate">{bank.label}</span>
                      <span className="text-[14.5px] font-bold text-emerald-400 tabular-nums whitespace-nowrap shrink-0">
                        {Store.formatMoney(bank.totalBase, state.meta.baseCurrency)}
                      </span>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                      {bank.items.map((it) => (
                        <button
                          key={it.cardId}
                          type="button"
                          onClick={() => {
                            setGlobalSettleOpen(false);
                            setFocusedCardId(it.cardId);
                            setBucketFilter(globalSettleBucket);
                          }}
                          className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left active:bg-white/[0.05]"
                        >
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-zinc-100 truncate">
                              {it.cardName} {it.last4 ? `(${it.last4})` : ''}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {it.pools.map((p) => p.name).join('、')}
                            </div>
                          </div>
                          <span className="text-[13px] font-semibold text-zinc-200 tabular-nums whitespace-nowrap shrink-0">
                            {Store.formatMoney(it.amount, it.currency)} ›
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BottomSheet>
      </div>
    );
  }

  window.WealthCards = { CreditCardsView };
})();
