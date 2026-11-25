(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;
  const { createPortal } = ReactDOM;

  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const TX_TYPES = [
    { value: 'EXPENSE', label: '支出' },
    { value: 'INCOME', label: '收入' },
    { value: 'TRANSFER', label: '轉帳' },
    { value: 'RECEIVABLE', label: '應收' },
    { value: 'PAYABLE', label: '應付' }
  ];

  function parseYMD(iso) {
    const parts = String(iso || '').split('-').map(Number);
    return new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1);
  }

  function fmtYMD(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function shiftDaysISO(deltaDays) {
    const d = new Date();
    d.setDate(d.getDate() + deltaDays);
    return fmtYMD(d);
  }

  function formatGroupDate(iso) {
    const d = parseYMD(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 · 星期${WEEKDAYS[d.getDay()]}`;
  }

  function formatShortDate(iso) {
    const parts = String(iso || '').split('-');
    if (parts.length !== 3) return iso || '';
    return `${Number(parts[1])}/${Number(parts[2])}`;
  }

  function buildAccountOptions(state, includeCards) {
    const Store = window.WealthStore;
    const list = [];
    (state.accounts || []).forEach((acc) => {
      const th = Store.CARD_THEMES.find((t) => t.id === acc.theme) || Store.CARD_THEMES[0];
      (acc.balances || []).forEach((bal) => {
        list.push({
          key: `ACCOUNT::${acc.id}::${bal.id}`,
          kind: 'ACCOUNT',
          accountType: acc.type || 'BANK',
          accountId: acc.id,
          balanceId: bal.id,
          currency: bal.currency,
          amount: bal.amount,
          poolId: bal.poolId,
          accent: th.accent,
          bg: th.bg,
          label: acc.balances.length > 1 ? `${acc.name} (${bal.currency})` : acc.name,
          shortLabel: acc.name,
          sublabel: acc.subtitle || bal.currency,
          statementDay: null
        });
      });
    });
    if (includeCards) {
      (state.cards || []).forEach((c) => {
        const th = Store.CARD_THEMES.find((t) => t.id === c.theme) || Store.CARD_THEMES[1];
        list.push({
          key: `CARD::${c.id}::`,
          kind: 'CARD',
          accountType: 'CARD',
          accountId: c.id,
          balanceId: null,
          currency: c.currency,
          amount: -((c.unbilled || 0) + (c.billed || 0)),
          poolId: null,
          accent: th.accent,
          bg: th.bg,
          label: c.name,
          shortLabel: c.name,
          sublabel: `尾號 ${c.last4 || '****'} · ${c.statementDay || 15}日截`,
          statementDay: c.statementDay || 15
        });
      });
    }
    return list;
  }

  // ---- Zero-Scroll Balanced Compact Transaction Editor (iPhone 14 Proportioned, Full 4x5 Calc, Portal z-[60]) ----
  function TransactionEditorSheet({ open, initialType, editingTx, prefillToCardId, state, onClose, showToast }) {
    const { Icon, BottomSheet, useKeypad, evalCalcExpr, hasCalcOp, canClearEntry, applyCalcKey } = window.WealthUI;
    const { openKeypad } = useKeypad();
    const Store = window.WealthStore;

    const allSources = useMemo(() => buildAccountOptions(state, true), [state]);
    const bankSources = useMemo(() => buildAccountOptions(state, false), [state]);
    const cardSources = useMemo(() => allSources.filter((s) => s.kind === 'CARD'), [allSources]);

    const defaultBankKey = useMemo(() => {
      for (let i = 0; i < state.accounts.length; i++) {
        const a = state.accounts[i];
        const defB = (a.balances || []).find((b) => b.isDefaultPayment);
        if (defB) return `ACCOUNT::${a.id}::${defB.id}`;
      }
      return bankSources[0] ? bankSources[0].key : '';
    }, [state.accounts, bankSources]);

    const [txType, setTxType] = useState('EXPENSE');
    const [expr, setExpr] = useState('0');
    const [currency, setCurrency] = useState(state.meta.baseCurrency);
    const [settledAmount, setSettledAmount] = useState(0);
    const [manualSettled, setManualSettled] = useState(false);

    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [title, setTitle] = useState('');
    const [fromKey, setFromKey] = useState('');
    const [toKey, setToKey] = useState('');
    const [poolId, setPoolId] = useState((state.pools[0] && state.pools[0].id) || 'pool_liquid');
    const [poolAutoLinked, setPoolAutoLinked] = useState(true);

    const [billingBucket, setBillingBucket] = useState('UNBILLED');
    const [billingAuto, setBillingAuto] = useState(true);

    const [counterparty, setCounterparty] = useState('');
    const [date, setDate] = useState(Store.todayISO());
    const [time, setTime] = useState(Store.nowTimeHM());
    const [note, setNote] = useState('');

    // Dynamic Bottom Panel: KEYPAD | CATEGORY | ACCOUNT | POOL | BILLING | CURRENCY | DATETIME | NOTE
    const [panel, setPanel] = useState('KEYPAD');
    const [accountTab, setAccountTab] = useState('CARD');
    const [transferSlot, setTransferSlot] = useState('FROM');

    // Quick add sub-category mini-sheet
    const [quickSubOpen, setQuickSubOpen] = useState(false);
    const [quickSubName, setQuickSubName] = useState('');
    const [quickSubPool, setQuickSubPool] = useState('');

    useEffect(() => {
      if (!open) return;
      setPanel('KEYPAD');
      setManualSettled(false);

      if (editingTx) {
        const nextType = editingTx.type === 'LOAN_SETTLEMENT' ? 'INCOME' : editingTx.type;
        setTxType(nextType);
        setExpr(String(editingTx.amount || 0));
        setCurrency(editingTx.currency || state.meta.baseCurrency);
        setSettledAmount(editingTx.settledAmount != null ? editingTx.settledAmount : (editingTx.amount || 0));
        setTitle(editingTx.title || '');
        setCategoryId(editingTx.categoryId || '');
        setSubCategoryId(editingTx.subCategoryId || '');

        const fKey = editingTx.accountKind === 'CARD'
          ? `CARD::${editingTx.accountId}::`
          : `ACCOUNT::${editingTx.accountId}::${editingTx.balanceId || ''}`;
        setFromKey(fKey);
        setAccountTab(editingTx.accountKind === 'CARD' ? 'CARD' : 'ACCOUNT');

        if (editingTx.toAccountId) {
          const tKey = editingTx.toAccountKind === 'CARD'
            ? `CARD::${editingTx.toAccountId}::`
            : `ACCOUNT::${editingTx.toAccountId}::${editingTx.toBalanceId || ''}`;
          setToKey(tKey);
        } else {
          const alt = bankSources.find((b) => b.key !== fKey);
          setToKey(alt ? alt.key : fKey);
        }

        const effPool = Store.resolveEffectivePoolId(editingTx.categoryId, editingTx.subCategoryId, state);
        setPoolId(editingTx.poolId || effPool);
        setPoolAutoLinked(!editingTx.poolId || editingTx.poolId === effPool);

        const txD = editingTx.date || Store.todayISO();
        setDate(txD);
        setTime(editingTx.time || Store.nowTimeHM());

        if (editingTx.accountKind === 'CARD') {
          const cardObj = state.cards.find((c) => c.id === editingTx.accountId);
          const autoB = Store.getAutoCardBillingBucket(cardObj, txD);
          const curB = editingTx.billingBucket || autoB;
          setBillingBucket(curB);
          setBillingAuto(curB === autoB);
        } else {
          setBillingBucket('UNBILLED');
          setBillingAuto(true);
        }

        setCounterparty(editingTx.counterparty || '');
        setNote(editingTx.note || '');
      } else {
        const nextType = initialType || 'EXPENSE';
        setTxType(nextType);
        setExpr('0');
        setTitle('');
        const cats = state.categories.filter((c) => c.type === (nextType === 'INCOME' ? 'INCOME' : 'EXPENSE'));
        const firstCat = cats[0] || null;
        const firstSub = firstCat && Array.isArray(firstCat.subcategories) && firstCat.subcategories[0] ? firstCat.subcategories[0] : null;
        setCategoryId(firstCat ? firstCat.id : '');
        setSubCategoryId(firstSub ? firstSub.id : '');

        const effPool = firstCat
          ? Store.resolveEffectivePoolId(firstCat.id, firstSub ? firstSub.id : null, state)
          : ((state.pools[0] && state.pools[0].id) || 'pool_liquid');
        setPoolId(effPool);
        setPoolAutoLinked(true);

        const allowCard = nextType === 'EXPENSE' || nextType === 'RECEIVABLE';
        const initialFrom = allowCard && cardSources.length > 0 && !defaultBankKey
          ? cardSources[0].key
          : defaultBankKey;
        setFromKey(initialFrom);
        setAccountTab(initialFrom.startsWith('CARD::') ? 'CARD' : 'ACCOUNT');

        const fromObj = allSources.find((s) => s.key === initialFrom);
        setCurrency(fromObj ? fromObj.currency : state.meta.baseCurrency);
        setSettledAmount(0);

        const altBank = bankSources.find((b) => b.key !== initialFrom);
        setToKey(altBank ? altBank.key : initialFrom);

        const todayD = Store.todayISO();
        setDate(todayD);
        setTime(Store.nowTimeHM());
        setBillingBucket('UNBILLED');
        setBillingAuto(true);
        setCounterparty('');
        setNote('');
      }
    }, [open, editingTx, initialType, prefillToCardId]);

    const allowCardsForType = txType === 'EXPENSE' || txType === 'RECEIVABLE';
    const showPoolForType = txType === 'EXPENSE' || txType === 'RECEIVABLE' || txType === 'PAYABLE';

    const filteredCats = useMemo(() => {
      const targetType = txType === 'INCOME' ? 'INCOME' : 'EXPENSE';
      return state.categories.filter((c) => c.type === targetType);
    }, [state.categories, txType]);

    const selectedCat = useMemo(
      () => filteredCats.find((c) => c.id === categoryId) || filteredCats[0] || null,
      [filteredCats, categoryId]
    );
    const activeSubs = useMemo(
      () => (selectedCat && Array.isArray(selectedCat.subcategories) ? selectedCat.subcategories : []),
      [selectedCat]
    );
    const selectedSub = useMemo(
      () => activeSubs.find((s) => s.id === subCategoryId) || null,
      [activeSubs, subCategoryId]
    );

    const eligibleSources = allowCardsForType ? allSources : bankSources;
    const fromOpt = useMemo(
      () => eligibleSources.find((s) => s.key === fromKey) || eligibleSources[0] || null,
      [eligibleSources, fromKey]
    );
    const toOpt = useMemo(
      () => bankSources.find((s) => s.key === toKey) || bankSources.find((s) => fromOpt && s.key !== fromOpt.key) || bankSources[0] || null,
      [bankSources, toKey, fromOpt]
    );

    const isCardSelected = Boolean(allowCardsForType && fromOpt && fromOpt.kind === 'CARD');
    const selectedCardObj = useMemo(
      () => (isCardSelected ? state.cards.find((c) => c.id === fromOpt.accountId) || null : null),
      [isCardSelected, state.cards, fromOpt]
    );

    useEffect(() => {
      if (isCardSelected && selectedCardObj && billingAuto) {
        setBillingBucket(Store.getAutoCardBillingBucket(selectedCardObj, date));
      }
    }, [isCardSelected, selectedCardObj, date, billingAuto]);

    const numericAmount = useMemo(() => Math.max(0, evalCalcExpr(expr)), [expr, evalCalcExpr]);
    const hasOperator = hasCalcOp(expr);
    const showClearEntry = canClearEntry(expr);

    const targetSettlementCurrency = txType === 'TRANSFER'
      ? (toOpt ? toOpt.currency : currency)
      : (fromOpt ? fromOpt.currency : currency);
    const isCrossCurrency = Boolean(targetSettlementCurrency && currency !== targetSettlementCurrency);

    useEffect(() => {
      if (!isCrossCurrency) {
        setSettledAmount(numericAmount);
        setManualSettled(false);
      } else if (!manualSettled) {
        if (numericAmount > 0) {
          const inBase = Store.convertToBase(numericAmount, currency, state);
          const targetRate = (state.meta.fxRates && state.meta.fxRates[targetSettlementCurrency]) || 1;
          setSettledAmount(Store.round2(inBase / targetRate));
        } else {
          setSettledAmount(0);
        }
      }
    }, [numericAmount, currency, targetSettlementCurrency, isCrossCurrency, manualSettled]);

    const selectedPoolObj = useMemo(
      () => state.pools.find((p) => p.id === poolId) || state.pools[0] || null,
      [state.pools, poolId]
    );
    const settlementAccLabel = useMemo(
      () => Store.getPoolSettlementLabel(poolId, state),
      [poolId, state]
    );

    const isCrossPoolBank = Boolean(
      showPoolForType &&
      fromOpt &&
      fromOpt.kind === 'ACCOUNT' &&
      selectedPoolObj &&
      selectedPoolObj.settlementAccountId &&
      selectedPoolObj.settlementAccountId !== fromOpt.accountId
    );

    if (!open) return null;

    const handleTypeSwitch = (nextType) => {
      setTxType(nextType);
      setManualSettled(false);

      const nextAllowsCard = nextType === 'EXPENSE' || nextType === 'RECEIVABLE';
      if (!nextAllowsCard && fromKey.startsWith('CARD::')) {
        const fallback = defaultBankKey || (bankSources[0] ? bankSources[0].key : '');
        setFromKey(fallback);
        setAccountTab('ACCOUNT');
        const obj = bankSources.find((b) => b.key === fallback);
        if (obj) setCurrency(obj.currency);
      }

      if (nextType === 'TRANSFER') {
        const fKey = fromKey.startsWith('CARD::') ? defaultBankKey : fromKey;
        const safeFrom = bankSources.some((b) => b.key === fKey) ? fKey : (bankSources[0] ? bankSources[0].key : '');
        const safeTo = bankSources.some((b) => b.key === toKey && b.key !== safeFrom)
          ? toKey
          : (bankSources.find((b) => b.key !== safeFrom) || bankSources[0] || { key: '' }).key;
        setFromKey(safeFrom);
        setToKey(safeTo);
        if (panel === 'CATEGORY' || panel === 'POOL' || panel === 'BILLING') setPanel('KEYPAD');
      } else {
        const cats = state.categories.filter((c) => c.type === (nextType === 'INCOME' ? 'INCOME' : 'EXPENSE'));
        const nextCat = cats.find((c) => c.id === categoryId) || cats[0] || null;
        if (nextCat) {
          setCategoryId(nextCat.id);
          const firstSub = (nextCat.subcategories || [])[0] || null;
          setSubCategoryId(firstSub ? firstSub.id : '');
          if (nextType !== 'INCOME') {
            const effPool = Store.resolveEffectivePoolId(nextCat.id, firstSub ? firstSub.id : null, state);
            setPoolId(effPool);
            setPoolAutoLinked(true);
          }
        }
        if (nextType === 'INCOME' && (panel === 'POOL' || panel === 'BILLING')) setPanel('KEYPAD');
      }
    };

    const handleSelectCategory = (cat) => {
      setCategoryId(cat.id);
      const firstSub = (cat.subcategories || [])[0] || null;
      setSubCategoryId(firstSub ? firstSub.id : '');
      if (showPoolForType) {
        const effPool = Store.resolveEffectivePoolId(cat.id, firstSub ? firstSub.id : null, state);
        setPoolId(effPool);
        setPoolAutoLinked(true);
      }
    };

    const handleSelectSubcategory = (sub) => {
      setSubCategoryId(sub.id);
      setTitle(sub.name);
      if (showPoolForType) {
        const effPool = Store.resolveEffectivePoolId(selectedCat ? selectedCat.id : categoryId, sub.id, state);
        setPoolId(effPool);
        setPoolAutoLinked(true);
      }
      setPanel('KEYPAD');
    };

    const handlePickAccount = (opt) => {
      if (txType === 'TRANSFER') {
        if (transferSlot === 'FROM') {
          if (opt.key === toKey) setToKey(fromKey);
          setFromKey(opt.key);
          setCurrency(opt.currency);
        } else {
          if (opt.key === fromKey) {
            setFromKey(toKey);
            const swappedFrom = bankSources.find((b) => b.key === toKey);
            if (swappedFrom) setCurrency(swappedFrom.currency);
          }
          setToKey(opt.key);
        }
        setManualSettled(false);
        setPanel('KEYPAD');
        return;
      }

      setFromKey(opt.key);
      setCurrency(opt.currency);
      setManualSettled(false);
      if (opt.kind === 'CARD') {
        const cardObj = state.cards.find((c) => c.id === opt.accountId);
        setBillingAuto(true);
        setBillingBucket(Store.getAutoCardBillingBucket(cardObj, date));
      } else if (panel === 'BILLING') {
        setPanel('KEYPAD');
      }
      setPanel('KEYPAD');
    };

    const handleSwapTransfer = () => {
      if (!fromOpt || !toOpt || fromOpt.key === toOpt.key) return;
      const prevFrom = fromOpt.key;
      const prevTo = toOpt.key;
      setFromKey(prevTo);
      setToKey(prevFrom);
      setCurrency(toOpt.currency);
      setManualSettled(false);
    };

    const handleKeyPress = (k) => {
      setManualSettled(false);
      setExpr((prev) => applyCalcKey(prev, k));
    };

    const handleSave = () => {
      const amt = Math.max(0, evalCalcExpr(expr));
      if (!Number.isFinite(amt) || amt <= 0) {
        showToast('請輸入大於 0 的金額');
        setPanel('KEYPAD');
        return;
      }
      if (!fromOpt) {
        showToast('請先在資產頁建立帳戶');
        return;
      }
      if (txType === 'TRANSFER') {
        if (bankSources.length < 2 || !toOpt || fromOpt.key === toOpt.key) {
          showToast('轉帳需要兩個不同的銀行或電子錢包帳戶');
          return;
        }
      }

      const finalTitle = title.trim() || (
        txType === 'TRANSFER'
          ? `${fromOpt.shortLabel} ➔ ${toOpt ? toOpt.shortLabel : ''}`
          : txType === 'RECEIVABLE'
          ? `代墊 · ${counterparty.trim() || (selectedSub ? selectedSub.name : (selectedCat ? selectedCat.name : '應收款項'))}`
          : txType === 'PAYABLE'
          ? `借款 · ${counterparty.trim() || '應付款項'}`
          : (selectedSub ? selectedSub.name : (selectedCat ? selectedCat.name : '日常紀錄'))
      );

      const payload = {
        type: txType,
        title: finalTitle,
        amount: amt,
        currency,
        settledAmount: isCrossCurrency ? Number(settledAmount || amt) : amt,
        settledCurrency: targetSettlementCurrency || currency,
        accountKind: fromOpt.kind,
        accountId: fromOpt.accountId,
        balanceId: fromOpt.balanceId,
        toAccountKind: txType === 'TRANSFER' && toOpt ? 'ACCOUNT' : null,
        toAccountId: txType === 'TRANSFER' && toOpt ? toOpt.accountId : null,
        toBalanceId: txType === 'TRANSFER' && toOpt ? toOpt.balanceId : null,
        categoryId: txType === 'TRANSFER' ? null : (selectedCat ? selectedCat.id : null),
        subCategoryId: txType === 'TRANSFER' ? null : (selectedSub ? selectedSub.id : null),
        subCategoryName: txType === 'TRANSFER' ? '' : (selectedSub ? selectedSub.name : ''),
        poolId: showPoolForType ? poolId : null,
        billingBucket: isCardSelected ? billingBucket : null,
        counterparty: (txType === 'RECEIVABLE' || txType === 'PAYABLE') ? counterparty.trim() : '',
        date,
        time,
        note: note.trim()
      };

      if (editingTx) {
        Store.updateTransaction(editingTx.id, payload);
        showToast('已更新帳目並同步帳戶餘額');
      } else {
        Store.addTransaction(payload);
        showToast('已入帳並即時更新餘額');
      }
      onClose();
    };

    const togglePanel = (target) => {
      setPanel((cur) => (cur === target ? 'KEYPAD' : target));
    };

    const openAccountPanel = (slot) => {
      if (txType === 'TRANSFER') {
        setTransferSlot(slot || 'FROM');
        setPanel('ACCOUNT');
      } else {
        if (allowCardsForType) {
          setAccountTab(fromOpt && fromOpt.kind === 'CARD' ? 'CARD' : 'ACCOUNT');
        } else {
          setAccountTab('ACCOUNT');
        }
        togglePanel('ACCOUNT');
      }
    };

    const accountRoleLabel = txType === 'INCOME'
      ? '入帳帳戶'
      : txType === 'RECEIVABLE'
      ? '代墊付款'
      : txType === 'PAYABLE'
      ? '借款入帳'
      : (isCardSelected ? '信用卡' : '付款帳戶');

    const keypadKeys = [
      [showClearEntry ? 'C' : 'AC', 'BACK', '%', '÷'],
      ['7', '8', '9', '×'],
      ['4', '5', '6', '-'],
      ['1', '2', '3', '+'],
      ['00', '0', '.', hasOperator ? '=' : 'OK']
    ];

    const sym = Store.getCurrencySymbol(currency);
    const activeCellClass = 'bg-white/[0.08]';

    return createPortal(
      <div
        className="fixed inset-0 z-[60] bg-[#0B0B0D] flex flex-col overflow-hidden anim-sheet-up"
        style={{ height: 'var(--app-height, 100dvh)' }}
      >
        {/* Top Action Bar & 5-Type Selector */}
        <div className="shrink-0 safe-top bg-[#0B0B0D] border-b border-white/[0.08]">
          <div className="px-4 h-11 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-[15px] text-zinc-400 active:text-white py-1 pr-3"
            >
              取消
            </button>
            <span className="text-[16px] font-semibold text-white">
              {editingTx ? '編輯紀錄' : '記一筆'}
            </span>
            <button
              type="button"
              onClick={handleSave}
              className="text-[15px] font-bold text-emerald-400 active:opacity-70 py-1 pl-3"
            >
              儲存
            </button>
          </div>

          <div className="px-3.5 pb-3 pt-0.5">
            <div className="p-1 rounded-2xl bg-[#16161A] border border-white/[0.08] grid grid-cols-5 gap-1">
              {TX_TYPES.map((t) => {
                const active = txType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTypeSwitch(t.value)}
                    className={`py-2 rounded-xl text-[13.5px] font-semibold transition whitespace-nowrap ${
                      active ? 'bg-white text-black shadow-sm' : 'text-zinc-400'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Balanced Middle Section: Spacious Upper Grid + Docked Amount Bar */}
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto px-3.5 pt-3.5 pb-3 max-w-[480px] w-full mx-auto">
          <div className="space-y-2.5">
            {txType === 'TRANSFER' ? (
              /* === TRANSFER Dedicated Dual-Card Flow Layout === */
              <div className="space-y-2.5">
                <div className="relative grid grid-cols-2 gap-3 items-stretch">
                  <button
                    type="button"
                    onClick={() => openAccountPanel('FROM')}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between min-h-[96px] ${
                      panel === 'ACCOUNT' && transferSlot === 'FROM'
                        ? 'bg-[#1D1D24] border-white'
                        : 'bg-[#141417] border-white/[0.09] active:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold tracking-wider text-rose-400">轉出 FROM</span>
                      <span className="text-[11px] text-zinc-500">切換</span>
                    </div>
                    <div className="text-[16px] font-bold text-white truncate mt-1.5 pr-3">
                      {fromOpt ? fromOpt.label : '選擇帳戶'}
                    </div>
                    <div className="text-[12.5px] text-zinc-400 tabular-nums truncate mt-1">
                      {fromOpt ? (
                        numericAmount > 0
                          ? `➔ ${Store.formatMoney(Store.round2(fromOpt.amount - numericAmount), fromOpt.currency)}`
                          : `餘額 ${Store.formatMoney(fromOpt.amount, fromOpt.currency)}`
                      ) : '-'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openAccountPanel('TO')}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between min-h-[96px] pl-4 ${
                      panel === 'ACCOUNT' && transferSlot === 'TO'
                        ? 'bg-[#14251F] border-emerald-400'
                        : 'bg-[#141417] border-white/[0.09] active:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold tracking-wider text-emerald-400">轉入 TO</span>
                      <span className="text-[11px] text-zinc-500">切換</span>
                    </div>
                    <div className="text-[16px] font-bold text-white truncate mt-1.5">
                      {toOpt ? toOpt.label : '選擇帳戶'}
                    </div>
                    <div className="text-[12.5px] text-zinc-400 tabular-nums truncate mt-1">
                      {toOpt ? (
                        numericAmount > 0
                          ? `➔ ${Store.formatMoney(Store.round2(toOpt.amount + (isCrossCurrency ? settledAmount : numericAmount)), toOpt.currency)}`
                          : `餘額 ${Store.formatMoney(toOpt.amount, toOpt.currency)}`
                      ) : '-'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleSwapTransfer}
                    aria-label="對調轉出與轉入帳戶"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#24242B] border-2 border-[#0B0B0D] text-white shadow-xl flex items-center justify-center active:scale-90 transition z-10"
                  >
                    <Icon name="swap" size={18} />
                  </button>
                </div>

                <div className="rounded-2xl bg-[#141417] border border-white/[0.09] grid grid-cols-2 divide-x divide-white/[0.08] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => togglePanel('DATETIME')}
                    className={`h-[54px] px-3.5 flex items-center justify-between gap-2 text-left transition ${panel === 'DATETIME' ? activeCellClass : ''}`}
                  >
                    <span className="text-[14.5px] font-semibold text-emerald-300 tabular-nums truncate">
                      {formatShortDate(date)} · {time}
                    </span>
                    <Icon name="calendar" size={16} className="text-zinc-400 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePanel('NOTE')}
                    className={`h-[54px] px-3.5 flex items-center justify-between gap-2 text-left transition ${panel === 'NOTE' ? activeCellClass : ''}`}
                  >
                    <span className={`text-[14px] truncate ${note || title ? 'text-white font-medium' : 'text-zinc-500'}`}>
                      {note || title || '轉帳備註'}
                    </span>
                    <span className="text-[11px] text-zinc-500 shrink-0">▾</span>
                  </button>
                </div>
              </div>
            ) : (
              /* === EXPENSE / INCOME / RECEIVABLE / PAYABLE Larger & Clearer Info Grid === */
              <div className="rounded-2xl bg-[#141417] border border-white/[0.09] divide-y divide-white/[0.08] overflow-hidden">
                {/* Row 1: Major Category | Date & Time */}
                <div className="grid grid-cols-2 divide-x divide-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => togglePanel('CATEGORY')}
                    className={`h-[58px] px-3.5 flex items-center gap-2.5 text-left transition min-w-0 ${panel === 'CATEGORY' ? activeCellClass : ''}`}
                  >
                    <span className="shrink-0" style={{ color: selectedCat ? selectedCat.color : '#9CA3AF' }}>
                      <Icon name={selectedCat ? selectedCat.icon : 'tag'} size={19} />
                    </span>
                    <span className="text-[16px] font-semibold text-white truncate flex-1">
                      {selectedCat ? selectedCat.name : '選擇分類'}
                    </span>
                    <span className="text-[11px] text-zinc-500 shrink-0">▾</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePanel('DATETIME')}
                    className={`h-[58px] px-3.5 flex items-center justify-between gap-2 text-left transition min-w-0 ${panel === 'DATETIME' ? activeCellClass : ''}`}
                  >
                    <span className="text-[15px] font-semibold text-emerald-300 tabular-nums truncate">
                      {formatShortDate(date)} · {time}
                    </span>
                    <Icon name="calendar" size={16} className="text-zinc-400 shrink-0" />
                  </button>
                </div>

                {/* Row 2: Sub-Category | Note (or Counterparty) */}
                <div className="grid grid-cols-2 divide-x divide-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => togglePanel('CATEGORY')}
                    className={`h-[58px] px-3.5 flex items-center gap-2 text-left transition min-w-0 ${panel === 'CATEGORY' ? activeCellClass : ''}`}
                  >
                    <span className="text-zinc-500 text-[14px] shrink-0">↳</span>
                    <span className={`text-[15px] truncate flex-1 ${selectedSub ? 'text-white font-medium' : 'text-zinc-400'}`}>
                      {selectedSub ? selectedSub.name : '點選小類'}
                    </span>
                    <span className="text-[11px] text-zinc-500 shrink-0">▾</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePanel('NOTE')}
                    className={`h-[58px] px-3.5 flex items-center justify-between gap-2 text-left transition min-w-0 ${panel === 'NOTE' ? activeCellClass : ''}`}
                  >
                    {txType === 'RECEIVABLE' || txType === 'PAYABLE' ? (
                      <span className={`text-[14px] truncate ${counterparty ? 'text-amber-300 font-semibold' : 'text-amber-400/80'}`}>
                        {counterparty
                          ? `${txType === 'RECEIVABLE' ? '待收' : '待還'}·${counterparty}`
                          : (txType === 'RECEIVABLE' ? '代墊對象 / 備註' : '借款對象 / 備註')}
                      </span>
                    ) : (
                      <span className={`text-[14px] truncate ${(note || (title && title !== (selectedSub && selectedSub.name))) ? 'text-white font-medium' : 'text-zinc-500'}`}>
                        {note || (title && title !== (selectedSub && selectedSub.name) ? title : '備註 / 自訂名')}
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-500 shrink-0">▾</span>
                  </button>
                </div>

                {/* Row 3: EXPENSE / RECEIVABLE / PAYABLE */}
                {showPoolForType && (
                  isCardSelected ? (
                    <div className="grid grid-cols-2 divide-x divide-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => togglePanel('POOL')}
                        className={`h-[58px] px-3.5 flex items-center gap-2 text-left transition min-w-0 ${panel === 'POOL' ? activeCellClass : ''}`}
                      >
                        <span className="text-zinc-500 text-[14px] shrink-0">↳</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: selectedPoolObj ? selectedPoolObj.color : '#34D399' }}
                        />
                        <span className="text-[15px] font-semibold text-white truncate flex-1">
                          {selectedPoolObj ? selectedPoolObj.name : '資金池'}
                        </span>
                        <span className={`text-[10.5px] px-1.5 py-0.5 rounded shrink-0 ${
                          poolAutoLinked ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          {poolAutoLinked ? '自動' : '手動'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePanel('BILLING')}
                        className={`h-[58px] px-3.5 flex items-center justify-between gap-2 text-left transition min-w-0 ${panel === 'BILLING' ? activeCellClass : ''}`}
                      >
                        <span className={`text-[14px] font-semibold truncate ${
                          billingBucket === 'BILLED' ? 'text-amber-300' : 'text-sky-300'
                        }`}>
                          {billingBucket === 'BILLED' ? '本期應繳' : '未出帳下期'}
                        </span>
                        <span className={`text-[10.5px] px-1.5 py-0.5 rounded shrink-0 ${
                          billingAuto ? 'bg-white/10 text-zinc-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {billingAuto ? '自動' : '手動'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => togglePanel('POOL')}
                      className={`w-full h-[58px] px-3.5 flex items-center justify-between gap-2 text-left transition ${panel === 'POOL' ? activeCellClass : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-500 text-[14px] shrink-0">↳</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: selectedPoolObj ? selectedPoolObj.color : '#34D399' }}
                        />
                        <span className="text-[15px] font-semibold text-white truncate">
                          {selectedPoolObj ? selectedPoolObj.name : '歸屬資金池'}
                        </span>
                        {poolAutoLinked && (
                          <span className="text-[10.5px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 shrink-0">
                            自動
                          </span>
                        )}
                      </div>
                      <span className={`text-[13px] font-medium truncate shrink-0 max-w-[55%] ${
                        isCrossPoolBank ? 'text-amber-300' : 'text-zinc-400'
                      }`}>
                        {isCrossPoolBank
                          ? `跨池墊付 · ${settlementAccLabel}歸墊 ▾`
                          : '本戶直扣 ▾'}
                      </span>
                    </button>
                  )
                )}
              </div>
            )}

            {/* Contextual Status Strips */}
            {isCardSelected && (
              <div className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-zinc-400 truncate">
                  刷 <strong className="text-zinc-100">{fromOpt ? fromOpt.shortLabel : ''}</strong> ➔ 歸屬 <strong className="text-zinc-100">{selectedPoolObj ? selectedPoolObj.name : ''}</strong>
                </span>
                <span className={`font-semibold whitespace-nowrap shrink-0 ${settlementAccLabel ? 'text-emerald-300' : 'text-zinc-500'}`}>
                  {settlementAccLabel ? `${settlementAccLabel}找數` : '未綁定找數戶'}
                </span>
              </div>
            )}

            {txType === 'INCOME' && fromOpt && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-emerald-200/85 truncate">
                  入帳：<strong className="text-white">{fromOpt.label}</strong>
                </span>
                <span className="text-emerald-300 font-semibold tabular-nums whitespace-nowrap shrink-0">
                  入帳後 {Store.formatMoney(Store.round2(fromOpt.amount + (isCrossCurrency ? settledAmount : numericAmount)), fromOpt.currency)}
                </span>
              </div>
            )}

            {isCrossCurrency && (
              <button
                type="button"
                onClick={() => openKeypad({
                  value: settledAmount,
                  currency: targetSettlementCurrency,
                  label: `調整實扣／實收金額 (${targetSettlementCurrency})`,
                  onConfirm: (val) => {
                    setSettledAmount(val);
                    setManualSettled(true);
                  }
                })}
                className="w-full px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-2 text-[12.5px] text-amber-200"
              >
                <span className="truncate">跨幣種折算 ({currency} ➔ {targetSettlementCurrency})</span>
                <span className="font-bold tabular-nums whitespace-nowrap shrink-0">
                  實算 {Store.formatMoney(settledAmount, targetSettlementCurrency)} · 微調
                </span>
              </button>
            )}
          </div>

          {/* Docked Unified Amount & Account Strip (Flush Above Keypad) */}
          <div className="pt-3">
            <div className="h-[68px] rounded-2xl bg-[#16161B] border border-white/[0.12] flex items-stretch overflow-hidden shadow-lg">
              {txType !== 'TRANSFER' && (
                <button
                  type="button"
                  onClick={() => openAccountPanel()}
                  className="min-w-[116px] max-w-[148px] px-3 flex flex-col justify-center text-left border-r border-white/[0.1] active:opacity-80 transition shrink-0"
                  style={{ background: fromOpt ? fromOpt.bg : '#1E1F24' }}
                >
                  <span className="text-[10.5px] text-white/70 leading-none">{accountRoleLabel}</span>
                  <div className="flex items-center gap-1 mt-1.5 min-w-0">
                    <span className="text-[14px] font-bold text-white truncate">
                      {fromOpt ? fromOpt.shortLabel : '選帳戶'}
                    </span>
                    <span className="text-[11px] text-white/70 shrink-0">▾</span>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => togglePanel('CURRENCY')}
                className={`px-3 flex flex-col items-center justify-center border-r border-white/[0.08] shrink-0 transition ${
                  panel === 'CURRENCY' ? 'bg-white/15' : 'active:bg-white/10'
                }`}
              >
                <span className="text-[13px] font-bold text-zinc-100 leading-none">{currency}</span>
                <span className="text-[10.5px] text-zinc-400 mt-1 leading-none">{sym} ▾</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel('KEYPAD')}
                className="flex-1 px-3.5 flex flex-col items-end justify-center min-w-0 text-right"
              >
                <div className={`font-bold tabular-nums tracking-tight leading-none truncate w-full ${
                  expr.length > 11 ? 'text-[22px]' : 'text-[28px]'
                } ${
                  txType === 'INCOME' ? 'text-emerald-400' : 'text-white'
                }`}>
                  {expr}
                </div>
                {hasOperator && (
                  <div className="text-[12px] text-emerald-400 tabular-nums leading-none mt-1.5">
                    = {sym} {numericAmount.toLocaleString('en-US')}
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (hasOperator) {
                    handleKeyPress('=');
                  } else {
                    handleSave();
                  }
                }}
                className={`w-[64px] shrink-0 flex items-center justify-center font-bold text-[22px] active:opacity-80 transition ${
                  hasOperator
                    ? 'bg-amber-400 text-black'
                    : 'bg-emerald-400 text-black'
                }`}
                aria-label={hasOperator ? '計算結果' : '儲存'}
              >
                {hasOperator ? '=' : <Icon name="check" size={24} strokeWidth={2.6} />}
              </button>
            </div>
          </div>
        </div>

        {/* Sleek Proportioned Bottom Operation Area (No Oversized Stretched Keys) */}
        <div
          className="shrink-0 flex flex-col bg-[#111114] border-t border-white/[0.08] max-w-[480px] w-full mx-auto"
          style={{ paddingBottom: 'max(14px, calc(env(safe-area-inset-bottom) + 4px))' }}
        >
          {/* PANEL 1: Full 4x5 Compact Standard Calculator (AC/C, ⌫, %, ÷, ×, −, +, 00, =/入帳) */}
          {panel === 'KEYPAD' && (
            <div className="p-2.5 grid grid-cols-4 gap-2">
              {keypadKeys.flat().map((k) => {
                const isConfirm = k === 'OK';
                const isOp = k === '+' || k === '-' || k === '×' || k === '÷' || k === '=';
                const isUtil = k === 'BACK' || k === 'C' || k === 'AC' || k === '%';
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (isConfirm) {
                        handleSave();
                      } else {
                        handleKeyPress(k);
                      }
                    }}
                    className={`h-[48px] rounded-2xl font-semibold flex items-center justify-center transition active:scale-95 tabular-nums ${
                      isConfirm
                        ? 'bg-white text-black font-bold text-[15px]'
                        : isOp
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[20px]'
                        : isUtil
                        ? 'bg-white/[0.08] text-zinc-200 text-[15px]'
                        : 'bg-[#1B1B20] text-white border border-white/[0.06] text-[19px]'
                    }`}
                  >
                    {k === 'BACK' ? '⌫' : k === 'OK' ? (editingTx ? '儲存' : '入帳') : k === '-' ? '−' : k}
                  </button>
                );
              })}
            </div>
          )}

          {/* PANEL 2: Split 2-Column Category -> Preset Sub-Categories Selector */}
          {panel === 'CATEGORY' && (
            <div className="h-[304px] flex flex-col">
              <div className="shrink-0 px-3.5 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12px] font-medium text-zinc-400">左選大類別 · 右點小類別即套用</span>
                <button
                  type="button"
                  onClick={() => setPanel('KEYPAD')}
                  className="text-[12.5px] font-semibold text-emerald-400"
                >
                  返回鍵盤
                </button>
              </div>
              <div className="flex-1 min-h-0 grid grid-cols-12 divide-x divide-white/[0.06]">
                <div className="col-span-5 overflow-y-auto overscroll-contain p-2 space-y-1">
                  {filteredCats.map((cat) => {
                    const sel = selectedCat && cat.id === selectedCat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat)}
                        className={`w-full px-2.5 py-2.5 rounded-xl flex items-center gap-2 text-left transition ${
                          sel ? 'bg-white text-black font-semibold' : 'text-zinc-300 active:bg-white/10'
                        }`}
                      >
                        <span className="shrink-0" style={{ color: sel ? '#000000' : cat.color }}>
                          <Icon name={cat.icon} size={16} />
                        </span>
                        <span className="text-[13.5px] truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="col-span-7 overflow-y-auto overscroll-contain p-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {activeSubs.map((sub) => {
                      const sel = sub.id === subCategoryId;
                      const overridePool = showPoolForType && sub.defaultPoolId
                        ? state.pools.find((p) => p.id === sub.defaultPoolId)
                        : null;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSelectSubcategory(sub)}
                          className={`px-3 py-2 rounded-xl text-[13.5px] font-medium border flex items-center gap-1.5 transition ${
                            sel
                              ? 'bg-emerald-400 text-black border-emerald-300 font-semibold'
                              : 'bg-black/45 text-zinc-200 border-white/[0.08] active:bg-white/15'
                          }`}
                        >
                          <span>{sub.name}</span>
                          {overridePool && (
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: sel ? '#000000' : overridePool.color }}
                              title={`自動歸屬：${overridePool.name}`}
                            />
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickSubName('');
                        setQuickSubPool('');
                        setQuickSubOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl text-[13px] text-zinc-400 border border-dashed border-white/20 active:bg-white/10"
                    >
                      + 自訂小類
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PANEL 3: Separated Multi-Card / Bank-EWallet Account Selector */}
          {panel === 'ACCOUNT' && (
            <div className="h-[304px] flex flex-col">
              <div className="shrink-0 px-3.5 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2">
                {txType === 'TRANSFER' ? (
                  <div className="p-0.5 rounded-xl bg-black/60 border border-white/[0.08] flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => setTransferSlot('FROM')}
                      className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${
                        transferSlot === 'FROM' ? 'bg-white text-black' : 'text-zinc-400'
                      }`}
                    >
                      選轉出帳戶
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferSlot('TO')}
                      className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${
                        transferSlot === 'TO' ? 'bg-emerald-400 text-black' : 'text-zinc-400'
                      }`}
                    >
                      選轉入帳戶
                    </button>
                  </div>
                ) : allowCardsForType ? (
                  <div className="p-0.5 rounded-xl bg-black/60 border border-white/[0.08] flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => setAccountTab('CARD')}
                      className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${
                        accountTab === 'CARD' ? 'bg-white text-black' : 'text-zinc-400'
                      }`}
                    >
                      信用卡 ({cardSources.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountTab('ACCOUNT')}
                      className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${
                        accountTab === 'ACCOUNT' ? 'bg-white text-black' : 'text-zinc-400'
                      }`}
                    >
                      銀行・錢包 ({bankSources.length})
                    </button>
                  </div>
                ) : (
                  <span className="text-[12.5px] font-medium text-zinc-400">
                    選擇銀行・電子錢包 ({bankSources.length})
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setPanel('KEYPAD')}
                  className="text-[12.5px] font-semibold text-emerald-400 shrink-0"
                >
                  返回鍵盤
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
                {(() => {
                  const list = txType === 'TRANSFER' || !allowCardsForType
                    ? bankSources
                    : (accountTab === 'CARD' ? cardSources : bankSources);
                  const activeKey = txType === 'TRANSFER' && transferSlot === 'TO'
                    ? (toOpt ? toOpt.key : '')
                    : (fromOpt ? fromOpt.key : '');

                  if (list.length === 0) {
                    return (
                      <div className="py-10 text-center text-[13.5px] text-zinc-500">
                        {accountTab === 'CARD' && allowCardsForType
                          ? '尚未建立信用卡，請切換至「銀行・錢包」或於資產頁設定。'
                          : '尚無可用銀行或電子錢包帳戶。'}
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {list.map((opt) => {
                        const sel = opt.key === activeKey;
                        const isOpposite = txType === 'TRANSFER' && (
                          (transferSlot === 'FROM' && toOpt && opt.key === toOpt.key) ||
                          (transferSlot === 'TO' && fromOpt && opt.key === fromOpt.key)
                        );
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handlePickAccount(opt)}
                            className={`px-3 py-2.5 rounded-xl border text-left transition ${
                              sel
                                ? (txType === 'TRANSFER' && transferSlot === 'TO'
                                    ? 'bg-emerald-400 text-black border-emerald-300'
                                    : 'bg-white text-black border-white')
                                : 'bg-black/45 text-zinc-100 border-white/[0.08] active:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: sel ? '#000000' : opt.accent }}
                                />
                                <span className="text-[13.5px] font-semibold truncate">{opt.label}</span>
                              </div>
                              {isOpposite && (
                                <span className="text-[9.5px] px-1 py-0.5 rounded bg-white/10 text-zinc-400 shrink-0">
                                  對調
                                </span>
                              )}
                            </div>
                            <div className={`text-[11.5px] tabular-nums truncate mt-1 ${sel ? 'text-black/70' : 'text-zinc-400'}`}>
                              {opt.kind === 'CARD'
                                ? `${opt.sublabel} · ${Store.formatMoney(-opt.amount, opt.currency)}`
                                : Store.formatMoney(opt.amount, opt.currency)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* PANEL 4: Funding Pool Selector */}
          {panel === 'POOL' && showPoolForType && (
            <div className="h-[304px] flex flex-col">
              <div className="shrink-0 px-3.5 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-zinc-400">選擇歸屬資金池（交叉找數依據）</span>
                <div className="flex items-center gap-2.5">
                  {!poolAutoLinked && (
                    <button
                      type="button"
                      onClick={() => {
                        const eff = Store.resolveEffectivePoolId(selectedCat ? selectedCat.id : categoryId, subCategoryId, state);
                        setPoolId(eff);
                        setPoolAutoLinked(true);
                        setPanel('KEYPAD');
                      }}
                      className="text-[11.5px] text-amber-300 font-medium"
                    >
                      還原分類預設
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPanel('KEYPAD')}
                    className="text-[12.5px] font-semibold text-emerald-400"
                  >
                    完成
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
                {state.pools.map((p) => {
                  const sel = p.id === poolId;
                  const sLabel = Store.getPoolSettlementLabel(p.id, state);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPoolId(p.id);
                        const eff = Store.resolveEffectivePoolId(selectedCat ? selectedCat.id : categoryId, subCategoryId, state);
                        setPoolAutoLinked(p.id === eff);
                        setPanel('KEYPAD');
                      }}
                      className={`w-full px-3.5 py-3 rounded-xl border flex items-center justify-between gap-2 text-left transition ${
                        sel ? 'bg-white text-black border-white' : 'bg-black/45 text-white border-white/[0.08] active:bg-white/10'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                          <span className="text-[14.5px] font-semibold truncate">{p.name}</span>
                        </div>
                        {p.note && (
                          <div className={`text-[11.5px] truncate mt-0.5 ${sel ? 'text-black/65' : 'text-zinc-500'}`}>
                            {p.note}
                          </div>
                        )}
                      </div>
                      <span className={`text-[12px] font-medium whitespace-nowrap shrink-0 ${
                        sel ? 'text-black/80' : (sLabel ? 'text-emerald-300' : 'text-zinc-500')
                      }`}>
                        {sLabel ? `${sLabel}找數` : '未綁定戶口'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PANEL 5: Credit Card Billing Bucket Selector */}
          {panel === 'BILLING' && isCardSelected && (
            <div className="h-[304px] flex flex-col">
              <div className="shrink-0 px-3.5 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-zinc-400">
                  {selectedCardObj ? `${selectedCardObj.name} · 每月 ${selectedCardObj.statementDay || 15} 日截數` : '帳期歸分'}
                </span>
                <button type="button" onClick={() => setPanel('KEYPAD')} className="text-[12.5px] font-semibold text-emerald-400">
                  完成
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBillingBucket('UNBILLED');
                      setBillingAuto(false);
                      setPanel('KEYPAD');
                    }}
                    className={`p-4 rounded-2xl border text-left transition ${
                      billingBucket === 'UNBILLED'
                        ? 'bg-sky-400/20 border-sky-300 text-white'
                        : 'bg-black/45 border-white/[0.08] text-zinc-300'
                    }`}
                  >
                    <div className="text-[15.5px] font-bold">未出帳下期</div>
                    <div className="text-[12px] text-zinc-400 mt-1">截數日後簽帳，併入下期帳單</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingBucket('BILLED');
                      setBillingAuto(false);
                      setPanel('KEYPAD');
                    }}
                    className={`p-4 rounded-2xl border text-left transition ${
                      billingBucket === 'BILLED'
                        ? 'bg-amber-400/20 border-amber-300 text-white'
                        : 'bg-black/45 border-white/[0.08] text-zinc-300'
                    }`}
                  >
                    <div className="text-[15.5px] font-bold">本期應繳</div>
                    <div className="text-[12px] text-zinc-400 mt-1">截數日當日或之前，計入本期帳單</div>
                  </button>
                </div>

                {!billingAuto && selectedCardObj && (
                  <button
                    type="button"
                    onClick={() => {
                      setBillingAuto(true);
                      setBillingBucket(Store.getAutoCardBillingBucket(selectedCardObj, date));
                      setPanel('KEYPAD');
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/[0.08] text-[12.5px] font-semibold text-emerald-300"
                  >
                    重設為依交易日期（{date}）自動歸分
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PANEL 6: Currency Picker */}
          {panel === 'CURRENCY' && (
            <div className="h-[304px] flex flex-col">
              <div className="shrink-0 px-3.5 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-zinc-400">選擇交易幣種</span>
                <button type="button" onClick={() => setPanel('KEYPAD')} className="text-[12.5px] font-semibold text-emerald-400">
                  返回鍵盤
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-3 gap-2 content-start">
                {Store.CURRENCIES.map((c) => {
                  const sel = c.code === currency;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCurrency(c.code);
                        setManualSettled(false);
                        setPanel('KEYPAD');
                      }}
                      className={`p-3 rounded-xl border text-left transition ${
                        sel ? 'bg-white text-black border-white' : 'bg-black/45 text-white border-white/[0.08] active:bg-white/10'
                      }`}
                    >
                      <div className="text-[15px] font-bold">{c.code}</div>
                      <div className={`text-[11.5px] mt-0.5 ${sel ? 'text-black/70' : 'text-zinc-400'}`}>
                        {c.name} ({c.symbol})
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PANEL 7: Date & Time Quick Picker */}
          {panel === 'DATETIME' && (
            <div className="h-[304px] flex flex-col">
              <div className="shrink-0 px-3.5 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-zinc-400">交易日期與時間</span>
                <button type="button" onClick={() => setPanel('KEYPAD')} className="text-[12.5px] font-semibold text-emerald-400">
                  完成
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '今天', iso: shiftDaysISO(0) },
                    { label: '昨天', iso: shiftDaysISO(-1) },
                    { label: '前天', iso: shiftDaysISO(-2) }
                  ].map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => {
                        setDate(q.iso);
                        if (isCardSelected) setBillingAuto(true);
                      }}
                      className={`py-2.5 rounded-xl text-[13.5px] font-semibold border transition ${
                        date === q.iso ? 'bg-white text-black border-white' : 'bg-black/45 text-zinc-200 border-white/[0.08]'
                      }`}
                    >
                      {q.label} ({formatShortDate(q.iso)})
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11.5px] text-zinc-400 block mb-1">自訂日期</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        if (isCardSelected) setBillingAuto(true);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] text-zinc-400 block mb-1">時間</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PANEL 8: Note / Custom Title / Counterparty */}
          {panel === 'NOTE' && (
            <div className="h-[304px] flex flex-col">
              <div className="shrink-0 px-3.5 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-zinc-400">
                  {txType === 'RECEIVABLE' || txType === 'PAYABLE' ? '對象與備註' : '備註與自訂標題'}
                </span>
                <button type="button" onClick={() => setPanel('KEYPAD')} className="text-[12.5px] font-semibold text-emerald-400">
                  完成
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5">
                {(txType === 'RECEIVABLE' || txType === 'PAYABLE') && (
                  <div>
                    <label className="text-[11.5px] text-amber-300 block mb-1">
                      {txType === 'RECEIVABLE' ? '代墊對象（待收回）' : '借款對象（待償還）'}
                    </label>
                    <input
                      type="text"
                      placeholder="例如：同事 A、朋友名稱"
                      value={counterparty}
                      onChange={(e) => setCounterparty(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-amber-400/30 text-[14px] text-white outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[11.5px] text-zinc-400 block mb-1">備註說明（選填）</label>
                  <input
                    type="text"
                    placeholder="輸入備註內容…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                  />
                </div>
                {txType !== 'TRANSFER' && (
                  <div>
                    <label className="text-[11.5px] text-zinc-400 block mb-1">
                      自訂項目標題（留空自動帶入：{selectedSub ? selectedSub.name : (selectedCat ? selectedCat.name : '類別名')}）
                    </label>
                    <input
                      type="text"
                      placeholder="選填覆蓋預設名稱"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Sub-Category Sub-Sheet */}
        <BottomSheet
          open={quickSubOpen && Boolean(selectedCat)}
          title={selectedCat ? `新增「${selectedCat.name}」小類別` : '新增小類別'}
          onClose={() => setQuickSubOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => {
                if (!quickSubName.trim() || !selectedCat) return;
                const created = Store.addSubcategory(selectedCat.id, {
                  name: quickSubName,
                  defaultPoolId: showPoolForType ? (quickSubPool || null) : null
                });
                if (created) {
                  setSubCategoryId(created.id);
                  setTitle(created.name);
                  if (showPoolForType) {
                    const eff = Store.resolveEffectivePoolId(selectedCat.id, created.id, Store.getState());
                    setPoolId(eff);
                    setPoolAutoLinked(true);
                  }
                  setPanel('KEYPAD');
                  showToast(`已新增小類別「${created.name}」`);
                }
                setQuickSubOpen(false);
              }}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold"
            >
              確認新增並套用
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-zinc-400 block mb-1.5">小類別名稱</label>
              <input
                type="text"
                placeholder="例如：下午茶、外賣午餐"
                value={quickSubName}
                onChange={(e) => setQuickSubName(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                autoFocus
              />
            </div>
            {showPoolForType && (
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">獨立歸屬資金池（選填）</label>
                <select
                  value={quickSubPool}
                  onChange={(e) => setQuickSubPool(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                >
                  <option value="">繼承大類別預設資金池</option>
                  {state.pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </BottomSheet>
      </div>,
      document.body
    );
  }

  // ---- Salary Split Drawer (Dual Tabs: Execute & Full CRUD Management) ----
  function SplitRulesSheet({ open, state, onClose, showToast }) {
    const { Icon, BottomSheet, NumericInput, SegmentedControl } = window.WealthUI;
    const Store = window.WealthStore;

    const bankOpts = useMemo(() => buildAccountOptions(state, false), [state]);
    const [tab, setTab] = useState('RUN');
    const [checkedMap, setCheckedMap] = useState({});
    const [amountMap, setAmountMap] = useState({});

    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState({
      name: '',
      type: 'TRANSFER',
      amount: 5000,
      fromKey: '',
      toKey: '',
      poolId: 'pool_reserve'
    });

    useEffect(() => {
      if (!open) return;
      const nextChecked = {};
      const nextAmt = {};
      (state.splitRules || []).forEach((r) => {
        nextChecked[r.id] = r.enabled !== false;
        nextAmt[r.id] = r.amount;
      });
      setCheckedMap(nextChecked);
      setAmountMap(nextAmt);
      if (bankOpts.length > 0 && !draft.fromKey) {
        setDraft((p) => Object.assign({}, p, {
          fromKey: bankOpts[0].key,
          toKey: (bankOpts[1] || bankOpts[0]).key
        }));
      }
      if ((state.splitRules || []).length === 0) setTab('MANAGE');
    }, [open, state.splitRules]);

    const parseKey = (key) => {
      if (!key) return { accountId: null, balanceId: null, currency: state.meta.baseCurrency };
      const opt = bankOpts.find((o) => o.key === key);
      if (!opt) return { accountId: null, balanceId: null, currency: state.meta.baseCurrency };
      return { accountId: opt.accountId, balanceId: opt.balanceId, currency: opt.currency };
    };

    const startNewRule = () => {
      setEditingId('NEW');
      setDraft({
        name: '',
        type: 'TRANSFER',
        amount: 3000,
        fromKey: bankOpts[0] ? bankOpts[0].key : '',
        toKey: (bankOpts[1] || bankOpts[0]) ? (bankOpts[1] || bankOpts[0]).key : '',
        poolId: 'pool_reserve'
      });
    };

    const startEditRule = (rule) => {
      setEditingId(rule.id);
      setDraft({
        name: rule.name,
        type: rule.type,
        amount: rule.amount,
        fromKey: rule.fromAccountId ? `ACCOUNT::${rule.fromAccountId}::${rule.fromBalanceId || ''}` : (bankOpts[0]?.key || ''),
        toKey: rule.toAccountId ? `ACCOUNT::${rule.toAccountId}::${rule.toBalanceId || ''}` : (bankOpts[0]?.key || ''),
        poolId: rule.poolId || 'pool_liquid'
      });
    };

    const saveRule = () => {
      if (!draft.name.trim()) {
        showToast('請輸入分流項目名稱');
        return;
      }
      const fromP = parseKey(draft.fromKey);
      const toP = parseKey(draft.toKey);
      const payload = {
        name: draft.name.trim(),
        type: draft.type,
        amount: Number(draft.amount || 0),
        currency: draft.type === 'INCOME' ? toP.currency : fromP.currency,
        fromAccountId: draft.type === 'INCOME' ? null : fromP.accountId,
        fromBalanceId: draft.type === 'INCOME' ? null : fromP.balanceId,
        toAccountId: draft.type === 'EXPENSE' ? null : toP.accountId,
        toBalanceId: draft.type === 'EXPENSE' ? null : toP.balanceId,
        poolId: draft.poolId
      };
      if (editingId === 'NEW') {
        Store.addSplitRule(payload);
        showToast('已新增分流項目');
      } else if (editingId) {
        Store.updateSplitRule(editingId, payload);
        showToast('已更新分流項目');
      }
      setEditingId(null);
    };

    const selectedToRun = (state.splitRules || []).filter((r) => checkedMap[r.id]);

    const handleRunBatch = () => {
      if (!selectedToRun.length) {
        showToast('請至少勾選一項分流規則');
        return;
      }
      const count = Store.executeSplitRules(
        selectedToRun.map((r) => ({ ruleId: r.id, amount: amountMap[r.id] }))
      );
      onClose();
      showToast(`已完成批次分流（${count} 筆入帳）`);
    };

    const getAccLabel = (accId, balId) => {
      const found = bankOpts.find((o) => o.accountId === accId && (!balId || o.balanceId === balId));
      return found ? found.label : '未指定';
    };

    const footerContent = tab === 'RUN' ? (
      <button
        type="button"
        onClick={handleRunBatch}
        disabled={selectedToRun.length === 0}
        className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold disabled:opacity-40"
      >
        批次執行已勾選項目 ({selectedToRun.length} 筆)
      </button>
    ) : editingId ? (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditingId(null)}
          className="px-5 py-3.5 rounded-2xl bg-white/10 text-zinc-200 text-[14px] font-medium"
        >
          返回
        </button>
        <button
          type="button"
          onClick={saveRule}
          className="flex-1 py-3.5 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold"
        >
          儲存分流規則
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={startNewRule}
        className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold flex items-center justify-center gap-1.5"
      >
        <Icon name="plus" size={16} /> 新增分流項目
      </button>
    );

    return (
      <BottomSheet
        open={open}
        title="月度發薪分流"
        subtitle="批次入帳、固定撥款與自訂流轉方向"
        onClose={onClose}
        footer={footerContent}
      >
        <div className="space-y-4">
          <SegmentedControl
            value={tab}
            onChange={(v) => { setTab(v); setEditingId(null); }}
            options={[
              { value: 'RUN', label: '執行入帳' },
              { value: 'MANAGE', label: '管理與新增' }
            ]}
          />

          {tab === 'RUN' && (
            <div className="space-y-2.5">
              {(state.splitRules || []).length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="text-[13px] text-zinc-400">尚未設定任何發薪分流規則</div>
                  <button
                    type="button"
                    onClick={() => { setTab('MANAGE'); startNewRule(); }}
                    className="px-4 py-2 rounded-full bg-white/10 text-[12px] text-white"
                  >
                    立即建立第一條規則
                  </button>
                </div>
              ) : (
                state.splitRules.map((rule) => {
                  const isChecked = Boolean(checkedMap[rule.id]);
                  const dirText = rule.type === 'INCOME'
                    ? `入帳 ➔ ${getAccLabel(rule.toAccountId, rule.toBalanceId)}`
                    : rule.type === 'EXPENSE'
                    ? `扣款 ➔ ${getAccLabel(rule.fromAccountId, rule.fromBalanceId)}`
                    : `${getAccLabel(rule.fromAccountId, rule.fromBalanceId)} ➔ ${getAccLabel(rule.toAccountId, rule.toBalanceId)}`;
                  return (
                    <div
                      key={rule.id}
                      className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                        isChecked ? 'bg-black/50 border-white/15' : 'bg-black/25 border-white/[0.05] opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setCheckedMap((p) => Object.assign({}, p, { [rule.id]: !isChecked }))}
                          className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                        >
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-emerald-400 border-emerald-400 text-black' : 'border-white/25'
                          }`}>
                            {isChecked && <Icon name="check" size={13} strokeWidth={2.5} />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-white truncate">{rule.name}</div>
                            <div className="text-[11px] text-zinc-400 truncate mt-0.5">{dirText}</div>
                          </div>
                        </button>
                      </div>
                      <NumericInput
                        size="sm"
                        value={amountMap[rule.id] != null ? amountMap[rule.id] : rule.amount}
                        currency={rule.currency}
                        label={`調整「${rule.name}」本次金額`}
                        onChange={(val) => setAmountMap((p) => Object.assign({}, p, { [rule.id]: val }))}
                      />
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'MANAGE' && !editingId && (
            <div className="space-y-2.5">
              {(state.splitRules || []).length === 0 ? (
                <div className="py-8 text-center text-[13px] text-zinc-500">
                  點擊下方「新增分流項目」建立常用入帳或轉撥流程。
                </div>
              ) : (
                state.splitRules.map((rule) => {
                  const badge = rule.type === 'INCOME' ? '收入入帳' : rule.type === 'EXPENSE' ? '固定支出' : '帳戶轉撥';
                  return (
                    <div key={rule.id} className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.08] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-zinc-300 shrink-0">{badge}</span>
                          <span className="text-[14px] font-semibold text-white truncate">{rule.name}</span>
                        </div>
                        <div className="text-[12px] text-zinc-400 tabular-nums mt-1">
                          {Store.formatMoney(rule.amount, rule.currency)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditRule(rule)}
                          className="p-2 rounded-xl bg-white/[0.06] text-zinc-200"
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            Store.deleteSplitRule(rule.id);
                            showToast('已刪除分流規則');
                          }}
                          className="p-2 rounded-xl bg-rose-500/15 text-rose-400"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'MANAGE' && editingId && (
            <div className="space-y-3.5">
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">項目名稱</label>
                <input
                  type="text"
                  placeholder="例如：薪資入帳、儲蓄撥款"
                  value={draft.name}
                  onChange={(e) => setDraft((p) => Object.assign({}, p, { name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">流轉類型</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'INCOME', l: '收入入帳' },
                    { v: 'TRANSFER', l: '帳戶轉撥' },
                    { v: 'EXPENSE', l: '固定支出' }
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setDraft((p) => Object.assign({}, p, { type: o.v }))}
                      className={`py-2.5 rounded-xl text-[13px] font-semibold border ${
                        draft.type === o.v ? 'bg-white text-black border-white' : 'bg-black/50 text-zinc-300 border-white/10'
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">預設金額</label>
                <NumericInput
                  value={draft.amount}
                  currency={parseKey(draft.type === 'INCOME' ? draft.toKey : draft.fromKey).currency}
                  label="設定分流金額"
                  quickAdds={[1000, 5000, 10000]}
                  onChange={(val) => setDraft((p) => Object.assign({}, p, { amount: val }))}
                />
              </div>

              {draft.type !== 'INCOME' && (
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1.5">來源扣款帳戶</label>
                  <select
                    value={draft.fromKey}
                    onChange={(e) => setDraft((p) => Object.assign({}, p, { fromKey: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                  >
                    {bankOpts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
              )}

              {draft.type === 'TRANSFER' && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDraft((p) => Object.assign({}, p, { fromKey: p.toKey, toKey: p.fromKey }))}
                    className="px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-[12px] text-emerald-300 flex items-center gap-1.5"
                  >
                    <Icon name="swap" size={14} /> 對調轉出 / 轉入方向
                  </button>
                </div>
              )}

              {draft.type !== 'EXPENSE' && (
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1.5">目標入帳帳戶</label>
                  <select
                    value={draft.toKey}
                    onChange={(e) => setDraft((p) => Object.assign({}, p, { toKey: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                  >
                    {bankOpts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
              )}

              {draft.type === 'EXPENSE' && (
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1.5">歸屬資金池</label>
                  <select
                    value={draft.poolId}
                    onChange={(e) => setDraft((p) => Object.assign({}, p, { poolId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                  >
                    {state.pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
    );
  }

  // ---- Main Ledger View ----
  function LedgerView({ state, onEditTx, showToast }) {
    const { Icon, BottomSheet } = window.WealthUI;
    const Store = window.WealthStore;

    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selectedDate, setSelectedDate] = useState(null);
    const [monthExpanded, setMonthExpanded] = useState(false);
    const [filterPendingLoans, setFilterPendingLoans] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedTxId, setExpandedTxId] = useState(null);
    const [splitOpen, setSplitOpen] = useState(false);

    const [settlingTx, setSettlingTx] = useState(null);
    const [settleTargetKey, setSettleTargetKey] = useState('');

    const allAccounts = useMemo(() => buildAccountOptions(state, true), [state]);

    const pendingLoans = useMemo(() => {
      return state.transactions.filter(
        (t) => (t.type === 'RECEIVABLE' || t.type === 'PAYABLE') && !t.isLoanSettled
      );
    }, [state.transactions]);

    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

    const dayMarkers = useMemo(() => {
      const map = {};
      state.transactions.forEach((tx) => {
        if (!tx.date || !tx.date.startsWith(monthPrefix)) return;
        if (!map[tx.date]) map[tx.date] = { inc: false, exp: false };
        if (tx.type === 'INCOME' || (tx.type === 'LOAN_SETTLEMENT' && tx.settlementDirection === 'IN')) {
          map[tx.date].inc = true;
        } else {
          map[tx.date].exp = true;
        }
      });
      return map;
    }, [state.transactions, monthPrefix]);

    const calendarCells = useMemo(() => {
      if (monthExpanded) {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const startPad = firstDay.getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < startPad; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
          cells.push(fmtYMD(new Date(viewYear, viewMonth, d)));
        }
        return cells;
      }
      const anchor = selectedDate && selectedDate.startsWith(monthPrefix)
        ? parseYMD(selectedDate)
        : (viewYear === now.getFullYear() && viewMonth === now.getMonth()
            ? now
            : new Date(viewYear, viewMonth, 1));
      const sunday = new Date(anchor);
      sunday.setDate(anchor.getDate() - anchor.getDay());
      const week = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        week.push(fmtYMD(d));
      }
      return week;
    }, [viewYear, viewMonth, monthExpanded, selectedDate, monthPrefix]);

    const visibleTransactions = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      return state.transactions.filter((tx) => {
        if (filterPendingLoans) {
          if (!((tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE') && !tx.isLoanSettled)) return false;
        } else if (selectedDate) {
          if (tx.date !== selectedDate) return false;
        } else if (!q) {
          if (!tx.date || !tx.date.startsWith(monthPrefix)) return false;
        }
        if (q) {
          const hay = `${tx.title || ''} ${tx.subCategoryName || ''} ${tx.note || ''} ${tx.counterparty || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }, [state.transactions, filterPendingLoans, selectedDate, monthPrefix, searchQuery]);

    const groupedByDate = useMemo(() => {
      const map = new Map();
      visibleTransactions.forEach((tx) => {
        const d = tx.date || Store.todayISO();
        if (!map.has(d)) map.set(d, []);
        map.get(d).push(tx);
      });
      return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [visibleTransactions]);

    const shiftMonth = (delta) => {
      const d = new Date(viewYear, viewMonth + delta, 1);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelectedDate(null);
    };

    const getAccountLabel = (tx) => {
      if (tx.accountKind === 'CARD') {
        const c = state.cards.find((x) => x.id === tx.accountId);
        return c ? c.name : '信用卡';
      }
      const a = state.accounts.find((x) => x.id === tx.accountId);
      return a ? a.name : '帳戶';
    };

    const getCategoryObj = (catId) => state.categories.find((c) => c.id === catId);
    const getPoolObj = (pid) => (pid ? state.pools.find((p) => p.id === pid) : null);

    const openSettleSheet = (tx) => {
      setSettlingTx(tx);
      const match = allAccounts.find((a) => a.kind === 'ACCOUNT' && a.accountId === tx.accountId)
        || allAccounts.find((a) => a.kind === 'ACCOUNT')
        || allAccounts[0];
      setSettleTargetKey(match ? match.key : '');
    };

    const confirmSettleLoan = () => {
      if (!settlingTx || !settleTargetKey) return;
      const picked = allAccounts.find((a) => a.key === settleTargetKey);
      if (!picked) return;
      Store.settleLoan(settlingTx.id, picked.kind, picked.accountId, picked.balanceId);
      setSettlingTx(null);
      showToast(settlingTx.type === 'RECEIVABLE' ? '已確認收回並更新餘額' : '已確認還款並更新餘額');
    };

    const handleDeleteTx = (tx) => {
      const res = Store.deleteTransaction(tx.id);
      setExpandedTxId(null);
      if (res.mode === 'PAIRED_DELETE') {
        showToast('已成對刪除代墊／借款與結清紀錄並回滾餘額');
      } else if (res.mode === 'REOPEN_LOAN') {
        showToast('已刪除結清紀錄，原單已回復為待收／待還狀態');
      } else {
        showToast('已刪除並回滾帳戶餘額');
      }
    };

    return (
      <div className="space-y-3 pb-6">
        {/* Row 1: Un-Truncated Month Nav & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-8 h-8 rounded-full bg-[#141417] border border-white/[0.08] flex items-center justify-center text-zinc-300 active:bg-white/15 shrink-0"
            >
              <Icon name="chevronLeft" size={15} />
            </button>
            <button
              type="button"
              onClick={() => setMonthExpanded(!monthExpanded)}
              className="px-2.5 h-8 rounded-full bg-[#141417] border border-white/[0.08] flex items-center gap-1 text-[13px] font-semibold text-white whitespace-nowrap shrink-0"
            >
              <span>{viewYear}年{viewMonth + 1}月</span>
              <Icon name="chevronDown" size={13} className={`transition-transform ${monthExpanded ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-8 h-8 rounded-full bg-[#141417] border border-white/[0.08] flex items-center justify-center text-zinc-300 active:bg-white/15 shrink-0"
            >
              <Icon name="chevronRight" size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSplitOpen(true)}
              className="px-2.5 h-8 rounded-full bg-[#141417] border border-white/[0.08] flex items-center gap-1 text-[12px] font-medium text-zinc-200 whitespace-nowrap active:bg-white/15"
            >
              <Icon name="split" size={13} /> 分流
            </button>
            <button
              type="button"
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                searchOpen ? 'bg-white text-black border-white' : 'bg-[#141417] border-white/[0.08] text-zinc-300'
              }`}
            >
              <Icon name="search" size={14} />
            </button>
            <button
              type="button"
              onClick={() => Store.togglePrivacy()}
              className="w-8 h-8 rounded-full bg-[#141417] border border-white/[0.08] flex items-center justify-center text-zinc-300 active:bg-white/15"
            >
              <Icon name={state.meta.privacyMode ? 'eyeOff' : 'eye'} size={14} />
            </button>
          </div>
        </div>

        {/* Row 2: Slim Pending Loans Banner */}
        {pendingLoans.length > 0 && (
          <button
            type="button"
            onClick={() => setFilterPendingLoans(!filterPendingLoans)}
            className={`w-full px-3.5 py-2 rounded-2xl border flex items-center justify-between text-[12px] font-medium transition whitespace-nowrap ${
              filterPendingLoans
                ? 'bg-amber-400 text-black border-amber-300 font-semibold'
                : 'bg-amber-500/10 text-amber-300 border-amber-400/25'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Icon name="users" size={14} />
              待收 / 待還 {pendingLoans.length} 筆
            </span>
            <span className="text-[11px] opacity-80">{filterPendingLoans ? '顯示全部' : '只看未結清'}</span>
          </button>
        )}

        {/* Search Bar */}
        {searchOpen && (
          <div className="relative">
            <input
              type="text"
              placeholder="搜尋標題、小類別、對象或備註…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#141417] border border-white/[0.12] text-[14px] text-white outline-none"
              autoFocus
            />
          </div>
        )}

        {/* Calendar Strip */}
        <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-3">
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center text-[11px] text-zinc-500">
            {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((iso, idx) => {
              if (!iso) return <div key={`empty_${idx}`} className="h-10" />;
              const dNum = Number(iso.slice(8, 10));
              const isToday = iso === Store.todayISO();
              const isSelected = iso === selectedDate;
              const inCurrentMonth = iso.startsWith(monthPrefix);
              const mark = dayMarkers[iso];
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : iso)}
                  className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition ${
                    isSelected
                      ? 'bg-white text-black font-bold'
                      : isToday
                      ? 'bg-white/[0.09] text-white font-semibold border border-white/15'
                      : inCurrentMonth
                      ? 'text-zinc-200 active:bg-white/10'
                      : 'text-zinc-600'
                  }`}
                >
                  <span className="text-[13px] tabular-nums leading-none">{dNum}</span>
                  <div className="flex gap-0.5 mt-1 h-1">
                    {mark && mark.exp && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-rose-600' : 'bg-rose-400'}`} />}
                    {mark && mark.inc && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-emerald-400'}`} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grouped Transaction List */}
        {groupedByDate.length === 0 ? (
          <div className="rounded-2xl bg-[#111114] border border-white/[0.08] py-12 text-center text-[13px] text-zinc-500">
            {selectedDate ? `${selectedDate} 尚無收支紀錄` : '本月尚無紀錄，點擊底部 ＋ 快速記帳'}
          </div>
        ) : (
          <div className="space-y-3.5">
            {groupedByDate.map(([dateIso, list]) => (
              <div key={dateIso} className="space-y-1.5">
                <div className="px-1 flex items-center justify-between text-[12px] text-zinc-400">
                  <span className="font-medium">{formatGroupDate(dateIso)}</span>
                  <span className="tabular-nums text-zinc-500">{list.length} 筆</span>
                </div>

                <div className="rounded-2xl bg-[#111114] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
                  {list.map((tx) => {
                    const isExpanded = expandedTxId === tx.id;
                    const cat = getCategoryObj(tx.categoryId);
                    const isLoan = tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE';
                    const isSettlement = tx.type === 'LOAN_SETTLEMENT';
                    const isPositive = tx.type === 'INCOME' || (isSettlement && tx.settlementDirection === 'IN');
                    const isTransfer = tx.type === 'TRANSFER';
                    const showPoolTag = !isTransfer && tx.type !== 'INCOME' && !isSettlement;
                    const pool = showPoolTag ? getPoolObj(tx.poolId) : null;

                    const iconName = isTransfer
                      ? 'swap'
                      : isLoan || isSettlement
                      ? 'users'
                      : (cat ? cat.icon : 'tag');
                    const iconColor = isTransfer
                      ? '#38BDF8'
                      : isLoan
                      ? '#FBBF24'
                      : isSettlement
                      ? '#34D399'
                      : (cat ? cat.color : '#9CA3AF');

                    return (
                      <div key={tx.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                          className={`w-full px-3.5 py-3 flex items-center justify-between gap-3 text-left transition ${
                            isExpanded ? 'bg-white/[0.04]' : 'active:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0" style={{ color: iconColor }}>
                              <Icon name={iconName} size={17} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px] font-semibold text-white truncate">{tx.title}</span>
                                {isLoan && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                                      tx.isLoanSettled
                                        ? 'bg-emerald-500/15 text-emerald-300'
                                        : 'bg-amber-500/20 text-amber-300'
                                    }`}
                                  >
                                    {tx.isLoanSettled
                                      ? '已結清'
                                      : `${tx.type === 'RECEIVABLE' ? '待收' : '待還'}${tx.counterparty ? '·' + tx.counterparty : ''}`}
                                  </span>
                                )}
                                {isSettlement && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/15 text-emerald-300 whitespace-nowrap shrink-0">
                                    結清
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate mt-0.5 flex items-center gap-1.5">
                                <span className="truncate">{getAccountLabel(tx)}</span>
                                {pool && (
                                  <span className="inline-flex items-center gap-1 shrink-0 text-zinc-500">
                                    ·
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: pool.color }} />
                                    {pool.name}
                                  </span>
                                )}
                                <span className="shrink-0 text-zinc-500">· {tx.time || ''}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div
                              className={`text-[14px] font-semibold tabular-nums whitespace-nowrap ${
                                isPositive
                                  ? 'text-emerald-400'
                                  : isTransfer
                                  ? 'text-sky-300'
                                  : 'text-white'
                              }`}
                            >
                              {isTransfer
                                ? Store.formatMoney(tx.amount, tx.currency)
                                : Store.formatMoney(isPositive ? tx.amount : -tx.amount, tx.currency, { showPlus: isPositive })}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1.5 bg-white/[0.03] border-t border-white/[0.05] space-y-2.5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                              {cat && (
                                <span>
                                  類別：{cat.name}{tx.subCategoryName ? ` ▸ ${tx.subCategoryName}` : ''}
                                </span>
                              )}
                              {pool && (
                                <span className="inline-flex items-center gap-1">
                                  歸屬池：
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: pool.color }} />
                                  {pool.name}
                                </span>
                              )}
                              {tx.accountKind === 'CARD' && tx.billingBucket && (
                                <span className={tx.billingBucket === 'BILLED' ? 'text-amber-300' : 'text-sky-300'}>
                                  帳期：{tx.billingBucket === 'BILLED' ? '本期應繳' : '未出帳下期'}
                                </span>
                              )}
                            </div>
                            {tx.note && <div className="text-[12px] text-zinc-400">備註：{tx.note}</div>}

                            {isLoan && !tx.isLoanSettled && (
                              <button
                                type="button"
                                onClick={() => openSettleSheet(tx)}
                                className="w-full py-2.5 rounded-xl bg-emerald-400 text-black text-[13px] font-bold"
                              >
                                {tx.type === 'RECEIVABLE' ? '確認收回款項' : '確認已還款'}
                              </button>
                            )}

                            {isLoan && tx.isLoanSettled && (
                              <button
                                type="button"
                                onClick={() => {
                                  Store.unsettleLoan(tx.id);
                                  showToast('已撤銷結清並回復為待收／待還狀態');
                                }}
                                className="w-full py-2.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[13px] font-semibold flex items-center justify-center gap-1.5"
                              >
                                <Icon name="undo" size={14} />
                                {tx.type === 'RECEIVABLE' ? '撤銷收回（回復待收狀態）' : '撤銷還款（回復待還狀態）'}
                              </button>
                            )}

                            <div className="flex gap-2">
                              {!isSettlement && (
                                <button
                                  type="button"
                                  onClick={() => onEditTx(tx)}
                                  className="flex-1 py-2 rounded-xl bg-white/[0.08] text-zinc-200 text-[12px] font-medium flex items-center justify-center gap-1"
                                >
                                  <Icon name="edit" size={14} /> 編輯
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteTx(tx)}
                                className="flex-1 py-2 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400 text-[12px] font-medium flex items-center justify-center gap-1"
                              >
                                <Icon name="trash" size={14} />
                                {isLoan && tx.isLoanSettled
                                  ? '成對刪除原單與結清'
                                  : isSettlement
                                  ? '刪除並回復原單待收'
                                  : '刪除並回滾'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <SplitRulesSheet
          open={splitOpen}
          state={state}
          onClose={() => setSplitOpen(false)}
          showToast={showToast}
        />

        <BottomSheet
          open={Boolean(settlingTx)}
          title={settlingTx && settlingTx.type === 'RECEIVABLE' ? '選擇收款入帳帳戶' : '選擇還款扣款帳戶'}
          subtitle={settlingTx ? `${settlingTx.title} · ${Store.formatMoney(settlingTx.amount, settlingTx.currency)}` : ''}
          onClose={() => setSettlingTx(null)}
          footer={
            <button
              type="button"
              onClick={confirmSettleLoan}
              className="w-full py-3.5 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold"
            >
              確認結清（不計入純收支）
            </button>
          }
        >
          <div className="space-y-2">
            {allAccounts.map((opt) => {
              const sel = opt.key === settleTargetKey;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSettleTargetKey(opt.key)}
                  className={`w-full px-4 py-3 rounded-2xl border flex items-center justify-between text-left ${
                    sel ? 'bg-white text-black border-white' : 'bg-black/45 text-white border-white/10'
                  }`}
                >
                  <div>
                    <div className="text-[14px] font-semibold">{opt.label}</div>
                    <div className={`text-[11px] ${sel ? 'text-zinc-600' : 'text-zinc-400'}`}>{opt.sublabel}</div>
                  </div>
                  <div className="text-[13px] font-semibold tabular-nums">
                    {opt.kind === 'CARD' ? '信用卡' : Store.formatMoney(opt.amount, opt.currency)}
                  </div>
                </button>
              );
            })}
          </div>
        </BottomSheet>
      </div>
    );
  }

  window.WealthLedger = { LedgerView, TransactionEditorSheet };
})();
