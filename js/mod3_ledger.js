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

  function formatGroupDate(iso) {
    const d = parseYMD(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 · 星期${WEEKDAYS[d.getDay()]}`;
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
          label: acc.balances.length > 1 ? `${acc.name} (${bal.currency})` : acc.name,
          sublabel: acc.subtitle || bal.currency
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
          amount: -(c.unbilled || 0),
          poolId: null,
          accent: th.accent,
          label: c.name,
          sublabel: `尾號 ${c.last4 || '****'}`
        });
      });
    }
    return list;
  }

  // ---- Separated Payment Picker: Credit Cards vs Bank/E-Wallet (2-Col Multi-Card Grid) ----
  function PaymentSourcePicker({ label, allowCards, options, selectedKey, onSelect, accentTone = 'white', rightAction }) {
    const Store = window.WealthStore;
    const cards = useMemo(() => options.filter((o) => o.kind === 'CARD'), [options]);
    const banks = useMemo(() => options.filter((o) => o.kind === 'ACCOUNT'), [options]);

    const selectedOpt = options.find((o) => o.key === selectedKey) || null;
    const [tab, setTab] = useState(() => (selectedOpt && selectedOpt.kind === 'CARD' && allowCards ? 'CARD' : 'ACCOUNT'));
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
      if (!allowCards) {
        setTab('ACCOUNT');
      } else if (selectedOpt) {
        setTab(selectedOpt.kind === 'CARD' ? 'CARD' : 'ACCOUNT');
      }
    }, [selectedKey, allowCards]);

    const list = tab === 'CARD' && allowCards ? cards : banks;
    const visibleList = showAll || list.length <= 6 ? list : list.slice(0, 6);

    return (
      <div className="rounded-2xl bg-[#141417] border border-white/[0.08] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-zinc-400">{label}</span>
          <div className="flex items-center gap-2">
            {rightAction}
            {allowCards && (
              <div className="p-0.5 rounded-xl bg-black/60 border border-white/[0.08] flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => { setTab('CARD'); setShowAll(false); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${
                    tab === 'CARD' ? 'bg-white text-black' : 'text-zinc-400'
                  }`}
                >
                  信用卡 ({cards.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('ACCOUNT'); setShowAll(false); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${
                    tab === 'ACCOUNT' ? 'bg-white text-black' : 'text-zinc-400'
                  }`}
                >
                  銀行・錢包 ({banks.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="py-4 text-center text-[12px] text-zinc-500">
            {tab === 'CARD' ? '尚未新增信用卡，可切換至「銀行・錢包」或於資產頁設定' : '尚無銀行／錢包帳戶'}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {visibleList.map((opt) => {
                const sel = opt.key === selectedKey;
                const activeClass = accentTone === 'emerald'
                  ? 'bg-emerald-400 text-black border-emerald-300'
                  : 'bg-white text-black border-white';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onSelect(opt)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition relative overflow-hidden ${
                      sel ? activeClass : 'bg-black/45 text-zinc-100 border-white/[0.08] active:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: sel ? '#000000' : opt.accent }}
                      />
                      <span className="text-[13px] font-semibold truncate">{opt.label}</span>
                    </div>
                    <div className={`text-[11px] tabular-nums truncate mt-1 ${sel ? 'text-black/70' : 'text-zinc-400'}`}>
                      {opt.kind === 'CARD'
                        ? `${opt.sublabel} · 待繳 ${Store.formatMoney(-opt.amount, opt.currency)}`
                        : Store.formatMoney(opt.amount, opt.currency)}
                    </div>
                  </button>
                );
              })}
            </div>

            {list.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="w-full py-1.5 rounded-xl bg-white/[0.05] text-[11px] text-zinc-300 font-medium"
              >
                {showAll ? '收合列表' : `顯示全部 ${list.length} 個選項`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- Full-Screen Transaction Editor (Portal z-[60], 3 Major Upgrades) ----
  function TransactionEditorSheet({ open, initialType, editingTx, prefillToCardId, state, onClose, showToast }) {
    const { Icon, NumericInput, BottomSheet } = window.WealthUI;
    const Store = window.WealthStore;

    const allSources = useMemo(() => buildAccountOptions(state, true), [state]);
    const bankSources = useMemo(() => buildAccountOptions(state, false), [state]);

    const defaultSource = useMemo(() => {
      for (let i = 0; i < state.accounts.length; i++) {
        const a = state.accounts[i];
        const defB = (a.balances || []).find((b) => b.isDefaultPayment);
        if (defB) return `ACCOUNT::${a.id}::${defB.id}`;
      }
      return allSources[0] ? allSources[0].key : '';
    }, [state.accounts, allSources]);

    const [txType, setTxType] = useState('EXPENSE');
    const [amount, setAmount] = useState(0);
    const [currency, setCurrency] = useState(state.meta.baseCurrency);
    const [settledAmount, setSettledAmount] = useState(0);
    const [title, setTitle] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [fromKey, setFromKey] = useState('');
    const [toKey, setToKey] = useState('');
    const [poolId, setPoolId] = useState((state.pools[0] && state.pools[0].id) || 'pool_liquid');
    const [poolAutoLinked, setPoolAutoLinked] = useState(true);
    const [counterparty, setCounterparty] = useState('');
    const [date, setDate] = useState(Store.todayISO());
    const [time, setTime] = useState(Store.nowTimeHM());
    const [note, setNote] = useState('');

    // Quick add sub-category mini-sheet
    const [quickSubOpen, setQuickSubOpen] = useState(false);
    const [quickSubName, setQuickSubName] = useState('');
    const [quickSubPool, setQuickSubPool] = useState('');

    useEffect(() => {
      if (!open) return;
      if (editingTx) {
        const nextType = editingTx.type === 'LOAN_SETTLEMENT' ? 'INCOME' : editingTx.type;
        setTxType(nextType);
        setAmount(editingTx.amount || 0);
        setCurrency(editingTx.currency || state.meta.baseCurrency);
        setSettledAmount(editingTx.settledAmount != null ? editingTx.settledAmount : (editingTx.amount || 0));
        setTitle(editingTx.title || '');
        setCategoryId(editingTx.categoryId || '');
        setSubCategoryId(editingTx.subCategoryId || '');
        setFromKey(
          editingTx.accountKind === 'CARD'
            ? `CARD::${editingTx.accountId}::`
            : `ACCOUNT::${editingTx.accountId}::${editingTx.balanceId || ''}`
        );
        setToKey(
          editingTx.toAccountId
            ? (editingTx.toAccountKind === 'CARD'
                ? `CARD::${editingTx.toAccountId}::`
                : `ACCOUNT::${editingTx.toAccountId}::${editingTx.toBalanceId || ''}`)
            : ''
        );
        const effPool = Store.resolveEffectivePoolId(editingTx.categoryId, editingTx.subCategoryId, state);
        setPoolId(editingTx.poolId || effPool);
        setPoolAutoLinked(!editingTx.poolId || editingTx.poolId === effPool);
        setCounterparty(editingTx.counterparty || '');
        setDate(editingTx.date || Store.todayISO());
        setTime(editingTx.time || Store.nowTimeHM());
        setNote(editingTx.note || '');
      } else {
        const nextType = prefillToCardId ? 'TRANSFER' : (initialType || 'EXPENSE');
        setTxType(nextType);
        setAmount(0);
        setCurrency(state.meta.baseCurrency);
        setSettledAmount(0);
        setTitle(prefillToCardId ? '信用卡找數還款' : '');
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
        setFromKey(defaultSource);
        if (prefillToCardId) {
          setToKey(`CARD::${prefillToCardId}::`);
        } else {
          const alt = allSources.find((s) => s.key !== defaultSource);
          setToKey(alt ? alt.key : defaultSource);
        }
        setCounterparty('');
        setDate(Store.todayISO());
        setTime(Store.nowTimeHM());
        setNote('');
      }
    }, [open, editingTx, initialType, prefillToCardId]);

    const filteredCats = useMemo(() => {
      const targetType = txType === 'INCOME' ? 'INCOME' : 'EXPENSE';
      return state.categories.filter((c) => c.type === targetType);
    }, [state.categories, txType]);

    const selectedCat = useMemo(() => filteredCats.find((c) => c.id === categoryId) || filteredCats[0] || null, [filteredCats, categoryId]);
    const activeSubs = useMemo(() => (selectedCat && Array.isArray(selectedCat.subcategories) ? selectedCat.subcategories : []), [selectedCat]);
    const selectedSub = useMemo(() => activeSubs.find((s) => s.id === subCategoryId) || null, [activeSubs, subCategoryId]);

    const fromOpt = useMemo(() => allSources.find((s) => s.key === fromKey) || allSources[0] || null, [allSources, fromKey]);
    const toOpt = useMemo(() => allSources.find((s) => s.key === toKey) || allSources[1] || allSources[0] || null, [allSources, toKey]);

    const targetSettlementCurrency = txType === 'TRANSFER'
      ? (toOpt ? toOpt.currency : currency)
      : (fromOpt ? fromOpt.currency : currency);
    const isCrossCurrency = Boolean(targetSettlementCurrency && currency !== targetSettlementCurrency);

    useEffect(() => {
      if (!isCrossCurrency) {
        setSettledAmount(amount);
      } else if (amount > 0) {
        const inBase = Store.convertToBase(amount, currency, state);
        const targetRate = (state.meta.fxRates && state.meta.fxRates[targetSettlementCurrency]) || 1;
        setSettledAmount(Store.round2(inBase / targetRate));
      } else {
        setSettledAmount(0);
      }
    }, [amount, currency, targetSettlementCurrency, isCrossCurrency]);

    const selectedPoolObj = useMemo(() => state.pools.find((p) => p.id === poolId) || state.pools[0] || null, [state.pools, poolId]);
    const settlementAccLabel = useMemo(() => Store.getPoolSettlementLabel(poolId, state), [poolId, state]);

    if (!open) return null;

    const handleTypeSwitch = (nextType) => {
      setTxType(nextType);
      if (nextType !== 'TRANSFER') {
        const cats = state.categories.filter((c) => c.type === (nextType === 'INCOME' ? 'INCOME' : 'EXPENSE'));
        const nextCat = cats.find((c) => c.id === categoryId) || cats[0] || null;
        if (nextCat) {
          setCategoryId(nextCat.id);
          const firstSub = (nextCat.subcategories || [])[0] || null;
          setSubCategoryId(firstSub ? firstSub.id : '');
          const effPool = Store.resolveEffectivePoolId(nextCat.id, firstSub ? firstSub.id : null, state);
          setPoolId(effPool);
          setPoolAutoLinked(true);
        }
      }
    };

    const handleSelectCategory = (cat) => {
      setCategoryId(cat.id);
      const firstSub = (cat.subcategories || [])[0] || null;
      setSubCategoryId(firstSub ? firstSub.id : '');
      const effPool = Store.resolveEffectivePoolId(cat.id, firstSub ? firstSub.id : null, state);
      setPoolId(effPool);
      setPoolAutoLinked(true);
    };

    const handleSelectSubcategory = (sub) => {
      setSubCategoryId(sub.id);
      setTitle(sub.name);
      const effPool = Store.resolveEffectivePoolId(selectedCat ? selectedCat.id : categoryId, sub.id, state);
      setPoolId(effPool);
      setPoolAutoLinked(true);
    };

    const handleManualPoolSelect = (pid) => {
      setPoolId(pid);
      const effPool = Store.resolveEffectivePoolId(selectedCat ? selectedCat.id : categoryId, subCategoryId, state);
      setPoolAutoLinked(pid === effPool);
    };

    const handleSave = () => {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        showToast('請輸入大於 0 的金額');
        return;
      }
      if (!fromOpt) {
        showToast('請先在資產頁建立帳戶');
        return;
      }
      if (txType === 'TRANSFER' && (!toOpt || fromOpt.key === toOpt.key)) {
        showToast('轉出與轉入帳戶不可相同');
        return;
      }

      const finalTitle = title.trim() || (
        txType === 'TRANSFER'
          ? `${fromOpt.label} ➔ ${toOpt ? toOpt.label : ''}`
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
        toAccountKind: txType === 'TRANSFER' && toOpt ? toOpt.kind : null,
        toAccountId: txType === 'TRANSFER' && toOpt ? toOpt.accountId : null,
        toBalanceId: txType === 'TRANSFER' && toOpt ? toOpt.balanceId : null,
        categoryId: txType === 'TRANSFER' ? null : (selectedCat ? selectedCat.id : null),
        subCategoryId: txType === 'TRANSFER' ? null : (selectedSub ? selectedSub.id : null),
        subCategoryName: txType === 'TRANSFER' ? '' : (selectedSub ? selectedSub.name : ''),
        poolId,
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

    const isCrossSettlementCard = fromOpt && fromOpt.kind === 'CARD' && txType !== 'TRANSFER';
    const isCrossAccountBank = fromOpt && fromOpt.kind === 'ACCOUNT' && selectedPoolObj && selectedPoolObj.settlementAccountId && selectedPoolObj.settlementAccountId !== fromOpt.accountId && txType !== 'TRANSFER';

    return createPortal(
      <div className="fixed inset-0 z-[60] bg-[#0B0B0D] flex flex-col anim-sheet-up">
        {/* Clean 2-Row Top Header */}
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

          <div className="px-4 pb-3 pt-1">
            <div className="p-1 rounded-2xl bg-[#16161A] border border-white/[0.08] grid grid-cols-5 gap-1">
              {TX_TYPES.map((t) => {
                const active = txType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTypeSwitch(t.value)}
                    className={`py-1.5 rounded-xl text-[13px] font-semibold transition whitespace-nowrap ${
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

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 space-y-3.5">
          {/* 1. Amount & Currency */}
          <div className="rounded-2xl bg-[#141417] border border-white/[0.08] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-zinc-400">交易金額</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/[0.12] text-[12px] font-semibold text-white outline-none"
              >
                {Store.CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
            <NumericInput
              size="lg"
              value={amount}
              currency={currency}
              label={`輸入${TX_TYPES.find((x) => x.value === txType)?.label || ''}金額`}
              quickAdds={[50, 100, 500, 1000]}
              onChange={(val) => setAmount(val)}
            />
            {isCrossCurrency && (
              <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                <div className="text-[11px] text-amber-300">
                  跨幣種實扣／實收折算（帳戶幣種：{targetSettlementCurrency}）
                </div>
                <NumericInput
                  size="sm"
                  value={settledAmount}
                  currency={targetSettlementCurrency}
                  label={`實扣金額 (${targetSettlementCurrency})`}
                  onChange={(val) => setSettledAmount(val)}
                />
              </div>
            )}
          </div>

          {/* 2. Major Category -> Preset Sub-Categories (Instant Tap, Auto-links Pool) */}
          {txType !== 'TRANSFER' && (
            <div className="rounded-2xl bg-[#141417] border border-white/[0.08] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-zinc-400">大類別 ➔ 小類別快選</span>
                <span className="text-[11px] text-zinc-500">可於「設定」自訂</span>
              </div>

              {/* Major Categories Horizontal Track */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5" data-no-swipe="true">
                {filteredCats.map((cat) => {
                  const sel = selectedCat && cat.id === selectedCat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className={`shrink-0 px-3 py-2 rounded-xl border flex items-center gap-1.5 transition ${
                        sel
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-black/45 text-zinc-200 border-white/[0.08]'
                      }`}
                    >
                      <span style={{ color: sel ? '#000000' : cat.color }}>
                        <Icon name={cat.icon} size={15} />
                      </span>
                      <span className="text-[13px] whitespace-nowrap">{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Preset Sub-Categories Chips for Selected Major Category */}
              <div className="pt-2.5 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">
                    {selectedCat ? `${selectedCat.name} · 點選小類別自動帶入` : '小類別'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeSubs.map((sub) => {
                    const sel = sub.id === subCategoryId;
                    const overridePool = sub.defaultPoolId ? state.pools.find((p) => p.id === sub.defaultPoolId) : null;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectSubcategory(sub)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium border flex items-center gap-1.5 transition ${
                          sel
                            ? 'bg-emerald-400 text-black border-emerald-300 font-semibold'
                            : 'bg-black/45 text-zinc-200 border-white/[0.08] active:bg-white/10'
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
                    className="px-2.5 py-1.5 rounded-full text-[12px] text-zinc-400 border border-dashed border-white/20 active:bg-white/10"
                  >
                    + 自訂小類
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Separated Payment Source Picker (Credit Cards vs Bank/E-Wallet) */}
          <PaymentSourcePicker
            label={
              txType === 'TRANSFER'
                ? '轉出帳戶'
                : txType === 'INCOME'
                ? '入帳帳戶'
                : txType === 'PAYABLE'
                ? '收款帳戶（借款入帳）'
                : '付款方式（信用卡 / 帳戶分流）'
            }
            allowCards={txType !== 'PAYABLE'}
            options={txType === 'PAYABLE' ? bankSources : allSources}
            selectedKey={fromOpt ? fromOpt.key : ''}
            onSelect={(opt) => {
              setFromKey(opt.key);
              setCurrency(opt.currency);
            }}
          />

          {/* Transfer Destination Picker + Swap */}
          {txType === 'TRANSFER' && (
            <PaymentSourcePicker
              label="轉入帳戶 / 找數信用卡"
              allowCards={true}
              options={allSources}
              selectedKey={toOpt ? toOpt.key : ''}
              accentTone="emerald"
              onSelect={(opt) => setToKey(opt.key)}
              rightAction={
                <button
                  type="button"
                  onClick={() => {
                    const oldFrom = fromKey;
                    setFromKey(toKey);
                    setToKey(oldFrom);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 active:opacity-70"
                >
                  <Icon name="swap" size={13} /> 對調
                </button>
              }
            />
          )}

          {/* 4. Upgraded Attribution Pool Card (Critical for Cross-Account / Credit Card Settlement) */}
          <div className="rounded-2xl bg-[#141417] border border-white/[0.12] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[12px] font-semibold text-white whitespace-nowrap">歸屬資金池</span>
                <span className="text-[10px] text-zinc-500 truncate">交叉流水與找數依據</span>
              </div>
              {txType !== 'TRANSFER' && (
                poolAutoLinked ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-[10px] font-medium text-emerald-300 whitespace-nowrap shrink-0">
                    已依分類自動關聯
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const eff = Store.resolveEffectivePoolId(selectedCat ? selectedCat.id : categoryId, subCategoryId, state);
                      setPoolId(eff);
                      setPoolAutoLinked(true);
                    }}
                    className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[10px] font-medium text-amber-300 whitespace-nowrap shrink-0"
                  >
                    已手動指定 · 還原自動
                  </button>
                )
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {state.pools.map((p) => {
                const sel = p.id === poolId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleManualPoolSelect(p.id)}
                    className={`px-3 py-2 rounded-xl text-[12px] font-semibold border flex items-center gap-1.5 transition ${
                      sel
                        ? 'bg-white text-black border-white shadow-sm'
                        : 'bg-black/45 text-zinc-200 border-white/[0.08] active:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: p.color }}
                    />
                    <span className="whitespace-nowrap">{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Cross-Account Settlement Preview */}
            <div className="px-3 py-2 rounded-xl bg-black/50 border border-white/[0.06] text-[11px] flex items-center justify-between gap-2">
              <span className="text-zinc-400">
                {isCrossSettlementCard
                  ? `刷卡交叉記帳 ➔ 結算找數來源：`
                  : isCrossAccountBank
                  ? `跨池墊付記錄 ➔ 歸屬應付戶口：`
                  : `此資金池綁定找數戶口：`}
              </span>
              <span className={`font-semibold whitespace-nowrap ${settlementAccLabel ? 'text-emerald-300' : 'text-zinc-500'}`}>
                {settlementAccLabel || '尚未綁定（可於設定配置）'}
              </span>
            </div>
          </div>

          {/* Receivable / Payable Counterparty */}
          {(txType === 'RECEIVABLE' || txType === 'PAYABLE') && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-400/25 p-3.5 space-y-2">
              <label className="text-[12px] text-amber-300 font-medium block">
                {txType === 'RECEIVABLE' ? '代墊對象（待收回）' : '借款對象（待償還）'}
              </label>
              <input
                type="text"
                placeholder="例如：同事 A、朋友名稱"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.12] text-[14px] text-white outline-none"
              />
            </div>
          )}

          {/* 5. Optional Custom Title, Date/Time & Note */}
          <div className="rounded-2xl bg-[#141417] border border-white/[0.08] p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  自訂項目標題（選填）
                </label>
                <input
                  type="text"
                  placeholder={selectedSub ? `預設：${selectedSub.name}` : '留空帶入類別名'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-[13px] text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">備註</label>
                <input
                  type="text"
                  placeholder="選填補充"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-[13px] text-white outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">日期</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-[13px] text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">時間</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-[13px] text-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Save Button */}
        <div
          className="shrink-0 px-4 pt-3 border-t border-white/[0.08] bg-[#0B0B0D]"
          style={{ paddingBottom: 'max(18px, calc(env(safe-area-inset-bottom) + 8px))' }}
        >
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold active:scale-[0.99] transition"
          >
            {editingTx ? '儲存修改' : '確認入帳'}
          </button>
        </div>

        {/* Quick Add Sub-category Sheet */}
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
                  defaultPoolId: quickSubPool || null
                });
                if (created) {
                  setSubCategoryId(created.id);
                  setTitle(created.name);
                  const eff = Store.resolveEffectivePoolId(selectedCat.id, created.id, Store.getState());
                  setPoolId(eff);
                  setPoolAutoLinked(true);
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
    const getPoolObj = (pid) => state.pools.find((p) => p.id === pid);

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
                    const pool = getPoolObj(tx.poolId);
                    const isLoan = tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE';
                    const isSettlement = tx.type === 'LOAN_SETTLEMENT';
                    const isPositive = tx.type === 'INCOME' || (isSettlement && tx.settlementDirection === 'IN');
                    const isTransfer = tx.type === 'TRANSFER';

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
                                {pool && !isTransfer && (
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
