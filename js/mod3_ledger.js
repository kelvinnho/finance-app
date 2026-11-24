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

  // ---- Helper: Build unified account/balance + credit card selector options ----
  function buildAccountOptions(state, includeCards) {
    const list = [];
    (state.accounts || []).forEach((acc) => {
      (acc.balances || []).forEach((bal) => {
        list.push({
          key: `ACCOUNT::${acc.id}::${bal.id}`,
          kind: 'ACCOUNT',
          accountId: acc.id,
          balanceId: bal.id,
          currency: bal.currency,
          amount: bal.amount,
          poolId: bal.poolId,
          label: acc.balances.length > 1 ? `${acc.name} (${bal.currency})` : acc.name,
          sublabel: acc.subtitle || bal.currency
        });
      });
    });
    if (includeCards) {
      (state.cards || []).forEach((c) => {
        list.push({
          key: `CARD::${c.id}::`,
          kind: 'CARD',
          accountId: c.id,
          balanceId: null,
          currency: c.currency,
          amount: -(c.unbilled || 0),
          poolId: 'pool_liquid',
          label: c.name,
          sublabel: `信用卡 · 尾號 ${c.last4 || '****'}`
        });
      });
    }
    return list;
  }

  // ---- Full-Screen Transaction Editor (Portal z-[60], Clean 2-Row Header) ----
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
    const [fromKey, setFromKey] = useState('');
    const [toKey, setToKey] = useState('');
    const [poolId, setPoolId] = useState('pool_liquid');
    const [counterparty, setCounterparty] = useState('');
    const [date, setDate] = useState(Store.todayISO());
    const [time, setTime] = useState(Store.nowTimeHM());
    const [note, setNote] = useState('');

    // Category manager sub-sheet
    const [catMgrOpen, setCatMgrOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatPool, setNewCatPool] = useState('pool_liquid');

    useEffect(() => {
      if (!open) return;
      if (editingTx) {
        setTxType(editingTx.type === 'LOAN_SETTLEMENT' ? 'INCOME' : editingTx.type);
        setAmount(editingTx.amount || 0);
        setCurrency(editingTx.currency || state.meta.baseCurrency);
        setSettledAmount(editingTx.settledAmount != null ? editingTx.settledAmount : (editingTx.amount || 0));
        setTitle(editingTx.title || '');
        setCategoryId(editingTx.categoryId || '');
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
        setPoolId(editingTx.poolId || 'pool_liquid');
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
        setCategoryId(cats[0] ? cats[0].id : '');
        setFromKey(defaultSource);
        if (prefillToCardId) {
          setToKey(`CARD::${prefillToCardId}::`);
        } else {
          const alt = allSources.find((s) => s.key !== defaultSource);
          setToKey(alt ? alt.key : defaultSource);
        }
        setPoolId('pool_liquid');
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

    if (!open) return null;

    const handleTypeSwitch = (nextType) => {
      setTxType(nextType);
      if (nextType !== 'TRANSFER') {
        const cats = state.categories.filter((c) => c.type === (nextType === 'INCOME' ? 'INCOME' : 'EXPENSE'));
        if (cats.length && !cats.some((c) => c.id === categoryId)) {
          setCategoryId(cats[0].id);
          if (cats[0].defaultPoolId) setPoolId(cats[0].defaultPoolId);
        }
      }
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

      const catObj = state.categories.find((c) => c.id === categoryId);
      const finalTitle = title.trim() || (
        txType === 'TRANSFER'
          ? `${fromOpt.label} ➔ ${toOpt ? toOpt.label : ''}`
          : txType === 'RECEIVABLE'
          ? `代墊 · ${counterparty.trim() || (catObj ? catObj.name : '應收款項')}`
          : txType === 'PAYABLE'
          ? `借款 · ${counterparty.trim() || '應付款項'}`
          : (catObj ? catObj.name : '日常紀錄')
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
        categoryId: txType === 'TRANSFER' ? null : (categoryId || (filteredCats[0] && filteredCats[0].id) || null),
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

    return createPortal(
      <div className="fixed inset-0 z-[60] bg-[#0B0B0D] flex flex-col anim-sheet-up">
        {/* Clean 2-Row Top Header (Zero Clutter) */}
        <div className="shrink-0 safe-top bg-[#0B0B0D] border-b border-white/[0.08]">
          {/* Row 1: Action Bar */}
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

          {/* Row 2: Clean 5-Type Full-Width Selector */}
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
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          {/* Amount & Currency Card */}
          <div className="rounded-2xl bg-[#141417] border border-white/[0.08] p-4 space-y-3">
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

          {/* Category Horizontal Track (Non-Transfer) */}
          {txType !== 'TRANSFER' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[12px] text-zinc-400">分類</span>
                <button
                  type="button"
                  onClick={() => setCatMgrOpen(true)}
                  className="text-[12px] text-zinc-400 active:text-white"
                >
                  + 管理分類
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-no-swipe="true">
                {filteredCats.map((cat) => {
                  const sel = cat.id === categoryId;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat.id);
                        if (cat.defaultPoolId) setPoolId(cat.defaultPoolId);
                      }}
                      className={`shrink-0 px-3.5 py-2.5 rounded-2xl border flex items-center gap-2 transition ${
                        sel
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-[#141417] text-zinc-200 border-white/[0.08]'
                      }`}
                    >
                      <span style={{ color: sel ? '#000000' : cat.color }}>
                        <Icon name={cat.icon} size={16} />
                      </span>
                      <span className="text-[13px] whitespace-nowrap">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account / Card Horizontal Track */}
          <div className="space-y-2">
            <div className="text-[12px] text-zinc-400 px-0.5">
              {txType === 'TRANSFER'
                ? '轉出帳戶'
                : txType === 'INCOME'
                ? '入帳帳戶'
                : txType === 'PAYABLE'
                ? '收款帳戶（借款入帳）'
                : '付款帳戶 / 信用卡'}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-no-swipe="true">
              {(txType === 'PAYABLE' ? bankSources : allSources).map((opt) => {
                const sel = fromOpt && opt.key === fromOpt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setFromKey(opt.key);
                      setCurrency(opt.currency);
                      if (opt.poolId) setPoolId(opt.poolId);
                    }}
                    className={`shrink-0 px-3.5 py-2.5 rounded-2xl border text-left transition ${
                      sel
                        ? 'bg-white text-black border-white'
                        : 'bg-[#141417] text-zinc-200 border-white/[0.08]'
                    }`}
                  >
                    <div className="text-[13px] font-semibold whitespace-nowrap">{opt.label}</div>
                    <div className={`text-[11px] tabular-nums mt-0.5 whitespace-nowrap ${sel ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {opt.kind === 'CARD' ? '信用卡' : Store.formatMoney(opt.amount, opt.currency)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transfer Destination Track + Swap */}
          {txType === 'TRANSFER' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[12px] text-zinc-400">轉入帳戶 / 找數信用卡</span>
                <button
                  type="button"
                  onClick={() => {
                    const oldFrom = fromKey;
                    setFromKey(toKey);
                    setToKey(oldFrom);
                  }}
                  className="inline-flex items-center gap-1 text-[12px] text-emerald-400 active:opacity-70"
                >
                  <Icon name="swap" size={14} /> 對調方向
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-no-swipe="true">
                {allSources.map((opt) => {
                  const sel = toOpt && opt.key === toOpt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setToKey(opt.key)}
                      className={`shrink-0 px-3.5 py-2.5 rounded-2xl border text-left transition ${
                        sel
                          ? 'bg-emerald-400 text-black border-emerald-300'
                          : 'bg-[#141417] text-zinc-200 border-white/[0.08]'
                      }`}
                    >
                      <div className="text-[13px] font-semibold whitespace-nowrap">{opt.label}</div>
                      <div className={`text-[11px] tabular-nums mt-0.5 whitespace-nowrap ${sel ? 'text-black/70' : 'text-zinc-400'}`}>
                        {opt.kind === 'CARD' ? `欠款 ${Store.formatMoney(-opt.amount, opt.currency)}` : Store.formatMoney(opt.amount, opt.currency)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Title, Date/Time, Pool & Note */}
          <div className="rounded-2xl bg-[#141417] border border-white/[0.08] p-4 space-y-3">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">項目標題（留空自動帶入分類）</label>
              <input
                type="text"
                placeholder="例如：午餐外食、咖啡"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-[14px] text-white outline-none"
              />
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
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">歸屬資金池</label>
                <select
                  value={poolId}
                  onChange={(e) => setPoolId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-[13px] text-white outline-none"
                >
                  {state.pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">備註</label>
                <input
                  type="text"
                  placeholder="選填"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
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

        {/* Sub-Sheet: Manage Categories */}
        <BottomSheet
          open={catMgrOpen}
          title={`管理${txType === 'INCOME' ? '收入' : '支出'}分類`}
          onClose={() => setCatMgrOpen(false)}
          footer={
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="輸入新分類名稱"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCatName.trim()) return;
                  const created = Store.addCategory({
                    type: txType === 'INCOME' ? 'INCOME' : 'EXPENSE',
                    name: newCatName,
                    defaultPoolId: newCatPool
                  });
                  setCategoryId(created.id);
                  setNewCatName('');
                  showToast(`已新增分類「${created.name}」`);
                }}
                className="px-4 py-2.5 rounded-xl bg-white text-black text-[13px] font-bold shrink-0"
              >
                新增
              </button>
            </div>
          }
        >
          <div className="space-y-2">
            {filteredCats.map((cat) => (
              <div key={cat.id} className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span style={{ color: cat.color }}><Icon name={cat.icon} size={16} /></span>
                  <span className="text-[14px] text-white">{cat.name}</span>
                </div>
                {filteredCats.length > 1 && (
                  <button
                    type="button"
                    onClick={() => Store.deleteCategory(cat.id)}
                    className="p-1.5 text-zinc-500 active:text-rose-400"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </div>
            ))}
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

    // Edit/Add rule form
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
    const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-11
    const [selectedDate, setSelectedDate] = useState(null);
    const [monthExpanded, setMonthExpanded] = useState(false);
    const [filterPendingLoans, setFilterPendingLoans] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedTxId, setExpandedTxId] = useState(null);
    const [splitOpen, setSplitOpen] = useState(false);

    // Loan settle picker sheet
    const [settlingTx, setSettlingTx] = useState(null);
    const [settleTargetKey, setSettleTargetKey] = useState('');

    const allAccounts = useMemo(() => buildAccountOptions(state, true), [state]);

    const pendingLoans = useMemo(() => {
      return state.transactions.filter(
        (t) => (t.type === 'RECEIVABLE' || t.type === 'PAYABLE') && !t.isLoanSettled
      );
    }, [state.transactions]);

    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

    // Dots map for calendar
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

    // Calendar days (week strip or full month grid)
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
      // Week around selectedDate or today (if same month) or 1st of month
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
          const hay = `${tx.title || ''} ${tx.note || ''} ${tx.counterparty || ''}`.toLowerCase();
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
        {/* Row 1: Clean Un-Truncated Month Navigation & Actions */}
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

        {/* Row 2: Slim Pending Loans Banner (Zero Wrapping) */}
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
              placeholder="搜尋標題、對象或備註…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#141417] border border-white/[0.12] text-[14px] text-white outline-none"
              autoFocus
            />
          </div>
        )}

        {/* Week / Full Month Calendar Strip */}
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
                              <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                                {getAccountLabel(tx)} · {tx.time || ''}
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

                        {/* Expanded Detail & Actions */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1 bg-white/[0.03] border-t border-white/[0.05] space-y-2.5">
                            {tx.note && <div className="text-[12px] text-zinc-400">備註：{tx.note}</div>}

                            {/* Pending Loan: Confirm Settle */}
                            {isLoan && !tx.isLoanSettled && (
                              <button
                                type="button"
                                onClick={() => openSettleSheet(tx)}
                                className="w-full py-2.5 rounded-xl bg-emerald-400 text-black text-[13px] font-bold"
                              >
                                {tx.type === 'RECEIVABLE' ? '確認收回款項' : '確認已還款'}
                              </button>
                            )}

                            {/* Settled Loan: One-tap Undo Settlement */}
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

                            {/* Standard Edit & Paired Delete Controls */}
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

        {/* Salary Split Drawer */}
        <SplitRulesSheet
          open={splitOpen}
          state={state}
          onClose={() => setSplitOpen(false)}
          showToast={showToast}
        />

        {/* Loan Settlement Account Picker Sheet */}
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
