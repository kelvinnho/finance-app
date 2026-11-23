(() => {
  const { useState, useEffect, useLayoutEffect, useRef, createContext, useContext } = React;

  // 8 款金屬質感卡面漸層（僅供銀包卡面與信用卡面使用）
  const CARD_THEMES = [
    { id: 'titanium', name: '鈦金灰',   bg: 'linear-gradient(135deg, #2C2C30 0%, #17171A 55%, #0D0D0F 100%)', border: 'rgba(255,255,255,0.16)', accent: '#E4E4E7' },
    { id: 'crimson',  name: '緋紅金',   bg: 'linear-gradient(135deg, #5B1222 0%, #2B0A13 55%, #12060A 100%)', border: 'rgba(244,63,94,0.28)',   accent: '#FDA4AF' },
    { id: 'purple',   name: '星曜紫',   bg: 'linear-gradient(135deg, #3B1D63 0%, #1F1038 55%, #0E081A 100%)', border: 'rgba(168,85,247,0.30)',  accent: '#D8B4FE' },
    { id: 'ocean',    name: '深海藍',   bg: 'linear-gradient(135deg, #0E3A5C 0%, #0A2239 55%, #06121E 100%)', border: 'rgba(56,189,248,0.28)',  accent: '#7DD3FC' },
    { id: 'emerald',  name: '祖母綠',   bg: 'linear-gradient(135deg, #0D4737 0%, #082920 55%, #041510 100%)', border: 'rgba(52,211,153,0.28)',  accent: '#6EE7B7' },
    { id: 'sunset',   name: '琥珀橘',   bg: 'linear-gradient(135deg, #6B2E0D 0%, #3A1808 55%, #180A04 100%)', border: 'rgba(251,146,60,0.30)',  accent: '#FDBA74' },
    { id: 'gold',     name: '香檳金',   bg: 'linear-gradient(135deg, #544118 0%, #2D220D 55%, #140F06 100%)', border: 'rgba(251,191,36,0.30)',  accent: '#FDE68A' },
    { id: 'obsidian', name: '曜石黑',   bg: 'linear-gradient(135deg, #1E1E22 0%, #101012 55%, #050506 100%)', border: 'rgba(255,255,255,0.12)', accent: '#A1A1AA' }
  ];

  function getCardTheme(themeId) {
    return CARD_THEMES.find(t => t.id === themeId) || CARD_THEMES[0];
  }

  const Icons = {
    Ledger: ({ active }) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="15" x2="13" y2="15" />
      </svg>
    ),
    Assets: ({ active }) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="15" rx="3" />
        <path d="M16 12.5h4" />
        <path d="M2 9.5h20" />
      </svg>
    ),
    Plus: ({ size = 22 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    Report: ({ active }) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
    Settings: ({ active }) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    Eye: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
      </svg>
    ),
    EyeOff: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    ),
    X: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    Check: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    ChevronRight: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    ),
    ChevronLeft: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    ),
    ChevronDown: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    ChevronUp: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    ),
    Shield: () => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    Download: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    Code: () => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    Refresh: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
    CreditCard: () => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2.5" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    TrendingUp: () => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    ArrowLeftRight: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 2 21 6 17 10" /><path d="M3 6h18" />
        <polyline points="7 22 3 18 7 14" /><path d="M21 18H3" />
      </svg>
    ),
    Wallet: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    ),
    ArrowDownLeft: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="17" y1="7" x2="7" y2="17" /><polyline points="17 17 7 17 7 7" />
      </svg>
    ),
    ArrowUpRight: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
      </svg>
    ),
    Users: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    Star: ({ filled = false }) => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    Lock: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    Unlock: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    ),
    Flip: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
    Sliders: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
    Trash: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    ),
    Layers: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    Backspace: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
      </svg>
    ),
    ArrowUpCircle: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="16 12 12 8 8 12" /><line x1="12" y1="16" x2="12" y2="8" />
      </svg>
    ),
    Edit: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    )
  };

  function useWealthStore() {
    const [state, setState] = useState(() => window.WealthStore.getState());
    useEffect(() => window.WealthStore.subscribe(setState), []);
    return state;
  }

  // =========================================================================
  // 全工具統一風格數字計算機鍵盤 (支援 + / - 算式與 = 求值)
  // =========================================================================
  function evalCalcExpression(expr) {
    const clean = String(expr || '').replace(/[^0-9.+\-]/g, '');
    if (!clean) return 0;
    const tokens = clean.match(/[+\-]?[0-9]*\.?[0-9]+/g);
    if (!tokens) return 0;
    const sum = tokens.reduce((acc, tk) => acc + (parseFloat(tk) || 0), 0);
    return Math.round(sum * 100) / 100;
  }

  function NumericKeypad({ value = '', onChange, onConfirm, confirmLabel = '完成', allowNegative = false }) {
    const expr = String(value ?? '');
    const hasOperator = (expr.length > 1 && /[+\-]/.test(expr.slice(1)));

    const pushKey = (k) => {
      if (navigator.vibrate) {
        try { navigator.vibrate(6); } catch (e) {}
      }
      if (k === 'C') {
        onChange('');
        return;
      }
      if (k === 'BACK') {
        onChange(expr.slice(0, -1));
        return;
      }
      if (k === '=') {
        const res = evalCalcExpression(expr);
        const clamped = allowNegative ? res : Math.max(0, res);
        onChange(clamped === 0 ? '' : String(clamped));
        return;
      }
      if (k === '+' || k === '-') {
        if (!expr) {
          if (k === '-' && allowNegative) onChange('-');
          return;
        }
        const last = expr.slice(-1);
        if (last === '+' || last === '-') {
          onChange(expr.slice(0, -1) + k);
        } else if (last === '.') {
          onChange(expr.slice(0, -1) + k);
        } else {
          onChange(expr + k);
        }
        return;
      }
      if (k === '.') {
        const parts = expr.split(/[+\-]/);
        const curPart = parts[parts.length - 1] || '';
        if (curPart.includes('.')) return;
        onChange(curPart === '' ? expr + '0.' : expr + '.');
        return;
      }
      if (k === '00') {
        const parts = expr.split(/[+\-]/);
        const curPart = parts[parts.length - 1] || '';
        if (curPart === '' || curPart === '0') return;
        if (curPart.includes('.')) {
          const dec = curPart.split('.')[1] || '';
          if (dec.length >= 2) return;
          onChange(expr + (dec.length === 1 ? '0' : '00'));
          return;
        }
        onChange(expr + '00');
        return;
      }
      // 數字 0-9
      const parts = expr.split(/[+\-]/);
      const curPart = parts[parts.length - 1] || '';
      if (curPart.includes('.')) {
        const dec = curPart.split('.')[1] || '';
        if (dec.length >= 2) return;
      }
      if (curPart === '0') {
        onChange(expr.slice(0, -1) + k);
      } else {
        onChange(expr + k);
      }
    };

    const handleConfirm = () => {
      const res = evalCalcExpression(expr);
      const finalVal = allowNegative ? res : Math.max(0, res);
      if (onConfirm) onConfirm(finalVal);
    };

    const btnBase = 'h-[48px] rounded-2xl font-mono-num text-lg font-semibold flex items-center justify-center active:scale-95 transition select-none';
    const numBtn = `${btnBase} bg-[#1C1C1F] text-white border border-white/[0.06] active:bg-[#2C2C30]`;
    const opBtn = `${btnBase} bg-[#242428] text-zinc-200 border border-white/[0.08] active:bg-[#34343A]`;

    return (
      <div className="grid grid-cols-4 gap-2">
        <button type="button" onClick={() => pushKey('7')} className={numBtn}>7</button>
        <button type="button" onClick={() => pushKey('8')} className={numBtn}>8</button>
        <button type="button" onClick={() => pushKey('9')} className={numBtn}>9</button>
        <button type="button" onClick={() => pushKey('BACK')} className={opBtn} aria-label="退格">
          <Icons.Backspace />
        </button>

        <button type="button" onClick={() => pushKey('4')} className={numBtn}>4</button>
        <button type="button" onClick={() => pushKey('5')} className={numBtn}>5</button>
        <button type="button" onClick={() => pushKey('6')} className={numBtn}>6</button>
        <button type="button" onClick={() => pushKey('+')} className={opBtn}>+</button>

        <button type="button" onClick={() => pushKey('1')} className={numBtn}>1</button>
        <button type="button" onClick={() => pushKey('2')} className={numBtn}>2</button>
        <button type="button" onClick={() => pushKey('3')} className={numBtn}>3</button>
        <button type="button" onClick={() => pushKey('-')} className={opBtn}>−</button>

        <button type="button" onClick={() => pushKey('00')} className={`${numBtn} text-base`}>00</button>
        <button type="button" onClick={() => pushKey('0')} className={numBtn}>0</button>
        <button type="button" onClick={() => pushKey('.')} className={numBtn}>.</button>
        {hasOperator ? (
          <button
            type="button"
            onClick={() => pushKey('=')}
            className={`${btnBase} bg-amber-400 text-black font-bold`}
          >
            =
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            className={`${btnBase} bg-white text-black text-sm font-bold`}
          >
            {confirmLabel}
          </button>
        )}
      </div>
    );
  }

  const KeypadContext = createContext(null);

  function NumericKeypadProvider({ children }) {
    const [session, setSession] = useState(null);
    const [expr, setExpr] = useState('');

    const openKeypad = ({ label = '輸入金額', currency = '', value = '', allowNegative = false, onConfirm }) => {
      const initStr = value === 0 || value === '0' || value === null || value === undefined ? '' : String(value);
      setExpr(initStr);
      setSession({ label, currency, allowNegative, onConfirm });
    };

    const closeKeypad = () => setSession(null);

    const previewVal = evalCalcExpression(expr);

    return (
      <KeypadContext.Provider value={{ openKeypad, closeKeypad }}>
        {children}
        {session && (
          <div
            onClick={closeKeypad}
            className="app-overlay z-[70] bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fade"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[440px] bg-[#121214] border-t border-white/12 rounded-t-[28px] px-4 pt-3 sheet-safe space-y-3 animate-sheet-up"
            >
              <div className="w-9 h-1 rounded-full bg-white/15 mx-auto" />
              <div className="flex items-center justify-between px-1">
                <div className="text-xs font-semibold text-[#8E8E93]">{session.label}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpr('')}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-[11px] font-semibold text-zinc-400 hover:text-white"
                  >
                    清除
                  </button>
                  <button
                    type="button"
                    onClick={closeKeypad}
                    className="w-7 h-7 rounded-full bg-white/[0.08] text-zinc-400 flex items-center justify-center"
                  >
                    <Icons.X />
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-[#0A0A0C] border border-white/[0.08] flex items-baseline justify-between gap-2">
                <span className="text-xs font-mono-num font-semibold text-[#8E8E93] shrink-0">
                  {session.currency || ''}
                </span>
                <div className="text-right min-w-0">
                  <div className="text-2xl font-bold font-mono-num text-white truncate">
                    {expr || '0'}
                  </div>
                  {(expr.length > 1 && /[+\-]/.test(expr.slice(1))) && (
                    <div className="text-[11px] font-mono-num text-emerald-400 mt-0.5">
                      = {previewVal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>

              <NumericKeypad
                value={expr}
                onChange={setExpr}
                allowNegative={session.allowNegative}
                confirmLabel="確定"
                onConfirm={(val) => {
                  if (session.onConfirm) session.onConfirm(val);
                  closeKeypad();
                }}
              />
            </div>
          </div>
        )}
      </KeypadContext.Provider>
    );
  }

  function NumericInput({
    value,
    onChange,
    label = '輸入金額',
    currency = '',
    placeholder = '0',
    allowNegative = false,
    className = ''
  }) {
    const ctx = useContext(KeypadContext);
    const numVal = Number(value);
    const hasVal = value !== '' && value !== null && value !== undefined && Number.isFinite(numVal);

    return (
      <button
        type="button"
        onClick={() => {
          if (ctx) {
            ctx.openKeypad({
              label,
              currency,
              value: hasVal ? value : '',
              allowNegative,
              onConfirm: (nextVal) => onChange(nextVal)
            });
          }
        }}
        className={`w-full min-h-[50px] px-4 rounded-2xl bg-[#111113] border border-white/10 active:border-white/35 flex items-center justify-between text-left transition ${className}`}
      >
        <span className="text-xs font-mono-num text-[#8E8E93]">{currency}</span>
        <span className={`font-mono-num text-base font-bold ${hasVal ? 'text-white' : 'text-zinc-600'}`}>
          {hasVal ? numVal.toLocaleString('en-US', { maximumFractionDigits: 2 }) : placeholder}
        </span>
      </button>
    );
  }

  // 統一橫向滑動手勢控制器（24px 邊緣豁免、data-no-swipe 豁免、方向鎖定）
  function useHorizontalSwipe({ onSwipeLeft, onSwipeRight, enabled = true, threshold = 55 }) {
    const startRef = useRef(null);

    const onTouchStart = (e) => {
      if (!enabled || !e.touches || e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) {
        startRef.current = null;
        return;
      }
      if (e.target && e.target.closest && e.target.closest('[data-no-swipe], input, select, textarea')) {
        startRef.current = null;
        return;
      }
      startRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    };

    const onTouchEnd = (e) => {
      if (!enabled || !startRef.current || !e.changedTouches || !e.changedTouches.length) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;
      const dt = Date.now() - startRef.current.t;
      startRef.current = null;

      if (dt > 650) return;
      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx < 0 && onSwipeLeft) onSwipeLeft();
        else if (dx > 0 && onSwipeRight) onSwipeRight();
      }
    };

    const onTouchCancel = () => {
      startRef.current = null;
    };

    return { onTouchStart, onTouchEnd, onTouchCancel };
  }

  function useLongPress({ onTap, onLongPress, onLongDragMove, onLongDragEnd, delay = 340 }) {
    const timerRef = useRef(null);
    const longFiredRef = useRef(false);
    const movedBeforeLongRef = useRef(false);
    const activePressRef = useRef(false);
    const startPosRef = useRef({ x: 0, y: 0 });
    const lastTouchAtRef = useRef(0);

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const start = (x, y) => {
      clearTimer();
      activePressRef.current = true;
      longFiredRef.current = false;
      movedBeforeLongRef.current = false;
      startPosRef.current = { x, y };
      if (onLongPress) {
        timerRef.current = setTimeout(() => {
          longFiredRef.current = true;
          if (navigator.vibrate) {
            try { navigator.vibrate(10); } catch (e) {}
          }
          onLongPress();
        }, delay);
      }
    };

    const move = (x, y) => {
      if (!activePressRef.current) return;
      if (longFiredRef.current) {
        if (onLongDragMove) onLongDragMove(x, y);
        return;
      }
      if (Math.hypot(x - startPosRef.current.x, y - startPosRef.current.y) > 12) {
        movedBeforeLongRef.current = true;
        clearTimer();
      }
    };

    const end = (x, y) => {
      clearTimer();
      if (!activePressRef.current) return;
      activePressRef.current = false;
      if (longFiredRef.current) {
        longFiredRef.current = false;
        if (onLongDragEnd) onLongDragEnd(x, y);
        return;
      }
      if (!movedBeforeLongRef.current && onTap) {
        onTap();
      }
    };

    const cancel = () => {
      clearTimer();
      activePressRef.current = false;
      longFiredRef.current = false;
    };

    return {
      onTouchStart: (e) => {
        lastTouchAtRef.current = Date.now();
        const t = e.touches && e.touches[0];
        if (t) start(t.clientX, t.clientY);
      },
      onTouchMove: (e) => {
        const t = e.touches && e.touches[0];
        if (t) move(t.clientX, t.clientY);
      },
      onTouchEnd: (e) => {
        lastTouchAtRef.current = Date.now();
        const t = e.changedTouches && e.changedTouches[0];
        if (t) end(t.clientX, t.clientY);
        else cancel();
      },
      onTouchCancel: () => cancel(),
      onMouseDown: (e) => {
        if (Date.now() - lastTouchAtRef.current < 600) return;
        if (e.button !== 0) return;
        start(e.clientX, e.clientY);
      },
      onMouseMove: (e) => {
        if (Date.now() - lastTouchAtRef.current < 600) return;
        move(e.clientX, e.clientY);
      },
      onMouseUp: (e) => {
        if (Date.now() - lastTouchAtRef.current < 600) return;
        end(e.clientX, e.clientY);
      },
      onMouseLeave: () => {
        if (Date.now() - lastTouchAtRef.current < 600) return;
        if (!longFiredRef.current) cancel();
      }
    };
  }

  function QuickPopoverMenu({ align = 'center', anchorX = null, title, items, hoveredItemId = null, onClose }) {
    const mountedAtRef = useRef(Date.now());
    const frameRef = useRef(null);
    const [boxStyle, setBoxStyle] = useState({ left: 16, width: 224, origin: 'bottom center' });

    useLayoutEffect(() => {
      const updatePosition = () => {
        const frameEl = frameRef.current;
        const rect = frameEl ? frameEl.getBoundingClientRect() : { left: 0, width: Math.min(window.innerWidth, 440) };
        const frameW = rect.width || Math.min(window.innerWidth, 440);
        const safeMargin = 16;
        const menuW = Math.min(224, Math.max(180, frameW - safeMargin * 2));

        let desiredLeft = (frameW - menuW) / 2;
        let origin = 'bottom center';

        if (typeof anchorX === 'number') {
          desiredLeft = anchorX - rect.left - menuW / 2;
        } else if (align === 'left') {
          desiredLeft = safeMargin;
          origin = 'bottom left';
        } else if (align === 'right') {
          desiredLeft = frameW - menuW - safeMargin;
          origin = 'bottom right';
        }

        const clampedLeft = Math.max(safeMargin, Math.min(frameW - menuW - safeMargin, desiredLeft));
        if (clampedLeft <= safeMargin + 4) origin = 'bottom left';
        else if (clampedLeft >= frameW - menuW - safeMargin - 4) origin = 'bottom right';

        setBoxStyle({ left: Math.round(clampedLeft), width: Math.round(menuW), origin });
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }, [align, anchorX]);

    const handleBackdropPress = (e) => {
      if (e.target !== e.currentTarget) return;
      if (Date.now() - mountedAtRef.current < 160) return;
      if (e.cancelable) e.preventDefault();
      onClose();
    };

    return (
      <div
        onTouchStart={handleBackdropPress}
        onMouseDown={handleBackdropPress}
        className="app-overlay z-40 bg-black/50 backdrop-blur-[2px] animate-fade"
      >
        <div ref={frameRef} className="w-full max-w-[440px] mx-auto h-full relative pointer-events-none">
          <div
            style={{
              left: `${boxStyle.left}px`,
              width: `${boxStyle.width}px`,
              bottom: 'calc(max(22px, var(--safe-bottom)) + 68px)'
            }}
            className="pointer-events-auto absolute"
          >
            <div
              style={{ transformOrigin: boxStyle.origin }}
              className="w-full rounded-3xl bg-[#1C1C1E]/95 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-2 space-y-1 animate-pop-up"
            >
              {title && (
                <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-[#8E8E93] tracking-wide flex items-center justify-between gap-2">
                  <span className="truncate">{title}</span>
                  <span className="text-[9px] text-[#636366] shrink-0">點選或滑選</span>
                </div>
              )}
              {items.map(it => {
                const isHighlighted = hoveredItemId === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    data-quick-item-id={it.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      it.onSelect();
                      onClose();
                    }}
                    className={`w-full min-h-[46px] px-3.5 rounded-2xl flex items-center justify-between gap-2.5 text-left transition active:scale-[0.98] ${
                      isHighlighted
                        ? 'bg-white text-black font-bold scale-[1.02] shadow-md'
                        : it.active
                        ? 'bg-white/15 text-white font-bold'
                        : 'text-white hover:bg-white/[0.08] font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                      <span className={isHighlighted ? 'text-black' : (it.iconClass || 'text-zinc-300')}>
                        {it.icon}
                      </span>
                      <span className="text-xs truncate">{it.label}</span>
                    </div>
                    {it.active && !isHighlighted && <Icons.Check />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function BottomSheet({ title, subtitle, onClose, children }) {
    useEffect(() => {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }, []);

    return (
      <div
        onClick={onClose}
        className="app-overlay z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade"
      >
        <div
          onClick={e => e.stopPropagation()}
          className="w-full max-w-[440px] bg-[#141416] border-t sm:border border-white/10 rounded-t-[30px] sm:rounded-[30px] px-5 pt-3 sheet-safe space-y-4 animate-sheet-up max-h-[90dvh] overflow-y-auto"
        >
          <div className="w-9 h-1 rounded-full bg-white/15 mx-auto" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">{title}</h3>
              {subtitle && <p className="text-xs text-[#8E8E93] mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/[0.08] text-[#8E8E93] hover:text-white flex items-center justify-center shrink-0 active:scale-95 transition"
              aria-label="關閉"
            >
              <Icons.X />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  function SegmentedControl({ options, value, onChange }) {
    return (
      <div className="grid p-1 rounded-2xl bg-[#161618] border border-white/[0.07]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(opt => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`min-h-[38px] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                active ? 'bg-[#2C2C2E] text-white shadow-sm' : 'text-[#8E8E93] hover:text-zinc-200'
              }`}
            >
              <span>{opt.label}</span>
              {opt.badge > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>
    );
  }

  function Toast({ message }) {
    if (!message) return null;
    return (
      <div
        style={{ top: 'calc(var(--safe-top) + 12px)' }}
        className="fixed left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-full bg-[#1C1C1E]/95 border border-white/15 text-xs font-medium text-white shadow-2xl backdrop-blur-md animate-fade max-w-[90vw] text-center"
      >
        {message}
      </div>
    );
  }

  function OnboardingFlow({ onComplete }) {
    const [step, setStep] = useState(1);
    const [selectedCurrency, setSelectedCurrency] = useState('MOP');

    const CURRENCY_CHOICES = [
      { code: 'MOP', name: '澳門幣', symbol: 'MOP$' },
      { code: 'HKD', name: '港幣',   symbol: 'HK$' },
      { code: 'TWD', name: '新台幣', symbol: 'NT$' },
      { code: 'USD', name: '美元',   symbol: 'US$' },
      { code: 'CNY', name: '人民幣', symbol: '¥' }
    ];

    return (
      <div className="app-viewport">
        <div className="app-shell-frame bg-black text-white animate-fade">
          <div className="app-scroll-main px-6 pt-8 pb-6 flex flex-col justify-between">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-[#111113] border border-white/10 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17 L8 7 L12 14 L16 7 L21 17" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-6 bg-white' : 'w-2 bg-white/25'}`} />
                  <span className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-6 bg-white' : 'w-2 bg-white/25'}`} />
                </div>
              </div>

              {step === 1 ? (
                <div className="space-y-6 animate-fade">
                  <div className="space-y-1.5">
                    <h1 className="text-[26px] font-bold tracking-tight">選擇主顯示幣種</h1>
                    <p className="text-sm text-[#8E8E93]">總資產與統計報表將預設以此幣種呈現，日後可隨時於設定修改。</p>
                  </div>

                  <div className="space-y-2.5">
                    {CURRENCY_CHOICES.map(c => {
                      const active = selectedCurrency === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => setSelectedCurrency(c.code)}
                          className={`w-full min-h-[58px] px-4 rounded-2xl border flex items-center justify-between transition active:scale-[0.99] ${
                            active
                              ? 'bg-white text-black border-white'
                              : 'bg-[#111113] text-white border-white/[0.07] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-12 text-left font-mono-num text-sm font-bold ${active ? 'text-black' : 'text-zinc-300'}`}>
                              {c.code}
                            </span>
                            <span className="text-sm font-semibold">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono-num text-xs ${active ? 'text-zinc-600' : 'text-[#8E8E93]'}`}>{c.symbol}</span>
                            {active && <Icons.Check />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fade">
                  <div className="space-y-1.5">
                    <h1 className="text-[26px] font-bold tracking-tight">選擇開始方式</h1>
                    <p className="text-sm text-[#8E8E93]">所有帳本資料僅儲存於你的裝置，並支援匯出備份。</p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => onComplete(selectedCurrency, 'DEMO')}
                      className="w-full p-5 rounded-3xl bg-[#111113] border border-white/15 hover:border-white/35 text-left space-y-1.5 active:scale-[0.99] transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-white">載入通用範例體驗</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">推薦體驗</span>
                      </div>
                      <p className="text-xs text-[#8E8E93] leading-relaxed">
                        預載銀行、信用卡、定期存款與投資範例，快速熟悉記帳與跨模組連動。
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onComplete(selectedCurrency, 'BLANK')}
                      className="w-full p-5 rounded-3xl bg-[#111113] border border-white/[0.07] hover:border-white/25 text-left space-y-1.5 active:scale-[0.99] transition"
                    >
                      <div className="text-base font-bold text-white">開始全新空白帳本</div>
                      <p className="text-xs text-[#8E8E93] leading-relaxed">
                        保留標準資金池與常用分類，從零開始建立你的真實帳戶與消費紀錄。
                      </p>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 px-6 pt-3 sheet-safe bg-black">
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full min-h-[52px] rounded-2xl bg-white text-black text-sm font-bold active:scale-[0.98] transition"
              >
                下一步
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full min-h-[48px] rounded-2xl bg-[#161618] text-zinc-300 text-sm font-semibold active:scale-[0.98] transition"
              >
                返回重選幣種 ({selectedCurrency})
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  class EmergencyRecoveryBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, message: '' };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, message: error?.message || '介面渲染發生異常' };
    }
    handleEmergencyExport = () => {
      try {
        const raw = window.localStorage?.getItem(window.WealthStore.STORAGE_KEY) || JSON.stringify(window.WealthStore.getState(), null, 2);
        downloadFile(`Wealth_Emergency_Backup_${new Date().toISOString().slice(0, 10)}.json`, raw, 'application/json');
      } catch (e) {}
    };
    render() {
      if (this.state.hasError) {
        return (
          <div className="app-viewport">
            <div className="app-shell-frame px-6 items-center justify-center bg-black text-white text-center space-y-5">
              <div className="w-14 h-14 rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <Icons.Shield />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold">安全恢復模式</h2>
                <p className="text-xs text-[#8E8E93] leading-relaxed">{this.state.message}</p>
              </div>
              <div className="w-full space-y-2.5">
                <button
                  type="button"
                  onClick={this.handleEmergencyExport}
                  className="w-full min-h-[48px] rounded-2xl bg-white text-black text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Icons.Download />
                  <span>緊急匯出目前帳本 JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full min-h-[48px] rounded-2xl bg-[#161618] border border-white/10 text-white text-sm font-semibold"
                >
                  安全重新整理
                </button>
              </div>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }

  window.WealthUI = {
    CARD_THEMES,
    getCardTheme,
    Icons,
    useWealthStore,
    useHorizontalSwipe,
    useLongPress,
    QuickPopoverMenu,
    NumericKeypad,
    NumericKeypadProvider,
    NumericInput,
    evalCalcExpression,
    downloadFile,
    BottomSheet,
    SegmentedControl,
    Toast,
    OnboardingFlow,
    EmergencyRecoveryBoundary
  };
})();