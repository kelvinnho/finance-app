(() => {
  const { useState, useMemo, useRef } = React;
  const Store = window.WealthStore;
  const {
    CARD_THEMES,
    getCardTheme,
    Icons,
    BottomSheet,
    SegmentedControl,
    NumericInput
  } = window.WealthUI;

  const CARRIER_TYPES = [
    { id: 'ALL',     label: '全部' },
    { id: 'BANK',    label: '銀行' },
    { id: 'EWALLET', label: '電子錢包' },
    { id: 'INVEST',  label: '投資保單' }
  ];

  const CARRIER_LABELS = {
    BANK: '銀行活期',
    EWALLET: '電子錢包',
    INVEST: '投資保單'
  };

  const SUB_BUCKET_COLORS = [
    '#38BDF8', '#34D399', '#A855F7', '#F59E0B', '#F43F5E', '#14B8A6', '#6366F1', '#FB923C'
  ];

  function getAvailableCurrencies(state) {
    const base = state.settings?.baseCurrency || 'MOP';
    const fxCodes = (state.settings?.fxRates || []).map(r => r.code);
    const metaCodes = Object.keys(Store.CURRENCY_META || {});
    return Array.from(new Set([base, ...fxCodes, ...metaCodes]));
  }

  // ==================== 餘額平帳校準抽屜 ====================
  function BalanceAdjustSheet({ card, account, onClose, onSaved }) {
    const [mode, setMode] = useState('SET'); // SET | DELTA
    const [deltaSign, setDeltaSign] = useState(1); // +1 存入 | -1 扣減
    const [amount, setAmount] = useState(account.balance || 0);
    const [lockedBalance, setLockedBalance] = useState(account.lockedBalance || 0);

    const handleModeChange = (nextMode) => {
      setMode(nextMode);
      setAmount(nextMode === 'SET' ? (account.balance || 0) : 0);
    };

    const previewBalance = mode === 'SET'
      ? Number(amount) || 0
      : Math.round(((Number(account.balance) || 0) + (Number(amount) || 0) * deltaSign) * 100) / 100;

    const handleSubmit = (e) => {
      e.preventDefault();
      const { warnings } = Store.adjustAccountBalance(card.id, account.id, {
        mode,
        amount: mode === 'DELTA' ? (Number(amount) || 0) * deltaSign : (Number(amount) || 0),
        lockedBalance: Number(lockedBalance) || 0
      });
      onSaved(warnings);
    };

    return (
      <BottomSheet
        title="餘額平帳校準"
        subtitle={`${card.institution} · ${account.name} (${account.currency})`}
        onClose={onClose}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <SegmentedControl
            value={mode}
            onChange={handleModeChange}
            options={[
              { id: 'SET',   label: '直接輸入總餘額' },
              { id: 'DELTA', label: '存入 / 扣減差額' }
            ]}
          />

          {mode === 'DELTA' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeltaSign(1)}
                className={`min-h-[42px] rounded-2xl border text-xs font-semibold transition ${
                  deltaSign === 1
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-[#111113] border-white/[0.08] text-zinc-400'
                }`}
              >
                + 存入差額
              </button>
              <button
                type="button"
                onClick={() => setDeltaSign(-1)}
                className={`min-h-[42px] rounded-2xl border text-xs font-semibold transition ${
                  deltaSign === -1
                    ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                    : 'bg-[#111113] border-white/[0.08] text-zinc-400'
                }`}
              >
                − 扣減差額
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">
              {mode === 'SET' ? '最新活期總餘額' : (deltaSign === 1 ? '存入金額' : '扣減金額')}
            </label>
            <NumericInput
              label={mode === 'SET' ? '輸入活期總餘額' : (deltaSign === 1 ? '輸入存入差額' : '輸入扣減差額')}
              currency={account.currency}
              value={amount}
              onChange={setAmount}
              allowNegative={mode === 'SET'}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">定存鎖定金額（不計入活期可用）</label>
            <NumericInput
              label="輸入定存鎖定金額"
              currency={account.currency}
              value={lockedBalance}
              onChange={setLockedBalance}
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-[#111113] border border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8E8E93]">校準後活期餘額</span>
            <span className="font-mono-num font-bold text-white">
              {Store.formatMoney(previewBalance, account.currency, false, 2)}
            </span>
          </div>

          <button
            type="submit"
            className="w-full min-h-[50px] rounded-2xl bg-white text-black text-sm font-bold active:scale-[0.98] transition"
          >
            儲存校準結果
          </button>
        </form>
      </BottomSheet>
    );
  }

  // ==================== 責任資金池與預設找數來源抽屜 ====================
  function BucketAssignSheet({ state, card, account, onClose, onSaved }) {
    const buckets = (state.settings?.buckets || []).filter(b => !b.archived);
    const [purpose, setPurpose] = useState(account.purpose || buckets[0]?.id || 'PUBLIC');
    const [isPrimary, setIsPrimary] = useState(!!account.isPrimary);

    const handleSave = () => {
      Store.updateWalletSubAccount(card.id, account.id, { purpose, isPrimary });
      onSaved(purpose, isPrimary);
    };

    return (
      <BottomSheet
        title="歸屬責任資金池"
        subtitle={`${card.institution} · ${account.name} (${account.currency})`}
        onClose={onClose}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {buckets.map(b => {
              const active = purpose === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setPurpose(b.id)}
                  className={`w-full min-h-[52px] px-4 rounded-2xl border flex items-center justify-between transition ${
                    active
                      ? 'bg-white text-black border-white'
                      : 'bg-[#111113] text-white border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-sm font-semibold">{b.name}</span>
                  </div>
                  {active && <Icons.Check />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsPrimary(!isPrimary)}
            className={`w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-left transition ${
              isPrimary
                ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                : 'bg-[#111113] border-white/[0.08] text-zinc-300'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Icons.Star filled={isPrimary} />
                <span>設為預設找數來源</span>
              </div>
              <div className="text-[11px] text-[#8E8E93]">
                同一資金池僅唯一一戶，供信用卡跨行補水導航自動比對
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full p-0.5 transition shrink-0 ${isPrimary ? 'bg-amber-400' : 'bg-zinc-700'}`}>
              <div className={`w-5 h-5 rounded-full bg-black transition-transform ${isPrimary ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="w-full min-h-[50px] rounded-2xl bg-white text-black text-sm font-bold active:scale-[0.98] transition"
          >
            確認套用
          </button>
        </div>
      </BottomSheet>
    );
  }

  // ==================== 電子錢包增值抽屜 ====================
  function EWalletTopUpSheet({ state, card, account, onClose, onSaved }) {
    const bankSources = useMemo(() => {
      return Store.getFlatAccounts(state).filter(
        a => a.kind === 'BANK' && a.currency === account.currency && a.id !== account.id
      );
    }, [state, account.currency, account.id]);

    const [fromAccId, setFromAccId] = useState(bankSources[0]?.id || '');
    const [amount, setAmount] = useState(0);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!fromAccId || Number(amount) <= 0) return;
      const { warnings } = Store.topUpEWallet({
        fromAccountId: fromAccId,
        toAccountId: account.id,
        amount: Number(amount)
      });
      onSaved(Number(amount), warnings);
    };

    return (
      <BottomSheet
        title="電子錢包增值"
        subtitle={`從同幣種 (${account.currency}) 銀行活期扣款並記錄內部轉帳`}
        onClose={onClose}
      >
        {bankSources.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="text-sm font-semibold text-zinc-300">找不到同幣種銀行活期戶口</div>
            <div className="text-xs text-[#8E8E93]">請先建立 {account.currency} 銀行活期子戶口再進行增值。</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#8E8E93]">扣款銀行戶口</label>
              <select
                value={fromAccId}
                onChange={e => setFromAccId(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none"
              >
                {bankSources.map(src => (
                  <option key={src.id} value={src.id} className="bg-zinc-900">
                    {src.displayName} ({Store.formatMoney(src.balance, src.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#8E8E93]">增值金額</label>
              <NumericInput
                label="輸入增值金額"
                currency={account.currency}
                value={amount}
                onChange={setAmount}
              />
            </div>

            <div className="flex gap-2">
              {[500, 1000, 2000, 3000].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="flex-1 min-h-[36px] rounded-xl bg-[#111113] border border-white/[0.08] text-xs font-mono-num text-zinc-300 active:bg-white/15"
                >
                  +{preset}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!fromAccId || Number(amount) <= 0}
              className="w-full min-h-[50px] rounded-2xl bg-white text-black text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition"
            >
              確認增值並寫入轉帳紀錄
            </button>
          </form>
        )}
      </BottomSheet>
    );
  }

  // ==================== 新增多幣種子戶口抽屜 ====================
  function AddCurrencyAccountSheet({ state, card, onClose, onCreated }) {
    const existingCurrs = new Set((card.accounts || []).filter(a => !a.archived).map(a => a.currency));
    const allCurrs = getAvailableCurrencies(state);
    const defaultCurr = allCurrs.find(c => !existingCurrs.has(c)) || allCurrs[0];
    const buckets = (state.settings?.buckets || []).filter(b => !b.archived);

    const [currency, setCurrency] = useState(defaultCurr);
    const [name, setName] = useState(`${defaultCurr} 活期`);
    const [balance, setBalance] = useState(0);
    const [purpose, setPurpose] = useState(buckets[0]?.id || 'PUBLIC');

    const handleSubmit = (e) => {
      e.preventDefault();
      const accId = Store.addWalletSubAccount(card.id, {
        currency,
        name: name.trim() || `${currency} 活期`,
        balance: Number(balance) || 0,
        purpose
      });
      onCreated(accId, currency);
    };

    return (
      <BottomSheet
        title="新增幣種子戶口"
        subtitle={card.institution}
        onClose={onClose}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">幣種</label>
            <div data-no-swipe="true" className="flex gap-2 overflow-x-auto snap-x-rail pb-1">
              {allCurrs.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCurrency(c);
                    if (!name || name.endsWith('活期')) setName(`${c} 活期`);
                  }}
                  className={`snap-x-item shrink-0 min-h-[40px] px-3.5 rounded-xl border text-xs font-mono-num font-bold transition ${
                    currency === c
                      ? 'bg-white text-black border-white'
                      : 'bg-[#111113] text-zinc-300 border-white/[0.08]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">子戶口名稱</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：港幣儲蓄戶"
              className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">初始餘額</label>
            <NumericInput
              label="輸入初始餘額"
              currency={currency}
              value={balance}
              onChange={setBalance}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">歸屬資金池</label>
            <div data-no-swipe="true" className="flex gap-2 overflow-x-auto snap-x-rail pb-1">
              {buckets.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setPurpose(b.id)}
                  className={`snap-x-item shrink-0 min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    purpose === b.id
                      ? 'bg-white text-black border-white'
                      : 'bg-[#111113] text-zinc-300 border-white/[0.08]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[50px] rounded-2xl bg-white text-black text-sm font-bold active:scale-[0.98] transition"
          >
            建立子戶口
          </button>
        </form>
      </BottomSheet>
    );
  }

  // ==================== 新增銀包卡片抽屜 ====================
  function AddCardSheet({ state, onClose, onCreated }) {
    const baseCurr = state.settings?.baseCurrency || 'MOP';
    const allCurrs = getAvailableCurrencies(state);
    const buckets = (state.settings?.buckets || []).filter(b => !b.archived);

    const [institution, setInstitution] = useState('');
    const [type, setType] = useState('BANK');
    const [themeId, setThemeId] = useState('ocean');
    const [currency, setCurrency] = useState(baseCurr);
    const [accountName, setAccountName] = useState('綜合活期');
    const [balance, setBalance] = useState(0);
    const [purpose, setPurpose] = useState(buckets[0]?.id || 'PUBLIC');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!institution.trim()) return;
      const res = Store.addWalletCard({
        institution: institution.trim(),
        type,
        themeId,
        currency,
        accountName: accountName.trim() || '主戶口',
        balance: Number(balance) || 0,
        purpose
      });
      onCreated(res.cardId);
    };

    return (
      <BottomSheet title="新增帳戶卡片" subtitle="建立銀行、電子錢包或投資交割現金戶" onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">機構名稱</label>
            <input
              type="text"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              placeholder="例如：儲蓄銀行、電子錢包、券商名稱"
              className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">載體類型</label>
            <SegmentedControl
              value={type}
              onChange={(nextType) => {
                setType(nextType);
                if (nextType === 'EWALLET') setAccountName('消費餘額');
                else if (nextType === 'INVEST') setAccountName('交割現金戶');
                else setAccountName('綜合活期');
              }}
              options={[
                { id: 'BANK',    label: '銀行' },
                { id: 'EWALLET', label: '電子錢包' },
                { id: 'INVEST',  label: '投資保單' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-[#8E8E93]">主幣種</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none"
              >
                {allCurrs.map(c => (
                  <option key={c} value={c} className="bg-zinc-900">{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8E8E93]">戶口名稱</label>
              <input
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">初始餘額</label>
            <NumericInput
              label="輸入初始餘額"
              currency={currency}
              value={balance}
              onChange={setBalance}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">卡面金屬配色</label>
            <div className="grid grid-cols-4 gap-2">
              {CARD_THEMES.map(th => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setThemeId(th.id)}
                  style={{ background: th.bg, borderColor: themeId === th.id ? '#fff' : th.border }}
                  className="h-10 rounded-xl border text-[11px] font-semibold text-white/90 transition"
                >
                  {th.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">歸屬資金池</label>
            <div data-no-swipe="true" className="flex gap-2 overflow-x-auto snap-x-rail pb-1">
              {buckets.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setPurpose(b.id)}
                  className={`snap-x-item shrink-0 min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    purpose === b.id
                      ? 'bg-white text-black border-white'
                      : 'bg-[#111113] text-zinc-300 border-white/[0.08]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!institution.trim()}
            className="w-full min-h-[50px] rounded-2xl bg-white text-black text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition"
          >
            新增至銀包
          </button>
        </form>
      </BottomSheet>
    );
  }

  // ==================== 新增份額抽屜 ====================
  function AddSubBucketSheet({ account, onClose, onAdd }) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState(0);
    const [isFrozen, setIsFrozen] = useState(false);
    const [color, setColor] = useState(SUB_BUCKET_COLORS[0]);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!name.trim()) return;
      onAdd({
        id: 'sb_' + Date.now(),
        name: name.trim(),
        amount: Math.max(0, Number(amount) || 0),
        isFrozen,
        color
      });
    };

    return (
      <BottomSheet title="新增戶口份額" subtitle={`${account.name} (${account.currency})`} onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">份額名稱</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：緊急預備金、旅遊儲備、保費預留"
              className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">分配金額</label>
            <NumericInput
              label="輸入份額金額"
              currency={account.currency}
              value={amount}
              onChange={setAmount}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8E8E93]">標記色點</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {SUB_BUCKET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141416] scale-110' : 'opacity-70'}`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFrozen(!isFrozen)}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition ${
              isFrozen ? 'bg-rose-500/15 border-rose-400/40 text-rose-200' : 'bg-[#111113] border-white/[0.08] text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              {isFrozen ? <Icons.Lock /> : <Icons.Unlock />}
              <span>{isFrozen ? '凍結底倉（觸及時警示提醒）' : '可用份額（納入可動用餘額）'}</span>
            </div>
            <div className={`w-10 h-6 rounded-full p-0.5 transition shrink-0 ${isFrozen ? 'bg-rose-400' : 'bg-zinc-700'}`}>
              <div className={`w-5 h-5 rounded-full bg-black transition-transform ${isFrozen ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full min-h-[50px] rounded-2xl bg-white text-black text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition"
          >
            建立份額
          </button>
        </form>
      </BottomSheet>
    );
  }

  // ==================== 模組一主視圖 ====================
  function WalletView({ state, hideMoney, onNotify }) {
    const baseCurr = state.settings?.baseCurrency || 'MOP';
    const nw = useMemo(() => Store.computeNetWorthSummary(state), [state]);
    const activeCards = useMemo(() => (state.walletCards || []).filter(c => !c.archived), [state.walletCards]);

    const [carrierFilter, setCarrierFilter] = useState('ALL');
    const [selectedCardId, setSelectedCardId] = useState(null); // null = 層疊總覽, id = 單卡抽卡視角
    const [selectedAccByCard, setSelectedAccByCard] = useState({});
    const [isFlipped, setIsFlipped] = useState(false);
    const [expandedSubId, setExpandedSubId] = useState(null);
    const [cardSlideAnim, setCardSlideAnim] = useState('animate-fade');
    const [confirmArchive, setConfirmArchive] = useState(false);

    // 抽屜控制
    const [showAddCard, setShowAddCard] = useState(false);
    const [showAdjust, setShowAdjust] = useState(false);
    const [showBucketAssign, setShowBucketAssign] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);
    const [showAddCurr, setShowAddCurr] = useState(false);
    const [showAddSub, setShowAddSub] = useState(false);

    const filteredCards = useMemo(() => {
      if (carrierFilter === 'ALL') return activeCards;
      return activeCards.filter(c => c.type === carrierFilter);
    }, [activeCards, carrierFilter]);

    const currentCardIndex = useMemo(() => {
      if (!selectedCardId) return -1;
      return activeCards.findIndex(c => c.id === selectedCardId);
    }, [activeCards, selectedCardId]);

    const currentCard = currentCardIndex >= 0 ? activeCards[currentCardIndex] : null;
    const activeAccounts = useMemo(
      () => (currentCard?.accounts || []).filter(a => !a.archived),
      [currentCard]
    );

    const currentAcc = useMemo(() => {
      if (!currentCard || activeAccounts.length === 0) return null;
      const savedId = selectedAccByCard[currentCard.id];
      return activeAccounts.find(a => a.id === savedId) || activeAccounts[0];
    }, [currentCard, activeAccounts, selectedAccByCard]);

    const currentBucket = useMemo(() => {
      if (!currentAcc) return null;
      return (state.settings?.buckets || []).find(b => b.id === currentAcc.purpose) || null;
    }, [state.settings?.buckets, currentAcc]);

    // 單卡卡面左右滑動切換卡片
    const cardSwipeRef = useRef(null);
    const onCardTouchStart = (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      cardSwipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    };
    const onCardTouchEnd = (e) => {
      if (!cardSwipeRef.current || !e.changedTouches?.length) return;
      const dx = e.changedTouches[0].clientX - cardSwipeRef.current.x;
      const dy = e.changedTouches[0].clientY - cardSwipeRef.current.y;
      const dt = Date.now() - cardSwipeRef.current.t;
      cardSwipeRef.current = null;
      if (dt > 600 || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      if (activeCards.length <= 1) return;
      setIsFlipped(false);
      setConfirmArchive(false);
      setExpandedSubId(null);
      if (dx < 0) {
        const nextIdx = (currentCardIndex + 1) % activeCards.length;
        setCardSlideAnim('animate-slide-left');
        setSelectedCardId(activeCards[nextIdx].id);
      } else {
        const prevIdx = (currentCardIndex - 1 + activeCards.length) % activeCards.length;
        setCardSlideAnim('animate-slide-right');
        setSelectedCardId(activeCards[prevIdx].id);
      }
    };

    const openCardDetail = (cardId) => {
      setIsFlipped(false);
      setConfirmArchive(false);
      setExpandedSubId(null);
      setCardSlideAnim('animate-fade');
      setSelectedCardId(cardId);
    };

    const selectSubAccount = (cardId, accId) => {
      setSelectedAccByCard(prev => ({ ...prev, [cardId]: accId }));
      setExpandedSubId(null);
    };

    // ==================== 視角 1：Apple Wallet 層疊卡包總覽 ====================
    if (!currentCard || !currentAcc) {
      return (
        <div className="space-y-4">
          {/* 頂部現金總覽卡 */}
          <div className="p-4 rounded-3xl bg-[#111113] border border-white/[0.07] flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-[#8E8E93]">活期與錢包可用</div>
              <div className="text-2xl font-bold font-mono-num mt-0.5 text-white">
                {Store.formatMoney(nw.liquidCash, baseCurr, hideMoney)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#8E8E93]">凍結與定存鎖定</div>
              <div className="text-sm font-mono-num font-semibold text-zinc-300 mt-0.5">
                {Store.formatMoney(nw.lockedAndFrozen, baseCurr, hideMoney)}
              </div>
            </div>
          </div>

          {/* 載體篩選膠囊 + 新增按鈕 */}
          <div className="flex items-center justify-between gap-2">
            <div data-no-swipe="true" className="flex items-center gap-1.5 overflow-x-auto snap-x-rail py-0.5">
              {CARRIER_TYPES.map(t => {
                const active = carrierFilter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCarrierFilter(t.id)}
                    className={`snap-x-item shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      active
                        ? 'bg-white text-black border-white'
                        : 'bg-[#111113] text-[#8E8E93] border-white/[0.07] hover:text-zinc-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowAddCard(true)}
              className="shrink-0 h-8 px-3 rounded-full bg-[#1C1C1F] border border-white/12 text-xs font-semibold text-white flex items-center gap-1 active:scale-95 transition"
            >
              <Icons.Plus size={14} />
              <span>新增</span>
            </button>
          </div>

          {/* Apple Wallet 層疊卡包 */}
          {filteredCards.length === 0 ? (
            <div className="py-14 rounded-3xl bg-[#111113] border border-white/[0.06] text-center space-y-2">
              <div className="text-sm font-semibold text-zinc-300">此分類尚無帳戶卡片</div>
              <button
                type="button"
                onClick={() => setShowAddCard(true)}
                className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold"
              >
                新增第一張卡片
              </button>
            </div>
          ) : (
            <div className="pt-1 pb-2">
              {filteredCards.map((card, idx) => {
                const theme = getCardTheme(card.themeId);
                const accs = (card.accounts || []).filter(a => !a.archived);
                const mainAcc = accs[0];
                const bucket = (state.settings?.buckets || []).find(b => b.id === mainAcc?.purpose);
                const totalBase = accs.reduce(
                  (s, a) => s + Store.convertToBase(state, (Number(a.balance) || 0) + (Number(a.lockedBalance) || 0), a.currency),
                  0
                );
                const isLast = idx === filteredCards.length - 1;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => openCardDetail(card.id)}
                    style={{
                      background: theme.bg,
                      borderColor: theme.border,
                      marginTop: idx === 0 ? '0px' : '-56px',
                      zIndex: idx + 1
                    }}
                    className={`relative w-full text-left rounded-[26px] border p-4 shadow-[0_-10px_28px_rgba(0,0,0,0.65)] transition-transform active:scale-[0.985] ${
                      isLast ? 'min-h-[146px]' : 'min-h-[126px]'
                    } flex flex-col justify-between`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-white truncate">{card.institution}</span>
                          <span className="px-2 py-0.5 rounded-full bg-black/30 border border-white/10 text-[10px] font-medium text-white/75 shrink-0">
                            {CARRIER_LABELS[card.type] || card.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-white/60 mt-0.5 flex items-center gap-1.5">
                          <span>{accs.map(a => a.currency).join(' · ')}</span>
                          {accs.some(a => a.isPrimary) && (
                            <span className="text-amber-300 inline-flex items-center gap-0.5">
                              <Icons.Star filled />
                              <span>主力</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold font-mono-num text-white">
                          {accs.length === 1 && mainAcc
                            ? Store.formatMoney(mainAcc.balance, mainAcc.currency, hideMoney)
                            : Store.formatMoney(totalBase, baseCurr, hideMoney)}
                        </div>
                        {bucket && (
                          <div className="inline-flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                            <span className="text-[10px] text-white/70">{bucket.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isLast && mainAcc && (
                      <div className="pt-3 flex items-center justify-between text-[11px] text-white/60 border-t border-white/10 mt-3">
                        <span>{mainAcc.name}</span>
                        <span>點擊抽卡管理份額</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {showAddCard && (
            <AddCardSheet
              state={state}
              onClose={() => setShowAddCard(false)}
              onCreated={(cardId) => {
                setShowAddCard(false);
                openCardDetail(cardId);
                onNotify('已新增帳戶卡片');
              }}
            />
          )}
        </div>
      );
    }

    // ==================== 視角 2：單卡抽卡彈簧視角 ====================
    const theme = getCardTheme(currentCard.themeId);
    const subBuckets = currentAcc.subBuckets || [];
    const totalAllocated = subBuckets.reduce((s, sb) => s + (Number(sb.amount) || 0), 0);
    const frozenSum = subBuckets.filter(sb => sb.isFrozen).reduce((s, sb) => s + (Number(sb.amount) || 0), 0);
    const unallocated = Math.round(((Number(currentAcc.balance) || 0) - totalAllocated) * 100) / 100;
    const trueAvailable = Math.max(0, Math.round(((Number(currentAcc.balance) || 0) - frozenSum) * 100) / 100);
    const belowFrozen = frozenSum > 0 && (Number(currentAcc.balance) || 0) < frozenSum;

    const updateSubBucket = (sbId, patch) => {
      const next = subBuckets.map(sb => sb.id === sbId ? { ...sb, ...patch } : sb);
      Store.saveSubBuckets(currentCard.id, currentAcc.id, next);
    };

    const deleteSubBucket = (sbId) => {
      const next = subBuckets.filter(sb => sb.id !== sbId);
      Store.saveSubBuckets(currentCard.id, currentAcc.id, next);
      if (expandedSubId === sbId) setExpandedSubId(null);
      onNotify('已移除份額');
    };

    const absorbUnallocated = (sbId) => {
      if (unallocated <= 0) return;
      const target = subBuckets.find(sb => sb.id === sbId);
      if (!target) return;
      updateSubBucket(sbId, { amount: Math.round(((Number(target.amount) || 0) + unallocated) * 100) / 100 });
      onNotify(`已將未分配自由額併入「${target.name}」`);
    };

    const otherCards = activeCards.filter(c => c.id !== currentCard.id);

    return (
      <div className="space-y-4">
        {/* 頂部導航列：返回卡包總覽 + 翻轉設定 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSelectedCardId(null);
              setIsFlipped(false);
              setConfirmArchive(false);
            }}
            className="h-9 px-3 rounded-full bg-[#161618] border border-white/[0.08] text-xs font-semibold text-zinc-200 flex items-center gap-1 active:scale-95 transition"
          >
            <Icons.ChevronLeft />
            <span>卡包總覽</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-num text-[#8E8E93]">
              {currentCardIndex + 1} / {activeCards.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsFlipped(!isFlipped);
                setConfirmArchive(false);
              }}
              className={`h-9 px-3 rounded-full border text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition ${
                isFlipped
                  ? 'bg-white text-black border-white'
                  : 'bg-[#161618] border-white/[0.08] text-zinc-200'
              }`}
            >
              <Icons.Flip />
              <span>{isFlipped ? '返回正面' : '卡片設定'}</span>
            </button>
          </div>
        </div>

        {/* 卡面主體（支援左右滑動切換卡片） */}
        <div
          key={currentCard.id + (isFlipped ? '_back' : '_front')}
          data-no-swipe="true"
          onTouchStart={!isFlipped ? onCardTouchStart : undefined}
          onTouchEnd={!isFlipped ? onCardTouchEnd : undefined}
          style={{ background: theme.bg, borderColor: theme.border }}
          className={`rounded-[28px] border p-5 shadow-[0_18px_40px_rgba(0,0,0,0.6)] ${cardSlideAnim}`}
        >
          {!isFlipped ? (
            /* ==================== 卡面正面 ==================== */
            <div className="space-y-4">
              {/* 頂列：機構名稱 + 右上角資金池膠囊 */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-base font-bold text-white truncate">{currentCard.institution}</div>
                  <div className="text-[11px] text-white/65 mt-0.5 flex items-center gap-1.5">
                    <span>{currentAcc.name}</span>
                    <span>·</span>
                    <span>{CARRIER_LABELS[currentCard.type] || currentCard.type}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBucketAssign(true)}
                  className="shrink-0 px-2.5 py-1.5 rounded-full bg-black/35 border border-white/15 text-[11px] font-semibold text-white flex items-center gap-1.5 active:scale-95 transition"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: currentBucket?.color || '#38BDF8' }}
                  />
                  <span>{currentBucket?.name || '指定水池'}</span>
                  {currentAcc.isPrimary && (
                    <span className="text-amber-300">
                      <Icons.Star filled />
                    </span>
                  )}
                </button>
              </div>

              {/* 多幣種子戶口切換列 + 新增幣種 */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {activeAccounts.map(acc => {
                  const sel = acc.id === currentAcc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => selectSubAccount(currentCard.id, acc.id)}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-mono-num font-bold border transition ${
                        sel
                          ? 'bg-white text-black border-white'
                          : 'bg-black/25 text-white/75 border-white/15'
                      }`}
                    >
                      {acc.currency}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowAddCurr(true)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/20 text-white/75 border border-dashed border-white/25 hover:text-white"
                >
                  + 幣種
                </button>
              </div>

              {/* 總餘額點擊校準 + 電子錢包增值鈕 */}
              <div className="flex items-end justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdjust(true)}
                  className="text-left group active:opacity-80 transition"
                >
                  <div className="text-[11px] text-white/60 flex items-center gap-1">
                    <span>活期餘額</span>
                    <span className="opacity-70"><Icons.Edit /></span>
                  </div>
                  <div className="text-[28px] leading-tight font-bold font-mono-num text-white mt-0.5">
                    {Store.formatMoney(currentAcc.balance, currentAcc.currency, hideMoney, 2)}
                  </div>
                  {Number(currentAcc.lockedBalance) > 0 && (
                    <div className="text-[11px] font-mono-num text-white/70 mt-1">
                      定存鎖定 {Store.formatMoney(currentAcc.lockedBalance, currentAcc.currency, hideMoney)}
                    </div>
                  )}
                </button>

                {currentCard.type === 'EWALLET' && (
                  <button
                    type="button"
                    onClick={() => setShowTopUp(true)}
                    className="shrink-0 h-9 px-3.5 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition"
                  >
                    <Icons.ArrowUpCircle />
                    <span>增值</span>
                  </button>
                )}
              </div>

              {/* 卡面底部：多色份額水位彩條 + 真實可用餘額 */}
              <div className="pt-2 border-t border-white/12 space-y-2">
                <div className="h-2 w-full rounded-full bg-black/35 overflow-hidden flex">
                  {Number(currentAcc.balance) > 0 ? (
                    <>
                      {subBuckets.map(sb => {
                        const pct = Math.min(100, ((Number(sb.amount) || 0) / Number(currentAcc.balance)) * 100);
                        if (pct <= 0) return null;
                        return (
                          <div
                            key={sb.id}
                            style={{ width: `${pct}%`, backgroundColor: sb.color || '#38BDF8' }}
                            className="h-full"
                          />
                        );
                      })}
                      {unallocated > 0 && (
                        <div
                          style={{ width: `${Math.min(100, (unallocated / Number(currentAcc.balance)) * 100)}%` }}
                          className="h-full bg-white/25"
                        />
                      )}
                    </>
                  ) : (
                    <div className="h-full w-full bg-white/10" />
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className={belowFrozen ? 'text-amber-300 font-semibold' : 'text-white/70'}>
                    {belowFrozen ? '已低於凍結底倉' : '扣除凍結真實可用'}
                  </span>
                  <span className="font-mono-num font-bold text-white">
                    {Store.formatMoney(trueAvailable, currentAcc.currency, hideMoney, 2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ==================== 卡面背面設定 ==================== */
            <div className="space-y-3.5">
              <div className="text-xs font-bold text-white/80">卡片與戶口設定</div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/60">機構名稱</label>
                  <input
                    type="text"
                    value={currentCard.institution}
                    onChange={e => Store.updateWalletCard(currentCard.id, { institution: e.target.value })}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/60">目前子戶口名稱</label>
                  <input
                    type="text"
                    value={currentAcc.name}
                    onChange={e => Store.updateWalletSubAccount(currentCard.id, currentAcc.id, { name: e.target.value })}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/60">載體類型</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['BANK', 'EWALLET', 'INVEST'].map(tp => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => Store.updateWalletCard(currentCard.id, { type: tp })}
                      className={`min-h-[36px] rounded-xl text-xs font-semibold border transition ${
                        currentCard.type === tp
                          ? 'bg-white text-black border-white'
                          : 'bg-black/30 text-white/75 border-white/15'
                      }`}
                    >
                      {CARRIER_LABELS[tp]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/60">金屬卡面配色</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CARD_THEMES.map(th => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => Store.updateWalletCard(currentCard.id, { themeId: th.id })}
                      style={{ background: th.bg, borderColor: currentCard.themeId === th.id ? '#fff' : th.border }}
                      className="h-8 rounded-lg border text-[10px] font-semibold text-white/90"
                    >
                      {th.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                {activeAccounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      Store.archiveWalletSubAccount(currentCard.id, currentAcc.id);
                      onNotify(`已封存 ${currentAcc.currency} 子戶口`);
                    }}
                    className="px-3 py-2 rounded-xl bg-black/35 border border-white/15 text-[11px] font-semibold text-zinc-300"
                  >
                    封存此幣種戶
                  </button>
                )}

                {!confirmArchive ? (
                  <button
                    type="button"
                    onClick={() => setConfirmArchive(true)}
                    className="ml-auto px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-400/35 text-[11px] font-semibold text-rose-200 flex items-center gap-1"
                  >
                    <Icons.Trash />
                    <span>軟封存卡片</span>
                  </button>
                ) : (
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmArchive(false)}
                      className="px-2.5 py-1.5 rounded-xl bg-black/40 text-[11px] text-zinc-300"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        Store.archiveWalletCard(currentCard.id);
                        setSelectedCardId(null);
                        setIsFlipped(false);
                        setConfirmArchive(false);
                        onNotify('已軟封存卡片（歷史帳目完整保留）');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-[11px] font-bold"
                    >
                      確認封存
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== 戶口內部份額切分 (Sub-buckets) ==================== */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-xs font-semibold text-[#8E8E93]">戶口內部份額切分</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSub(true)}
              className="h-7 px-2.5 rounded-full bg-[#161618] border border-white/[0.08] text-[11px] font-semibold text-zinc-200 flex items-center gap-1 active:scale-95 transition"
            >
              <Icons.Plus size={12} />
              <span>新增份額</span>
            </button>
          </div>

          {/* 未分配自由額與凍結摘要條 */}
          <div className="p-3.5 rounded-2xl bg-[#111113] border border-white/[0.07] grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[11px] text-[#8E8E93]">未分配自由額</div>
              <div className={`font-mono-num font-bold mt-0.5 ${unallocated < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {Store.formatMoney(unallocated, currentAcc.currency, hideMoney, 2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#8E8E93]">凍結底倉總和</div>
              <div className="font-mono-num font-bold text-white mt-0.5">
                {Store.formatMoney(frozenSum, currentAcc.currency, hideMoney, 2)}
              </div>
            </div>
          </div>

          {subBuckets.length === 0 ? (
            <div className="p-5 rounded-3xl bg-[#111113] border border-white/[0.06] text-center space-y-1.5">
              <div className="text-xs font-semibold text-zinc-300">尚未切分內部份額</div>
              <div className="text-[11px] text-[#8E8E93]">可將同一銀行活期劃分為緊急底倉、保費預留或日常配額</div>
            </div>
          ) : (
            <div className="rounded-3xl bg-[#111113] border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
              {subBuckets.map(sb => {
                const isOpen = expandedSubId === sb.id;
                const sliderMax = Math.max(Number(currentAcc.balance) || 0, Number(sb.amount) || 0, 1000);
                return (
                  <div key={sb.id} className="px-4 py-3.5 space-y-3">
                    <button
                      type="button"
                      onClick={() => setExpandedSubId(isOpen ? null : sb.id)}
                      className="w-full flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sb.color || '#38BDF8' }} />
                        <span className="text-sm font-semibold text-white truncate">{sb.name}</span>
                        {sb.isFrozen && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-[10px] font-semibold text-rose-300 inline-flex items-center gap-1 shrink-0">
                            <Icons.Lock />
                            <span>凍結</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold font-mono-num text-white">
                          {Store.formatMoney(sb.amount, currentAcc.currency, hideMoney)}
                        </span>
                        <span className="text-[#636366]">
                          {isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="pt-2 space-y-3 border-t border-white/[0.06] animate-fade">
                        {/* 滑桿 */}
                        <input
                          type="range"
                          min="0"
                          max={sliderMax}
                          step={sliderMax >= 10000 ? 500 : 100}
                          value={Math.min(sliderMax, Number(sb.amount) || 0)}
                          onChange={e => updateSubBucket(sb.id, { amount: Number(e.target.value) })}
                          className="w-full accent-white"
                        />

                        {/* ±1K 微調 + 統一數字鍵盤直輸 */}
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => updateSubBucket(sb.id, { amount: Math.max(0, (Number(sb.amount) || 0) - 1000) })}
                            className="min-h-[42px] rounded-xl bg-[#18181B] border border-white/[0.08] text-xs font-mono-num font-bold text-zinc-200 active:scale-95 transition"
                          >
                            −1K
                          </button>
                          <NumericInput
                            label={`調整「${sb.name}」金額`}
                            currency={currentAcc.currency}
                            value={sb.amount}
                            onChange={val => updateSubBucket(sb.id, { amount: Math.max(0, Number(val) || 0) })}
                            className="!min-h-[42px] !px-2.5 !rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => updateSubBucket(sb.id, { amount: (Number(sb.amount) || 0) + 1000 })}
                            className="min-h-[42px] rounded-xl bg-[#18181B] border border-white/[0.08] text-xs font-mono-num font-bold text-zinc-200 active:scale-95 transition"
                          >
                            +1K
                          </button>
                        </div>

                        {/* 功能列：凍結切換、一鍵吸納未分配自由額、刪除 */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => updateSubBucket(sb.id, { isFrozen: !sb.isFrozen })}
                            className={`h-8 px-3 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1.5 transition ${
                              sb.isFrozen
                                ? 'bg-rose-500/15 border-rose-400/35 text-rose-300'
                                : 'bg-[#18181B] border-white/[0.08] text-zinc-300'
                            }`}
                          >
                            {sb.isFrozen ? <Icons.Lock /> : <Icons.Unlock />}
                            <span>{sb.isFrozen ? '凍結底倉' : '可用份額'}</span>
                          </button>

                          {unallocated > 0 && (
                            <button
                              type="button"
                              onClick={() => absorbUnallocated(sb.id)}
                              className="h-8 px-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-[11px] font-semibold text-emerald-300 active:scale-95 transition"
                            >
                              吸納自由額 (+{unallocated.toLocaleString('en-US', { maximumFractionDigits: 0 })})
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteSubBucket(sb.id)}
                            className="ml-auto h-8 w-8 rounded-xl bg-white/[0.05] text-zinc-400 hover:text-rose-400 flex items-center justify-center"
                            aria-label="刪除份額"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ==================== 底部立體疊卡槽（快速抽換卡片） ==================== */}
        {otherCards.length > 0 && (
          <section className="space-y-2 pt-1">
            <div className="text-[11px] font-semibold text-[#8E8E93] px-0.5">快速切換其他卡片</div>
            <div>
              {otherCards.map((c, idx) => {
                const th = getCardTheme(c.themeId);
                const firstAcc = (c.accounts || []).find(a => !a.archived);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openCardDetail(c.id)}
                    style={{
                      background: th.bg,
                      borderColor: th.border,
                      marginTop: idx === 0 ? '0px' : '-20px',
                      zIndex: idx + 1
                    }}
                    className="relative w-full px-4 py-3 rounded-2xl border shadow-[0_-6px_18px_rgba(0,0,0,0.55)] flex items-center justify-between active:scale-[0.99] transition"
                  >
                    <span className="text-xs font-bold text-white truncate">{c.institution}</span>
                    <span className="text-xs font-mono-num font-semibold text-white/85">
                      {firstAcc ? Store.formatMoney(firstAcc.balance, firstAcc.currency, hideMoney) : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 抽屜群組 */}
        {showAdjust && (
          <BalanceAdjustSheet
            card={currentCard}
            account={currentAcc}
            onClose={() => setShowAdjust(false)}
            onSaved={(warnings) => {
              setShowAdjust(false);
              if (warnings.length > 0) onNotify(`餘額已校準 · 注意：${warnings[0]}`);
              else onNotify('已更新帳戶餘額');
            }}
          />
        )}

        {showBucketAssign && (
          <BucketAssignSheet
            state={state}
            card={currentCard}
            account={currentAcc}
            onClose={() => setShowBucketAssign(false)}
            onSaved={(purpose, isPrimary) => {
              setShowBucketAssign(false);
              const b = (state.settings?.buckets || []).find(x => x.id === purpose);
              onNotify(isPrimary ? `已設為「${b?.name || purpose}」預設找數來源` : `已歸屬至「${b?.name || purpose}」`);
            }}
          />
        )}

        {showTopUp && (
          <EWalletTopUpSheet
            state={state}
            card={currentCard}
            account={currentAcc}
            onClose={() => setShowTopUp(false)}
            onSaved={(amt, warnings) => {
              setShowTopUp(false);
              if (warnings.length > 0) onNotify(`已增值 ${Store.formatMoney(amt, currentAcc.currency)} · 注意：${warnings[0]}`);
              else onNotify(`已增值 ${Store.formatMoney(amt, currentAcc.currency)} 並寫入轉帳紀錄`);
            }}
          />
        )}

        {showAddCurr && (
          <AddCurrencyAccountSheet
            state={state}
            card={currentCard}
            onClose={() => setShowAddCurr(false)}
            onCreated={(accId, curr) => {
              setShowAddCurr(false);
              selectSubAccount(currentCard.id, accId);
              onNotify(`已新增 ${curr} 子戶口`);
            }}
          />
        )}

        {showAddSub && (
          <AddSubBucketSheet
            account={currentAcc}
            onClose={() => setShowAddSub(false)}
            onAdd={(newSb) => {
              Store.saveSubBuckets(currentCard.id, currentAcc.id, [...subBuckets, newSb]);
              setShowAddSub(false);
              setExpandedSubId(newSb.id);
              onNotify(`已建立「${newSb.name}」份額`);
            }}
          />
        )}
      </div>
    );
  }

  window.WealthMod1 = { WalletView };
})();