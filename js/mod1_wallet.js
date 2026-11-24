(function () {
  const { useState, useMemo } = React;
  const Store = window.WealthStore;
  const { Icons, BottomSheet, NumericInput } = window.WealthUI;

  const CARD_THEMES = [
    { id: 'titanium', name: '鈦金屬黑', gradient: 'from-[#334155] via-[#1E293B] to-[#090D16]' },
    { id: 'purple',   name: '極光紫',   gradient: 'from-[#5B21B6] via-[#4C1D95] to-[#1E1B4B]' },
    { id: 'crimson',  name: '緋紅金',   gradient: 'from-[#991B1B] via-[#7F1D1D] to-[#2A0808]' },
    { id: 'ocean',    name: '深海藍',   gradient: 'from-[#0369A1] via-[#075985] to-[#082F49]' },
    { id: 'emerald',  name: '翡翠綠',   gradient: 'from-[#047857] via-[#064E3B] to-[#022C22]' },
    { id: 'sunset',   name: '琥珀橙',   gradient: 'from-[#EA580C] via-[#9A3412] to-[#3B1106]' },
    { id: 'rose',     name: '玫瑰金',   gradient: 'from-[#BE123C] via-[#881337] to-[#2E0514]' },
    { id: 'gold',     name: '黑金尊貴', gradient: 'from-[#78350F] via-[#451A03] to-[#1C0A00]' }
  ];

  const SUB_BUCKET_COLORS = ['#F43F5E', '#38BDF8', '#34D399', '#F59E0B', '#A855F7', '#14B8A6'];
  const TYPE_LABELS = { ALL: '全部', BANK: '銀行', EWALLET: '電子錢包', INVEST: '投資保單' };

  function WalletView({ hideMoney, onNotify }) {
    const state = window.WealthUI.useWealthStore();
    const cards = (state.walletCards || []).filter(c => !c.archived);
    const buckets = (state.settings?.buckets || []).filter(b => !b.archived);
    const baseCurrency = state.settings?.baseCurrency || 'MOP';
    const netSummary = useMemo(() => Store.computeNetWorthSummary(), [state]);

    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [activeCardId, setActiveCardId] = useState(() => cards[0]?.id || null);
    const [activeCurrencyIdx, setActiveCurrencyIdx] = useState({});
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [confirmDeleteCard, setConfirmDeleteCard] = useState(false);
    const [expandedSbId, setExpandedSbId] = useState(null);
    const [modalType, setModalType] = useState(null);

    const filteredCards = useMemo(() => {
      if (categoryFilter === 'ALL') return cards;
      return cards.filter(c => c.type === categoryFilter);
    }, [cards, categoryFilter]);

    const activeCardIndex = filteredCards.findIndex(c => c.id === activeCardId);
    const activeCard = activeCardIndex !== -1 ? filteredCards[activeCardIndex] : null;
    const currentAccIdx = activeCard ? (activeCurrencyIdx[activeCard.id] || 0) : 0;
    const activeAccount = activeCard ? (activeCard.accounts[currentAccIdx] || activeCard.accounts[0]) : null;
    const cardTheme = CARD_THEMES.find(t => t.id === activeCard?.themeId) || CARD_THEMES[0];

    const selectCardSmooth = (cardId) => {
      setIsCardFlipped(false);
      setConfirmDeleteCard(false);
      setActiveCardId(cardId);
      const target = cards.find(c => c.id === cardId);
      const firstAcc = target?.accounts?.[activeCurrencyIdx[cardId] || 0] || target?.accounts?.[0];
      setExpandedSbId(firstAcc?.subBuckets?.[0]?.id || null);
    };

    const stepCard = (dir) => {
      if (!filteredCards.length || activeCardIndex === -1) return;
      const nextIdx = (activeCardIndex + dir + filteredCards.length) % filteredCards.length;
      selectCardSmooth(filteredCards[nextIdx].id);
    };

    const cardSwipeHandlers = window.WealthUI.useHorizontalSwipe({
      enabled: Boolean(activeCard && !isCardFlipped),
      onSwipeLeft: () => stepCard(1),
      onSwipeRight: () => stepCard(-1)
    });

    const updateActiveAccount = (updater) => {
      if (!activeCard || !activeAccount) return;
      Store.setState(prev => {
        const updatedTarget = updater(activeAccount);
        const nextBuckets = updatedTarget.isPrimary
          ? prev.settings.buckets.map(b => b.id === updatedTarget.purpose ? { ...b, primaryAccountId: updatedTarget.id } : b)
          : prev.settings.buckets;

        return {
          ...prev,
          settings: { ...prev.settings, buckets: nextBuckets },
          walletCards: prev.walletCards.map(c => ({
            ...c,
            accounts: c.accounts.map(a => {
              if (c.id === activeCard.id && a.id === activeAccount.id) return updatedTarget;
              if (updatedTarget.isPrimary && a.purpose === updatedTarget.purpose) {
                return { ...a, isPrimary: false };
              }
              return a;
            })
          }))
        };
      });
    };

    const updateActiveCard = (updater) => {
      if (!activeCard) return;
      Store.setState(prev => ({
        ...prev,
        walletCards: prev.walletCards.map(c => c.id === activeCard.id ? updater(c) : c)
      }));
    };

    const deleteCurrentCard = () => {
      if (!activeCard) return;
      const remaining = cards.filter(c => c.id !== activeCard.id);
      Store.setState(prev => ({
        ...prev,
        walletCards: prev.walletCards.map(c => c.id === activeCard.id ? { ...c, archived: true } : c)
      }));
      setIsCardFlipped(false);
      setConfirmDeleteCard(false);
      setActiveCardId(remaining[0]?.id || null);
      onNotify('已封存該銀包卡片');
    };

    const updateSubBucket = (sbId, patch) => {
      updateActiveAccount(acc => ({
        ...acc,
        subBuckets: (acc.subBuckets || []).map(sb => sb.id === sbId ? { ...sb, ...patch } : sb)
      }));
    };

    const deleteSubBucket = (sbId) => {
      updateActiveAccount(acc => ({
        ...acc,
        subBuckets: (acc.subBuckets || []).filter(sb => sb.id !== sbId)
      }));
    };

    return (
      <div className="space-y-3.5 animate-fade">
        <div className="px-4 py-3 rounded-2xl bg-[#111113] border border-white/[0.06] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#8E8E93]">活期與錢包可用</div>
            <div className="text-xl font-bold font-mono-num text-white mt-0.5">
              {Store.formatMoney(netSummary.liquidCash, baseCurrency, hideMoney)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[#8E8E93]">凍結底倉與定存</div>
            <div className="text-xs font-mono-num font-semibold text-zinc-300 mt-0.5">
              {Store.formatMoney(netSummary.lockedAndFrozen, baseCurrency, hideMoney)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {activeCard ? (
            <button
              type="button"
              onClick={() => {
                setIsCardFlipped(false);
                setActiveCardId(null);
              }}
              className="min-h-[38px] px-3 rounded-full bg-[#161618] border border-white/[0.08] text-xs font-semibold text-zinc-200 flex items-center gap-1"
            >
              <Icons.ChevronLeft />
              <span>卡包總覽 ({filteredCards.length})</span>
            </button>
          ) : (
            <div data-no-swipe="true" className="flex items-center gap-1 bg-[#161618] p-1 rounded-full border border-white/[0.06] overflow-x-auto">
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCategoryFilter(k)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 transition ${
                    categoryFilter === k ? 'bg-white text-black' : 'text-[#8E8E93]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setModalType('NEW_CARD')}
            className="min-h-[38px] px-3.5 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1 shrink-0 active:scale-95 transition"
          >
            <span>＋</span>
            <span>新增卡片</span>
          </button>
        </div>

        {!activeCard && (
          <div className="pt-1 pb-6">
            {filteredCards.length === 0 ? (
              <div className="py-12 rounded-3xl bg-[#111113] border border-white/[0.06] text-center space-y-3">
                <div className="text-xs text-[#8E8E93]">尚無銀包卡片</div>
                <button
                  type="button"
                  onClick={() => setModalType('NEW_CARD')}
                  className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold"
                >
                  新增首張銀包卡
                </button>
              </div>
            ) : (
              filteredCards.map((card, index) => {
                const theme = CARD_THEMES.find(t => t.id === card.themeId) || CARD_THEMES[0];
                const primaryAcc = card.accounts[activeCurrencyIdx[card.id] || 0] || card.accounts[0];
                const bucket = buckets.find(b => b.id === primaryAcc.purpose) || buckets[0];

                return (
                  <div
                    key={card.id}
                    onClick={() => selectCardSmooth(card.id)}
                    style={{ marginTop: index === 0 ? '0px' : '-114px', zIndex: index + 1 }}
                    className={`wallet-card-transition relative h-[188px] rounded-[28px] p-5 bg-gradient-to-br ${theme.gradient} border border-white/20 shadow-[0_-12px_28px_rgba(0,0,0,0.85)] cursor-pointer hover:-translate-y-2`}
                  >
                    <div className="wallet-card-shine absolute inset-0 rounded-[28px] pointer-events-none" />
                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-white">{card.institution}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 text-white/80 font-medium">
                            {TYPE_LABELS[card.type]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {card.accounts.map(a => (
                            <span key={a.id} className="text-[10px] font-mono-num px-2 py-0.5 rounded bg-black/40 text-white/90 font-semibold">
                              {a.currency}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold font-mono-num text-white">
                          {Store.formatMoney(primaryAcc.balance, primaryAcc.currency, hideMoney)}
                        </div>
                        {bucket && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-black/40 text-white/90 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                            <span>{bucket.name}</span>
                            {primaryAcc.isPrimary && <span>★</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeCard && activeAccount && (() => {
          const allocatedSum = (activeAccount.subBuckets || []).reduce((s, b) => s + Number(b.amount || 0), 0);
          const frozenSum = (activeAccount.subBuckets || []).filter(b => b.isFrozen).reduce((s, b) => s + Number(b.amount || 0), 0);
          const unallocatedFree = Math.max(0, Number(activeAccount.balance) - allocatedSum);
          const realSpendable = Math.max(0, Number(activeAccount.balance) - frozenSum);
          const currentBucket = buckets.find(b => b.id === activeAccount.purpose) || buckets[0];
          const otherCards = filteredCards.filter(c => c.id !== activeCard.id);

          return (
            <div className="space-y-4">
              <div
                key={activeCard.id}
                data-no-swipe="true"
                {...cardSwipeHandlers}
                className={`animate-card-spring wallet-card-transition relative rounded-[28px] p-5 bg-gradient-to-br ${cardTheme.gradient} border border-white/20 shadow-[0_18px_45px_rgba(0,0,0,0.85)] overflow-hidden`}
              >
                <div className="wallet-card-shine absolute inset-0 pointer-events-none" />

                {!isCardFlipped ? (
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-bold tracking-tight text-white">{activeCard.institution}</h2>
                          <button
                            type="button"
                            onClick={() => setIsCardFlipped(true)}
                            className="px-2 py-0.5 rounded-full bg-black/35 border border-white/15 text-[10px] text-white/80 hover:text-white"
                          >
                            設定
                          </button>
                          {activeCard.type === 'EWALLET' && (
                            <button
                              type="button"
                              onClick={() => setModalType('TOPUP_EWALLET')}
                              className="px-2.5 py-0.5 rounded-full bg-white text-black text-[10px] font-bold"
                            >
                              增值
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-white/75 mt-0.5">{activeAccount.name}</div>
                      </div>

                      {currentBucket && (
                        <button
                          type="button"
                          onClick={() => setModalType('BUCKET_PICKER')}
                          className="px-2.5 py-1 rounded-full bg-black/40 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentBucket.color }} />
                          <span>{currentBucket.name}</span>
                          {activeAccount.isPrimary && <span className="text-amber-300">★</span>}
                        </button>
                      )}
                    </div>

                    <div data-no-swipe="true" className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      {activeCard.accounts.map((acc, idx) => {
                        const isSel = idx === currentAccIdx;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setActiveCurrencyIdx(prev => ({ ...prev, [activeCard.id]: idx }));
                              setExpandedSbId(acc.subBuckets?.[0]?.id || null);
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-mono-num font-bold shrink-0 transition flex items-center gap-1.5 ${
                              isSel ? 'bg-white text-black shadow' : 'bg-black/35 text-white/80 border border-white/15'
                            }`}
                          >
                            <span>{acc.currency}</span>
                            <span className={`text-[10px] ${isSel ? 'text-zinc-600' : 'text-white/60'}`}>
                              {hideMoney ? '•••' : Number(acc.balance).toLocaleString()}
                            </span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setModalType('ADD_CURRENCY')}
                        className="px-2.5 py-1 rounded-xl bg-white/10 border border-dashed border-white/30 text-[11px] font-semibold text-white/90 shrink-0"
                      >
                        + 幣種
                      </button>
                    </div>

                    <div className="pt-1 flex items-end justify-between">
                      <div
                        onClick={() => setModalType('BALANCE_EDIT')}
                        className="cursor-pointer rounded-2xl -ml-2 px-2 py-1 hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] text-white/75">
                          <span>{activeCard.type === 'INVEST' ? '交割現金餘額' : '帳戶餘額'}</span>
                          <span className="opacity-70"><Icons.Sliders /></span>
                        </div>
                        <div className="text-3xl font-bold font-mono-num tracking-tight text-white mt-0.5">
                          {Store.formatMoney(activeAccount.balance, activeAccount.currency, hideMoney)}
                        </div>
                      </div>

                      <div className="text-right pb-1">
                        <div className="text-[11px] text-emerald-300 font-medium">扣除凍結可用</div>
                        <div className="text-base font-bold font-mono-num text-emerald-200">
                          {Store.formatMoney(realSpendable, activeAccount.currency, hideMoney)}
                        </div>
                        {activeAccount.lockedBalance > 0 && (
                          <div className="text-[10px] font-mono-num text-amber-300 mt-0.5">
                            定存鎖定 {Store.formatMoney(activeAccount.lockedBalance, activeAccount.currency, hideMoney)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="h-2.5 w-full rounded-full bg-black/45 p-0.5 flex gap-0.5 overflow-hidden border border-white/10">
                        {(activeAccount.subBuckets || []).map(sb => {
                          const pct = activeAccount.balance > 0 ? Math.min(100, (sb.amount / activeAccount.balance) * 100) : 0;
                          if (pct <= 0) return null;
                          return (
                            <div
                              key={sb.id}
                              onClick={() => setExpandedSbId(sb.id)}
                              style={{ width: `${pct}%`, backgroundColor: sb.color }}
                              className="h-full first:rounded-l-full last:rounded-r-full cursor-pointer"
                            />
                          );
                        })}
                        {unallocatedFree > 0 && (
                          <div
                            style={{ width: `${(unallocatedFree / (activeAccount.balance || 1)) * 100}%` }}
                            className="h-full bg-white/25 rounded-r-full"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-white/75 font-mono-num px-0.5">
                        <span>凍結底倉 {Store.formatMoney(frozenSum, activeAccount.currency, hideMoney)}</span>
                        <span>未分配 {Store.formatMoney(unallocatedFree, activeAccount.currency, hideMoney)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 space-y-3 animate-fade">
                    <div className="flex items-center justify-between border-b border-white/15 pb-2">
                      <span className="text-xs font-bold text-white">卡片設定</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCardFlipped(false);
                          setConfirmDeleteCard(false);
                        }}
                        className="px-3 py-1 rounded-full bg-white text-black text-xs font-bold"
                      >
                        完成
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-white/70 mb-1">機構名稱</label>
                        <input
                          type="text"
                          value={activeCard.institution}
                          onChange={e => updateActiveCard(c => ({ ...c, institution: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/20 text-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/70 mb-1">子戶口名稱</label>
                        <input
                          type="text"
                          value={activeAccount.name}
                          onChange={e => updateActiveAccount(a => ({ ...a, name: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/20 text-white font-semibold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-white/70">載體類型</span>
                      <div className="flex gap-1">
                        {['BANK', 'EWALLET', 'INVEST'].map(tKey => (
                          <button
                            key={tKey}
                            type="button"
                            onClick={() => updateActiveCard(c => ({ ...c, type: tKey }))}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                              activeCard.type === tKey ? 'bg-white text-black border-white' : 'bg-black/40 text-white/75 border-white/15'
                            }`}
                          >
                            {TYPE_LABELS[tKey]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {CARD_THEMES.map(theme => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => updateActiveCard(c => ({ ...c, themeId: theme.id }))}
                          className={`py-1.5 px-1 rounded-xl bg-gradient-to-br ${theme.gradient} border text-[10px] font-semibold text-white ${
                            activeCard.themeId === theme.id ? 'border-white ring-2 ring-white/50' : 'border-white/20 opacity-80'
                          }`}
                        >
                          {theme.name}
                        </button>
                      ))}
                    </div>

                    <div className="pt-1 border-t border-white/15 flex items-center justify-between">
                      {!confirmDeleteCard ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCard(true)}
                          className="ml-auto text-[11px] text-rose-300 font-semibold"
                        >
                          封存此卡片
                        </button>
                      ) : (
                        <div className="ml-auto flex items-center gap-1.5">
                          <span className="text-[10px] text-rose-200">確定封存？</span>
                          <button type="button" onClick={deleteCurrentCard} className="px-2.5 py-1 rounded bg-rose-600 text-white text-[10px] font-bold">
                            確認
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteCard(false)} className="px-2 py-1 rounded bg-black/50 text-white/70 text-[10px]">
                            取消
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-[#8E8E93]">
                    戶口份額 ({(activeAccount.subBuckets || []).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalType('ADD_SUBBUCKET')}
                    className="px-3 py-1 rounded-full bg-[#161618] border border-white/10 text-xs font-semibold text-white"
                  >
                    + 新增份額
                  </button>
                </div>

                <div className="space-y-2">
                  {(activeAccount.subBuckets || []).map(sb => {
                    const isExpanded = expandedSbId === sb.id;
                    const pct = activeAccount.balance > 0 ? Math.round((sb.amount / activeAccount.balance) * 100) : 0;
                    const otherAllocated = (activeAccount.subBuckets || []).filter(it => it.id !== sb.id).reduce((s, it) => s + Number(it.amount || 0), 0);
                    const maxForThis = Math.max(0, Number(activeAccount.balance) - otherAllocated);

                    return (
                      <div key={sb.id} className="rounded-2xl bg-[#111113] border border-white/[0.06] overflow-hidden">
                        <div
                          onClick={() => setExpandedSbId(isExpanded ? null : sb.id)}
                          className="p-3.5 flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sb.color }} />
                            <span className="text-xs font-bold text-white truncate">{sb.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 shrink-0 ${
                              sb.isFrozen ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'
                            }`}>
                              {sb.isFrozen ? <Icons.Lock /> : <Icons.Unlock />}
                              <span>{sb.isFrozen ? '凍結' : '可用'}</span>
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold font-mono-num text-white">
                              {Store.formatMoney(sb.amount, activeAccount.currency, hideMoney)}
                            </div>
                            <div className="text-[10px] font-mono-num text-[#8E8E93]">{pct}%</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-2.5 border-t border-white/[0.06] bg-black/35 space-y-3">
                            <input
                              type="range"
                              min="0"
                              max={Math.max(activeAccount.balance, sb.amount)}
                              step="500"
                              value={sb.amount}
                              onChange={e => updateSubBucket(sb.id, { amount: Number(e.target.value) })}
                              className="w-full"
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateSubBucket(sb.id, { amount: Math.max(0, sb.amount - 1000) })}
                                className="min-h-[38px] px-2.5 rounded-xl bg-[#161618] border border-white/[0.08] text-xs font-mono-num font-bold text-zinc-300"
                              >
                                -1K
                              </button>
                              <NumericInput
                                value={sb.amount}
                                label={sb.name}
                                subtitle="設定份額金額"
                                currency={activeAccount.currency}
                                onChange={val => updateSubBucket(sb.id, { amount: Math.max(0, val) })}
                                className="flex-1 min-w-0 min-h-[38px] px-2 rounded-xl bg-[#161618] border border-white/15 text-center text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => updateSubBucket(sb.id, { amount: sb.amount + 1000 })}
                                className="min-h-[38px] px-2.5 rounded-xl bg-[#161618] border border-white/[0.08] text-xs font-mono-num font-bold text-emerald-400"
                              >
                                +1K
                              </button>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateSubBucket(sb.id, { isFrozen: !sb.isFrozen })}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
                                    sb.isFrozen ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-[#161618] text-zinc-300 border-white/[0.08]'
                                  }`}
                                >
                                  {sb.isFrozen ? '解除凍結' : '設為凍結底倉'}
                                </button>
                                {unallocatedFree > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => updateSubBucket(sb.id, { amount: maxForThis })}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-[11px] font-semibold text-emerald-300"
                                  >
                                    吸納自由額
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteSubBucket(sb.id)}
                                className="text-[11px] text-[#8E8E93] hover:text-rose-400 px-2 py-1"
                              >
                                刪除
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="p-3.5 rounded-2xl bg-[#0B0B0D] border border-dashed border-white/[0.1] flex items-center justify-between text-xs">
                    <span className="text-[#8E8E93]">未分配自由餘額</span>
                    <span className="font-mono-num font-bold text-emerald-400">
                      {Store.formatMoney(unallocatedFree, activeAccount.currency, hideMoney)}
                    </span>
                  </div>
                </div>
              </div>

              {otherCards.length > 0 && (
                <div className="pt-3">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[11px] font-semibold text-[#8E8E93]">其他銀包卡片</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => stepCard(-1)} className="w-7 h-7 rounded-full bg-[#161618] border border-white/[0.08] text-zinc-400 flex items-center justify-center">
                        <Icons.ChevronLeft />
                      </button>
                      <span className="text-[10px] font-mono-num text-[#8E8E93] px-1">
                        {activeCardIndex + 1} / {filteredCards.length}
                      </span>
                      <button type="button" onClick={() => stepCard(1)} className="w-7 h-7 rounded-full bg-[#161618] border border-white/[0.08] text-zinc-400 flex items-center justify-center">
                        <Icons.ChevronRight />
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    {otherCards.map((c, idx) => {
                      const t = CARD_THEMES.find(theme => theme.id === c.themeId) || CARD_THEMES[0];
                      const pAcc = c.accounts[activeCurrencyIdx[c.id] || 0] || c.accounts[0];
                      const isLast = idx === otherCards.length - 1;
                      return (
                        <div
                          key={c.id}
                          onClick={() => selectCardSmooth(c.id)}
                          style={{ marginTop: idx === 0 ? '0px' : '-20px', zIndex: idx + 1 }}
                          className={`wallet-card-transition relative bg-gradient-to-br ${t.gradient} border-t border-x border-white/20 ${
                            isLast ? 'rounded-[24px] border-b pb-3.5' : 'rounded-t-[24px] pb-7'
                          } px-4 pt-3 shadow-[0_-10px_24px_rgba(0,0,0,0.85)] cursor-pointer hover:-translate-y-1.5`}
                        >
                          <div className="relative z-10 flex items-center justify-between">
                            <span className="font-bold text-sm text-white truncate">{c.institution}</span>
                            <span className="text-xs font-bold font-mono-num text-white shrink-0">
                              {Store.formatMoney(pAcc.balance, pAcc.currency, hideMoney)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {modalType === 'BALANCE_EDIT' && activeAccount && (
          <BalanceAdjustSheet
            account={activeAccount}
            onClose={() => setModalType(null)}
            onSave={(newBal, newLocked) => {
              updateActiveAccount(a => ({ ...a, balance: newBal, lockedBalance: newLocked }));
              setModalType(null);
              onNotify('已更新帳戶餘額');
            }}
          />
        )}

        {modalType === 'BUCKET_PICKER' && activeAccount && (
          <BucketPickerSheet
            buckets={buckets}
            currentPurpose={activeAccount.purpose}
            isPrimary={activeAccount.isPrimary}
            onSelect={(purposeId, primaryFlag) => {
              updateActiveAccount(a => ({ ...a, purpose: purposeId, isPrimary: primaryFlag }));
              setModalType(null);
              onNotify('已更新歸屬資金池');
            }}
            onAddBucket={(newB) => {
              Store.setState(prev => ({
                ...prev,
                settings: { ...prev.settings, buckets: [...prev.settings.buckets, newB] }
              }));
              updateActiveAccount(a => ({ ...a, purpose: newB.id }));
              setModalType(null);
              onNotify(`已建立「${newB.name}」`);
            }}
            onClose={() => setModalType(null)}
          />
        )}

        {modalType === 'ADD_SUBBUCKET' && activeAccount && (
          <AddSubBucketSheet
            account={activeAccount}
            onClose={() => setModalType(null)}
            onAdd={(newSb) => {
              updateActiveAccount(a => ({ ...a, subBuckets: [...(a.subBuckets || []), newSb] }));
              setExpandedSbId(newSb.id);
              setModalType(null);
              onNotify(`已新增份額「${newSb.name}」`);
            }}
          />
        )}

        {modalType === 'ADD_CURRENCY' && activeCard && (
          <AddCurrencySheet
            card={activeCard}
            fxRates={state.settings?.fxRates || []}
            onClose={() => setModalType(null)}
            onAdd={(newAcc) => {
              const nextIdx = activeCard.accounts.length;
              updateActiveCard(c => ({ ...c, accounts: [...c.accounts, newAcc] }));
              setActiveCurrencyIdx(prev => ({ ...prev, [activeCard.id]: nextIdx }));
              setModalType(null);
              onNotify(`已新增 ${newAcc.currency} 子戶口`);
            }}
          />
        )}

        {modalType === 'NEW_CARD' && (
          <NewCardModal
            buckets={buckets}
            baseCurrency={baseCurrency}
            fxRates={state.settings?.fxRates || []}
            onClose={() => setModalType(null)}
            onCreate={(newCard) => {
              Store.setState(prev => ({ ...prev, walletCards: [newCard, ...prev.walletCards] }));
              setCategoryFilter('ALL');
              setActiveCardId(newCard.id);
              setModalType(null);
              onNotify(`已新增「${newCard.institution}」`);
            }}
          />
        )}

        {modalType === 'TOPUP_EWALLET' && activeCard && activeAccount && (
          <TopupEwalletSheet
            targetCard={activeCard}
            targetAccount={activeAccount}
            allCards={cards}
            onClose={() => setModalType(null)}
            onConfirmTopup={(sourceAccId, amount) => {
              const now = new Date();
              Store.saveTransaction({
                id: 'tx_topup_' + Date.now(),
                date: Store.todayISO(),
                time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                type: 'TRANSFER',
                mainCatId: 'TRANSFER',
                subCatId: 'TRANSFER',
                title: `${activeCard.institution} 增值`,
                merchant: '',
                bucketId: activeAccount.purpose || 'PERSONAL',
                accountId: sourceAccId,
                toAccountId: activeAccount.id,
                currency: activeAccount.currency,
                amount,
                accountAmount: amount,
                creditCycle: null,
                counterparty: '',
                receivableMode: 'NEW',
                isLoanSettled: false,
                isLockedSettled: false,
                note: '電子錢包增值'
              });
              setModalType(null);
              onNotify(`已完成增值 ${Store.formatMoney(amount, activeAccount.currency)}`);
            }}
          />
        )}
      </div>
    );
  }

  function BalanceAdjustSheet({ account, onClose, onSave }) {
    const [mode, setMode] = useState('SET');
    const [inputVal, setInputVal] = useState(Number(account.balance) || 0);
    const [deltaVal, setDeltaVal] = useState(0);
    const [lockedVal, setLockedVal] = useState(Number(account.lockedBalance) || 0);

    const previewBalance = mode === 'SET'
      ? (Number(inputVal) || 0)
      : Math.max(0, Math.round((Number(account.balance) + (Number(deltaVal) || 0)) * 100) / 100);

    return (
      <BottomSheet title="餘額平帳校準" subtitle={`${account.name} (${account.currency})`} onClose={onClose}>
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-black border border-white/[0.08] text-xs font-semibold">
          <button type="button" onClick={() => setMode('SET')} className={`py-2 rounded-xl ${mode === 'SET' ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93]'}`}>
            直接輸入總餘額
          </button>
          <button type="button" onClick={() => setMode('DELTA')} className={`py-2 rounded-xl ${mode === 'DELTA' ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93]'}`}>
            存入 / 扣減差額
          </button>
        </div>

        {mode === 'SET' ? (
          <div>
            <label className="block text-xs text-[#8E8E93] mb-1.5">實際帳戶餘額 ({account.currency})</label>
            <NumericInput
              value={inputVal}
              label="實際帳戶餘額"
              subtitle={account.name}
              currency={account.currency}
              onChange={setInputVal}
              className="w-full px-4 py-3 rounded-2xl bg-black border border-white/15 text-left text-xl"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs text-[#8E8E93]">變動差額 (正數存入 / 負數扣減)</label>
            <NumericInput
              value={deltaVal}
              label="變動差額"
              subtitle="正數存入 · 負數扣減"
              currency={account.currency}
              allowNegative={true}
              onChange={setDeltaVal}
              textClassName={deltaVal < 0 ? 'text-rose-400' : 'text-emerald-400'}
              className="w-full px-4 py-3 rounded-2xl bg-black border border-white/15 text-left text-xl"
            />
            <div className="grid grid-cols-4 gap-1.5">
              {[-1000, -500, +1000, +5000].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDeltaVal((Number(deltaVal) || 0) + d)}
                  className="min-h-[38px] rounded-xl bg-black border border-white/[0.08] text-xs font-mono-num font-bold text-zinc-300"
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-[#8E8E93] mb-1.5">定存鎖定金額 ({account.currency})</label>
          <NumericInput
            value={lockedVal}
            label="定存鎖定金額"
            currency={account.currency}
            onChange={setLockedVal}
            textClassName="text-zinc-200"
            className="w-full px-3.5 py-2.5 rounded-2xl bg-black border border-white/10 text-left text-base"
          />
        </div>

        <button
          type="button"
          onClick={() => onSave(previewBalance, Number(lockedVal) || 0)}
          className="w-full min-h-[48px] rounded-2xl bg-white text-black font-bold text-sm"
        >
          確認更新為 {Store.formatMoney(previewBalance, account.currency)}
        </button>
      </BottomSheet>
    );
  }

  function BucketPickerSheet({ buckets, currentPurpose, isPrimary, onSelect, onAddBucket, onClose }) {
    const [selected, setSelected] = useState(currentPurpose);
    const [primaryFlag, setPrimaryFlag] = useState(Boolean(isPrimary));
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState('');

    return (
      <BottomSheet title="歸屬資金池" onClose={onClose}>
        <div className="space-y-2">
          {buckets.map(b => (
            <div
              key={b.id}
              onClick={() => setSelected(b.id)}
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between ${
                selected === b.id ? 'bg-white text-black border-white font-bold' : 'bg-black text-white border-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-xs">{b.name}</span>
              </div>
              {selected === b.id && <Icons.Check />}
            </div>
          ))}
        </div>

        {!showNew ? (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="w-full min-h-[42px] rounded-2xl border border-dashed border-white/15 text-xs font-semibold text-zinc-300"
          >
            + 新增自訂資金池
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="輸入資金池名稱"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-black border border-white/15 text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!newName.trim()) return;
                onAddBucket({
                  id: 'CUSTOM_' + Date.now(),
                  name: newName.trim(),
                  color: SUB_BUCKET_COLORS[buckets.length % SUB_BUCKET_COLORS.length],
                  monthlyBudget: 3000,
                  primaryAccountId: '',
                  archived: false
                });
              }}
              className="px-4 rounded-xl bg-white text-black text-xs font-bold"
            >
              建立
            </button>
          </div>
        )}

        <label className="p-3.5 rounded-2xl bg-black border border-white/[0.08] flex items-center justify-between cursor-pointer">
          <span className="text-xs font-semibold text-amber-300">★ 設為預設找數來源</span>
          <input
            type="checkbox"
            checked={primaryFlag}
            onChange={e => setPrimaryFlag(e.target.checked)}
            className="w-4 h-4 accent-amber-400"
          />
        </label>

        <button
          type="button"
          onClick={() => onSelect(selected, primaryFlag)}
          className="w-full min-h-[48px] rounded-2xl bg-white text-black font-bold text-sm"
        >
          儲存設定
        </button>
      </BottomSheet>
    );
  }

  function AddSubBucketSheet({ account, onClose, onAdd }) {
    const allocatedSum = (account.subBuckets || []).reduce((s, b) => s + Number(b.amount || 0), 0);
    const unallocated = Math.max(0, Number(account.balance) - allocatedSum);

    const [name, setName] = useState('');
    const [amount, setAmount] = useState(unallocated > 0 ? unallocated : 0);
    const [isFrozen, setIsFrozen] = useState(false);
    const [color, setColor] = useState(SUB_BUCKET_COLORS[(account.subBuckets?.length || 0) % SUB_BUCKET_COLORS.length]);

    const PRESETS = ['緊急備用底倉', '年度保費預留', '進修教育預留', '旅行儲備', '稅款預留'];

    return (
      <BottomSheet title="新增戶口內部份額" onClose={onClose}>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setName(p)}
                className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${
                  name === p ? 'bg-white text-black border-white' : 'bg-black border-white/[0.1] text-zinc-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="輸入份額名稱"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full p-3 rounded-2xl bg-black border border-white/15 text-white font-semibold"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-[#8E8E93] mb-1.5">
            <span>金額 ({account.currency})</span>
            {unallocated > 0 && (
              <button type="button" onClick={() => setAmount(unallocated)} className="text-emerald-400 font-semibold">
                填入自由額 ({unallocated.toLocaleString()})
              </button>
            )}
          </div>
          <NumericInput
            value={amount}
            label="份額金額"
            currency={account.currency}
            onChange={setAmount}
            className="w-full p-3 rounded-2xl bg-black border border-white/15 text-left text-lg"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {SUB_BUCKET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full ${color === c ? 'ring-2 ring-white scale-110' : 'opacity-60'}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsFrozen(!isFrozen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isFrozen ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-black text-zinc-400 border-white/10'
            }`}
          >
            {isFrozen ? '凍結底倉' : '可用份額'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!name.trim()) return;
            onAdd({ id: 'sb_' + Date.now(), name: name.trim(), amount: Number(amount) || 0, isFrozen, color });
          }}
          className="w-full min-h-[48px] rounded-2xl bg-white text-black font-bold text-sm"
        >
          加入份額
        </button>
      </BottomSheet>
    );
  }

  function AddCurrencySheet({ card, fxRates, onClose, onAdd }) {
    const codes = (fxRates || []).map(f => f.code);
    const [currency, setCurrency] = useState(codes[0] || 'HKD');
    const [name, setName] = useState('外幣活期');
    const [balance, setBalance] = useState(0);

    return (
      <BottomSheet title={`${card.institution} · 新增幣種`} onClose={onClose}>
        <div className="grid grid-cols-4 gap-1.5">
          {codes.slice(0, 8).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCurrency(c);
                setName(`${c} 活期`);
              }}
              className={`py-2.5 rounded-xl font-mono-num text-xs font-bold border ${
                currency === c ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-white/[0.08]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs text-[#8E8E93] mb-1">子戶口名稱</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full p-3 rounded-2xl bg-black border border-white/15 text-white font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs text-[#8E8E93] mb-1">初始餘額 ({currency})</label>
          <NumericInput
            value={balance}
            label="初始餘額"
            currency={currency}
            onChange={setBalance}
            className="w-full p-3 rounded-2xl bg-black border border-white/15 text-left text-lg"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            onAdd({
              id: 'acc_' + Date.now(),
              currency,
              name: name.trim() || `${currency} 戶口`,
              balance: Number(balance) || 0,
              lockedBalance: 0,
              purpose: card.accounts[0]?.purpose || 'PUBLIC',
              isPrimary: false,
              subBuckets: []
            });
          }}
          className="w-full min-h-[48px] rounded-2xl bg-white text-black font-bold text-sm"
        >
          確認加入
        </button>
      </BottomSheet>
    );
  }

  function NewCardModal({ buckets, baseCurrency, fxRates, onClose, onCreate }) {
    const [institution, setInstitution] = useState('');
    const [type, setType] = useState('BANK');
    const [themeId, setThemeId] = useState('ocean');
    const [currency, setCurrency] = useState(baseCurrency);
    const [accName, setAccName] = useState('綜合活期');
    const [balance, setBalance] = useState(0);
    const [purpose, setPurpose] = useState(buckets[0]?.id || 'PUBLIC');

    return (
      <BottomSheet title="新增銀包卡片" onClose={onClose}>
        <div>
          <label className="block text-xs text-[#8E8E93] mb-1">銀行 / 錢包 / 券商名稱</label>
          <input
            type="text"
            placeholder="輸入機構名稱"
            value={institution}
            onChange={e => setInstitution(e.target.value)}
            className="w-full p-3 rounded-2xl bg-black border border-white/15 text-white font-semibold"
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {['BANK', 'EWALLET', 'INVEST'].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setType(k)}
              className={`py-2.5 rounded-xl text-xs font-bold border ${
                type === k ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-white/[0.08]'
              }`}
            >
              {TYPE_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {CARD_THEMES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeId(t.id)}
              className={`py-2 rounded-xl bg-gradient-to-br ${t.gradient} border text-[11px] font-semibold text-white ${
                themeId === t.id ? 'border-white ring-2 ring-white/40' : 'border-white/15 opacity-75'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-[#8E8E93] mb-1">幣種</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full p-3 rounded-2xl bg-black border border-white/15 text-white font-mono-num font-bold"
            >
              {(fxRates || []).map(f => (
                <option key={f.code} value={f.code} className="bg-zinc-900">{f.code}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-[#8E8E93] mb-1">初始餘額</label>
            <NumericInput
              value={balance}
              label="初始餘額"
              currency={currency}
              onChange={setBalance}
              className="w-full p-3 rounded-2xl bg-black border border-white/15 text-left text-base"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#8E8E93] mb-1">歸屬資金池</label>
          <select
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full p-3 rounded-2xl bg-black border border-white/15 text-white font-semibold"
          >
            {buckets.map(b => (
              <option key={b.id} value={b.id} className="bg-zinc-900">{b.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!institution.trim()) return;
            onCreate({
              id: 'card_' + Date.now(),
              institution: institution.trim(),
              type,
              themeId,
              archived: false,
              accounts: [
                {
                  id: 'acc_' + Date.now(),
                  currency,
                  name: accName.trim() || `${currency} 活期`,
                  balance: Number(balance) || 0,
                  lockedBalance: 0,
                  purpose,
                  isPrimary: false,
                  subBuckets: []
                }
              ]
            });
          }}
          className="w-full min-h-[48px] rounded-2xl bg-white text-black font-bold text-sm"
        >
          建立卡片
        </button>
      </BottomSheet>
    );
  }

  function TopupEwalletSheet({ targetCard, targetAccount, allCards, onClose, onConfirmTopup }) {
    const bankAccounts = [];
    allCards.forEach(c => {
      if (c.type === 'BANK') {
        c.accounts.forEach(a => {
          if (a.currency === targetAccount.currency) {
            bankAccounts.push({ accId: a.id, label: `${c.institution} · ${a.name}`, balance: a.balance, currency: a.currency });
          }
        });
      }
    });

    const [selectedSource, setSelectedSource] = useState(bankAccounts[0]?.accId || '');
    const [amount, setAmount] = useState(500);

    return (
      <BottomSheet title={`${targetCard.institution} · 增值`} onClose={onClose}>
        {bankAccounts.length === 0 ? (
          <div className="p-4 rounded-2xl bg-black border border-white/10 text-xs text-[#8E8E93] text-center">
            尚無同幣種 ({targetAccount.currency}) 之銀行活期戶口可供扣款增值
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs text-[#8E8E93] mb-1">扣款銀行戶口</label>
              <select
                value={selectedSource}
                onChange={e => setSelectedSource(e.target.value)}
                className="w-full p-3 rounded-2xl bg-black border border-white/15 text-white font-semibold"
              >
                {bankAccounts.map(b => (
                  <option key={b.accId} value={b.accId} className="bg-zinc-900">
                    {b.label} ({Store.formatMoney(b.balance, b.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#8E8E93] mb-1">增值金額 ({targetAccount.currency})</label>
              <NumericInput
                value={amount}
                label="電子錢包增值金額"
                currency={targetAccount.currency}
                onChange={setAmount}
                textClassName="text-emerald-400"
                className="w-full p-3 rounded-2xl bg-black border border-white/15 text-left text-xl"
              />
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[200, 500, 1000, 2000].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className="min-h-[38px] rounded-xl bg-black border border-white/[0.08] font-mono-num text-xs font-bold text-zinc-300"
                  >
                    +{v}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!selectedSource || !Number(amount)) return;
                onConfirmTopup(selectedSource, Number(amount));
              }}
              className="w-full min-h-[48px] rounded-2xl bg-white text-black font-bold text-sm"
            >
              確認增值 {Store.formatMoney(amount, targetAccount.currency)}
            </button>
          </>
        )}
      </BottomSheet>
    );
  }

  window.WealthMod1 = { WalletView };
})();
