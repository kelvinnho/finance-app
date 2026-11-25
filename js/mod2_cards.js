// mod2_cards.js · Stage 2 r5
(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;

  function CardMetallicLayers({ theme }) {
    return (
      <>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: theme.glow || 'radial-gradient(circle at 86% 14%, rgba(255,255,255,0.20) 0%, transparent 65%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-45"
          style={{ background: 'linear-gradient(122deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.02) 34%, transparent 56%)' }}
        />
        <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full border border-white/[0.08] pointer-events-none" />
        <div className="absolute -right-2 -bottom-2 w-24 h-24 rounded-full border border-white/[0.05] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
      </>
    );
  }

  function EmvChip({ small }) {
    return (
      <svg
        width={small ? 24 : 30}
        height={small ? 18 : 22}
        viewBox="0 0 32 24"
        fill="none"
        className="shrink-0 opacity-90 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="chipGold" x1="0" y1="0" x2="32" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#D4A353" />
            <stop offset="100%" stopColor="#926C2C" />
          </linearGradient>
        </defs>
        <rect x="0.75" y="0.75" width="30.5" height="22.5" rx="4.25" fill="url(#chipGold)" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        <path d="M11 1V23M21 1V23M1 9H11M21 9H31M1 15H11M21 15H31" stroke="rgba(0,0,0,0.28)" strokeWidth="1" />
        <rect x="12.5" y="7.5" width="7" height="9" rx="1.5" stroke="rgba(0,0,0,0.28)" strokeWidth="1" />
      </svg>
    );
  }

  function CreditCardsView({ state, showToast, onFocusChange, resetSignal }) {
    const { Icon, BottomSheet, NumericInput, SegmentedControl } = window.WealthUI;
    const Store = window.WealthStore;

    const [focusedCardId, setFocusedCardId] = useState(null);
    const [flipped, setFlipped] = useState(false);
    const [bucketFilter, setBucketFilter] = useState('BILLED'); // BILLED | UNBILLED | ALL

    // Global cross-card transfer plan sheet
    const [globalSettleOpen, setGlobalSettleOpen] = useState(false);
    const [globalSettleBucket, setGlobalSettleBucket] = useState('BILLED');

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

    // Pay Bill Sheet (Dual Mode: MAIN_FLOW | DIRECT)
    const [payOpen, setPayOpen] = useState(false);
    const [payMode, setPayMode] = useState('MAIN_FLOW');
    const [payIncludeReimb, setPayIncludeReimb] = useState(true);
    const [reimbCheckedMap, setReimbCheckedMap] = useState({});
    const [directPayKey, setDirectPayKey] = useState('');
    const [directPayAmount, setDirectPayAmount] = useState(0);
    const [directPayTarget, setDirectPayTarget] = useState('BILLED_FIRST');

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

    // Overview default bucket: BILLED if any card has billed > 0, else ALL
    const overviewBucket = cardTotals.billed > 0 ? 'BILLED' : 'ALL';
    const overviewTransferPlan = useMemo(
      () => Store.getAllCardsTransferPlan(overviewBucket, state),
      [overviewBucket, state]
    );

    const globalTransferPlan = useMemo(
      () => (globalSettleOpen ? Store.getAllCardsTransferPlan(globalSettleBucket, state) : { grandDebtBase: 0, grandTransferRemainingBase: 0, pendingRouteCount: 0, routes: [], mainBanks: [] }),
      [globalSettleOpen, globalSettleBucket, state]
    );

    const focusedCard = useMemo(() => {
      if (!focusedCardId) return null;
      return (state.cards || []).find((c) => c.id === focusedCardId) || null;
    }, [state.cards, focusedCardId]);

    const syncEditDraftFromCard = (card) => {
      if (!card) return;
      const autoKey = card.autoPayAccountId
        ? (bankOptions.find((b) =>
            b.accountId === card.autoPayAccountId &&
            (!card.autoPayBalanceId || b.balanceId === card.autoPayBalanceId)
          )?.key || defaultBankKey)
        : defaultBankKey;
      setEditDraft({
        name: card.name || '',
        last4: card.last4 || '',
        currency: card.currency || state.meta.baseCurrency,
        creditLimit: card.creditLimit || 50000,
        statementDay: card.statementDay || 15,
        dueDay: card.dueDay || 5,
        billed: card.billed || 0,
        unbilled: card.unbilled || 0,
        theme: card.theme || 'titanium',
        autoPayKey: autoKey,
        note: card.note || ''
      });
    };

    const toggleCardSettings = (forceState) => {
      const next = typeof forceState === 'boolean' ? forceState : !flipped;
      // Strictly discard any unsaved draft when entering OR leaving settings without saving
      syncEditDraftFromCard(focusedCard);
      setFlipped(next);
    };

    useEffect(() => {
      if (focusedCard) {
        syncEditDraftFromCard(focusedCard);
      } else {
        setFlipped(false);
      }
    }, [focusedCard, bankOptions, defaultBankKey]);

    const isCardFocused = Boolean(focusedCard);
    useEffect(() => {
      if (onFocusChange) onFocusChange(isCardFocused);
    }, [isCardFocused, onFocusChange]);

    useEffect(() => {
      return () => {
        if (onFocusChange) onFocusChange(false);
      };
    }, [onFocusChange]);

    useEffect(() => {
      if (resetSignal > 0) {
        setFocusedCardId(null);
        setFlipped(false);
      }
    }, [resetSignal]);

    const focusedPlan = useMemo(() => {
      if (!focusedCard) return null;
      return Store.getCardSettlementPlan(focusedCard.id, bucketFilter, state);
    }, [focusedCard, bucketFilter, state]);

    const cardTransactions = useMemo(() => {
      if (!focusedCard) return [];
      return (state.transactions || [])
        .filter((tx) => {
          const isCharge = tx.accountKind === 'CARD' && tx.accountId === focusedCard.id;
          const isPayment = tx.toAccountKind === 'CARD' && tx.toAccountId === focusedCard.id;
          const isReimb = tx.type === 'TRANSFER' && tx.cardReimbursement && tx.cardReimbursement.cardId === focusedCard.id;
          if (!isCharge && !isPayment && !isReimb) return false;
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

    const openCardDetail = (card) => {
      setFocusedCardId(card.id);
      setFlipped(false);
      setBucketFilter((card.billed || 0) > 0 ? 'BILLED' : 'UNBILLED');
    };

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
      openCardDetail(created);
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
      showToast('信用卡與主找數戶口設定已儲存');
    };

    // Execute a single card's single inbound reimbursement transfer (Source Bank -> Card Main Bank)
    const handleSingleReimburse = (tr) => {
      if (!focusedCard || !tr || tr.isDone) return;
      if (!tr.fromAccountId || !tr.toAccountId) {
        showToast('請先為資金池與信用卡綁定銀行戶口');
        return;
      }
      const cnt = Store.executeCardReimbursements([{
        cardId: focusedCard.id,
        cardName: focusedCard.name,
        bucket: bucketFilter,
        fromAccountId: tr.fromAccountId,
        fromBalanceId: tr.fromBalanceId,
        toAccountId: tr.toAccountId,
        toBalanceId: tr.toBalanceId,
        amountInCardCur: tr.remainingAmount,
        cardCurrency: focusedCard.currency,
        note: `為「${focusedCard.name}」歸墊（${tr.pools.map((p) => p.name).join('、')}）`
      }]);
      if (cnt > 0) {
        showToast(`已轉帳 ${Store.formatMoney(tr.remainingAmount, focusedCard.currency)} 至 ${tr.toLabel}`);
      }
    };

    // Execute ALL pending inbound reimbursements for the focused card (Step 1 only, ready for autopay)
    const handleReimburseAllForCard = () => {
      if (!focusedCard || !focusedPlan) return;
      const pending = focusedPlan.inboundTransfers.filter((tr) => !tr.isDone && tr.fromAccountId && tr.toAccountId);
      if (!pending.length) {
        showToast('本卡無待歸墊之跨行轉帳');
        return;
      }
      const cnt = Store.executeCardReimbursements(
        pending.map((tr) => ({
          cardId: focusedCard.id,
          cardName: focusedCard.name,
          bucket: bucketFilter,
          fromAccountId: tr.fromAccountId,
          fromBalanceId: tr.fromBalanceId,
          toAccountId: tr.toAccountId,
          toBalanceId: tr.toBalanceId,
          amountInCardCur: tr.remainingAmount,
          cardCurrency: focusedCard.currency,
          note: `為「${focusedCard.name}」歸墊（${tr.pools.map((p) => p.name).join('、')}）`
        }))
      );
      if (cnt > 0) {
        showToast(`已完成 ${cnt} 筆歸墊轉帳至 ${focusedPlan.mainBank ? focusedPlan.mainBank.label : '主找數戶口'}`);
      }
    };

    // Execute a merged cross-card route from the Global Transfer Plan sheet
    const handleExecuteGlobalRoute = (route) => {
      if (!route || route.isDone) return;
      const items = route.breakdown
        .filter((b) => !b.isDone && b.remainingAmount > 0)
        .map((b) => ({
          cardId: b.cardId,
          cardName: b.cardName,
          bucket: globalSettleBucket,
          fromAccountId: route.fromAccountId,
          fromBalanceId: route.fromBalanceId,
          toAccountId: route.toAccountId,
          toBalanceId: route.toBalanceId,
          amountInCardCur: b.remainingAmount,
          cardCurrency: b.currency,
          note: `為「${b.cardName}」歸墊（${b.pools.map((p) => p.name).join('、')}）`
        }));
      const cnt = Store.executeCardReimbursements(items);
      if (cnt > 0) {
        showToast(`已從 ${route.fromShortName} 轉入 ${route.toLabel}（${cnt} 筆）`);
      }
    };

    const handleExecuteAllGlobalRoutes = () => {
      const items = [];
      globalTransferPlan.routes.forEach((route) => {
        if (route.isDone) return;
        route.breakdown.forEach((b) => {
          if (b.isDone || b.remainingAmount <= 0) return;
          items.push({
            cardId: b.cardId,
            cardName: b.cardName,
            bucket: globalSettleBucket,
            fromAccountId: route.fromAccountId,
            fromBalanceId: route.fromBalanceId,
            toAccountId: route.toAccountId,
            toBalanceId: route.toBalanceId,
            amountInCardCur: b.remainingAmount,
            cardCurrency: b.currency,
            note: `為「${b.cardName}」歸墊（${b.pools.map((p) => p.name).join('、')}）`
          });
        });
      });
      if (!items.length) {
        showToast('目前無待執行之跨行歸墊轉帳');
        return;
      }
      const cnt = Store.executeCardReimbursements(items);
      if (cnt > 0) {
        showToast(`已一鍵完成全部 ${cnt} 筆跨戶歸墊轉帳`);
      }
    };

    const openPayBillSheet = (preferredMode) => {
      if (!focusedCard || !focusedPlan) return;
      const totalDue = Store.round2((focusedCard.billed || 0) + (focusedCard.unbilled || 0));
      if (bankOptions.length === 0) {
        showToast('請先於「銀包」建立扣款銀行帳戶');
        return;
      }

      const mainKey = focusedPlan.mainBank ? focusedPlan.mainBank.key : defaultBankKey;
      const targetAmt = focusedPlan.targetTotal > 0 ? focusedPlan.targetTotal : totalDue;
      setDirectPayKey(mainKey);
      setDirectPayAmount(targetAmt);
      setDirectPayTarget(bucketFilter === 'UNBILLED' ? 'UNBILLED_FIRST' : 'BILLED_FIRST');

      const map = {};
      focusedPlan.inboundTransfers.forEach((tr) => {
        map[tr.fromKey] = !tr.isDone;
      });
      setReimbCheckedMap(map);
      setPayIncludeReimb(focusedPlan.totalInboundRemaining > 0);
      setPayMode(preferredMode === 'DIRECT' ? 'DIRECT' : 'MAIN_FLOW');
      setPayOpen(true);
    };

    const handleConfirmPayment = () => {
      if (!focusedCard || !focusedPlan) return;
      if (payMode === 'DIRECT') {
        if (!directPayKey) {
          showToast('請選擇扣款銀行戶口');
          return;
        }
        if (Number(directPayAmount) <= 0) {
          showToast('找數金額須大於 0');
          return;
        }
        const [accId, balId] = directPayKey.split('::');
        const cnt = Store.payCardBill(
          focusedCard.id,
          [{ fromAccountId: accId, fromBalanceId: balId, amount: Number(directPayAmount) }],
          directPayTarget
        );
        if (cnt > 0) {
          setPayOpen(false);
          showToast(`已完成找數 ${Store.formatMoney(directPayAmount, focusedCard.currency)}`);
        }
      } else {
        if (!focusedPlan.mainBank) {
          showToast('請先設定此卡的主找數銀行戶口');
          return;
        }
        if (Number(directPayAmount) <= 0) {
          showToast('找數金額須大於 0');
          return;
        }
        const reimbItems = payIncludeReimb
          ? focusedPlan.inboundTransfers
              .filter((tr) => !tr.isDone && reimbCheckedMap[tr.fromKey] && tr.fromAccountId && tr.toAccountId)
              .map((tr) => ({
                cardId: focusedCard.id,
                cardName: focusedCard.name,
                bucket: bucketFilter,
                fromAccountId: tr.fromAccountId,
                fromBalanceId: tr.fromBalanceId,
                toAccountId: tr.toAccountId,
                toBalanceId: tr.toBalanceId,
                amountInCardCur: tr.remainingAmount,
                cardCurrency: focusedCard.currency,
                note: `為「${focusedCard.name}」歸墊（${tr.pools.map((p) => p.name).join('、')}）`
              }))
          : [];

        const res = Store.settleCardWithReimbursements(
          focusedCard.id,
          bucketFilter,
          reimbItems,
          {
            fromAccountId: focusedPlan.mainBank.accountId,
            fromBalanceId: focusedPlan.mainBank.balanceId,
            amount: Number(directPayAmount),
            note: `由主找數戶口（${focusedPlan.mainBank.label}）清償找數`
          },
          bucketFilter === 'UNBILLED' ? 'UNBILLED_FIRST' : 'BILLED_FIRST'
        );

        if (res.payCount > 0) {
          setPayOpen(false);
          if (res.reimbCount > 0) {
            showToast(`已完成 ${res.reimbCount} 筆歸墊轉帳並由主戶清償找數`);
          } else {
            showToast(`已由主戶（${focusedPlan.mainBank.shortName}）完成找數`);
          }
        }
      }
    };

    const focusedCycle = focusedCard ? Store.getCreditCardCycle(focusedCard, bucketFilter) : null;
    const focusedTotal = focusedCard ? Store.round2((focusedCard.billed || 0) + (focusedCard.unbilled || 0)) : 0;
    const focusedRatio = focusedCard && focusedCard.creditLimit > 0
      ? Math.min(100, Math.round((focusedTotal / focusedCard.creditLimit) * 100))
      : 0;

    return (
      <div className="space-y-4 pb-6">
        {/* Mode A: Start Directly with Apple Wallet Stacked Credit Card Deck (No Top Summary Card) */}
        {!focusedCard && (
          <div className="space-y-4">
            {state.cards.length === 0 ? (
              <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-8 text-center text-[13px] text-zinc-500">
                尚未建立任何信用卡，點擊下方新增。
              </div>
            ) : (
              <div className="relative pt-0.5">
                {state.cards.map((card, idx) => {
                  const cardBucket = (card.billed || 0) > 0 ? 'BILLED' : 'UNBILLED';
                  const cycle = Store.getCreditCardCycle(card, cardBucket);
                  const spent = Store.round2((card.billed || 0) + (card.unbilled || 0));
                  const ratio = card.creditLimit > 0 ? Math.min(100, Math.round((spent / card.creditLimit) * 100)) : 0;
                  const theme = getThemeObj(card.theme);
                  const isLast = idx === state.cards.length - 1;
                  const plan = Store.getCardSettlementPlan(card.id, cardBucket, state);

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => openCardDetail(card)}
                      style={{
                        background: theme.bg,
                        zIndex: idx + 1
                      }}
                      className={`relative block w-full rounded-[24px] border border-white/20 shadow-[0_-12px_30px_rgba(0,0,0,0.6)] text-left transition-transform active:scale-[0.985] overflow-hidden ${
                        idx > 0 ? '-mt-12' : ''
                      } ${isLast ? 'p-5 min-h-[178px]' : 'px-5 pt-4 pb-16 min-h-[146px]'}`}
                    >
                      <CardMetallicLayers theme={theme} />

                      <div className="relative flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="pt-0.5">
                            <EmvChip small />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[16px] font-bold text-white truncate">{card.name}</span>
                              {card.last4 && (
                                <span className="text-[11px] text-white/55 tabular-nums shrink-0">•{card.last4}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-white/75 truncate mt-0.5 tabular-nums">
                              {plan.mainBank ? plan.mainBank.shortName : '未設主戶'} · {cardBucket === 'BILLED' ? `本期 ${cycle.shortDueLabel} 到期 (${cycle.countdownText})` : `下期 ${cycle.shortDueLabel} 到期`}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[18px] font-bold text-white tabular-nums tracking-tight whitespace-nowrap">
                            {Store.formatMoney(spent, card.currency)}
                          </div>
                          <div className="text-[10.5px] mt-0.5 whitespace-nowrap tabular-nums">
                            {plan.totalInboundRemaining > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-400/25 border border-amber-300/35 text-amber-200 font-semibold">
                                待轉 {Store.formatMoney(plan.totalInboundRemaining, card.currency)}
                              </span>
                            ) : (card.billed || 0) > 0 ? (
                              <span className="text-amber-300 font-medium">本期 {Store.formatMoney(card.billed, card.currency)}</span>
                            ) : (
                              <span className="text-sky-200/80">未出帳 {ratio}%</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isLast && (
                        <div className="relative mt-6 space-y-2.5">
                          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-white/90 to-white/60 rounded-full" style={{ width: `${ratio}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                            <span>
                              {(card.billed || 0) > 0
                                ? `本期 ${Store.formatMoney(card.billed, card.currency)} · 下期 ${Store.formatMoney(card.unbilled || 0, card.currency)}`
                                : `額度 ${Store.formatMoney(card.creditLimit, card.currency)} (${ratio}%)`}
                            </span>
                            <span>展開 ›</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Compact Cross-Bank Transfer Bar Placed Cleanly Below Cards */}
            {cardTotals.total > 0 && overviewTransferPlan.routes.length > 0 && (
              <button
                type="button"
                onClick={() => { setGlobalSettleBucket(overviewBucket); setGlobalSettleOpen(true); }}
                className={`w-full rounded-2xl border p-3.5 text-left space-y-2.5 active:opacity-85 transition ${
                  overviewTransferPlan.pendingRouteCount > 0
                    ? 'bg-[#17171D] border-amber-400/35'
                    : 'bg-[#151817] border-emerald-400/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold shrink-0 ${
                      overviewTransferPlan.pendingRouteCount > 0
                        ? 'bg-amber-400 text-black'
                        : 'bg-emerald-400 text-black'
                    }`}>
                      {overviewBucket === 'BILLED' ? '本期歸墊' : '待繳歸墊'}
                    </span>
                    <span className="text-[13.5px] font-semibold text-white truncate tabular-nums">
                      {overviewTransferPlan.pendingRouteCount > 0
                        ? `${overviewTransferPlan.pendingRouteCount} 筆待轉 · ${Store.formatMoney(overviewTransferPlan.grandTransferRemainingBase, state.meta.baseCurrency)}`
                        : '跨戶歸墊已就位'}
                    </span>
                  </div>
                  <Icon name="chevronRight" size={16} className="text-zinc-400 shrink-0" />
                </div>

                <div className="space-y-1.5">
                  {overviewTransferPlan.routes.slice(0, 3).map((r) => (
                    <div key={r.routeKey} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/45 text-[12px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-zinc-100 truncate">{r.fromShortName}</span>
                        <span className="text-amber-400 font-bold shrink-0">➔</span>
                        <span className="font-medium text-emerald-300 truncate">{r.toLabel}</span>
                      </div>
                      {r.isDone ? (
                        <span className="text-[11px] font-semibold text-emerald-400 shrink-0">✓ 已轉</span>
                      ) : (
                        <span className="font-bold text-amber-300 tabular-nums shrink-0 whitespace-nowrap">
                          {Store.formatMoney(r.totalRemainingInToCur, r.toCurrency)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </button>
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

        {/* Mode B: Focused Credit Card Detail + Flagship Transfer-to-Main-Account Flow */}
        {focusedCard && focusedCycle && focusedPlan && (
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
                onClick={() => toggleCardSettings()}
                className="px-3 py-1.5 rounded-full bg-[#1C1C22] border border-white/10 text-[12px] font-medium text-zinc-200 active:bg-white/15"
              >
                {flipped ? '取消並返回正面' : '卡片與主戶設定'}
              </button>
            </div>

            {/* Card Front or Back */}
            {!flipped ? (() => {
              const cardTheme = getThemeObj(focusedCard.theme);
              const isBilledView = bucketFilter === 'BILLED';
              const isUnbilledView = bucketFilter === 'UNBILLED';
              const activeInfo = focusedCycle.active;
              const billedInfo = focusedCycle.billed;
              const unbilledInfo = focusedCycle.unbilled;

              const heroLabel = isBilledView
                ? `本期應繳 · ${billedInfo.monthLabel} (${focusedCard.currency})`
                : isUnbilledView
                ? `下期累積 · ${unbilledInfo.monthLabel} (${focusedCard.currency})`
                : `總累積待繳 (${focusedCard.currency})`;

              const heroAmount = isBilledView
                ? Store.round2(focusedCard.billed || 0)
                : isUnbilledView
                ? Store.round2(focusedCard.unbilled || 0)
                : focusedTotal;

              const periodHeadline = isBilledView
                ? `本期 ${billedInfo.monthLabel} · ${billedInfo.periodLabel}`
                : isUnbilledView
                ? `下期 ${unbilledInfo.monthLabel} · ${unbilledInfo.periodLabel}`
                : `${billedInfo.monthLabel}＋${unbilledInfo.monthLabel}`;

              const badgeToneClass = activeInfo.isOverdue
                ? 'bg-rose-500/30 border-rose-300/60 text-rose-100'
                : isUnbilledView
                ? 'bg-sky-500/25 border-sky-300/45 text-sky-100'
                : 'bg-amber-400/25 border-amber-300/50 text-amber-200';

              const badgeText = isBilledView
                ? `${billedInfo.countdownText} (${billedInfo.dueLabel})`
                : isUnbilledView
                ? `${unbilledInfo.countdownText} (${unbilledInfo.dueLabel})`
                : (focusedCard.billed > 0
                    ? `本期 ${billedInfo.dueLabel} 到期`
                    : `下期 ${unbilledInfo.dueLabel} 到期`);

              return (
                <div
                  className="rounded-[24px] p-5 border border-white/20 shadow-[0_18px_40px_rgba(0,0,0,0.65)] relative overflow-hidden space-y-4"
                  style={{ background: cardTheme.bg }}
                >
                  <CardMetallicLayers theme={cardTheme} />

                  {/* Row 1: EMV Chip + Card Name + Dynamic Period Deadline Pill */}
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="pt-0.5">
                        <EmvChip />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[18px] font-bold text-white truncate leading-tight">{focusedCard.name}</span>
                          {focusedCard.last4 && (
                            <span className="text-[11.5px] text-white/60 tabular-nums shrink-0">•••• {focusedCard.last4}</span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-white/80 mt-1 tabular-nums truncate">
                          {periodHeadline}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Dynamic Deadline Strip + Main Bank Selector */}
                  <div className="relative flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap tabular-nums ${badgeToneClass}`}>
                      {badgeText}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleCardSettings(true)}
                      className="px-2.5 py-1 rounded-full bg-black/35 border border-white/15 text-[11.5px] font-semibold text-emerald-300 truncate max-w-[60%] active:opacity-75"
                    >
                      主戶：{focusedPlan.mainBank ? focusedPlan.mainBank.shortName : '未設定'} ▾
                    </button>
                  </div>

                  {/* Row 3: Dynamic Hero Amount (Switches Live Between 本期 / 下期 / 總額) */}
                  <div className="relative flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11.5px] text-white/70 mb-0.5">{heroLabel}</div>
                      <div className={`text-[32px] font-bold tabular-nums tracking-tight leading-tight break-all ${
                        isBilledView ? 'text-white' : isUnbilledView ? 'text-sky-100' : 'text-white'
                      }`}>
                        {Store.formatMoney(heroAmount, focusedCard.currency)}
                      </div>
                    </div>
                    {(isBilledView || isUnbilledView) && focusedTotal !== heroAmount && (
                      <button
                        type="button"
                        onClick={() => setBucketFilter('ALL')}
                        className="text-right shrink-0 pb-1 active:opacity-75"
                      >
                        <div className="text-[10px] text-white/55">總累積</div>
                        <div className="text-[13px] font-semibold text-white/85 tabular-nums whitespace-nowrap">
                          {Store.formatMoney(focusedTotal, focusedCard.currency)}
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Row 4: Interactive 本期 / 下期 Glass Tiles (Each Displays Its Own Billing Month & Deadline) */}
                  <div className="relative grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBucketFilter('BILLED')}
                      className={`px-3 py-2.5 rounded-2xl border text-left transition ${
                        isBilledView
                          ? 'bg-amber-400/20 border-amber-300/75 shadow-[0_0_16px_rgba(251,191,36,0.18)]'
                          : 'bg-black/30 border-white/10 active:bg-black/45'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10.5px]">
                        <span className={isBilledView ? 'text-amber-200 font-semibold' : 'text-white/70'}>
                          本期 · {billedInfo.monthLabel}
                        </span>
                        <span className="text-white/60 tabular-nums shrink-0">{billedInfo.shortDueLabel}止</span>
                      </div>
                      <div className="text-[15.5px] font-bold text-amber-300 tabular-nums mt-1">
                        {Store.formatMoney(focusedCard.billed || 0, focusedCard.currency)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBucketFilter('UNBILLED')}
                      className={`px-3 py-2.5 rounded-2xl border text-left transition ${
                        isUnbilledView
                          ? 'bg-sky-400/20 border-sky-300/75 shadow-[0_0_16px_rgba(56,189,248,0.18)]'
                          : 'bg-black/30 border-white/10 active:bg-black/45'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10.5px]">
                        <span className={isUnbilledView ? 'text-sky-200 font-semibold' : 'text-white/70'}>
                          下期 · {unbilledInfo.monthLabel}
                        </span>
                        <span className="text-white/60 tabular-nums shrink-0">{unbilledInfo.shortDueLabel}止</span>
                      </div>
                      <div className="text-[15.5px] font-bold text-sky-300 tabular-nums mt-1">
                        {Store.formatMoney(focusedCard.unbilled || 0, focusedCard.currency)}
                      </div>
                    </button>
                  </div>

                  {/* Row 5: Utilization Bar */}
                  <div className="relative space-y-1">
                    <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-white/95 to-white/65 rounded-full" style={{ width: `${focusedRatio}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-white/70 tabular-nums">
                      <span>額度已用 {focusedRatio}%</span>
                      <span>可用 {Store.formatMoney(Math.max(0, Store.round2((focusedCard.creditLimit || 0) - focusedTotal)), focusedCard.currency)}</span>
                    </div>
                  </div>

                  {/* Row 6: Card Quick Actions */}
                  <div className="relative pt-2 border-t border-white/15 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openPayBillSheet('MAIN_FLOW')}
                      disabled={focusedTotal <= 0}
                      className="flex-1 py-2.5 rounded-xl bg-white text-black text-[13.5px] font-bold active:scale-[0.98] transition disabled:opacity-40"
                    >
                      找數還款
                    </button>
                    {(focusedCard.unbilled || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`確定將「${focusedCard.name}」的未出帳金額 ${Store.formatMoney(focusedCard.unbilled, focusedCard.currency)} 結轉為本期已出帳？`)) {
                            const moved = Store.closeCardStatement(focusedCard.id);
                            if (moved > 0) {
                              setBucketFilter('BILLED');
                              showToast(`已結單出帳 ${Store.formatMoney(moved, focusedCard.currency)}`);
                            }
                          }
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-black/35 border border-white/20 text-white text-[12.5px] font-semibold active:bg-black/50 whitespace-nowrap"
                      >
                        截單出帳
                      </button>
                    )}
                  </div>
                </div>
              );
            })() : (
              /* Card Back: Complete Settings & Balance Calibration */
              <div className="rounded-[22px] p-4 bg-[#191920] border border-white/15 shadow-2xl space-y-3.5">
                <div className="text-[15px] font-semibold text-white">編輯信用卡與主找數戶口</div>

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

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/25 space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-emerald-300 block">本卡主找數／自動扣款銀行戶口</label>
                  <select
                    value={editDraft.autoPayKey}
                    onChange={(e) => setEditDraft((p) => Object.assign({}, p, { autoPayKey: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                  >
                    <option value="">自動採用預設找數戶口</option>
                    {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                  </select>
                  <p className="text-[11px] text-emerald-200/70">
                    其他資金池的刷卡消費將自動產生「來源銀行 ➔ 此主戶」的歸墊轉帳指引。
                  </p>
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

            {/* Clean Elevated Card Options Tray (Concise, Scannable, Zero Textbook Fluff) */}
            <div
              className="rounded-[22px] bg-[#17171D] border border-white/[0.12] shadow-[0_10px_28px_rgba(0,0,0,0.45)] overflow-hidden"
              style={{ borderTop: `2px solid ${getThemeObj(focusedCard.theme).accent}88` }}
            >
              <div className="p-3.5 space-y-3.5">
                <SegmentedControl
                  value={bucketFilter}
                  onChange={setBucketFilter}
                  options={[
                    { value: 'BILLED', label: '本期已出帳' },
                    { value: 'UNBILLED', label: '未出帳下期' },
                    { value: 'ALL', label: '全部待繳' }
                  ]}
                />

                {focusedPlan.targetTotal <= 0 ? (
                  <div className="py-5 text-center text-[13px] text-zinc-500">
                    此帳期無待繳金額
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Cross-Bank Transfer Rows */}
                    {focusedPlan.inboundTransfers.length === 0 ? (
                      <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-[12px] text-emerald-300">
                        ✓ 全由 {focusedPlan.mainBank ? focusedPlan.mainBank.shortName : '主戶'} 直接扣款，無需跨行轉帳
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="px-0.5 flex items-center justify-between gap-2 text-[11.5px]">
                          <span className="font-semibold text-zinc-300 truncate">
                            轉入 {focusedPlan.mainBank ? focusedPlan.mainBank.shortName : '主戶'}
                          </span>
                          <span className={`font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                            focusedPlan.totalInboundRemaining > 0 ? 'text-amber-300' : 'text-emerald-400'
                          }`}>
                            {focusedPlan.totalInboundRemaining > 0
                              ? `尚待 ${Store.formatMoney(focusedPlan.totalInboundRemaining, focusedCard.currency)}`
                              : '✓ 皆已轉入'}
                          </span>
                        </div>

                        {focusedPlan.inboundTransfers.map((tr) => (
                          <div
                            key={tr.fromKey}
                            className={`px-3.5 py-3 rounded-2xl border space-y-2 ${
                              tr.isDone
                                ? 'bg-emerald-500/10 border-emerald-400/25'
                                : 'bg-[#111116] border-amber-400/30'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 text-[13.5px]">
                                <span className="font-bold text-white truncate">{tr.fromShortName}</span>
                                <span className="text-amber-400 font-bold shrink-0">➔</span>
                                <span className="font-semibold text-emerald-300 truncate">
                                  {focusedPlan.mainBank ? focusedPlan.mainBank.shortName : tr.toLabel}
                                </span>
                              </div>
                              <span className={`text-[15px] font-bold tabular-nums whitespace-nowrap shrink-0 ${
                                tr.isDone ? 'text-emerald-400' : 'text-amber-300'
                              }`}>
                                {Store.formatMoney(tr.isDone ? tr.requiredAmount : tr.remainingAmount, focusedCard.currency)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[11px] text-zinc-400 flex flex-wrap gap-x-2 gap-y-0.5 min-w-0">
                                {tr.pools.map((p) => (
                                  <span key={p.poolId} className="inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                                    {p.name}
                                  </span>
                                ))}
                                {tr.fromCurrency !== focusedCard.currency && !tr.isDone && (
                                  <span className="text-zinc-500 tabular-nums">
                                    (扣 {Store.formatMoney(tr.remainingInSourceCur, tr.fromCurrency)})
                                  </span>
                                )}
                              </div>

                              {tr.isDone ? (
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-400/20 text-emerald-300 text-[11px] font-bold shrink-0 whitespace-nowrap">
                                  ✓ 已轉入
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSingleReimburse(tr)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-black text-[12px] font-bold active:scale-95 transition shrink-0 whitespace-nowrap"
                                >
                                  立即轉帳
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Compact Main Bank Summary (Zero Vertical Wrapping) */}
                    <div className="p-3.5 rounded-2xl bg-[#111116] border border-white/[0.08] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13.5px] font-bold text-white whitespace-nowrap truncate">
                          {focusedPlan.mainBank ? focusedPlan.mainBank.shortName : '主戶'} 應付總額
                        </span>
                        <span className="text-[16px] font-bold text-white tabular-nums whitespace-nowrap shrink-0">
                          {Store.formatMoney(focusedPlan.targetTotal, focusedCard.currency)}
                        </span>
                      </div>

                      <div className="text-[11.5px] text-zinc-400 flex items-center justify-between gap-2 tabular-nums">
                        <span className="whitespace-nowrap">本位 {Store.formatMoney(focusedPlan.mainBankSelfAmount, focusedCard.currency)}</span>
                        <span className="whitespace-nowrap">他行轉入 {Store.formatMoney(focusedPlan.totalInboundRequired, focusedCard.currency)}</span>
                      </div>

                      {focusedPlan.mainBank && (
                        <div className={`pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 text-[11.5px] tabular-nums ${
                          focusedPlan.isMainBankSufficientAfterInbound ? 'text-zinc-400' : 'text-rose-300'
                        }`}>
                          <span className="whitespace-nowrap">
                            現有 {Store.formatMoney(focusedPlan.mainBank.balanceAmount, focusedPlan.mainBank.currency)}
                          </span>
                          <span className="font-semibold whitespace-nowrap">
                            找數後 {Store.formatMoney(focusedPlan.mainBankAfterPay, focusedPlan.mainBank.currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Concise Action Buttons */}
                    {focusedPlan.totalInboundRemaining > 0 ? (
                      <div className="grid grid-cols-12 gap-2">
                        <button
                          type="button"
                          onClick={handleReimburseAllForCard}
                          className="col-span-5 py-3 rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-300 text-[12.5px] font-bold active:bg-amber-400/25 transition whitespace-nowrap"
                        >
                          全部歸墊
                        </button>
                        <button
                          type="button"
                          onClick={() => openPayBillSheet('MAIN_FLOW')}
                          className="col-span-7 py-3 rounded-xl bg-emerald-400 text-black text-[13px] font-bold active:scale-[0.99] transition whitespace-nowrap"
                        >
                          歸墊並找數
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openPayBillSheet('MAIN_FLOW')}
                        className="w-full py-3 rounded-xl bg-emerald-400 text-black text-[13.5px] font-bold active:scale-[0.99] transition"
                      >
                        {focusedPlan.mainBank ? focusedPlan.mainBank.shortName : '主戶'}找數 · {Store.formatMoney(focusedPlan.targetTotal, focusedCard.currency)}
                      </button>
                    )}
                  </div>
                )}

                {/* Card Recent Transactions */}
                <div className="rounded-2xl bg-[#111116] border border-white/[0.08] overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold text-zinc-300">近期紀錄</span>
                    <span className="text-[11px] text-zinc-500 tabular-nums">{cardTransactions.length} 筆</span>
                  </div>
                  {cardTransactions.length === 0 ? (
                    <div className="py-6 text-center text-[12px] text-zinc-500">
                      暫無紀錄
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.06]">
                      {cardTransactions.map((tx) => {
                        const isPayment = tx.toAccountKind === 'CARD' && tx.toAccountId === focusedCard.id;
                        const isReimb = Boolean(tx.cardReimbursement && tx.cardReimbursement.cardId === focusedCard.id);
                        const isRefund = !isPayment && !isReimb && tx.type === 'INCOME';
                        const pool = !isPayment && !isReimb ? getPoolObj(tx.poolId) : null;
                        return (
                          <div key={tx.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-semibold text-white truncate">{tx.title}</span>
                                {isReimb ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-500/20 text-amber-300 shrink-0">歸墊</span>
                                ) : isPayment ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-500/15 text-emerald-300 shrink-0">找數</span>
                                ) : (
                                  <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold shrink-0 ${
                                    tx.billingBucket === 'BILLED' ? 'bg-amber-500/15 text-amber-300' : 'bg-sky-500/15 text-sky-300'
                                  }`}>
                                    {tx.billingBucket === 'BILLED' ? '本期' : '下期'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5 truncate">
                                <span>{tx.date}</span>
                                {pool && (
                                  <span className="inline-flex items-center gap-1 text-zinc-400">
                                    · <span className="w-1.5 h-1.5 rounded-full" style={{ background: pool.color }} />
                                    {pool.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`text-[13px] font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                              isReimb ? 'text-amber-300' : (isPayment || isRefund ? 'text-emerald-400' : 'text-white')
                            }`}>
                              {isReimb
                                ? Store.formatMoney(tx.cardReimbursement.amountInCardCur || tx.settledAmount, focusedCard.currency)
                                : isPayment || isRefund
                                ? Store.formatMoney(tx.settledAmount != null ? tx.settledAmount : tx.amount, focusedCard.currency, { showPlus: true })
                                : Store.formatMoney(-(tx.settledAmount != null ? tx.settledAmount : tx.amount), focusedCard.currency)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
                        onClick={() => openCardDetail(c)}
                        className="relative shrink-0 min-w-[146px] p-3 rounded-2xl border border-white/15 text-left active:scale-95 transition overflow-hidden"
                        style={{ background: th.bg }}
                      >
                        <div className="absolute inset-0 pointer-events-none" style={{ background: th.glow }} />
                        <div className="relative text-[12.5px] font-semibold text-white truncate">{c.name}</div>
                        <div className="relative text-[11px] text-white/75 tabular-nums mt-1">
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
          subtitle="設定截數日、到期日與本卡主找數銀行戶口"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white tabular-nums outline-none"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/25 space-y-1.5">
              <label className="text-[12px] font-semibold text-emerald-300 block">本卡主找數／扣款銀行戶口</label>
              <select
                value={newCard.autoPayKey}
                onChange={(e) => setNewCard((p) => Object.assign({}, p, { autoPayKey: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
              >
                <option value="">自動採用預設找數戶口</option>
                {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
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

        {/* Sheet 2: Smart Card Bill Payment (Main-Account Flow with Reimbursements OR Direct Override) */}
        <BottomSheet
          open={payOpen && Boolean(focusedCard && focusedPlan)}
          title={focusedCard ? `找數還款 · ${focusedCard.name}` : '找數還款'}
          subtitle={focusedPlan && focusedPlan.mainBank ? `主找數戶口：${focusedPlan.mainBank.label}` : ''}
          onClose={() => setPayOpen(false)}
          footer={
            <button
              type="button"
              onClick={handleConfirmPayment}
              className="w-full py-3.5 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold active:scale-[0.99] transition"
            >
              {payMode === 'MAIN_FLOW'
                ? (payIncludeReimb && focusedPlan && focusedPlan.inboundTransfers.some((tr) => !tr.isDone && reimbCheckedMap[tr.fromKey])
                    ? `執行歸墊並由主戶找數 ${focusedCard ? Store.formatMoney(directPayAmount, focusedCard.currency) : ''}`
                    : `由主戶清償找數 ${focusedCard ? Store.formatMoney(directPayAmount, focusedCard.currency) : ''}`)
                : `確認直接找數 ${focusedCard ? Store.formatMoney(directPayAmount, focusedCard.currency) : ''}`}
            </button>
          }
        >
          {focusedCard && focusedPlan && (
            <div className="space-y-4">
              <SegmentedControl
                value={payMode}
                onChange={setPayMode}
                options={[
                  { value: 'MAIN_FLOW', label: '主戶找數（含歸墊）' },
                  { value: 'DIRECT', label: '自選單戶直接找數' }
                ]}
              />

              {payMode === 'MAIN_FLOW' && (
                <div className="space-y-4">
                  {/* Step 1: Inbound reimbursements to main bank */}
                  {focusedPlan.inboundTransfers.filter((tr) => !tr.isDone).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-amber-300">步驟 1：同步執行跨行歸墊至主戶</span>
                        <button
                          type="button"
                          onClick={() => setPayIncludeReimb(!payIncludeReimb)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            payIncludeReimb ? 'bg-amber-400 text-black' : 'bg-white/10 text-zinc-400'
                          }`}
                        >
                          {payIncludeReimb ? '包含歸墊' : '略過歸墊'}
                        </button>
                      </div>

                      {payIncludeReimb && focusedPlan.inboundTransfers.filter((tr) => !tr.isDone).map((tr) => {
                        const checked = Boolean(reimbCheckedMap[tr.fromKey]);
                        return (
                          <button
                            key={tr.fromKey}
                            type="button"
                            onClick={() => setReimbCheckedMap((p) => Object.assign({}, p, { [tr.fromKey]: !checked }))}
                            className={`w-full p-3 rounded-xl border flex items-center justify-between gap-2 text-left transition ${
                              checked ? 'bg-amber-500/10 border-amber-400/35' : 'bg-black/35 border-white/[0.06] opacity-55'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                checked ? 'bg-amber-400 border-amber-400 text-black' : 'border-white/25'
                              }`}>
                                {checked && <Icon name="check" size={13} strokeWidth={2.5} />}
                              </span>
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-white truncate">
                                  {tr.fromShortName} ➔ {tr.toLabel}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">
                                  {tr.pools.map((p) => p.name).join('、')}
                                </div>
                              </div>
                            </div>
                            <span className="text-[13.5px] font-bold text-amber-300 tabular-nums whitespace-nowrap shrink-0">
                              {Store.formatMoney(tr.remainingAmount, focusedCard.currency)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Step 2: Main bank pays card */}
                  <div className="space-y-2.5">
                    <div className="text-[12px] font-bold text-emerald-300">
                      步驟 {focusedPlan.inboundTransfers.filter((tr) => !tr.isDone).length > 0 ? '2' : '1'}：由主找數戶口（{focusedPlan.mainBank ? focusedPlan.mainBank.label : '未設定'}）扣款找數
                    </div>
                    <NumericInput
                      size="lg"
                      value={directPayAmount}
                      currency={focusedCard.currency}
                      label={`主戶找數金額 (${focusedCard.currency})`}
                      onChange={(val) => setDirectPayAmount(val)}
                      className="!text-emerald-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {(focusedCard.billed || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setDirectPayAmount(focusedCard.billed)}
                          className="py-2.5 px-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-[12.5px] font-semibold text-amber-300 tabular-nums"
                        >
                          清本期 {Store.formatMoney(focusedCard.billed, focusedCard.currency)}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDirectPayAmount(focusedTotal)}
                        className={`py-2.5 px-3 rounded-xl bg-white/[0.08] border border-white/15 text-[12.5px] font-semibold text-white tabular-nums ${
                          (focusedCard.billed || 0) > 0 ? '' : 'col-span-2'
                        }`}
                      >
                        清全部 {Store.formatMoney(focusedTotal, focusedCard.currency)}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {payMode === 'DIRECT' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[12px] text-zinc-400 block mb-1.5">自選扣款銀行／錢包戶口</label>
                    <select
                      value={directPayKey}
                      onChange={(e) => setDirectPayKey(e.target.value)}
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
                      value={directPayAmount}
                      currency={focusedCard.currency}
                      label={`輸入找數金額 (${focusedCard.currency})`}
                      onChange={(val) => setDirectPayAmount(val)}
                      className="!text-emerald-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </BottomSheet>

        {/* Sheet 3: Global Cross-Card Bank Transfer Plan (Merged From -> To Main Bank Instructions) */}
        <BottomSheet
          open={globalSettleOpen}
          title="全信用卡 · 跨戶歸墊轉帳總覽"
          subtitle="依每張卡的主找數戶口，自動合併同方向之跨行轉帳"
          onClose={() => setGlobalSettleOpen(false)}
          footer={
            globalTransferPlan.pendingRouteCount > 0 ? (
              <button
                type="button"
                onClick={handleExecuteAllGlobalRoutes}
                className="w-full py-3.5 rounded-2xl bg-amber-400 text-black text-[15px] font-bold active:scale-[0.99] transition"
              >
                一鍵執行全部待歸墊轉帳 ({Store.formatMoney(globalTransferPlan.grandTransferRemainingBase, state.meta.baseCurrency)})
              </button>
            ) : null
          }
        >
          <div className="space-y-4">
            <SegmentedControl
              value={globalSettleBucket}
              onChange={setGlobalSettleBucket}
              options={[
                { value: 'BILLED', label: '本期已出帳' },
                { value: 'UNBILLED', label: '未出帳下期' },
                { value: 'ALL', label: '全部待繳' }
              ]}
            />

            {/* Section 1: Merged Cross-Bank Transfer Routes */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-amber-300">步驟 1：跨銀行轉入主找數戶口清單</span>
                <span className="text-[11px] text-zinc-400 tabular-nums">
                  {globalTransferPlan.routes.length} 條路線
                </span>
              </div>

              {globalTransferPlan.routes.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 text-[13px] text-emerald-300 text-center">
                  ✓ 此帳期無需跨行轉帳，所有消費皆落在各卡主找數戶口內。
                </div>
              ) : (
                <div className="space-y-3">
                  {globalTransferPlan.routes.map((route) => (
                    <div
                      key={route.routeKey}
                      className={`rounded-2xl border overflow-hidden ${
                        route.isDone
                          ? 'bg-emerald-500/10 border-emerald-400/25'
                          : 'bg-black/50 border-amber-400/35'
                      }`}
                    >
                      <div className="px-4 py-3 bg-white/[0.04] border-b border-white/[0.06] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap text-[14px]">
                            <span className="font-bold text-white">{route.fromShortName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10.5px] font-bold">➔ 轉入</span>
                            <span className="font-bold text-emerald-300">{route.toLabel}</span>
                          </div>
                        </div>
                        <span className={`text-[15.5px] font-bold tabular-nums whitespace-nowrap shrink-0 ${
                          route.isDone ? 'text-emerald-400' : 'text-amber-300'
                        }`}>
                          {route.isDone
                            ? '✓ 已歸墊'
                            : Store.formatMoney(route.totalRemainingInToCur, route.toCurrency)}
                        </span>
                      </div>

                      <div className="divide-y divide-white/[0.05]">
                        {route.breakdown.map((it) => (
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
                              <div className="text-[12.5px] font-medium text-zinc-100 truncate">
                                {it.cardName} {it.last4 ? `(${it.last4})` : ''}
                              </div>
                              <div className="text-[11px] text-zinc-500 truncate">
                                {it.pools.map((p) => `${p.name} ${Store.formatMoney(p.amount, it.currency)}`).join(' · ')}
                              </div>
                            </div>
                            <span className={`text-[12.5px] font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                              it.isDone ? 'text-emerald-400' : 'text-zinc-200'
                            }`}>
                              {it.isDone ? '已歸墊' : Store.formatMoney(it.remainingAmount, it.currency)} ›
                            </span>
                          </button>
                        ))}
                      </div>

                      {!route.isDone && (
                        <div className="px-3.5 py-2.5 bg-white/[0.02] border-t border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => handleExecuteGlobalRoute(route)}
                            className="w-full py-2 rounded-xl bg-amber-400 text-black text-[12.5px] font-bold active:scale-[0.99] transition"
                          >
                            立即從 {route.fromShortName} 轉入 {Store.formatMoney(route.totalRemainingInToCur, route.toCurrency)}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Per-Main-Bank Upcoming Auto-Pay Totals & Balance Check */}
            {globalTransferPlan.mainBanks.length > 0 && (
              <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
                <span className="text-[12.5px] font-bold text-emerald-300 block">步驟 2：各主找數戶口到期扣款檢核</span>
                {globalTransferPlan.mainBanks.map((mb) => (
                  <div key={mb.key} className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-bold text-white truncate">{mb.label}</span>
                      <span className="text-[14.5px] font-bold text-white tabular-nums whitespace-nowrap shrink-0">
                        扣款 {Store.formatMoney(mb.totalPayInMainCur, mb.currency)}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      對應卡片：{mb.cards.map((c) => `${c.cardName} (${Store.formatMoney(c.amount, c.currency)})`).join('、')}
                    </div>
                    <div className={`px-2.5 py-1.5 rounded-xl text-[11px] flex items-center justify-between gap-2 tabular-nums ${
                      mb.isSufficient ? 'bg-white/[0.04] text-zinc-300' : 'bg-rose-500/15 text-rose-300'
                    }`}>
                      <span>歸墊後餘額 {Store.formatMoney(mb.afterInbound, mb.currency)}</span>
                      <span className="font-semibold">找數後 {Store.formatMoney(mb.afterPay, mb.currency)}</span>
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
