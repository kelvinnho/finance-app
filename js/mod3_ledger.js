(function () {
  const { useState, useMemo } = React;
  const Store = window.WealthStore;
  const { Icons, CategoryIcon, BottomSheet, NumericInput, NumericKeypad, evaluateMathExpr } = window.WealthUI;

  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  const RECORD_TYPES = {
    EXPENSE:    { id: 'EXPENSE',    label: '支出', accent: 'text-rose-400',    pill: 'bg-rose-500 text-white' },
    INCOME:     { id: 'INCOME',     label: '收入', accent: 'text-emerald-400', pill: 'bg-emerald-500 text-black' },
    TRANSFER:   { id: 'TRANSFER',   label: '轉帳', accent: 'text-sky-400',     pill: 'bg-sky-500 text-black' },
    RECEIVABLE: { id: 'RECEIVABLE', label: '應收', accent: 'text-amber-400',   pill: 'bg-amber-400 text-black' },
    PAYABLE:    { id: 'PAYABLE',    label: '應付', accent: 'text-purple-400',  pill: 'bg-purple-400 text-white' }
  };

  function formatDateHeading(dateStr) {
    const [y, m, d] = (dateStr || Store.todayISO()).split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const wd = WEEKDAYS[dt.getDay()] || '';
    return `${m}月${d}日 · 星期${wd}`;
  }

  function LedgerMainView({ hideMoney, onToggleHideMoney, onOpenEditor, onNotify }) {
    const state = window.WealthUI.useWealthStore();
    const today = Store.todayISO();
    const [yearMonth, setYearMonth] = useState(() => ({
      year: Number(today.slice(0, 4)),
      month: Number(today.slice(5, 7))
    }));
    const [isCalExpanded, setIsCalExpanded] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [filterPendingLoans, setFilterPendingLoans] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedTxId, setExpandedTxId] = useState(null);
    const [showBatchSheet, setShowBatchSheet] = useState(false);

    const buckets = state.settings?.buckets || [];
    const baseCurrency = state.settings?.baseCurrency || 'MOP';
    const flatAccounts = useMemo(() => Store.getFlatAccounts(), [state]);

    const pendingLoans = useMemo(() => {
      return (state.transactions || []).filter(t => (t.type === 'RECEIVABLE' || t.type === 'PAYABLE') && !t.isLoanSettled);
    }, [state.transactions]);

    const monthPrefix = `${yearMonth.year}-${String(yearMonth.month).padStart(2, '0')}`;

    const dailyDots = useMemo(() => {
      const map = {};
      (state.transactions || []).forEach(t => {
        if (!t.date.startsWith(monthPrefix)) return;
        if (!map[t.date]) map[t.date] = { exp: false, inc: false };
        if (t.type === 'EXPENSE') map[t.date].exp = true;
        if (t.type === 'INCOME') map[t.date].inc = true;
      });
      return map;
    }, [state.transactions, monthPrefix]);

    const calendarGrid = useMemo(() => {
      const { year, month } = yearMonth;
      const firstWeekday = new Date(year, month - 1, 1).getDay();
      const daysCount = new Date(year, month, 0).getDate();
      const days = Array.from({ length: daysCount }, (_, i) => {
        const dNum = i + 1;
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
        return { dayNum: dNum, iso, dots: dailyDots[iso] || null };
      });
      return { firstWeekday, days };
    }, [yearMonth, dailyDots]);

    const currentWeekDays = useMemo(() => {
      const all = calendarGrid.days;
      const anchor = selectedDate || (today.startsWith(monthPrefix) ? today : all[0]?.iso);
      const idx = all.findIndex(d => d.iso === anchor);
      const start = idx >= 0 ? Math.floor(idx / 7) * 7 : 0;
      return all.slice(start, start + 7);
    }, [calendarGrid, selectedDate, today, monthPrefix]);

    const groupedDays = useMemo(() => {
      const list = (state.transactions || []).filter(t => {
        if (filterPendingLoans) {
          return (t.type === 'RECEIVABLE' || t.type === 'PAYABLE') && !t.isLoanSettled;
        }
        if (selectedDate) {
          if (t.date !== selectedDate) return false;
        } else if (!searchQuery.trim()) {
          if (!t.date.startsWith(monthPrefix)) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const acc = flatAccounts.find(a => a.id === t.accountId);
          return (
            (t.title || '').toLowerCase().includes(q) ||
            (t.merchant || '').toLowerCase().includes(q) ||
            (t.counterparty || '').toLowerCase().includes(q) ||
            (acc?.name || '').toLowerCase().includes(q)
          );
        }
        return true;
      });

      const groups = {};
      list.forEach(tx => {
        if (!groups[tx.date]) groups[tx.date] = { date: tx.date, label: formatDateHeading(tx.date), items: [] };
        groups[tx.date].items.push(tx);
      });
      return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }, [state.transactions, filterPendingLoans, selectedDate, searchQuery, monthPrefix, flatAccounts]);

    const stepMonth = (delta) => {
      setSelectedDate(null);
      setFilterPendingLoans(false);
      setYearMonth(prev => {
        let m = prev.month + delta;
        let y = prev.year;
        if (m > 12) { m = 1; y += 1; }
        if (m < 1) { m = 12; y -= 1; }
        return { year: y, month: m };
      });
    };

    const resolveCategoryMeta = (tx) => {
      const flow = tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const cat = (state.settings?.categories?.[flow] || []).find(c => c.id === tx.mainCatId);
      const sub = cat?.subs?.find(s => s.id === tx.subCatId);
      return {
        iconKey: cat?.iconKey || 'tag',
        color: cat?.color || '#94A3B8',
        catPath: cat ? `${cat.name}${sub ? ` ▸ ${sub.name}` : ''}` : ''
      };
    };

    return (
      <div className="space-y-3.5 animate-fade">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button type="button" onClick={() => stepMonth(-1)} className="w-8 h-8 rounded-full bg-[#161618] border border-white/[0.07] text-zinc-400 flex items-center justify-center shrink-0">
              <Icons.ChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => setIsCalExpanded(!isCalExpanded)}
              className="px-2.5 py-1.5 rounded-xl hover:bg-[#161618] flex items-center gap-1.5 min-w-0"
            >
              <span className="text-base font-bold text-white truncate">
                {yearMonth.year}年 {yearMonth.month}月
              </span>
              <span className="text-[11px] text-[#8E8E93]">{isCalExpanded ? '▴' : '▾'}</span>
            </button>
            <button type="button" onClick={() => stepMonth(1)} className="w-8 h-8 rounded-full bg-[#161618] border border-white/[0.07] text-zinc-400 flex items-center justify-center shrink-0">
              <Icons.ChevronRight />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {pendingLoans.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterPendingLoans(!filterPendingLoans)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 whitespace-nowrap transition ${
                  filterPendingLoans
                    ? 'bg-amber-400 text-black border-amber-300 font-bold'
                    : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                }`}
              >
                待收/還 {pendingLoans.length} 筆
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowBatchSheet(true)}
              className="h-9 px-3 rounded-full bg-[#161618] border border-white/[0.08] text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
            >
              <Icons.Bookmark />
              <span>分流</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSearch(!showSearch);
                setSearchQuery('');
              }}
              className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                showSearch ? 'bg-white text-black border-white' : 'bg-[#161618] text-zinc-400 border-white/[0.08]'
              }`}
            >
              <Icons.Search />
            </button>
            <button
              type="button"
              onClick={onToggleHideMoney}
              className="w-9 h-9 rounded-full bg-[#161618] border border-white/[0.08] text-zinc-400 flex items-center justify-center"
            >
              {hideMoney ? <Icons.EyeOff /> : <Icons.Eye />}
            </button>
          </div>
        </header>

        {showSearch && (
          <input
            type="text"
            autoFocus
            placeholder="搜尋項目、商戶、對象或帳戶"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[#161618] border border-white/10 text-white placeholder-zinc-500 focus:outline-none"
          />
        )}

        <section className="p-3 rounded-3xl bg-[#111113] border border-white/[0.06] space-y-2">
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#636366]">
            {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {isCalExpanded && Array.from({ length: calendarGrid.firstWeekday }).map((_, i) => <div key={'e_' + i} />)}
            {(isCalExpanded ? calendarGrid.days : currentWeekDays).map(d => {
              const isSel = selectedDate === d.iso;
              const isToday = d.iso === today;
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => {
                    setFilterPendingLoans(false);
                    setSelectedDate(isSel ? null : d.iso);
                  }}
                  className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition ${
                    isSel
                      ? 'bg-white text-black font-bold'
                      : isToday
                      ? 'bg-[#1F1F23] text-white font-semibold border border-white/15'
                      : 'text-zinc-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-xs font-mono-num">{d.dayNum}</span>
                  <div className="h-2 flex items-center gap-0.5 mt-0.5">
                    {d.dots?.exp && <span className={`w-1 h-1 rounded-full ${isSel ? 'bg-rose-600' : 'bg-rose-400'}`} />}
                    {d.dots?.inc && <span className={`w-1 h-1 rounded-full ${isSel ? 'bg-emerald-600' : 'bg-emerald-400'}`} />}
                  </div>
                </button>
              );
            })}
          </div>

          {(selectedDate || filterPendingLoans) && (
            <div className="pt-1 border-t border-white/[0.05] flex items-center justify-between text-[11px] px-1">
              <span className="text-amber-300 font-semibold">
                {filterPendingLoans ? '僅顯示待結清款項' : `篩選：${selectedDate}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(null);
                  setFilterPendingLoans(false);
                }}
                className="text-zinc-300 font-semibold"
              >
                顯示全月
              </button>
            </div>
          )}
        </section>

        {groupedDays.length === 0 ? (
          <div className="py-16 rounded-3xl bg-[#111113] border border-white/[0.06] text-center space-y-3">
            <div className="text-sm font-semibold text-zinc-400">尚無相關紀錄</div>
            <button
              type="button"
              onClick={() => onOpenEditor(selectedDate ? { date: selectedDate } : null)}
              className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold"
            >
              ＋ 新增紀錄
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedDays.map(day => (
              <section key={day.date} className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-[#8E8E93]">
                  <span>{day.label}</span>
                  <span className="font-mono-num">{day.items.length} 筆</span>
                </div>

                <div className="rounded-3xl bg-[#111113] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
                  {day.items.map(tx => {
                    const bucketMeta = buckets.find(b => b.id === tx.bucketId);
                    const acc = flatAccounts.find(a => a.id === tx.accountId);
                    const toAcc = tx.toAccountId ? flatAccounts.find(a => a.id === tx.toAccountId) : null;
                    const catMeta = resolveCategoryMeta(tx);
                    const isExpanded = expandedTxId === tx.id;
                    const isLoanPending = (tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE') && !tx.isLoanSettled;

                    return (
                      <div key={tx.id}>
                        <div
                          onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                          className={`px-3.5 py-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                            isExpanded ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border border-white/[0.06]"
                              style={{ backgroundColor: `${catMeta.color}18`, color: catMeta.color }}
                            >
                              <CategoryIcon iconKey={catMeta.iconKey} type={tx.type} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-white truncate">{tx.title}</span>
                                {(tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE') && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 whitespace-nowrap ${
                                    tx.isLoanSettled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                                  }`}>
                                    {tx.isLoanSettled ? '已結清' : `${tx.type === 'RECEIVABLE' ? '待收' : '待還'}${tx.counterparty ? `·${tx.counterparty}` : ''}`}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E93] mt-0.5 truncate">
                                {bucketMeta && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: bucketMeta.color }} />}
                                <span className="truncate">
                                  {tx.type === 'TRANSFER'
                                    ? `${acc?.name || '轉出'} ➔ ${toAcc?.name || '轉入'}`
                                    : (acc?.name || '帳戶')}
                                </span>
                                <span>·</span>
                                <span className="font-mono-num shrink-0">{tx.time}</span>
                              </div>
                            </div>
                          </div>

                          <div className={`text-sm font-bold font-mono-num shrink-0 ${
                            tx.type === 'INCOME' || (tx.type === 'LOAN_SETTLEMENT' && tx.loanDirection === 'IN')
                              ? 'text-emerald-400'
                              : tx.type === 'TRANSFER'
                              ? 'text-sky-400'
                              : isLoanPending
                              ? 'text-amber-300'
                              : 'text-white'
                          }`}>
                            {tx.type === 'INCOME' || (tx.type === 'LOAN_SETTLEMENT' && tx.loanDirection === 'IN')
                              ? '+'
                              : tx.type === 'TRANSFER'
                              ? ''
                              : '-'}
                            {Store.formatMoney(tx.amount, tx.currency, hideMoney)}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-3.5 pt-2.5 bg-black/45 border-t border-white/[0.06] space-y-2.5 text-xs animate-fade">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              {bucketMeta && (
                                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.07] text-zinc-200 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bucketMeta.color }} />
                                  <span>{bucketMeta.name}</span>
                                </span>
                              )}
                              {catMeta.catPath && (
                                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.07] text-zinc-300">
                                  {catMeta.catPath}
                                </span>
                              )}
                              {tx.merchant && (
                                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.07] text-zinc-300">
                                  {tx.merchant}
                                </span>
                              )}
                            </div>

                            {tx.note && (
                              <div className="px-3 py-2 rounded-xl bg-white/[0.04] text-zinc-300">
                                {tx.note}
                              </div>
                            )}

                            {isLoanPending && (
                              <button
                                type="button"
                                onClick={() => {
                                  Store.settleLoanTransaction(tx.id, tx.accountId);
                                  setExpandedTxId(null);
                                  onNotify('已結清款項並還原帳戶餘額');
                                }}
                                className="w-full min-h-[42px] rounded-xl bg-amber-400 text-black font-bold text-xs"
                              >
                                確認已{tx.type === 'RECEIVABLE' ? '收回款項' : '完成還款'}
                              </button>
                            )}

                            {(tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE') && tx.isLoanSettled && (
                              <button
                                type="button"
                                onClick={() => {
                                  const ok = Store.unsettleLoanTransaction(tx.id);
                                  if (ok) {
                                    setExpandedTxId(null);
                                    onNotify(`已撤銷${tx.type === 'RECEIVABLE' ? '收回' : '還款'}並回復為待處理狀態`);
                                  }
                                }}
                                className="w-full min-h-[42px] rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-300 font-bold text-xs"
                              >
                                撤銷{tx.type === 'RECEIVABLE' ? '收回' : '還款'}（回復{tx.type === 'RECEIVABLE' ? '待收' : '待還'}狀態）
                              </button>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                              <button
                                type="button"
                                disabled={tx.isLockedSettled}
                                onClick={() => {
                                  const outcome = Store.deleteTransaction(tx.id);
                                  setExpandedTxId(null);
                                  if (outcome === 'PAIR_DELETED') {
                                    onNotify('已成對刪除原單及結清紀錄，並回滾雙方餘額');
                                  } else if (outcome === 'REVERTED_LOAN') {
                                    onNotify('已刪除結清紀錄，原單已回復為待處理狀態');
                                  } else {
                                    onNotify('已刪除並回滾帳戶餘額');
                                  }
                                }}
                                className="min-h-[40px] rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold disabled:opacity-35"
                              >
                                刪除
                              </button>
                              <button
                                type="button"
                                disabled={tx.isLockedSettled}
                                onClick={() => onOpenEditor(tx)}
                                className="min-h-[40px] rounded-xl bg-white text-black font-bold disabled:opacity-35"
                              >
                                修改
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {showBatchSheet && (
          <PaydayBatchSheet
            templates={state.settings?.paydayTemplates || []}
            accounts={flatAccounts}
            buckets={buckets.filter(b => !b.archived)}
            categories={state.settings?.categories || { EXPENSE: [], INCOME: [] }}
            baseCurrency={baseCurrency}
            targetDate={selectedDate || today}
            onClose={() => setShowBatchSheet(false)}
            onSaveTemplates={(nextTpls) => {
              Store.savePaydayTemplates(nextTpls);
              onNotify('已儲存分流規則設定');
            }}
            onExecute={(items, runDate) => {
              Store.executePaydayBatch(items, runDate || selectedDate || today);
              setShowBatchSheet(false);
              onNotify('已完成批次分流入帳');
            }}
          />
        )}
      </div>
    );
  }

  function PaydayBatchSheet({ templates, accounts, buckets, categories, baseCurrency, targetDate, onClose, onSaveTemplates, onExecute }) {
    const [items, setItems] = useState(templates || []);
    const [mode, setMode] = useState((templates || []).length > 0 ? 'RUN' : 'MANAGE');
    const [runDate, setRunDate] = useState(targetDate);
    const [editingForm, setEditingForm] = useState(null);

    const cashAccounts = useMemo(() => accounts.filter(a => a.kind !== 'CREDIT'), [accounts]);

    const startNewItem = () => {
      const defAcc = cashAccounts[0] || accounts[0];
      const defToAcc = cashAccounts[1] || defAcc;
      setEditingForm({
        isNew: true,
        id: 'pt_' + Date.now(),
        enabled: true,
        title: '',
        type: 'TRANSFER',
        mainCatId: 'TRANSFER',
        subCatId: 'TRANSFER',
        amount: 0,
        currency: defAcc?.currency || baseCurrency,
        bucketId: buckets[0]?.id || 'PUBLIC',
        accountId: defAcc?.id || '',
        toAccountId: defToAcc?.id || ''
      });
    };

    const startEditItem = (it) => {
      setEditingForm({ ...it, isNew: false });
    };

    const commitForm = () => {
      if (!editingForm) return;
      const resolvedAccId = editingForm.accountId || accounts[0]?.id || '';
      const srcAcc = accounts.find(a => a.id === resolvedAccId);
      const toAcc = accounts.find(a => a.id === editingForm.toAccountId);
      const cleanTitle = editingForm.title.trim() || (
        editingForm.type === 'TRANSFER'
          ? `${srcAcc?.name || '轉出'} ➔ ${toAcc?.name || '轉入'}`
          : editingForm.type === 'INCOME'
          ? '固定收入入帳'
          : '固定支出扣款'
      );
      const savedItem = {
        id: editingForm.id,
        enabled: editingForm.enabled !== false,
        title: cleanTitle,
        type: editingForm.type,
        mainCatId: editingForm.type === 'TRANSFER' ? 'TRANSFER' : (editingForm.mainCatId || (editingForm.type === 'INCOME' ? 'cat_salary' : 'cat_home')),
        subCatId: editingForm.type === 'TRANSFER' ? 'TRANSFER' : (editingForm.subCatId || (editingForm.type === 'INCOME' ? 'sub_main_sal' : 'sub_mortgage')),
        amount: Math.max(0, Number(editingForm.amount) || 0),
        currency: srcAcc?.currency || editingForm.currency || baseCurrency,
        bucketId: editingForm.bucketId || buckets[0]?.id || 'PUBLIC',
        accountId: resolvedAccId,
        toAccountId: editingForm.type === 'TRANSFER' ? (editingForm.toAccountId || resolvedAccId) : null
      };

      const nextList = editingForm.isNew
        ? [...items, savedItem]
        : items.map(x => x.id === savedItem.id ? savedItem : x);
      setItems(nextList);
      onSaveTemplates(nextList);
      setEditingForm(null);
    };

    const removeItem = (id) => {
      const nextList = items.filter(x => x.id !== id);
      setItems(nextList);
      onSaveTemplates(nextList);
    };

    const renderFlowLine = (it) => {
      const src = accounts.find(a => a.id === it.accountId);
      const dst = it.toAccountId ? accounts.find(a => a.id === it.toAccountId) : null;
      if (it.type === 'INCOME') return `外部入帳 ➔ ${src?.name || '未選帳戶'}`;
      if (it.type === 'EXPENSE') return `${src?.name || '未選帳戶'} ➔ 固定支出`;
      return `${src?.name || '轉出戶'} ➔ ${dst?.name || '轉入戶'}`;
    };

    const enabledCount = items.filter(i => i.enabled && Number(i.amount) > 0).length;

    return (
      <BottomSheet
        title="月度發薪分流"
        subtitle={mode === 'RUN' ? '勾選並核對本月金額後一鍵入帳' : '自由增刪項目、設定流轉方向與對應帳戶'}
        onClose={onClose}
      >
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-black border border-white/[0.08] text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('RUN'); setEditingForm(null); }}
            className={`py-2 rounded-xl transition ${mode === 'RUN' ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93]'}`}
          >
            執行入帳 ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('MANAGE')}
            className={`py-2 rounded-xl transition ${mode === 'MANAGE' ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93]'}`}
          >
            管理與新增
          </button>
        </div>

        {mode === 'RUN' ? (
          <div className="space-y-3">
            <label className="px-3.5 py-2.5 rounded-2xl bg-black border border-white/[0.08] flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span>批次入帳日期</span>
              <input
                type="date"
                value={runDate}
                onChange={e => setRunDate(e.target.value || targetDate)}
                className="bg-transparent text-white font-mono-num font-bold text-right focus:outline-none"
              />
            </label>

            {items.length === 0 ? (
              <div className="py-8 text-center space-y-2.5">
                <div className="text-xs text-[#8E8E93]">尚未設定任何分流項目</div>
                <button
                  type="button"
                  onClick={() => { setMode('MANAGE'); startNewItem(); }}
                  className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold"
                >
                  ＋ 建立首筆分流規則
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {items.map((it, idx) => {
                    const bMeta = buckets.find(b => b.id === it.bucketId);
                    const typeBadge = it.type === 'INCOME'
                      ? { text: '收入', cls: 'bg-emerald-500/15 text-emerald-300' }
                      : it.type === 'EXPENSE'
                      ? { text: '支出', cls: 'bg-rose-500/15 text-rose-300' }
                      : { text: '轉撥', cls: 'bg-sky-500/15 text-sky-300' };
                    return (
                      <div
                        key={it.id}
                        className={`p-3 rounded-2xl bg-black border border-white/[0.08] flex items-center justify-between gap-2 ${
                          it.enabled ? '' : 'opacity-45'
                        }`}
                      >
                        <div
                          onClick={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, enabled: !x.enabled } : x))}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                            it.enabled ? 'bg-emerald-400 text-black' : 'bg-zinc-800'
                          }`}>
                            {it.enabled && <Icons.Check />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${typeBadge.cls}`}>
                                {typeBadge.text}
                              </span>
                              <span className="text-xs font-bold text-white truncate">{it.title}</span>
                            </div>
                            <div className="text-[10px] text-[#8E8E93] flex items-center gap-1.5 mt-0.5 truncate">
                              {bMeta && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: bMeta.color }} />}
                              <span className="truncate">{renderFlowLine(it)}</span>
                            </div>
                          </div>
                        </div>

                        <NumericInput
                          value={it.amount}
                          label={it.title}
                          subtitle={renderFlowLine(it)}
                          currency={it.currency || baseCurrency}
                          onChange={val => setItems(prev => prev.map((x, i) => i === idx ? { ...x, amount: Math.max(0, val) } : x))}
                          className="min-w-[88px] px-2.5 py-1.5 rounded-xl bg-[#161618] border border-white/15 text-right text-xs shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={enabledCount === 0}
                  onClick={() => onExecute(items, runDate)}
                  className="w-full min-h-[48px] rounded-2xl bg-white text-black font-bold text-sm disabled:opacity-40"
                >
                  確認批次入帳 ({enabledCount} 筆)
                </button>
              </>
            )}
          </div>
        ) : editingForm ? (
          <div className="space-y-3 text-xs animate-fade">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{editingForm.isNew ? '新增分流項目' : '編輯分流項目'}</span>
              <button type="button" onClick={() => setEditingForm(null)} className="text-[#8E8E93]">取消</button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'INCOME',   label: '收入入帳', active: 'bg-emerald-400 text-black border-emerald-300' },
                { id: 'EXPENSE',  label: '固定支出', active: 'bg-rose-500 text-white border-rose-400' },
                { id: 'TRANSFER', label: '帳戶轉撥', active: 'bg-sky-400 text-black border-sky-300' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    const nextCats = categories[t.id] || [];
                    const firstCat = nextCats[0];
                    const firstSub = firstCat?.subs?.[0];
                    setEditingForm(prev => ({
                      ...prev,
                      type: t.id,
                      mainCatId: t.id === 'TRANSFER' ? 'TRANSFER' : (firstCat?.id || 'cat_home'),
                      subCatId: t.id === 'TRANSFER' ? 'TRANSFER' : (firstSub?.id || 'sub_mortgage'),
                      toAccountId: t.id === 'TRANSFER' ? (prev.toAccountId || cashAccounts[1]?.id || prev.accountId) : null
                    }));
                  }}
                  className={`py-2.5 rounded-xl font-bold border transition ${
                    editingForm.type === t.id ? t.active : 'bg-black text-[#8E8E93] border-white/[0.08]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3">
                <label className="block text-[11px] text-[#8E8E93] mb-1">項目名稱</label>
                <input
                  type="text"
                  placeholder={editingForm.type === 'INCOME' ? '如：每月薪資' : editingForm.type === 'EXPENSE' ? '如：物業按揭' : '如：撥入預留池'}
                  value={editingForm.title}
                  onChange={e => setEditingForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/15 text-white font-semibold"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-[#8E8E93] mb-1">預設金額</label>
                <NumericInput
                  value={editingForm.amount}
                  label="預設分流金額"
                  currency={accounts.find(a => a.id === editingForm.accountId)?.currency || baseCurrency}
                  onChange={val => setEditingForm(prev => ({ ...prev, amount: Math.max(0, val) }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/15 text-right text-sm"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black border border-white/[0.08] space-y-2.5">
              <div>
                <label className="block text-[11px] text-[#8E8E93] mb-1">
                  {editingForm.type === 'INCOME' ? '入帳目標帳戶' : editingForm.type === 'EXPENSE' ? '扣款來源帳戶' : '轉出帳戶 (From)'}
                </label>
                <select
                  value={editingForm.accountId}
                  onChange={e => setEditingForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#161618] border border-white/10 text-white font-semibold"
                >
                  {(editingForm.type === 'EXPENSE' ? accounts : cashAccounts).map(a => (
                    <option key={a.id} value={a.id} className="bg-zinc-900">
                      {a.fullName} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>

              {editingForm.type === 'TRANSFER' && (
                <>
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setEditingForm(prev => ({
                        ...prev,
                        accountId: prev.toAccountId || prev.accountId,
                        toAccountId: prev.accountId
                      }))}
                      className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-[11px] font-bold text-sky-300 flex items-center gap-1.5 active:scale-95 transition"
                    >
                      <Icons.ArrowLeftRight />
                      <span>對調轉出 / 轉入方向</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] text-sky-400 mb-1">轉入目標帳戶 (To)</label>
                    <select
                      value={editingForm.toAccountId || ''}
                      onChange={e => setEditingForm(prev => ({ ...prev, toAccountId: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#161618] border border-white/10 text-white font-semibold"
                    >
                      {cashAccounts.map(a => (
                        <option key={a.id} value={a.id} className="bg-zinc-900">
                          {a.fullName} ({a.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {editingForm.type !== 'TRANSFER' && (
              <div>
                <label className="block text-[11px] text-[#8E8E93] mb-1">入帳分類</label>
                <select
                  value={`${editingForm.mainCatId}::${editingForm.subCatId}`}
                  onChange={e => {
                    const [mc, sc] = e.target.value.split('::');
                    setEditingForm(prev => ({ ...prev, mainCatId: mc, subCatId: sc }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/15 text-white font-semibold"
                >
                  {(categories[editingForm.type] || []).filter(c => !c.archived).map(c => (
                    (c.subs || []).filter(s => !s.archived).map(s => (
                      <option key={s.id} value={`${c.id}::${s.id}`} className="bg-zinc-900">
                        {c.name} ▸ {s.name}
                      </option>
                    ))
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-[#8E8E93] mb-1.5">歸屬資金池</label>
              <div className="flex flex-wrap gap-1.5">
                {buckets.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setEditingForm(prev => ({ ...prev, bucketId: b.id }))}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                      editingForm.bucketId === b.id ? 'bg-white text-black border-white font-bold' : 'bg-black text-zinc-300 border-white/[0.08]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                    <span>{b.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={commitForm}
              className="w-full min-h-[46px] rounded-2xl bg-white text-black font-bold text-sm"
            >
              儲存此分流項目
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map(it => {
              const bMeta = buckets.find(b => b.id === it.bucketId);
              const typeLabel = it.type === 'INCOME' ? '收入' : it.type === 'EXPENSE' ? '支出' : '轉撥';
              return (
                <div key={it.id} className="p-3 rounded-2xl bg-black border border-white/[0.08] flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bMeta?.color || '#38BDF8' }} />
                      <span className="text-xs font-bold text-white truncate">{it.title}</span>
                      <span className="text-[10px] text-[#8E8E93] shrink-0">({typeLabel})</span>
                    </div>
                    <div className="text-[10px] text-[#8E8E93] mt-0.5 truncate">
                      {renderFlowLine(it)} · <span className="font-mono-num text-zinc-300">{Store.formatMoney(it.amount, it.currency || baseCurrency)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditItem(it)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#161618] border border-white/10 text-[11px] font-semibold text-white"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-300 flex items-center justify-center"
                    >
                      <Icons.X />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={startNewItem}
              className="w-full min-h-[46px] rounded-2xl bg-white text-black font-bold text-sm flex items-center justify-center gap-1.5"
            >
              <span>＋</span>
              <span>新增分流項目</span>
            </button>
          </div>
        )}
      </BottomSheet>
    );
  }

  function MozeRecordEditorSheet({ preset, onClose, onSaved }) {
    const state = window.WealthUI.useWealthStore();
    const baseCurrency = state.settings?.baseCurrency || 'MOP';
    const fxRates = state.settings?.fxRates || [];
    const buckets = (state.settings?.buckets || []).filter(b => !b.archived);
    const categories = state.settings?.categories || { EXPENSE: [], INCOME: [] };
    const flatAccounts = useMemo(() => Store.getFlatAccounts(), [state]);

    const editTx = preset?.id && (state.transactions || []).some(t => t.id === preset.id) ? preset : null;
    const [recType, setRecType] = useState(preset?.type || 'EXPENSE');
    const [currency, setCurrency] = useState(preset?.currency || baseCurrency);
    const [amountStr, setAmountStr] = useState(preset?.amount ? String(preset.amount) : '0');

    const flowKey = recType === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const catList = (categories[flowKey] || []).filter(c => !c.archived);
    const initialCat = catList.find(c => c.id === preset?.mainCatId) || catList[0];
    const [selectedCatId, setSelectedCatId] = useState(initialCat?.id);
    const selectedCat = catList.find(c => c.id === selectedCatId) || catList[0];

    const activeSubs = (selectedCat?.subs || []).filter(s => !s.archived);
    const initialSub = activeSubs.find(s => s.id === preset?.subCatId) || activeSubs[0];
    const [selectedSubId, setSelectedSubId] = useState(initialSub?.id);
    const selectedSub = activeSubs.find(s => s.id === selectedSubId) || activeSubs[0];

    const [bucketId, setBucketId] = useState(preset?.bucketId || selectedSub?.defaultBucket || buckets[0]?.id || 'PUBLIC');
    const [accountId, setAccountId] = useState(preset?.accountId || flatAccounts[0]?.id || '');
    const [toAccountId, setToAccountId] = useState(preset?.toAccountId || flatAccounts[1]?.id || flatAccounts[0]?.id || '');
    const [accGroupFilter, setAccGroupFilter] = useState('ALL');
    const [expandCatGrid, setExpandCatGrid] = useState(false);
    const [expandAccGrid, setExpandAccGrid] = useState(false);
    const [creditCycle, setCreditCycle] = useState(preset?.creditCycle || 'UNBILLED');
    const [counterparty, setCounterparty] = useState(preset?.counterparty || '');
    const [loanMode, setLoanMode] = useState(preset?.receivableMode || 'NEW');
    const [title, setTitle] = useState(preset?.title || '');
    const [merchant, setMerchant] = useState(preset?.merchant || '');
    const [note, setNote] = useState(preset?.note || '');
    const [recordDate, setRecordDate] = useState(preset?.date || Store.todayISO());
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [showDetails, setShowDetails] = useState(Boolean(preset?.merchant || preset?.note || preset?.title));
    const [showKeypad, setShowKeypad] = useState(!editTx);
    const [showCatMgr, setShowCatMgr] = useState(false);

    const currentAccount = flatAccounts.find(a => a.id === accountId) || flatAccounts[0];
    const toAccount = flatAccounts.find(a => a.id === toAccountId) || flatAccounts[1] || flatAccounts[0];
    const typeStyle = RECORD_TYPES[recType] || RECORD_TYPES.EXPENSE;

    const evaluatedAmount = useMemo(() => evaluateMathExpr(amountStr, false), [amountStr]);
    const hasOperator = /[+\-]/.test(amountStr.slice(1));

    const isCrossCurrency = currentAccount && currency !== currentAccount.currency && recType !== 'TRANSFER';
    const autoAccountAmount = useMemo(() => {
      if (!isCrossCurrency) return evaluatedAmount;
      const txRate = Store.getRateToBase(currency);
      const accRate = Store.getRateToBase(currentAccount.currency);
      return Math.round((evaluatedAmount * (txRate / (accRate || 1))) * 100) / 100;
    }, [isCrossCurrency, evaluatedAmount, currency, currentAccount]);
    const [customAccountAmt, setCustomAccountAmt] = useState(preset?.accountAmount ?? null);
    const finalAccountAmount = isCrossCurrency
      ? (customAccountAmt !== null ? Number(customAccountAmt) : autoAccountAmount)
      : evaluatedAmount;

    const filteredAccounts = useMemo(() => {
      if (accGroupFilter === 'ALL') return flatAccounts;
      return flatAccounts.filter(a => a.group === accGroupFilter);
    }, [flatAccounts, accGroupFilter]);

    const handleSubmit = (overrideAmt = null) => {
      const amt = overrideAmt !== null ? Number(overrideAmt) : evaluateMathExpr(amountStr, false);
      if (amt <= 0) return;

      const now = new Date();
      const timeStr = editTx?.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const defaultTitle = recType === 'TRANSFER'
        ? `${currentAccount?.name || '轉出'} ➔ ${toAccount?.name || '轉入'}`
        : (selectedSub?.name || selectedCat?.name || RECORD_TYPES[recType]?.label);

      const warnings = Store.saveTransaction({
        id: editTx ? editTx.id : ('tx_' + Date.now()),
        date: recordDate,
        time: timeStr,
        type: recType,
        mainCatId: recType === 'TRANSFER' ? 'TRANSFER' : (selectedCat?.id || 'cat_food'),
        subCatId: recType === 'TRANSFER' ? 'TRANSFER' : (selectedSub?.id || 'sub_dining'),
        title: title.trim() || defaultTitle,
        merchant: merchant.trim(),
        bucketId,
        accountId: currentAccount?.id || '',
        toAccountId: recType === 'TRANSFER' ? (toAccount?.id || '') : null,
        currency,
        amount: amt,
        accountAmount: isCrossCurrency ? finalAccountAmount : amt,
        creditCycle: currentAccount?.kind === 'CREDIT' ? creditCycle : null,
        counterparty: counterparty.trim(),
        receivableMode: loanMode,
        isLoanSettled: editTx?.isLoanSettled || false,
        settlementTxId: editTx?.settlementTxId || null,
        isLockedSettled: false,
        note: note.trim()
      }, saveAsTemplate);

      onSaved(warnings);
      onClose();
    };

    if (showCatMgr) {
      return <CategoryManagerSheet onClose={() => setShowCatMgr(false)} />;
    }

    const currencyList = Array.from(new Set([baseCurrency, 'MOP', 'HKD', 'USD', 'CNY', ...fxRates.map(f => f.code)])).slice(0, 6);

    return (
      <div
        style={{
          height: 'var(--app-height, 100dvh)',
          paddingTop: 'max(12px, env(safe-area-inset-top))'
        }}
        className="fixed inset-0 z-50 bg-black flex flex-col max-w-[440px] mx-auto animate-sheet-up overflow-hidden"
      >
        <div className="px-4 pb-2.5 border-b border-white/[0.07] flex items-center justify-between gap-1.5 shrink-0">
          <button type="button" onClick={onClose} className="min-h-[38px] px-3 rounded-2xl bg-[#161618] text-xs font-semibold text-zinc-300">
            取消
          </button>

          <div className="flex items-center bg-[#161618] p-1 rounded-2xl border border-white/[0.06]">
            {Object.values(RECORD_TYPES).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setRecType(t.id);
                  const nextList = (categories[t.id === 'INCOME' ? 'INCOME' : 'EXPENSE'] || []).filter(c => !c.archived);
                  const firstC = nextList[0];
                  const firstS = (firstC?.subs || []).filter(s => !s.archived)[0];
                  setSelectedCatId(firstC?.id);
                  setSelectedSubId(firstS?.id);
                  if (firstS?.defaultBucket) setBucketId(firstS.defaultBucket);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  recType === t.id ? t.pill : 'text-[#8E8E93]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => handleSubmit()} className="min-h-[38px] px-3.5 rounded-2xl bg-white text-black text-xs font-bold">
            {editTx ? '更新' : '儲存'}
          </button>
        </div>

        <div
          onClick={() => setShowKeypad(true)}
          className="px-4 py-2.5 bg-[#0B0B0D] border-b border-white/[0.07] flex items-center justify-between gap-2 cursor-pointer shrink-0"
        >
          <div data-no-swipe="true" className="flex items-center gap-1 bg-[#161618] p-1 rounded-2xl border border-white/[0.06] overflow-x-auto">
            {currencyList.map(c => (
              <button
                key={c}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrency(c);
                  setCustomAccountAmt(null);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono-num font-bold shrink-0 ${
                  currency === c ? 'bg-white text-black' : 'text-[#8E8E93]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="text-right shrink-0">
            <div className={`text-3xl font-bold font-mono-num tracking-tight ${typeStyle.accent}`}>
              {amountStr}
            </div>
            {hasOperator && (
              <div className="text-[11px] font-mono-num text-[#8E8E93]">
                = {Store.formatMoney(evaluatedAmount, currency)}
              </div>
            )}
          </div>
        </div>

        {isCrossCurrency && (
          <div className="px-4 py-2 bg-[#161618] border-b border-white/[0.08] flex items-center justify-between gap-2 text-xs shrink-0">
            <span className="text-[#8E8E93]">折算 {currentAccount.currency} 實扣</span>
            <NumericInput
              value={finalAccountAmount}
              label={`折算 ${currentAccount.currency} 實扣金額`}
              currency={currentAccount.currency}
              onChange={val => setCustomAccountAmt(val)}
              textClassName="text-amber-300"
              className="min-w-[100px] px-2.5 py-1 rounded-xl bg-black border border-white/15 text-right text-xs"
            />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 space-y-4">
          {(recType === 'EXPENSE' || recType === 'INCOME') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#8E8E93]">分類</span>
                  <button
                    type="button"
                    onClick={() => setExpandCatGrid(!expandCatGrid)}
                    className="text-[11px] text-zinc-400 px-2 py-0.5 rounded bg-[#161618]"
                  >
                    {expandCatGrid ? '收合' : '展開'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCatMgr(true)}
                  className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1"
                >
                  <Icons.Sliders />
                  <span>管理分類</span>
                </button>
              </div>

              <div data-no-swipe="true" className={expandCatGrid ? 'grid grid-cols-3 gap-2' : 'flex gap-2 overflow-x-auto snap-x-rail pb-1'}>
                {catList.map(c => {
                  const isSel = c.id === selectedCat?.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCatId(c.id);
                        const firstS = (c.subs || []).filter(s => !s.archived)[0];
                        if (firstS) {
                          setSelectedSubId(firstS.id);
                          setBucketId(firstS.defaultBucket);
                        }
                      }}
                      className={`snap-x-item shrink-0 ${expandCatGrid ? '' : 'min-w-[106px]'} py-2.5 px-3 rounded-2xl border flex items-center gap-2 transition ${
                        isSel ? 'bg-white text-black border-white font-bold' : 'bg-[#111113] text-zinc-200 border-white/[0.07]'
                      }`}
                    >
                      <span style={{ color: isSel ? '#000' : c.color }}><CategoryIcon iconKey={c.iconKey} /></span>
                      <span className="text-xs truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>

              {activeSubs.length > 0 && (
                <div data-no-swipe="true" className="flex gap-1.5 overflow-x-auto snap-x-rail pt-0.5">
                  {activeSubs.map(s => {
                    const isSubSel = s.id === selectedSub?.id;
                    const bMeta = buckets.find(b => b.id === s.defaultBucket);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubId(s.id);
                          if (s.defaultBucket) setBucketId(s.defaultBucket);
                        }}
                        className={`snap-x-item shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                          isSubSel ? 'bg-[#2C2C2E] text-white border-white/25' : 'bg-[#111113] text-[#8E8E93] border-white/[0.06]'
                        }`}
                      >
                        {bMeta && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bMeta.color }} />}
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(recType === 'RECEIVABLE' || recType === 'PAYABLE') && (
            <div className="p-3.5 rounded-2xl bg-[#111113] border border-white/[0.07] space-y-2.5">
              <input
                type="text"
                placeholder={recType === 'RECEIVABLE' ? '對象名稱（向誰收款）' : '對象名稱（還給誰）'}
                value={counterparty}
                onChange={e => setCounterparty(e.target.value)}
                onFocus={() => setShowKeypad(false)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-white font-semibold"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLoanMode('NEW')}
                  className={`py-2 rounded-xl text-xs font-semibold border ${
                    loanMode === 'NEW' ? 'bg-white text-black border-white' : 'bg-black text-[#8E8E93] border-white/[0.08]'
                  }`}
                >
                  {recType === 'RECEIVABLE' ? '新代刷/借出' : '新借入'}
                </button>
                <button
                  type="button"
                  onClick={() => setLoanMode('EXISTING')}
                  className={`py-2 rounded-xl text-xs font-semibold border ${
                    loanMode === 'EXISTING' ? 'bg-white text-black border-white' : 'bg-black text-[#8E8E93] border-white/[0.08]'
                  }`}
                >
                  既有款項（不動帳戶）
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#8E8E93]">
                  {recType === 'TRANSFER' ? '轉出帳戶' : '帳戶'}
                </span>
                <button
                  type="button"
                  onClick={() => setExpandAccGrid(!expandAccGrid)}
                  className="text-[11px] text-zinc-400 px-2 py-0.5 rounded bg-[#161618]"
                >
                  {expandAccGrid ? '收合' : `全部 (${filteredAccounts.length})`}
                </button>
              </div>

              {currentAccount?.kind === 'CREDIT' && recType !== 'TRANSFER' && (
                <button
                  type="button"
                  onClick={() => setCreditCycle(creditCycle === 'UNBILLED' ? 'BILLED' : 'UNBILLED')}
                  className="px-2.5 py-1 rounded-lg bg-[#161618] border border-white/10 text-[11px] font-semibold text-amber-300"
                >
                  {creditCycle === 'UNBILLED' ? '進行中下期' : '補入本期應繳'}
                </button>
              )}
            </div>

            <div data-no-swipe="true" className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {['ALL', '電子錢包', '信用卡', '銀行活期', '投資保單'].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setAccGroupFilter(g)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0 border ${
                    accGroupFilter === g ? 'bg-zinc-200 text-black border-white' : 'bg-[#111113] text-[#8E8E93] border-white/[0.06]'
                  }`}
                >
                  {g === 'ALL' ? '全部' : g}
                </button>
              ))}
            </div>

            <div data-no-swipe="true" className={expandAccGrid ? 'grid grid-cols-3 gap-2' : 'flex gap-2 overflow-x-auto snap-x-rail pb-1'}>
              {filteredAccounts.map(acc => {
                const isSel = acc.id === accountId;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setAccountId(acc.id);
                      setCurrency(acc.currency);
                      setCustomAccountAmt(null);
                    }}
                    className={`snap-x-item shrink-0 ${expandAccGrid ? '' : 'w-[122px]'} p-2.5 rounded-2xl border text-left transition ${
                      isSel ? 'bg-white text-black border-white' : 'bg-[#111113] text-white border-white/[0.07]'
                    }`}
                  >
                    <div className={`text-[10px] ${isSel ? 'text-zinc-600' : 'text-[#8E8E93]'}`}>{acc.group}</div>
                    <div className="text-xs font-bold truncate mt-0.5">{acc.name}</div>
                    <div className={`text-[10px] font-mono-num truncate mt-0.5 ${isSel ? 'text-zinc-700' : 'text-[#8E8E93]'}`}>
                      {Store.formatMoney(acc.balance, acc.currency)}
                    </div>
                  </button>
                );
              })}
            </div>

            {recType === 'TRANSFER' && (
              <div className="pt-1 space-y-1.5">
                <span className="text-xs font-semibold text-sky-400">轉入目標帳戶</span>
                <div data-no-swipe="true" className="flex gap-2 overflow-x-auto snap-x-rail pb-1">
                  {flatAccounts.filter(a => a.kind !== 'CREDIT').map(acc => {
                    const isSel = acc.id === toAccountId;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setToAccountId(acc.id)}
                        className={`snap-x-item shrink-0 w-[122px] p-2.5 rounded-2xl border text-left ${
                          isSel ? 'bg-sky-400 text-black border-sky-300' : 'bg-[#111113] text-white border-white/[0.07]'
                        }`}
                      >
                        <div className="text-xs font-bold truncate">{acc.name}</div>
                        <div className={`text-[10px] font-mono-num truncate mt-0.5 ${isSel ? 'text-zinc-900' : 'text-[#8E8E93]'}`}>
                          {Store.formatMoney(acc.balance, acc.currency)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#8E8E93]">資金池</span>
            <div data-no-swipe="true" className="flex gap-2 overflow-x-auto snap-x-rail pb-1">
              {buckets.map(b => {
                const isSel = bucketId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBucketId(b.id)}
                    className={`snap-x-item shrink-0 min-w-[104px] py-2.5 px-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      isSel ? 'bg-white text-black border-white font-bold' : 'bg-[#111113] text-zinc-300 border-white/[0.07]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                    <span>{b.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pb-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="py-2.5 px-3.5 rounded-2xl bg-[#111113] border border-white/[0.07] flex items-center justify-between text-xs font-semibold text-zinc-300">
                <span>日期</span>
                <input
                  type="date"
                  value={recordDate}
                  onChange={e => setRecordDate(e.target.value || Store.todayISO())}
                  className="bg-transparent text-white font-mono-num font-bold text-right focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowDetails(!showDetails);
                  setShowKeypad(false);
                }}
                className={`py-2.5 px-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
                  showDetails ? 'bg-[#2C2C2E] text-white border-white/20' : 'bg-[#111113] text-zinc-300 border-white/[0.07]'
                }`}
              >
                <span>商戶 / 備註</span>
                <span>{showDetails ? '▴' : '▾'}</span>
              </button>
            </div>

            {showDetails && (
              <div className="p-3.5 rounded-2xl bg-[#111113] border border-white/[0.07] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8E8E93]">自訂名稱</span>
                  <button
                    type="button"
                    onClick={() => setSaveAsTemplate(!saveAsTemplate)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      saveAsTemplate ? 'bg-amber-400 text-black border-amber-300' : 'bg-black text-[#8E8E93] border-white/10'
                    }`}
                  >
                    {saveAsTemplate ? '★ 存為範本' : '存為範本'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={selectedSub?.name || '項目名稱'}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-white font-semibold"
                />

                {selectedSub?.merchants?.length > 0 && (
                  <div data-no-swipe="true" className="flex gap-1.5 overflow-x-auto pb-1">
                    {selectedSub.merchants.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMerchant(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 border ${
                          merchant === m ? 'bg-white text-black border-white' : 'bg-black text-zinc-300 border-white/[0.08]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="商戶地點"
                  value={merchant}
                  onChange={e => setMerchant(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-white"
                />
                <input
                  type="text"
                  placeholder="備註"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-white"
                />
              </div>
            )}
          </div>
        </div>

        {showKeypad && (
          <NumericKeypad
            valueStr={amountStr}
            onChangeStr={(next) => {
              setCustomAccountAmt(null);
              setAmountStr(next);
            }}
            confirmLabel={editTx ? '更新' : '完成'}
            onCollapse={() => setShowKeypad(false)}
            onConfirm={(val) => handleSubmit(val)}
          />
        )}
      </div>
    );
  }

  function CategoryManagerSheet({ onClose }) {
    const state = window.WealthUI.useWealthStore();
    const buckets = (state.settings?.buckets || []).filter(b => !b.archived);
    const categories = state.settings?.categories || { EXPENSE: [], INCOME: [] };
    const [flow, setFlow] = useState('EXPENSE');
    const [newSubMap, setNewSubMap] = useState({});

    const list = (categories[flow] || []).filter(c => !c.archived);

    const updateSubBucket = (catId, subId, nextBucketId) => {
      Store.setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          categories: {
            ...prev.settings.categories,
            [flow]: prev.settings.categories[flow].map(c => c.id !== catId ? c : {
              ...c,
              subs: c.subs.map(s => s.id === subId ? { ...s, defaultBucket: nextBucketId } : s)
            })
          }
        }
      }));
    };

    const addSub = (catId) => {
      const name = (newSubMap[catId] || '').trim();
      if (!name) return;
      Store.setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          categories: {
            ...prev.settings.categories,
            [flow]: prev.settings.categories[flow].map(c => c.id !== catId ? c : {
              ...c,
              subs: [...c.subs, { id: 'sub_' + Date.now(), name, defaultBucket: buckets[0]?.id || 'PUBLIC', merchants: [], archived: false }]
            })
          }
        }
      }));
      setNewSubMap(prev => ({ ...prev, [catId]: '' }));
    };

    return (
      <div
        style={{
          height: 'var(--app-height, 100dvh)',
          paddingTop: 'max(14px, env(safe-area-inset-top))'
        }}
        className="fixed inset-0 z-50 bg-black flex flex-col max-w-[440px] mx-auto animate-sheet-up overflow-hidden"
      >
        <div className="px-4 pb-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-white">分類與預設資金池</h3>
          <button type="button" onClick={onClose} className="min-h-[38px] px-4 rounded-2xl bg-white text-black text-xs font-bold">
            完成
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#161618] border border-white/[0.06] text-xs font-semibold">
            <button type="button" onClick={() => setFlow('EXPENSE')} className={`py-2 rounded-xl ${flow === 'EXPENSE' ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93]'}`}>
              支出分類
            </button>
            <button type="button" onClick={() => setFlow('INCOME')} className={`py-2 rounded-xl ${flow === 'INCOME' ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93]'}`}>
              收入分類
            </button>
          </div>

          {list.map(cat => (
            <div key={cat.id} className="p-3.5 rounded-2xl bg-[#111113] border border-white/[0.06] space-y-2.5 text-xs">
              <div className="font-bold text-white text-sm">{cat.name}</div>
              <div className="divide-y divide-white/[0.05]">
                {(cat.subs || []).filter(s => !s.archived).map(sub => (
                  <div key={sub.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-zinc-200 font-medium">{sub.name}</span>
                    <select
                      value={sub.defaultBucket}
                      onChange={e => updateSubBucket(cat.id, sub.id, e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-black border border-white/10 text-xs font-semibold text-white"
                    >
                      {buckets.map(b => (
                        <option key={b.id} value={b.id} className="bg-zinc-900">{b.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder={`新增「${cat.name}」子分類`}
                  value={newSubMap[cat.id] || ''}
                  onChange={e => setNewSubMap(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-xl bg-black border border-white/10 text-white"
                />
                <button type="button" onClick={() => addSub(cat.id)} className="px-3.5 rounded-xl bg-white/15 text-white font-semibold">
                  新增
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  window.WealthMod3 = { LedgerMainView, MozeRecordEditorSheet };
})();
