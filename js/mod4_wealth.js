// mod4_wealth.js · Stage 3 r1
(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;

  function addMonthsISO(iso, months) {
    const p = String(iso || '').split('-').map(Number);
    const d = p.length === 3 && p[0] ? new Date(p[0], p[1] - 1, p[2]) : new Date();
    d.setMonth(d.getMonth() + months);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDisplayDate(iso) {
    if (!iso) return '未設定';
    const parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    return `${parts[0]} / ${parts[1]} / ${parts[2]}`;
  }

  function currentQuarterLabel() {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `${now.getFullYear()} Q${q} 季報快照`;
  }

  function WealthCardAura({ theme }) {
    return (
      <>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: theme.glow || 'radial-gradient(circle at 86% 14%, rgba(255,255,255,0.20) 0%, transparent 65%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{ background: 'linear-gradient(122deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 34%, transparent 56%)' }}
        />
        <div className="absolute -right-8 -bottom-10 w-36 h-36 rounded-full border border-white/[0.08] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
      </>
    );
  }

  function WealthView({ state, showToast, onFocusChange, resetSignal }) {
    const { Icon, BottomSheet, NumericInput, SegmentedControl, useConfirm } = window.WealthUI;
    const { confirmDeductions } = useConfirm();
    const Store = window.WealthStore;

    const [filterTab, setFilterTab] = useState('ALL'); // ALL | FD | INVEST
    const [focusedInvId, setFocusedInvId] = useState(null);
    const [flipped, setFlipped] = useState(false);
    const [closedExpanded, setClosedExpanded] = useState(false);

    // Sheet 1: Add New Investment
    const [addOpen, setAddOpen] = useState(false);
    const [newInv, setNewInv] = useState({
      type: 'FIXED_DEPOSIT',
      name: '',
      ticker: '',
      currency: state.meta.baseCurrency,
      principal: 50000,
      currentValue: 50000,
      faceValue: 0,
      shares: 0,
      apr: 3.5,
      startDate: Store.todayISO(),
      maturityDate: addMonthsISO(Store.todayISO(), 6),
      linkedKey: '',
      deductFromBank: true,
      note: ''
    });

    // Card Back Edit Draft
    const [editDraft, setEditDraft] = useState({
      name: '',
      ticker: '',
      type: 'FIXED_DEPOSIT',
      currency: state.meta.baseCurrency,
      principal: 0,
      currentValue: 0,
      faceValue: 0,
      shares: 0,
      apr: 0,
      startDate: '',
      maturityDate: '',
      linkedKey: '',
      note: ''
    });

    // Sheet 2: Term Maturity Settle / Rollover
    const [settleOpen, setSettleOpen] = useState(false);
    const [settleDraft, setSettleDraft] = useState({
      mode: 'CASH_OUT', // CASH_OUT | ROLLOVER_PRINCIPAL | ROLLOVER_ALL
      actualInterest: 0,
      toKey: '',
      newApr: 3.5,
      newMaturityDate: addMonthsISO(Store.todayISO(), 6)
    });

    // Sheet 3: Market Value Calibration
    const [valOpen, setValOpen] = useState(false);
    const [valMode, setValMode] = useState('TOTAL'); // TOTAL | PRICE
    const [valTotal, setValTotal] = useState(0);
    const [valShares, setValShares] = useState(0);
    const [valUnitPrice, setValUnitPrice] = useState(0);

    // Sheet 4: TopUp / Dividend / Sell
    const [cashEventOpen, setCashEventOpen] = useState(false);
    const [cashEventMode, setCashEventMode] = useState('TOPUP'); // TOPUP | DIVIDEND | SELL
    const [cashDraft, setCashDraft] = useState({
      amount: 0,
      sharesDelta: 0,
      costReduce: 0,
      fullClose: false,
      linkCash: true,
      bankKey: '',
      note: ''
    });

    // Sheet 5: Quarterly Snapshot & History
    const [snapOpen, setSnapOpen] = useState(false);
    const [snapTab, setSnapTab] = useState('CREATE'); // CREATE | HISTORY
    const [snapLabel, setSnapLabel] = useState(currentQuarterLabel());
    const [snapDate, setSnapDate] = useState(Store.todayISO());
    const [snapNote, setSnapNote] = useState('');
    const [snapValues, setSnapValues] = useState({});
    const [expandedSnapId, setExpandedSnapId] = useState(null);

    // All bank/broker balances for linking & cash flow closure
    const bankOptions = useMemo(() => {
      const list = [];
      (state.accounts || []).forEach((a) => {
        (a.balances || []).forEach((b) => {
          list.push({
            key: `${a.id}::${b.id}`,
            accountId: a.id,
            balanceId: b.id,
            accountType: a.type,
            currency: b.currency,
            amount: b.amount,
            label: a.balances.length > 1
              ? `${a.name} (${b.currency}) · ${Store.formatMoney(b.amount, b.currency)}`
              : `${a.name} · ${Store.formatMoney(b.amount, b.currency)}`,
            shortLabel: a.balances.length > 1 ? `${a.name} (${b.currency})` : a.name
          });
        });
      });
      return list;
    }, [state.accounts]);

    const getTypeMeta = (t) => (Store.INVESTMENT_TYPES || []).find((x) => x.id === t) || Store.INVESTMENT_TYPES[0];
    const getThemeObj = (themeId) => Store.CARD_THEMES.find((t) => t.id === themeId) || Store.CARD_THEMES[0];

    const getBankShortLabel = (accId, balId) => {
      if (!accId) return null;
      const found = bankOptions.find((b) => b.accountId === accId && (!balId || b.balanceId === balId))
        || bankOptions.find((b) => b.accountId === accId);
      return found ? found.shortLabel : null;
    };

    const findBestBankKey = (type, currency) => {
      const preferBroker = type === 'ETF' || type === 'STOCK' || type === 'TBILL';
      if (preferBroker) {
        const brkExact = bankOptions.find((b) => b.accountType === 'BROKER' && b.currency === currency);
        if (brkExact) return brkExact.key;
        const brkAny = bankOptions.find((b) => b.accountType === 'BROKER');
        if (brkAny) return brkAny.key;
      }
      const curMatch = bankOptions.find((b) => b.accountType === 'BANK' && b.currency === currency)
        || bankOptions.find((b) => b.currency === currency);
      if (curMatch) return curMatch.key;
      return bankOptions[0] ? bankOptions[0].key : '';
    };

    const activeInvestments = useMemo(
      () => (state.investments || []).filter((x) => x.status !== 'CLOSED'),
      [state.investments]
    );
    const closedInvestments = useMemo(
      () => (state.investments || []).filter((x) => x.status === 'CLOSED'),
      [state.investments]
    );

    const focusedInv = useMemo(() => {
      if (!focusedInvId) return null;
      return (state.investments || []).find((x) => x.id === focusedInvId) || null;
    }, [state.investments, focusedInvId]);

    const isFocused = Boolean(focusedInv);
    useEffect(() => {
      if (onFocusChange) onFocusChange(isFocused);
    }, [isFocused, onFocusChange]);

    useEffect(() => {
      return () => {
        if (onFocusChange) onFocusChange(false);
      };
    }, [onFocusChange]);

    useEffect(() => {
      if (resetSignal > 0) {
        setFocusedInvId(null);
        setFlipped(false);
      }
    }, [resetSignal]);

    useEffect(() => {
      setFlipped(false);
    }, [focusedInvId]);

    const syncEditDraft = (inv) => {
      if (!inv) return;
      const lKey = inv.linkedAccountId
        ? (bankOptions.find((b) => b.accountId === inv.linkedAccountId && (!inv.linkedBalanceId || b.balanceId === inv.linkedBalanceId))?.key || '')
        : '';
      setEditDraft({
        name: inv.name || '',
        ticker: inv.ticker || '',
        type: inv.type || 'FIXED_DEPOSIT',
        currency: inv.currency || state.meta.baseCurrency,
        principal: inv.principal || 0,
        currentValue: inv.currentValue != null ? inv.currentValue : (inv.principal || 0),
        faceValue: inv.faceValue || 0,
        shares: inv.shares || 0,
        apr: inv.apr || 0,
        startDate: inv.startDate || '',
        maturityDate: inv.maturityDate || '',
        linkedKey: lKey,
        note: inv.note || ''
      });
    };

    // Portfolio Totals & Breakdown
    const portfolio = useMemo(() => {
      let totalPrincipalBase = 0;
      let totalValueBase = 0;
      let fdBase = 0;
      let tbillBase = 0;
      let equityBase = 0;
      let expectedTermIntBase = 0;
      let unrealizedEquityPnlBase = 0;
      const upcomingMaturities = [];

      activeInvestments.forEach((inv) => {
        const m = Store.getInvestmentMetrics(inv);
        const priB = Store.convertToBase(m.principal, inv.currency, state);
        const valB = Store.convertToBase(m.marketValue, inv.currency, state);
        totalPrincipalBase = Store.round2(totalPrincipalBase + priB);
        totalValueBase = Store.round2(totalValueBase + valB);

        if (inv.type === 'FIXED_DEPOSIT') {
          fdBase = Store.round2(fdBase + valB);
          expectedTermIntBase = Store.round2(expectedTermIntBase + Store.convertToBase(m.expectedInterest, inv.currency, state));
        } else if (inv.type === 'TBILL') {
          tbillBase = Store.round2(tbillBase + valB);
          expectedTermIntBase = Store.round2(expectedTermIntBase + Store.convertToBase(m.expectedInterest, inv.currency, state));
        } else {
          equityBase = Store.round2(equityBase + valB);
          unrealizedEquityPnlBase = Store.round2(unrealizedEquityPnlBase + Store.convertToBase(m.pnl, inv.currency, state));
        }

        if (m.isTerm && m.remainingDays != null && m.remainingDays <= 14) {
          upcomingMaturities.push({ inv, m });
        }
      });

      const totalValSafe = Math.max(totalValueBase, 1);
      const fdPct = totalValueBase > 0 ? Math.round((fdBase / totalValSafe) * 100) : 0;
      const tbillPct = totalValueBase > 0 ? Math.round((tbillBase / totalValSafe) * 100) : 0;
      const equityPct = totalValueBase > 0 ? Math.max(0, 100 - fdPct - tbillPct) : 0;
      const combinedPnlBase = Store.round2(totalValueBase - totalPrincipalBase);
      const combinedPnlPct = totalPrincipalBase > 0 ? Store.round2((combinedPnlBase / totalPrincipalBase) * 100) : 0;

      return {
        totalPrincipalBase,
        totalValueBase,
        fdBase,
        tbillBase,
        equityBase,
        fdPct,
        tbillPct,
        equityPct,
        expectedTermIntBase,
        unrealizedEquityPnlBase,
        combinedPnlBase,
        combinedPnlPct,
        upcomingMaturities: upcomingMaturities.sort((a, b) => (a.m.remainingDays || 0) - (b.m.remainingDays || 0))
      };
    }, [activeInvestments, state]);

    const filteredActive = useMemo(() => {
      if (filterTab === 'FD') return activeInvestments.filter((x) => x.type === 'FIXED_DEPOSIT');
      if (filterTab === 'INVEST') return activeInvestments.filter((x) => x.type !== 'FIXED_DEPOSIT');
      return activeInvestments;
    }, [activeInvestments, filterTab]);

    // Live preview for New Investment Sheet
    const newInvPreview = useMemo(() => {
      return Store.getInvestmentMetrics({
        type: newInv.type,
        principal: Number(newInv.principal || 0),
        currentValue: Number(newInv.currentValue || 0),
        faceValue: Number(newInv.faceValue || 0) || null,
        apr: Number(newInv.apr || 0),
        startDate: newInv.startDate,
        maturityDate: newInv.maturityDate
      });
    }, [newInv]);

    const openAddSheet = (presetType) => {
      const t = presetType || (filterTab === 'INVEST' ? 'ETF' : 'FIXED_DEPOSIT');
      const cur = (t === 'ETF' || t === 'STOCK' || t === 'TBILL') ? 'USD' : state.meta.baseCurrency;
      const today = Store.todayISO();
      setNewInv({
        type: t,
        name: '',
        ticker: '',
        currency: cur,
        principal: t === 'FIXED_DEPOSIT' ? 50000 : 10000,
        currentValue: t === 'FIXED_DEPOSIT' ? 50000 : 10000,
        faceValue: t === 'TBILL' ? 10200 : 0,
        shares: 0,
        apr: t === 'FIXED_DEPOSIT' ? 3.5 : (t === 'TBILL' ? 4.3 : 0),
        startDate: today,
        maturityDate: addMonthsISO(today, 6),
        linkedKey: findBestBankKey(t, cur),
        deductFromBank: false,
        note: ''
      });
      setAddOpen(true);
    };

    const handleCreateInvestment = async () => {
      if (!newInv.name.trim()) {
        showToast('請輸入部位名稱');
        return;
      }
      const pri = Number(newInv.principal || 0);
      if (pri <= 0) {
        showToast('本金／投入成本須大於 0');
        return;
      }

      const [linkedAccountId, linkedBalanceId] = newInv.linkedKey ? newInv.linkedKey.split('::') : [null, null];

      if (newInv.deductFromBank && linkedAccountId) {
        const bankOpt = bankOptions.find((b) => b.key === newInv.linkedKey);
        const deductAmt = bankOpt && bankOpt.currency !== newInv.currency
          ? Store.round2(Store.convertToBase(pri, newInv.currency, state) / ((state.meta.fxRates && state.meta.fxRates[bankOpt.currency]) || 1))
          : pri;
        const ok = await confirmDeductions([{ accountId: linkedAccountId, balanceId: linkedBalanceId, delta: -deductAmt }]);
        if (!ok) return;
      }

      const created = Store.addInvestment({
        name: newInv.name,
        ticker: newInv.ticker,
        type: newInv.type,
        currency: newInv.currency,
        principal: pri,
        currentValue: newInv.type === 'FIXED_DEPOSIT' ? pri : Number(newInv.currentValue || pri),
        faceValue: newInv.type === 'TBILL' ? Number(newInv.faceValue || 0) : null,
        shares: (newInv.type === 'ETF' || newInv.type === 'STOCK') ? Number(newInv.shares || 0) : null,
        apr: (newInv.type === 'FIXED_DEPOSIT' || newInv.type === 'TBILL') ? Number(newInv.apr || 0) : null,
        startDate: newInv.startDate,
        maturityDate: (newInv.type === 'FIXED_DEPOSIT' || newInv.type === 'TBILL') ? newInv.maturityDate : null,
        linkedAccountId,
        linkedBalanceId,
        note: newInv.note
      }, {
        deductFromBank: newInv.deductFromBank,
        fromAccountId: linkedAccountId,
        fromBalanceId: linkedBalanceId
      });

      setAddOpen(false);
      setFocusedInvId(created.id);
      showToast(newInv.deductFromBank ? `已開立「${created.name}」並扣除帳戶資金` : `已登記「${created.name}」`);
    };

    const handleSaveEdit = () => {
      if (!focusedInv) return;
      const [linkedAccountId, linkedBalanceId] = editDraft.linkedKey ? editDraft.linkedKey.split('::') : [null, null];
      Store.updateInvestment(focusedInv.id, {
        name: editDraft.name,
        ticker: editDraft.ticker,
        type: editDraft.type,
        currency: editDraft.currency,
        principal: Number(editDraft.principal || 0),
        currentValue: editDraft.type === 'FIXED_DEPOSIT' ? Number(editDraft.principal || 0) : Number(editDraft.currentValue || 0),
        faceValue: editDraft.type === 'TBILL' ? Number(editDraft.faceValue || 0) : null,
        shares: (editDraft.type === 'ETF' || editDraft.type === 'STOCK') ? Number(editDraft.shares || 0) : null,
        apr: (editDraft.type === 'FIXED_DEPOSIT' || editDraft.type === 'TBILL') ? Number(editDraft.apr || 0) : null,
        startDate: editDraft.startDate,
        maturityDate: (editDraft.type === 'FIXED_DEPOSIT' || editDraft.type === 'TBILL') ? editDraft.maturityDate : null,
        linkedAccountId,
        linkedBalanceId,
        note: editDraft.note
      });
      setFlipped(false);
      showToast('部位設定已更新');
    };

    const openSettleSheet = (inv) => {
      const m = Store.getInvestmentMetrics(inv);
      const lKey = inv.linkedAccountId
        ? (bankOptions.find((b) => b.accountId === inv.linkedAccountId && (!inv.linkedBalanceId || b.balanceId === inv.linkedBalanceId))?.key || findBestBankKey(inv.type, inv.currency))
        : findBestBankKey(inv.type, inv.currency);
      setSettleDraft({
        mode: 'CASH_OUT',
        actualInterest: m.expectedInterest,
        toKey: lKey,
        newApr: inv.apr || 3.5,
        newMaturityDate: addMonthsISO(Store.todayISO(), 6)
      });
      setSettleOpen(true);
    };

    const handleConfirmSettle = () => {
      if (!focusedInv) return;
      const [toAccountId, toBalanceId] = settleDraft.toKey ? settleDraft.toKey.split('::') : [null, null];
      if ((settleDraft.mode === 'CASH_OUT' || settleDraft.mode === 'ROLLOVER_PRINCIPAL') && !toAccountId) {
        showToast('請選擇入帳銀行戶口');
        return;
      }
      Store.settleTermInvestment(focusedInv.id, {
        mode: settleDraft.mode,
        actualInterest: Number(settleDraft.actualInterest || 0),
        toAccountId,
        toBalanceId,
        newApr: Number(settleDraft.newApr || focusedInv.apr || 0),
        newMaturityDate: settleDraft.newMaturityDate
      });
      setSettleOpen(false);
      if (settleDraft.mode === 'CASH_OUT') {
        setFocusedInvId(null);
        showToast('已完成到期結清，本金與利息已入帳');
      } else if (settleDraft.mode === 'ROLLOVER_PRINCIPAL') {
        showToast('已續存本金，利息已入帳活期');
      } else {
        showToast('已將本息全額滾存續期');
      }
    };

    const openValSheet = (inv) => {
      const curVal = inv.currentValue != null ? inv.currentValue : (inv.principal || 0);
      const sh = inv.shares || 0;
      setValMode('TOTAL');
      setValTotal(curVal);
      setValShares(sh);
      setValUnitPrice(sh > 0 ? Store.round2(curVal / sh) : 0);
      setValOpen(true);
    };

    const handleSaveValuation = () => {
      if (!focusedInv) return;
      const nextVal = valMode === 'PRICE'
        ? Store.round2(Number(valShares || 0) * Number(valUnitPrice || 0))
        : Store.round2(Number(valTotal || 0));
      if (nextVal < 0) return;
      const patch = { currentValue: nextVal };
      if (valMode === 'PRICE' && Number(valShares || 0) > 0) {
        patch.shares = Number(valShares);
      }
      Store.updateInvestment(focusedInv.id, patch);
      setValOpen(false);
      showToast(`已更新市值為 ${Store.formatMoney(nextVal, focusedInv.currency)}`);
    };

    const openCashEvent = (inv, mode) => {
      const lKey = inv.linkedAccountId
        ? (bankOptions.find((b) => b.accountId === inv.linkedAccountId && (!inv.linkedBalanceId || b.balanceId === inv.linkedBalanceId))?.key || findBestBankKey(inv.type, inv.currency))
        : findBestBankKey(inv.type, inv.currency);
      setCashEventMode(mode);
      setCashDraft({
        amount: mode === 'SELL' ? (inv.currentValue || inv.principal || 0) : 0,
        sharesDelta: mode === 'SELL' ? (inv.shares || 0) : 0,
        costReduce: mode === 'SELL' ? (inv.principal || 0) : 0,
        fullClose: mode === 'SELL',
        linkCash: true,
        bankKey: lKey,
        note: ''
      });
      setCashEventOpen(true);
    };

    const handleConfirmCashEvent = async () => {
      if (!focusedInv) return;
      const amt = Number(cashDraft.amount || 0);
      if (amt <= 0) {
        showToast('金額須大於 0');
        return;
      }
      const [accId, balId] = cashDraft.bankKey ? cashDraft.bankKey.split('::') : [null, null];

      if (cashEventMode === 'TOPUP') {
        if (cashDraft.linkCash && accId) {
          const bankOpt = bankOptions.find((b) => b.key === cashDraft.bankKey);
          const deductAmt = bankOpt && bankOpt.currency !== focusedInv.currency
            ? Store.round2(Store.convertToBase(amt, focusedInv.currency, state) / ((state.meta.fxRates && state.meta.fxRates[bankOpt.currency]) || 1))
            : amt;
          const ok = await confirmDeductions([{ accountId: accId, balanceId: balId, delta: -deductAmt }]);
          if (!ok) return;
        }
        Store.topUpInvestment(focusedInv.id, {
          addAmount: amt,
          addShares: Number(cashDraft.sharesDelta || 0),
          deductFromBank: cashDraft.linkCash,
          fromAccountId: accId,
          fromBalanceId: balId,
          note: cashDraft.note
        });
        setCashEventOpen(false);
        showToast(`已追加投入 ${Store.formatMoney(amt, focusedInv.currency)}`);
      } else if (cashEventMode === 'DIVIDEND') {
        Store.recordInvestmentCashEvent(focusedInv.id, {
          mode: 'DIVIDEND',
          amount: amt,
          creditToBank: cashDraft.linkCash,
          toAccountId: accId,
          toBalanceId: balId,
          note: cashDraft.note
        });
        setCashEventOpen(false);
        showToast(`已入帳配息收益 ${Store.formatMoney(amt, focusedInv.currency)}`);
      } else {
        Store.recordInvestmentCashEvent(focusedInv.id, {
          mode: 'SELL',
          amount: amt,
          sellShares: Number(cashDraft.sharesDelta || 0),
          costBasisReduced: cashDraft.fullClose ? focusedInv.principal : Number(cashDraft.costReduce || 0),
          fullClose: cashDraft.fullClose,
          creditToBank: cashDraft.linkCash,
          toAccountId: accId,
          toBalanceId: balId,
          note: cashDraft.note
        });
        setCashEventOpen(false);
        if (cashDraft.fullClose) setFocusedInvId(null);
        showToast(cashDraft.fullClose ? '已全額賣出並歸檔' : `已賣出回款 ${Store.formatMoney(amt, focusedInv.currency)}`);
      }
    };

    const openSnapshotSheet = (initialTab) => {
      const map = {};
      activeInvestments.forEach((inv) => {
        if (inv.type !== 'FIXED_DEPOSIT') {
          map[inv.id] = inv.currentValue != null ? inv.currentValue : (inv.principal || 0);
        }
      });
      setSnapValues(map);
      setSnapLabel(currentQuarterLabel());
      setSnapDate(Store.todayISO());
      setSnapNote('');
      setSnapTab(initialTab || (activeInvestments.length > 0 ? 'CREATE' : 'HISTORY'));
      setSnapOpen(true);
    };

    const handleSaveSnapshot = () => {
      const updates = Object.keys(snapValues).map((id) => ({
        id,
        currentValue: Number(snapValues[id] || 0)
      }));
      Store.recordWealthSnapshot({
        label: snapLabel,
        date: snapDate,
        note: snapNote,
        updates
      });
      setSnapTab('HISTORY');
      showToast('已更新市值並完成季報快照歸檔');
    };

    const snapList = state.wealthSnapshots || [];

    return (
      <div className="space-y-4 pb-6">
        {/* ================= MODE A: WEALTH OVERVIEW ================= */}
        {!focusedInv && (
          <div className="space-y-4">
            {/* Luminous Portfolio Summary Card */}
            <div className="relative rounded-[22px] bg-[#13141A] border border-white/[0.11] p-4 space-y-3 overflow-hidden shadow-lg">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 90% 8%, rgba(251,191,36,0.16) 0%, rgba(56,189,248,0.08) 45%, transparent 72%)' }}
              />
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/40 to-transparent pointer-events-none" />

              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11.5px] font-medium text-amber-200/90 mb-1">
                    定存與投資總值 ({state.meta.baseCurrency})
                  </div>
                  <div className="text-[30px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
                    {Store.formatMoney(portfolio.totalValueBase, state.meta.baseCurrency)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSnapshotSheet('CREATE')}
                  className="px-3 py-1.5 rounded-full bg-white/[0.10] border border-white/15 text-[11.5px] font-semibold text-zinc-100 active:bg-white/20 transition shrink-0 whitespace-nowrap"
                >
                  季報快照{snapList.length > 0 ? ` · ${snapList.length}` : ''}
                </button>
              </div>

              {/* 3-Asset-Class Ratio Bar: Fixed Deposits | T-Bills | ETF/Stocks */}
              {portfolio.totalValueBase > 0 && (
                <div className="relative space-y-1.5">
                  <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden flex gap-[1.5px]">
                    {portfolio.fdPct > 0 && <div className="h-full bg-amber-400" style={{ width: `${portfolio.fdPct}%` }} />}
                    {portfolio.tbillPct > 0 && <div className="h-full bg-sky-400" style={{ width: `${portfolio.tbillPct}%` }} />}
                    {portfolio.equityPct > 0 && <div className="h-full bg-emerald-400" style={{ width: `${portfolio.equityPct}%` }} />}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[10.5px] text-zinc-400 tabular-nums">
                    {portfolio.fdBase > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        定期 {portfolio.fdPct}%
                      </span>
                    )}
                    {portfolio.tbillBase > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        美債 {portfolio.tbillPct}%
                      </span>
                    )}
                    {portfolio.equityBase > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ETF／股票 {portfolio.equityPct}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="relative pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-zinc-500">總投入本金</div>
                  <div className="text-[14.5px] font-semibold text-zinc-200 tabular-nums mt-0.5 whitespace-nowrap">
                    {Store.formatMoney(portfolio.totalPrincipalBase, state.meta.baseCurrency)}
                  </div>
                </div>
                <div className="min-w-0 text-right">
                  <div className="text-[11px] text-zinc-500">持倉盈虧 / 預估息</div>
                  <div className="text-[14.5px] font-semibold tabular-nums mt-0.5 whitespace-nowrap">
                    <span className={portfolio.combinedPnlBase >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {Store.formatMoney(portfolio.combinedPnlBase, state.meta.baseCurrency, { showPlus: true })}
                    </span>
                    {portfolio.expectedTermIntBase > 0 && (
                      <span className="text-[11px] text-amber-300/90 ml-1">
                        (息+{Store.formatMoney(portfolio.expectedTermIntBase, state.meta.baseCurrency).replace(/^[A-Z$¥]+\s*/, '')})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming / Matured Alert Strip */}
            {portfolio.upcomingMaturities.length > 0 && (
              <div className="space-y-2">
                {portfolio.upcomingMaturities.map(({ inv, m }) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setFocusedInvId(inv.id)}
                    className={`w-full px-3.5 py-3 rounded-2xl border flex items-center justify-between gap-2.5 text-left transition active:opacity-85 ${
                      m.isMatured
                        ? 'bg-emerald-500/15 border-emerald-400/45'
                        : 'bg-amber-500/15 border-amber-400/35'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className={`text-[12.5px] font-bold truncate ${m.isMatured ? 'text-emerald-200' : 'text-amber-200'}`}>
                        {m.isMatured ? `已到期 · ${inv.name}` : `即將到期 · ${inv.name}`}
                      </div>
                      <div className="text-[11px] text-zinc-300 tabular-nums mt-0.5">
                        {m.isMatured ? '點此結清本息或續存' : `${m.remainingDays} 天後 (${inv.maturityDate}) 到期 · 預估本息 ${Store.formatMoney(m.maturityTotal, inv.currency)}`}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[11.5px] font-bold shrink-0 whitespace-nowrap ${
                      m.isMatured ? 'bg-emerald-400 text-black' : 'bg-amber-400 text-black'
                    }`}>
                      處理 ›
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Category Filter */}
            <SegmentedControl
              value={filterTab}
              onChange={setFilterTab}
              options={[
                { value: 'ALL', label: `全部 (${activeInvestments.length})` },
                { value: 'FD', label: `定期存款 (${activeInvestments.filter((x) => x.type === 'FIXED_DEPOSIT').length})` },
                { value: 'INVEST', label: `投資美債 (${activeInvestments.filter((x) => x.type !== 'FIXED_DEPOSIT').length})` }
              ]}
            />

            {/* Active Holdings List */}
            {filteredActive.length === 0 ? (
              <div className="rounded-2xl bg-[#111114] border border-white/[0.08] p-8 text-center text-[13px] text-zinc-500">
                此分類尚無持倉部位，點擊下方按鈕新增。
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActive.map((inv) => {
                  const tMeta = getTypeMeta(inv.type);
                  const theme = getThemeObj(tMeta.theme);
                  const m = Store.getInvestmentMetrics(inv);
                  const bankName = getBankShortLabel(inv.linkedAccountId, inv.linkedBalanceId);
                  const isForeign = inv.currency !== state.meta.baseCurrency;
                  const baseEq = isForeign ? Store.convertToBase(m.marketValue, inv.currency, state) : null;

                  return (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => setFocusedInvId(inv.id)}
                      style={{ background: theme.bg }}
                      className="relative block w-full rounded-[22px] border border-white/15 p-4 text-left shadow-lg overflow-hidden active:scale-[0.985] transition space-y-3"
                    >
                      <WealthCardAura theme={theme} />

                      <div className="relative flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/35 border border-white/15 shrink-0"
                              style={{ color: tMeta.color }}
                            >
                              {tMeta.shortLabel}
                            </span>
                            <span className="text-[15.5px] font-bold text-white truncate">{inv.name}</span>
                            {inv.ticker && (
                              <span className="text-[11px] font-semibold text-white/60 shrink-0">{inv.ticker}</span>
                            )}
                          </div>

                          <div className="text-[11.5px] text-white/75 mt-1 flex items-center gap-1.5 flex-wrap tabular-nums">
                            {bankName && <span>{bankName}</span>}
                            {m.isTerm ? (
                              <>
                                {bankName && <span className="opacity-50">·</span>}
                                <span>{m.impliedApr > 0 ? `年化 ${m.impliedApr}%` : inv.currency}</span>
                                {inv.maturityDate && (
                                  <>
                                    <span className="opacity-50">·</span>
                                    <span className={m.isMatured ? 'text-emerald-300 font-semibold' : ''}>
                                      {m.isMatured ? '已到期' : `${m.remainingDays}天後到期`}
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                {bankName && <span className="opacity-50">·</span>}
                                {inv.shares ? <span>{inv.shares} 股</span> : <span>{inv.currency}</span>}
                                {inv.lastUpdated && (
                                  <>
                                    <span className="opacity-50">·</span>
                                    <span>估值 {inv.lastUpdated.slice(5)}</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[17px] font-bold text-white tabular-nums whitespace-nowrap">
                            {Store.formatMoney(m.marketValue, inv.currency)}
                          </div>
                          <div className="text-[11px] mt-0.5 tabular-nums whitespace-nowrap">
                            {m.isFD ? (
                              <span className="text-amber-200 font-medium">
                                預估息 {Store.formatMoney(m.expectedInterest, inv.currency, { showPlus: true })}
                              </span>
                            ) : (
                              <span className={m.pnl >= 0 ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                                {Store.formatMoney(m.pnl, inv.currency, { showPlus: true })} ({m.pnl >= 0 ? '+' : ''}{m.pnlPct}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Term Progress Bar OR Foreign Base Equivalent Strip */}
                      {m.isTerm && inv.maturityDate ? (
                        <div className="relative space-y-1">
                          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${m.progressPct}%`, background: tMeta.color }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10.5px] text-white/70 tabular-nums">
                            <span>{inv.startDate ? `${inv.startDate} 起` : '已存進度'} ({m.progressPct}%)</span>
                            <span>
                              到期 {inv.maturityDate} · 本息 {Store.formatMoney(m.maturityTotal, inv.currency)}
                            </span>
                          </div>
                        </div>
                      ) : baseEq != null ? (
                        <div className="relative pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                          <span>成本 {Store.formatMoney(m.principal, inv.currency)}</span>
                          <span>折合 ≈ {Store.formatMoney(baseEq, state.meta.baseCurrency)}</span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Add New Holding Button */}
            <button
              type="button"
              onClick={() => openAddSheet()}
              className="w-full py-3.5 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-[13.5px] font-medium text-zinc-300 flex items-center justify-center gap-1.5 active:bg-white/[0.06]"
            >
              <Icon name="plus" size={16} /> 新增定期存款 / 投資部位
            </button>

            {/* Collapsible Closed / Matured Archive */}
            {closedInvestments.length > 0 && (
              <div className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setClosedExpanded((p) => !p)}
                  className="w-full px-4 py-3 flex items-center justify-between text-[12.5px] text-zinc-400 active:bg-white/[0.04]"
                >
                  <span>已結清 / 到期歸檔 ({closedInvestments.length})</span>
                  <Icon name="chevronDown" size={14} className={`transition-transform ${closedExpanded ? 'rotate-180' : ''}`} />
                </button>
                {closedExpanded && (
                  <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                    {closedInvestments.map((inv) => {
                      const tMeta = getTypeMeta(inv.type);
                      return (
                        <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="text-[13.5px] font-semibold text-zinc-300 truncate">{inv.name}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">
                              {tMeta.shortLabel} · 結清於 {inv.closedDate || inv.lastUpdated}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[13px] font-semibold tabular-nums ${(inv.realizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              收益 {Store.formatMoney(inv.realizedPnl || 0, inv.currency, { showPlus: true })}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`確定永久刪除已歸檔紀錄「${inv.name}」？`)) {
                                  Store.deleteInvestment(inv.id);
                                  showToast('已刪除歸檔紀錄');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-white/[0.06] text-zinc-400"
                            >
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= MODE B: FOCUSED HOLDING DETAIL ================= */}
        {focusedInv && (() => {
          const tMeta = getTypeMeta(focusedInv.type);
          const theme = getThemeObj(tMeta.theme);
          const m = Store.getInvestmentMetrics(focusedInv);
          const bankName = getBankShortLabel(focusedInv.linkedAccountId, focusedInv.linkedBalanceId);
          const isForeign = focusedInv.currency !== state.meta.baseCurrency;
          const baseEq = isForeign ? Store.convertToBase(m.marketValue, focusedInv.currency, state) : null;
          const avgCost = focusedInv.shares && focusedInv.shares > 0 ? Store.round2(m.principal / focusedInv.shares) : null;
          const unitPrice = focusedInv.shares && focusedInv.shares > 0 ? Store.round2(m.marketValue / focusedInv.shares) : null;

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFocusedInvId(null)}
                  className="inline-flex items-center gap-1 text-[13.5px] text-zinc-400 active:text-white"
                >
                  <Icon name="chevronLeft" size={16} /> 全部定存與投資
                </button>
                <button
                  type="button"
                  onClick={() => {
                    syncEditDraft(focusedInv);
                    setFlipped((p) => !p);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#1C1C22] border border-white/10 text-[12px] font-medium text-zinc-200 active:bg-white/15"
                >
                  {flipped ? '取消並返回正面' : '編輯設定'}
                </button>
              </div>

              {!flipped ? (
                <div
                  className="rounded-[24px] p-5 border border-white/20 shadow-[0_18px_40px_rgba(0,0,0,0.65)] relative overflow-hidden space-y-4"
                  style={{ background: theme.bg }}
                >
                  <WealthCardAura theme={theme} />

                  {/* Row 1: Type Badge + Name + Linked Bank */}
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-black/35 border border-white/15 shrink-0"
                          style={{ color: tMeta.color }}
                        >
                          {tMeta.label}
                        </span>
                        {focusedInv.ticker && (
                          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-white/15 text-white shrink-0">
                            {focusedInv.ticker}
                          </span>
                        )}
                      </div>
                      <div className="text-[20px] font-bold text-white mt-1.5 leading-snug break-words">
                        {focusedInv.name}
                      </div>
                      {bankName && (
                        <div className="text-[11.5px] text-white/75 mt-0.5">
                          關聯戶口：{bankName}
                        </div>
                      )}
                    </div>

                    {m.isTerm && focusedInv.maturityDate && (
                      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap shrink-0 tabular-nums ${
                        m.isMatured
                          ? 'bg-emerald-400/25 border-emerald-300/60 text-emerald-100'
                          : 'bg-black/35 border-white/15 text-amber-200'
                      }`}>
                        {m.isMatured ? '已到期' : `${m.remainingDays} 天後到期`}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Hero Metric */}
                  <div className="relative flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11.5px] text-white/70 mb-0.5">
                        {m.isFD ? `定期本金 (${focusedInv.currency})` : `最新市值 (${focusedInv.currency})`}
                        {baseEq != null && (
                          <span className="ml-1.5 text-white/80 tabular-nums">≈ {Store.formatMoney(baseEq, state.meta.baseCurrency)}</span>
                        )}
                      </div>
                      <div className="text-[31px] font-bold text-white tabular-nums tracking-tight leading-tight break-all">
                        {Store.formatMoney(m.marketValue, focusedInv.currency)}
                      </div>
                    </div>

                    {m.isTerm && (
                      <div className="text-right shrink-0 pb-0.5">
                        <div className="text-[10.5px] text-white/60">{m.isTBill ? '到期面值' : '預估本息'}</div>
                        <div className="text-[14.5px] font-bold text-amber-200 tabular-nums whitespace-nowrap">
                          {Store.formatMoney(m.maturityTotal, focusedInv.currency)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Two Glass Sub-Tiles */}
                  <div className="relative grid grid-cols-2 gap-2">
                    {m.isTerm ? (
                      <>
                        <div className="px-3 py-2.5 rounded-2xl bg-black/30 border border-white/10">
                          <div className="text-[10.5px] text-white/65">{m.isTBill ? '買入成本 / 年化' : '年利率 (APR)'}</div>
                          <div className="text-[15px] font-bold text-white tabular-nums mt-0.5">
                            {m.isTBill
                              ? `${Store.formatMoney(m.principal, focusedInv.currency)} · ${m.impliedApr}%`
                              : `${m.impliedApr || 0}%`}
                          </div>
                        </div>
                        <div className="px-3 py-2.5 rounded-2xl bg-black/30 border border-white/10">
                          <div className="text-[10.5px] text-white/65">到期預估收益</div>
                          <div className="text-[15px] font-bold text-emerald-300 tabular-nums mt-0.5">
                            {Store.formatMoney(m.expectedInterest, focusedInv.currency, { showPlus: true })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="px-3 py-2.5 rounded-2xl bg-black/30 border border-white/10">
                          <div className="text-[10.5px] text-white/65">投入成本</div>
                          <div className="text-[15px] font-bold text-white tabular-nums mt-0.5">
                            {Store.formatMoney(m.principal, focusedInv.currency)}
                          </div>
                        </div>
                        <div className="px-3 py-2.5 rounded-2xl bg-black/30 border border-white/10">
                          <div className="text-[10.5px] text-white/65">未實現損益</div>
                          <div className={`text-[15px] font-bold tabular-nums mt-0.5 ${m.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {Store.formatMoney(m.pnl, focusedInv.currency, { showPlus: true })} ({m.pnl >= 0 ? '+' : ''}{m.pnlPct}%)
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Row 4: Maturity Progress Bar (Term) OR Shares/Unit Price Strip (Equity) */}
                  {m.isTerm && focusedInv.maturityDate && (
                    <div className="relative space-y-1">
                      <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${m.progressPct}%`, background: tMeta.color }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/75 tabular-nums">
                        <span>起息 {focusedInv.startDate || '-'}</span>
                        <span>到期 {focusedInv.maturityDate} ({m.progressPct}%)</span>
                      </div>
                    </div>
                  )}

                  {!m.isTerm && (avgCost != null || focusedInv.lastUpdated) && (
                    <div className="relative flex items-center justify-between text-[11px] text-white/75 tabular-nums">
                      <span>
                        {focusedInv.shares ? `${focusedInv.shares} 股 · 均價 ${Store.formatMoney(avgCost, focusedInv.currency)} · 現價 ${Store.formatMoney(unitPrice, focusedInv.currency)}` : '未記錄股數'}
                      </span>
                      <span className="shrink-0">更新 {focusedInv.lastUpdated}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Card Back: Edit Settings */
                <div className="rounded-[24px] p-4 bg-[#191920] border border-white/15 shadow-2xl space-y-3.5">
                  <div className="text-[15px] font-semibold text-white">編輯部位設定</div>

                  <div className="grid grid-cols-12 gap-2.5">
                    <div className="col-span-8">
                      <label className="text-[11px] text-zinc-400 block mb-1">部位名稱</label>
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((p) => Object.assign({}, p, { name: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[11px] text-zinc-400 block mb-1">代號（選填）</label>
                      <input
                        type="text"
                        placeholder="VOO"
                        value={editDraft.ticker}
                        onChange={(e) => setEditDraft((p) => Object.assign({}, p, { ticker: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white uppercase outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">類型</label>
                      <select
                        value={editDraft.type}
                        onChange={(e) => setEditDraft((p) => Object.assign({}, p, { type: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                      >
                        {Store.INVESTMENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">幣種</label>
                      <select
                        value={editDraft.currency}
                        onChange={(e) => setEditDraft((p) => Object.assign({}, p, { currency: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                      >
                        {Store.CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">關聯銀行 / 券商戶口</label>
                    <select
                      value={editDraft.linkedKey}
                      onChange={(e) => setEditDraft((p) => Object.assign({}, p, { linkedKey: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                    >
                      <option value="">不綁定戶口</option>
                      {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">投入本金</label>
                      <NumericInput
                        size="sm"
                        value={editDraft.principal}
                        currency={editDraft.currency}
                        label="修改投入本金"
                        onChange={(val) => setEditDraft((p) => Object.assign({}, p, { principal: val }))}
                      />
                    </div>
                    {editDraft.type === 'FIXED_DEPOSIT' ? (
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">年利率 (%)</label>
                        <NumericInput
                          size="sm"
                          value={editDraft.apr}
                          label="修改年利率 (%)"
                          onChange={(val) => setEditDraft((p) => Object.assign({}, p, { apr: val }))}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">最新市值</label>
                        <NumericInput
                          size="sm"
                          value={editDraft.currentValue}
                          currency={editDraft.currency}
                          label="修改最新市值"
                          onChange={(val) => setEditDraft((p) => Object.assign({}, p, { currentValue: val }))}
                        />
                      </div>
                    )}
                  </div>

                  {editDraft.type === 'TBILL' && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">到期面值</label>
                        <NumericInput
                          size="sm"
                          value={editDraft.faceValue}
                          currency={editDraft.currency}
                          label="設定到期面值"
                          onChange={(val) => setEditDraft((p) => Object.assign({}, p, { faceValue: val }))}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">票面/參考年化 (%)</label>
                        <NumericInput
                          size="sm"
                          value={editDraft.apr}
                          label="參考年化 (%)"
                          onChange={(val) => setEditDraft((p) => Object.assign({}, p, { apr: val }))}
                        />
                      </div>
                    </div>
                  )}

                  {(editDraft.type === 'ETF' || editDraft.type === 'STOCK') && (
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">持有股數（選填）</label>
                      <NumericInput
                        size="sm"
                        value={editDraft.shares}
                        label="修改持有股數"
                        onChange={(val) => setEditDraft((p) => Object.assign({}, p, { shares: val }))}
                      />
                    </div>
                  )}

                  {(editDraft.type === 'FIXED_DEPOSIT' || editDraft.type === 'TBILL') && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="min-w-0">
                        <label className="text-[11px] text-zinc-400 block mb-1">起息日</label>
                        <div className="relative h-[42px] rounded-xl bg-black/60 border border-white/[0.12] px-3 flex items-center justify-between overflow-hidden">
                          <span className="text-[13px] font-semibold text-white tabular-nums truncate">{formatDisplayDate(editDraft.startDate)}</span>
                          <input
                            type="date"
                            value={editDraft.startDate || ''}
                            onChange={(e) => setEditDraft((p) => Object.assign({}, p, { startDate: e.target.value }))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <label className="text-[11px] text-zinc-400 block mb-1">到期日</label>
                        <div className="relative h-[42px] rounded-xl bg-black/60 border border-white/[0.12] px-3 flex items-center justify-between overflow-hidden">
                          <span className="text-[13px] font-semibold text-white tabular-nums truncate">{formatDisplayDate(editDraft.maturityDate)}</span>
                          <input
                            type="date"
                            value={editDraft.maturityDate || ''}
                            onChange={(e) => setEditDraft((p) => Object.assign({}, p, { maturityDate: e.target.value }))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">備註</label>
                    <input
                      type="text"
                      value={editDraft.note}
                      onChange={(e) => setEditDraft((p) => Object.assign({}, p, { note: e.target.value }))}
                      placeholder="選填備註"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={handleSaveEdit} className="flex-1 py-3 rounded-xl bg-white text-black text-[13.5px] font-bold">
                      儲存設定
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`確定刪除部位「${focusedInv.name}」？`)) {
                          Store.deleteInvestment(focusedInv.id);
                          setFocusedInvId(null);
                          showToast('已刪除部位');
                        }
                      }}
                      className="px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[13.5px] font-medium"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )}

              {/* Elevated Action Tray */}
              <div
                className="rounded-[22px] bg-[#17171D] border border-white/[0.12] shadow-[0_10px_28px_rgba(0,0,0,0.45)] overflow-hidden"
                style={{ borderTop: `2px solid ${tMeta.color}88` }}
              >
                <div className="p-4 space-y-3.5">
                  {m.isTerm ? (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => openSettleSheet(focusedInv)}
                        className="w-full py-3.5 rounded-2xl bg-emerald-400 text-black text-[14.5px] font-bold active:scale-[0.99] transition"
                      >
                        {m.isFD ? '到期結清 / 續存操作' : '到期贖回 / 續買處理'}
                      </button>
                      {m.isTBill && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openValSheet(focusedInv)}
                            className="py-2.5 rounded-xl bg-white/[0.08] text-white text-[13px] font-semibold active:bg-white/15"
                          >
                            更新市值
                          </button>
                          <button
                            type="button"
                            onClick={() => openCashEvent(focusedInv, 'DIVIDEND')}
                            className="py-2.5 rounded-xl bg-white/[0.08] text-emerald-300 text-[13px] font-semibold active:bg-white/15"
                          >
                            登記派息
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => openValSheet(focusedInv)}
                        className="w-full py-3.5 rounded-2xl bg-white text-black text-[14.5px] font-bold active:scale-[0.99] transition"
                      >
                        更新最新市值
                      </button>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => openCashEvent(focusedInv, 'TOPUP')}
                          className="py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[12.5px] font-semibold active:bg-emerald-500/25"
                        >
                          追加買入
                        </button>
                        <button
                          type="button"
                          onClick={() => openCashEvent(focusedInv, 'DIVIDEND')}
                          className="py-2.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[12.5px] font-semibold active:bg-sky-500/25"
                        >
                          股息入帳
                        </button>
                        <button
                          type="button"
                          onClick={() => openCashEvent(focusedInv, 'SELL')}
                          className="py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[12.5px] font-semibold active:bg-amber-500/25"
                        >
                          賣出回款
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Clean Metadata Summary Card */}
                  <div className="rounded-2xl bg-[#111116] border border-white/[0.08] p-3.5 space-y-2 text-[12.5px]">
                    {focusedInv.startDate && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-500">{m.isTerm ? '起息日' : '建倉日'}</span>
                        <span className="text-zinc-200 tabular-nums">{focusedInv.startDate}</span>
                      </div>
                    )}
                    {m.isTerm && focusedInv.maturityDate && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-500">到期日 / 總天期</span>
                        <span className="text-zinc-200 tabular-nums">{focusedInv.maturityDate}（{m.totalDays} 天）</span>
                      </div>
                    )}
                    {(focusedInv.cumulativeDividends || 0) > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-500">累計已收息 / 股息</span>
                        <span className="text-emerald-300 font-semibold tabular-nums">
                          {Store.formatMoney(focusedInv.cumulativeDividends, focusedInv.currency, { showPlus: true })}
                        </span>
                      </div>
                    )}
                    {(focusedInv.realizedPnl || 0) !== 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-500">累計已實現收益</span>
                        <span className={`font-semibold tabular-nums ${focusedInv.realizedPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {Store.formatMoney(focusedInv.realizedPnl, focusedInv.currency, { showPlus: true })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500">最後更新</span>
                      <span className="text-zinc-400 tabular-nums">{focusedInv.lastUpdated || '-'}</span>
                    </div>
                    {focusedInv.note && (
                      <div className="pt-2 border-t border-white/[0.06] text-zinc-300 text-[12px] leading-relaxed break-words">
                        {focusedInv.note}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ================= SHEET 1: ADD NEW INVESTMENT ================= */}
        <BottomSheet
          open={addOpen}
          title="新增定期存款 / 投資部位"
          onClose={() => setAddOpen(false)}
          footer={
            <button
              type="button"
              onClick={handleCreateInvestment}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold active:scale-[0.99] transition"
            >
              {newInv.deductFromBank ? '確認扣款並建立部位' : '確認登記部位'}
            </button>
          }
        >
          <div className="space-y-3.5">
            {/* Asset Type Selector */}
            <div className="grid grid-cols-4 gap-1.5">
              {Store.INVESTMENT_TYPES.map((t) => {
                const active = newInv.type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      const nextCur = (t.id === 'ETF' || t.id === 'STOCK' || t.id === 'TBILL') ? 'USD' : state.meta.baseCurrency;
                      setNewInv((p) => Object.assign({}, p, {
                        type: t.id,
                        currency: nextCur,
                        linkedKey: findBestBankKey(t.id, nextCur),
                        apr: t.id === 'FIXED_DEPOSIT' ? 3.5 : (t.id === 'TBILL' ? 4.3 : 0)
                      }));
                    }}
                    className={`py-2.5 rounded-xl text-[12px] font-semibold border transition ${
                      active ? 'bg-white text-black border-white' : 'bg-black/45 text-zinc-300 border-white/10'
                    }`}
                  >
                    {t.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-12 gap-2.5">
              <div className={newInv.type === 'FIXED_DEPOSIT' ? 'col-span-12' : 'col-span-8'}>
                <label className="text-[12px] text-zinc-400 block mb-1">部位名稱</label>
                <input
                  type="text"
                  placeholder={newInv.type === 'FIXED_DEPOSIT' ? '例如：6個月高息定期' : newInv.type === 'TBILL' ? '例如：6個月美國國債' : '例如：標普 500 指數 ETF'}
                  value={newInv.name}
                  onChange={(e) => setNewInv((p) => Object.assign({}, p, { name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                />
              </div>
              {newInv.type !== 'FIXED_DEPOSIT' && (
                <div className="col-span-4">
                  <label className="text-[12px] text-zinc-400 block mb-1">代號</label>
                  <input
                    type="text"
                    placeholder={newInv.type === 'TBILL' ? 'T-Bill' : 'VOO'}
                    value={newInv.ticker}
                    onChange={(e) => setNewInv((p) => Object.assign({}, p, { ticker: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white uppercase outline-none"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1">計價幣種</label>
                <select
                  value={newInv.currency}
                  onChange={(e) => {
                    const c = e.target.value;
                    setNewInv((p) => Object.assign({}, p, { currency: c, linkedKey: findBestBankKey(p.type, c) }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                >
                  {Store.CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1">
                  {newInv.type === 'FIXED_DEPOSIT' ? '存入本金' : '買入成本'}
                </label>
                <NumericInput
                  size="sm"
                  value={newInv.principal}
                  currency={newInv.currency}
                  label="輸入投入本金"
                  quickAdds={[5000, 10000, 50000]}
                  onChange={(val) => setNewInv((p) => Object.assign({}, p, {
                    principal: val,
                    currentValue: p.type === 'FIXED_DEPOSIT' || p.currentValue === p.principal ? val : p.currentValue
                  }))}
                />
              </div>
            </div>

            {newInv.type === 'FIXED_DEPOSIT' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[12px] text-zinc-400 block mb-1">年利率 (%)</label>
                    <NumericInput
                      size="sm"
                      value={newInv.apr}
                      label="輸入年利率 (%)"
                      onChange={(val) => setNewInv((p) => Object.assign({}, p, { apr: val }))}
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-zinc-400 block mb-1">快捷存期</label>
                    <div className="grid grid-cols-3 gap-1 h-[40px]">
                      {[3, 6, 12].map((mo) => (
                        <button
                          key={mo}
                          type="button"
                          onClick={() => setNewInv((p) => Object.assign({}, p, { maturityDate: addMonthsISO(p.startDate || Store.todayISO(), mo) }))}
                          className="rounded-xl bg-white/[0.08] text-[12px] font-semibold text-zinc-200 active:bg-white/20"
                        >
                          {mo}月
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {newInv.type === 'TBILL' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1">到期面值 (Par)</label>
                  <NumericInput
                    size="sm"
                    value={newInv.faceValue}
                    currency={newInv.currency}
                    label="輸入到期面值"
                    onChange={(val) => setNewInv((p) => Object.assign({}, p, { faceValue: val }))}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1">目前估值</label>
                  <NumericInput
                    size="sm"
                    value={newInv.currentValue}
                    currency={newInv.currency}
                    label="輸入目前估值"
                    onChange={(val) => setNewInv((p) => Object.assign({}, p, { currentValue: val }))}
                  />
                </div>
              </div>
            )}

            {(newInv.type === 'ETF' || newInv.type === 'STOCK') && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1">目前市值</label>
                  <NumericInput
                    size="sm"
                    value={newInv.currentValue}
                    currency={newInv.currency}
                    label="輸入最新總市值"
                    onChange={(val) => setNewInv((p) => Object.assign({}, p, { currentValue: val }))}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1">持有股數（選填）</label>
                  <NumericInput
                    size="sm"
                    value={newInv.shares}
                    label="輸入股數"
                    onChange={(val) => setNewInv((p) => Object.assign({}, p, { shares: val }))}
                  />
                </div>
              </div>
            )}

            {(newInv.type === 'FIXED_DEPOSIT' || newInv.type === 'TBILL') && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="min-w-0">
                    <label className="text-[12px] text-zinc-400 block mb-1">起息日</label>
                    <div className="relative h-[44px] rounded-xl bg-black/60 border border-white/[0.12] px-3 flex items-center justify-between overflow-hidden">
                      <span className="text-[13.5px] font-semibold text-white tabular-nums truncate">{formatDisplayDate(newInv.startDate)}</span>
                      <Icon name="calendar" size={14} className="text-zinc-400 shrink-0" />
                      <input
                        type="date"
                        value={newInv.startDate}
                        onChange={(e) => { if (e.target.value) setNewInv((p) => Object.assign({}, p, { startDate: e.target.value })); }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="text-[12px] text-zinc-400 block mb-1">到期日</label>
                    <div className="relative h-[44px] rounded-xl bg-black/60 border border-white/[0.12] px-3 flex items-center justify-between overflow-hidden">
                      <span className="text-[13.5px] font-semibold text-white tabular-nums truncate">{formatDisplayDate(newInv.maturityDate)}</span>
                      <Icon name="calendar" size={14} className="text-zinc-400 shrink-0" />
                      <input
                        type="date"
                        value={newInv.maturityDate}
                        onChange={(e) => { if (e.target.value) setNewInv((p) => Object.assign({}, p, { maturityDate: e.target.value })); }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Interest Preview */}
                <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-between text-[12px] tabular-nums">
                  <span className="text-amber-200/90">
                    存期 {newInvPreview.totalDays} 天 · 預估年化 {newInvPreview.impliedApr}%
                  </span>
                  <span className="font-bold text-amber-200">
                    預估息 {Store.formatMoney(newInvPreview.expectedInterest, newInv.currency, { showPlus: true })}
                  </span>
                </div>
              </>
            )}

            {/* Linked Account + Optional Cash Deduction Toggle */}
            <div className="p-3 rounded-2xl bg-black/45 border border-white/[0.08] space-y-2.5">
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1">關聯銀行 / 證券交割戶</label>
                <select
                  value={newInv.linkedKey}
                  onChange={(e) => setNewInv((p) => Object.assign({}, p, { linkedKey: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                >
                  <option value="">不綁定戶口</option>
                  {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                </select>
              </div>

              {newInv.linkedKey && (
                <button
                  type="button"
                  onClick={() => setNewInv((p) => Object.assign({}, p, { deductFromBank: !p.deductFromBank }))}
                  className="w-full flex items-center justify-between gap-2 pt-1 text-left"
                >
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-white">同步從上述帳戶扣款開立</div>
                    <div className="text-[11px] text-zinc-500">關閉則「僅登記既有部位」，不變動活期餘額</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
                    newInv.deductFromBank ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {newInv.deductFromBank ? '扣款開立' : '僅登記'}
                  </span>
                </button>
              )}
            </div>

            <div>
              <label className="text-[12px] text-zinc-400 block mb-1">備註（選填）</label>
              <input
                type="text"
                placeholder="例如：新資金優惠利率、IBKR 帳戶"
                value={newInv.note}
                onChange={(e) => setNewInv((p) => Object.assign({}, p, { note: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
              />
            </div>
          </div>
        </BottomSheet>

        {/* ================= SHEET 2: TERM SETTLEMENT / ROLLOVER ================= */}
        <BottomSheet
          open={settleOpen && Boolean(focusedInv)}
          title={focusedInv ? `到期處理 · ${focusedInv.name}` : '到期處理'}
          subtitle={focusedInv ? `本金 ${Store.formatMoney(focusedInv.principal, focusedInv.currency)}` : ''}
          onClose={() => setSettleOpen(false)}
          footer={
            <button
              type="button"
              onClick={handleConfirmSettle}
              className="w-full py-3.5 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold active:scale-[0.99] transition"
            >
              {settleDraft.mode === 'CASH_OUT'
                ? '確認本息回籠活期'
                : settleDraft.mode === 'ROLLOVER_PRINCIPAL'
                ? '確認續存本金並領息'
                : '確認本息全額滾存'}
            </button>
          }
        >
          {focusedInv && (
            <div className="space-y-4">
              <SegmentedControl
                value={settleDraft.mode}
                onChange={(v) => setSettleDraft((p) => Object.assign({}, p, { mode: v }))}
                options={[
                  { value: 'CASH_OUT', label: '本息入活期' },
                  { value: 'ROLLOVER_PRINCIPAL', label: '本金續存' },
                  { value: 'ROLLOVER_ALL', label: '本息滾存' }
                ]}
              />

              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">
                  實收利息 / 到期收益 ({focusedInv.currency})
                </label>
                <NumericInput
                  size="lg"
                  value={settleDraft.actualInterest}
                  currency={focusedInv.currency}
                  label="輸入實際收到利息"
                  onChange={(val) => setSettleDraft((p) => Object.assign({}, p, { actualInterest: val }))}
                  className="!text-emerald-400"
                />
              </div>

              {(settleDraft.mode === 'CASH_OUT' || settleDraft.mode === 'ROLLOVER_PRINCIPAL') && (
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1.5">
                    {settleDraft.mode === 'CASH_OUT' ? '本息回款帳戶' : '利息入帳帳戶'}
                  </label>
                  <select
                    value={settleDraft.toKey}
                    onChange={(e) => setSettleDraft((p) => Object.assign({}, p, { toKey: e.target.value }))}
                    className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.12] text-[14px] text-white outline-none"
                  >
                    {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                  </select>
                </div>
              )}

              {settleDraft.mode !== 'CASH_OUT' && (
                <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.08] space-y-3">
                  <div className="text-[12px] font-semibold text-amber-300">
                    續期條件 {settleDraft.mode === 'ROLLOVER_ALL' && `（新本金 ${Store.formatMoney(Store.round2((focusedInv.principal || 0) + Number(settleDraft.actualInterest || 0)), focusedInv.currency)}）`}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">新期年利率 (%)</label>
                      <NumericInput
                        size="sm"
                        value={settleDraft.newApr}
                        label="設定續存年利率 (%)"
                        onChange={(val) => setSettleDraft((p) => Object.assign({}, p, { newApr: val }))}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="text-[11px] text-zinc-400 block mb-1">新到期日</label>
                      <div className="relative h-[40px] rounded-xl bg-black/60 border border-white/[0.12] px-3 flex items-center justify-between overflow-hidden">
                        <span className="text-[13px] font-semibold text-white tabular-nums truncate">{formatDisplayDate(settleDraft.newMaturityDate)}</span>
                        <input
                          type="date"
                          value={settleDraft.newMaturityDate}
                          onChange={(e) => { if (e.target.value) setSettleDraft((p) => Object.assign({}, p, { newMaturityDate: e.target.value })); }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 6, 12].map((mo) => (
                      <button
                        key={mo}
                        type="button"
                        onClick={() => setSettleDraft((p) => Object.assign({}, p, { newMaturityDate: addMonthsISO(Store.todayISO(), mo) }))}
                        className="py-2 rounded-xl bg-white/[0.08] text-[12px] font-semibold text-zinc-200 active:bg-white/20"
                      >
                        +{mo} 個月
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </BottomSheet>

        {/* ================= SHEET 3: MARKET VALUE CALIBRATION ================= */}
        <BottomSheet
          open={valOpen && Boolean(focusedInv)}
          title={focusedInv ? `更新市值 · ${focusedInv.name}` : '更新市值'}
          subtitle={focusedInv ? `投入成本 ${Store.formatMoney(focusedInv.principal, focusedInv.currency)}` : ''}
          onClose={() => setValOpen(false)}
          footer={
            <button
              type="button"
              onClick={handleSaveValuation}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold"
            >
              儲存最新市值
            </button>
          }
        >
          {focusedInv && (() => {
            const previewVal = valMode === 'PRICE'
              ? Store.round2(Number(valShares || 0) * Number(valUnitPrice || 0))
              : Store.round2(Number(valTotal || 0));
            const previewPnl = Store.round2(previewVal - (focusedInv.principal || 0));
            const previewPct = (focusedInv.principal || 0) > 0 ? Store.round2((previewPnl / focusedInv.principal) * 100) : 0;

            return (
              <div className="space-y-4">
                <SegmentedControl
                  value={valMode}
                  onChange={setValMode}
                  options={[
                    { value: 'TOTAL', label: '直接填總市值' },
                    { value: 'PRICE', label: '股數 × 單價' }
                  ]}
                />

                {valMode === 'TOTAL' ? (
                  <div>
                    <label className="text-[12px] text-zinc-400 block mb-1.5">最新總市值 ({focusedInv.currency})</label>
                    <NumericInput
                      size="lg"
                      value={valTotal}
                      currency={focusedInv.currency}
                      label={`輸入最新市值 (${focusedInv.currency})`}
                      onChange={(val) => setValTotal(val)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[12px] text-zinc-400 block mb-1.5">最新持股數</label>
                      <NumericInput
                        size="md"
                        value={valShares}
                        label="輸入持有股數"
                        onChange={(val) => setValShares(val)}
                      />
                    </div>
                    <div>
                      <label className="text-[12px] text-zinc-400 block mb-1.5">最新單價 ({focusedInv.currency})</label>
                      <NumericInput
                        size="md"
                        value={valUnitPrice}
                        currency={focusedInv.currency}
                        label="輸入最新市價"
                        onChange={(val) => setValUnitPrice(val)}
                      />
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.08] flex items-center justify-between text-[13px] tabular-nums">
                  <span className="text-zinc-400">更新後未實現損益</span>
                  <span className={`font-bold ${previewPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Store.formatMoney(previewPnl, focusedInv.currency, { showPlus: true })} ({previewPnl >= 0 ? '+' : ''}{previewPct}%)
                  </span>
                </div>
              </div>
            );
          })()}
        </BottomSheet>

        {/* ================= SHEET 4: TOPUP / DIVIDEND / SELL ================= */}
        <BottomSheet
          open={cashEventOpen && Boolean(focusedInv)}
          title={
            cashEventMode === 'TOPUP'
              ? `追加買入 · ${focusedInv ? focusedInv.name : ''}`
              : cashEventMode === 'DIVIDEND'
              ? `配息收益 · ${focusedInv ? focusedInv.name : ''}`
              : `賣出回款 · ${focusedInv ? focusedInv.name : ''}`
          }
          onClose={() => setCashEventOpen(false)}
          footer={
            <button
              type="button"
              onClick={handleConfirmCashEvent}
              className="w-full py-3.5 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold"
            >
              {cashEventMode === 'TOPUP' ? '確認追加投入' : cashEventMode === 'DIVIDEND' ? '確認配息入帳' : '確認賣出結算'}
            </button>
          }
        >
          {focusedInv && (
            <div className="space-y-4">
              <div>
                <label className="text-[12px] text-zinc-400 block mb-1.5">
                  {cashEventMode === 'TOPUP' ? '本次投入金額' : cashEventMode === 'DIVIDEND' ? '實收配息金額' : '實收賣出金額'} ({focusedInv.currency})
                </label>
                <NumericInput
                  size="lg"
                  value={cashDraft.amount}
                  currency={focusedInv.currency}
                  label="輸入金額"
                  onChange={(val) => setCashDraft((p) => Object.assign({}, p, { amount: val }))}
                  className="!text-emerald-400"
                />
              </div>

              {(cashEventMode === 'TOPUP' || cashEventMode === 'SELL') && (focusedInv.type === 'ETF' || focusedInv.type === 'STOCK') && (
                <div>
                  <label className="text-[12px] text-zinc-400 block mb-1.5">
                    {cashEventMode === 'TOPUP' ? '新增股數（選填）' : '賣出股數（選填）'}
                  </label>
                  <NumericInput
                    size="sm"
                    value={cashDraft.sharesDelta}
                    label="輸入股數"
                    onChange={(val) => setCashDraft((p) => Object.assign({}, p, { sharesDelta: val }))}
                  />
                </div>
              )}

              {cashEventMode === 'SELL' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setCashDraft((p) => Object.assign({}, p, { fullClose: !p.fullClose }))}
                    className="w-full px-3.5 py-3 rounded-xl bg-black/45 border border-white/[0.1] flex items-center justify-between"
                  >
                    <span className="text-[13px] text-zinc-200">全額清倉並移入歸檔</span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${cashDraft.fullClose ? 'bg-amber-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
                      {cashDraft.fullClose ? '全額清倉' : '部分賣出'}
                    </span>
                  </button>

                  {!cashDraft.fullClose && (
                    <div>
                      <label className="text-[12px] text-zinc-400 block mb-1.5">
                        對應扣減成本（留空自動按比例扣減）
                      </label>
                      <NumericInput
                        size="sm"
                        value={cashDraft.costReduce}
                        currency={focusedInv.currency}
                        label="輸入扣減成本"
                        onChange={(val) => setCashDraft((p) => Object.assign({}, p, { costReduce: val }))}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 rounded-2xl bg-black/45 border border-white/[0.08] space-y-2.5">
                <button
                  type="button"
                  onClick={() => setCashDraft((p) => Object.assign({}, p, { linkCash: !p.linkCash }))}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-[13px] font-medium text-white">
                    {cashEventMode === 'TOPUP' ? '同步從現金戶扣款' : '同步入帳至現金戶'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${cashDraft.linkCash ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
                    {cashDraft.linkCash ? '同步連動' : '僅改持倉'}
                  </span>
                </button>
                {cashDraft.linkCash && (
                  <select
                    value={cashDraft.bankKey}
                    onChange={(e) => setCashDraft((p) => Object.assign({}, p, { bankKey: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                  >
                    {bankOptions.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[12px] text-zinc-400 block mb-1">備註（選填）</label>
                <input
                  type="text"
                  value={cashDraft.note}
                  onChange={(e) => setCashDraft((p) => Object.assign({}, p, { note: e.target.value }))}
                  placeholder="選填說明"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                />
              </div>
            </div>
          )}
        </BottomSheet>

        {/* ================= SHEET 5: QUARTERLY WEALTH SNAPSHOT ================= */}
        <BottomSheet
          open={snapOpen}
          title="券商季報與投資快照"
          subtitle="定期批次更新市值並留存資產歷史歸檔"
          maxHeight="88dvh"
          onClose={() => setSnapOpen(false)}
          footer={
            snapTab === 'CREATE' && activeInvestments.length > 0 ? (
              <button
                type="button"
                onClick={handleSaveSnapshot}
                className="w-full py-3.5 rounded-2xl bg-emerald-400 text-black text-[15px] font-bold active:scale-[0.99] transition"
              >
                更新市值並歸檔快照
              </button>
            ) : null
          }
        >
          <div className="space-y-4">
            <SegmentedControl
              value={snapTab}
              onChange={setSnapTab}
              options={[
                { value: 'CREATE', label: '建立新快照' },
                { value: 'HISTORY', label: `歷史歸檔 (${snapList.length})` }
              ]}
            />

            {snapTab === 'CREATE' && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-7">
                    <label className="text-[11.5px] text-zinc-400 block mb-1">快照名稱</label>
                    <input
                      type="text"
                      value={snapLabel}
                      onChange={(e) => setSnapLabel(e.target.value)}
                      placeholder="2026 Q4 季報快照"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13.5px] text-white outline-none"
                    />
                  </div>
                  <div className="col-span-5 min-w-0">
                    <label className="text-[11.5px] text-zinc-400 block mb-1">歸檔日期</label>
                    <div className="relative h-[42px] rounded-xl bg-black/60 border border-white/[0.12] px-2.5 flex items-center justify-between overflow-hidden">
                      <span className="text-[12.5px] font-semibold text-white tabular-nums truncate">{snapDate}</span>
                      <input
                        type="date"
                        value={snapDate}
                        onChange={(e) => { if (e.target.value) setSnapDate(e.target.value); }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {activeInvestments.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-zinc-500">尚無持倉部位可歸檔</div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="text-[12px] text-zinc-400">
                      核對各持倉最新市值（定期存款自動按本金計入）：
                    </div>
                    {activeInvestments.map((inv) => {
                      const tMeta = getTypeMeta(inv.type);
                      const isFD = inv.type === 'FIXED_DEPOSIT';
                      return (
                        <div key={inv.id} className="p-3 rounded-2xl bg-black/45 border border-white/[0.08] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tMeta.color }} />
                              <span className="text-[13.5px] font-semibold text-white truncate">{inv.name}</span>
                              {inv.ticker && <span className="text-[11px] text-zinc-500">{inv.ticker}</span>}
                            </div>
                            <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">
                              成本 {Store.formatMoney(inv.principal, inv.currency)}
                            </span>
                          </div>
                          {isFD ? (
                            <div className="text-[13px] font-semibold text-amber-200 tabular-nums">
                              定期本金 {Store.formatMoney(inv.principal, inv.currency)}
                            </div>
                          ) : (
                            <NumericInput
                              size="sm"
                              value={snapValues[inv.id] != null ? snapValues[inv.id] : inv.currentValue}
                              currency={inv.currency}
                              label={`輸入「${inv.name}」最新市值`}
                              onChange={(val) => setSnapValues((p) => Object.assign({}, p, { [inv.id]: val }))}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <label className="text-[11.5px] text-zinc-400 block mb-1">備註（選填）</label>
                  <input
                    type="text"
                    value={snapNote}
                    onChange={(e) => setSnapNote(e.target.value)}
                    placeholder="例如：對齊券商季度結單"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] text-[13px] text-white outline-none"
                  />
                </div>
              </div>
            )}

            {snapTab === 'HISTORY' && (
              <div className="space-y-3">
                {snapList.length === 0 ? (
                  <div className="py-10 text-center text-[13px] text-zinc-500">尚無歷史季報快照</div>
                ) : (
                  snapList.map((sn, idx) => {
                    const prev = snapList[idx + 1] || null;
                    const delta = prev ? Store.round2(sn.totalValueBase - prev.totalValueBase) : null;
                    const isExp = expandedSnapId === sn.id;
                    return (
                      <div key={sn.id} className="rounded-2xl bg-black/45 border border-white/[0.09] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedSnapId(isExp ? null : sn.id)}
                          className="w-full p-3.5 text-left space-y-1.5 active:bg-white/[0.04]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[14px] font-bold text-white truncate">{sn.label}</span>
                            <span className="text-[11.5px] text-zinc-400 tabular-nums shrink-0">{sn.date}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-2 tabular-nums">
                            <span className="text-[17px] font-bold text-white">
                              {Store.formatMoney(sn.totalValueBase, sn.baseCurrency)}
                            </span>
                            <span className={`text-[12px] font-semibold ${sn.totalPnlBase >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              損益 {Store.formatMoney(sn.totalPnlBase, sn.baseCurrency, { showPlus: true })}
                            </span>
                          </div>
                          {delta != null && (
                            <div className="text-[11px] text-zinc-400 tabular-nums">
                              較上期快照：
                              <span className={`font-semibold ml-1 ${delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {Store.formatMoney(delta, sn.baseCurrency, { showPlus: true })}
                              </span>
                            </div>
                          )}
                        </button>

                        {isExp && (
                          <div className="px-3.5 pb-3.5 pt-2 border-t border-white/[0.06] space-y-2">
                            {(sn.items || []).map((it) => (
                              <div key={it.id} className="flex items-center justify-between gap-2 text-[12px] tabular-nums">
                                <span className="text-zinc-300 truncate">{it.name}{it.ticker ? ` (${it.ticker})` : ''}</span>
                                <span className="text-white font-semibold shrink-0">{Store.formatMoney(it.currentValue, it.currency)}</span>
                              </div>
                            ))}
                            {sn.note && <div className="text-[11.5px] text-zinc-500 pt-1">{sn.note}</div>}
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`確定刪除快照「${sn.label}」？`)) {
                                    Store.deleteWealthSnapshot(sn.id);
                                    showToast('已刪除歷史快照');
                                  }
                                }}
                                className="text-[11.5px] text-rose-400 flex items-center gap-1"
                              >
                                <Icon name="trash" size={12} /> 刪除此歸檔
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </BottomSheet>
      </div>
    );
  }

  window.WealthInvest = { WealthView };
})();
