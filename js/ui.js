(function () {
  const { useState, useEffect, useRef } = React;

  const Icons = {
    Calendar: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    Wallet: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
      </svg>
    ),
    Plus: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
    PieChart: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
      </svg>
    ),
    Settings: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    Eye: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    EyeOff: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
      </svg>
    ),
    ChevronLeft: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    ),
    ChevronRight: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    ),
    Search: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    X: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ),
    Check: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    Lock: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    Unlock: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
      </svg>
    ),
    Sliders: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
      </svg>
    ),
    Bookmark: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    ArrowUpRight: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
      </svg>
    ),
    ArrowDownLeft: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/>
      </svg>
    ),
    ArrowLeftRight: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"/><line x1="3" y1="5" x2="21" y2="5"/><polyline points="7 23 3 19 7 15"/><line x1="21" y1="19" x2="3" y2="19"/>
      </svg>
    ),
    Users: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    CreditCard: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
    TrendingUp: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    Shield: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    Download: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
    Upload: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
    AlertTriangle: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    RefreshCw: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    ),
    Sparkles: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
      </svg>
    )
  };

  function CategoryIcon({ iconKey, type }) {
    if (type === 'TRANSFER') return <Icons.ArrowLeftRight />;
    if (type === 'RECEIVABLE' || type === 'PAYABLE') return <Icons.Users />;
    if (type === 'LOAN_SETTLEMENT') return <Icons.Check />;
    switch (iconKey) {
      case 'utensils':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
          </svg>
        );
      case 'car':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
          </svg>
        );
      case 'home':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        );
      case 'bag':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        );
      case 'shield':
        return <Icons.Shield />;
      case 'briefcase':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        );
      case 'sparkles':
        return <Icons.Sparkles />;
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        );
    }
  }

  function useWealthStore() {
    const [state, setState] = useState(() => window.WealthStore.getState());
    useEffect(() => window.WealthStore.subscribe(setState), []);
    return state;
  }

  function useHorizontalSwipe({ onSwipeLeft, onSwipeRight, enabled = true }) {
    const startRef = useRef(null);
    return {
      onTouchStart: (e) => {
        if (!enabled || !e.touches || e.touches.length !== 1) return;
        if (e.target && e.target.closest && e.target.closest('[data-no-swipe="true"]')) {
          startRef.current = null;
          return;
        }
        const t = e.touches[0];
        const vw = window.innerWidth || 390;
        if (t.clientX < 24 || t.clientX > vw - 24) {
          startRef.current = null;
          return;
        }
        startRef.current = { x: t.clientX, y: t.clientY };
      },
      onTouchEnd: (e) => {
        if (!startRef.current || !e.changedTouches || !e.changedTouches.length) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - startRef.current.x;
        const dy = t.clientY - startRef.current.y;
        startRef.current = null;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.45) {
          if (dx < 0 && onSwipeLeft) onSwipeLeft();
          if (dx > 0 && onSwipeRight) onSwipeRight();
        }
      }
    };
  }

  function useLongPress(onLongPress, onClick, delay = 400) {
    const timerRef = useRef(null);
    const longPressedRef = useRef(false);
    const movedRef = useRef(false);
    const startPosRef = useRef({ x: 0, y: 0 });
    const ignoreMouseRef = useRef(false);

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const dispatchHighlightAtPoint = (clientX, clientY) => {
      try {
        const el = document.elementFromPoint(clientX, clientY);
        const itemBtn = el && el.closest ? el.closest('[data-popover-idx]') : null;
        const idx = itemBtn ? Number(itemBtn.getAttribute('data-popover-idx')) : -1;
        window.dispatchEvent(new CustomEvent('wealth:popover-hover', { detail: { idx } }));
      } catch (e) {}
    };

    return {
      onTouchStart: (e) => {
        ignoreMouseRef.current = true;
        longPressedRef.current = false;
        movedRef.current = false;
        const t = e.touches?.[0];
        if (t) startPosRef.current = { x: t.clientX, y: t.clientY };
        clearTimer();
        timerRef.current = setTimeout(() => {
          longPressedRef.current = true;
          if (navigator.vibrate) {
            try { navigator.vibrate(14); } catch (err) {}
          }
          if (onLongPress) onLongPress(e);
        }, delay);
      },
      onTouchMove: (e) => {
        const t = e.touches?.[0];
        if (!t) return;
        if (!longPressedRef.current) {
          const dist = Math.hypot(t.clientX - startPosRef.current.x, t.clientY - startPosRef.current.y);
          if (dist > 14) {
            movedRef.current = true;
            clearTimer();
          }
        } else {
          dispatchHighlightAtPoint(t.clientX, t.clientY);
        }
      },
      onTouchEnd: (e) => {
        clearTimer();
        if (longPressedRef.current) {
          const t = e.changedTouches?.[0];
          if (t) {
            try {
              const el = document.elementFromPoint(t.clientX, t.clientY);
              const itemBtn = el && el.closest ? el.closest('[data-popover-idx]') : null;
              if (itemBtn) {
                itemBtn.click();
                return;
              }
            } catch (err) {}
          }
          return;
        }
        if (!movedRef.current && onClick) {
          onClick(e);
        }
      },
      onTouchCancel: () => {
        clearTimer();
      },
      onMouseDown: (e) => {
        if (ignoreMouseRef.current) return;
        longPressedRef.current = false;
        clearTimer();
        timerRef.current = setTimeout(() => {
          longPressedRef.current = true;
          if (onLongPress) onLongPress(e);
        }, delay);
      },
      onMouseUp: (e) => {
        if (ignoreMouseRef.current) {
          ignoreMouseRef.current = false;
          return;
        }
        clearTimer();
        if (!longPressedRef.current && onClick) onClick(e);
      },
      onMouseLeave: () => {
        clearTimer();
      },
      onContextMenu: (e) => {
        e.preventDefault();
      }
    };
  }

  function QuickPopoverMenu({ title, items, align = 'center', anchorX = null, onClose }) {
    const [hoverIdx, setHoverIdx] = useState(-1);
    const [leftPx, setLeftPx] = useState(null);
    const boxRef = useRef(null);

    useEffect(() => {
      const handleHover = (e) => setHoverIdx(e.detail?.idx ?? -1);
      window.addEventListener('wealth:popover-hover', handleHover);
      return () => window.removeEventListener('wealth:popover-hover', handleHover);
    }, []);

    useEffect(() => {
      const updatePos = () => {
        const vw = window.innerWidth || 390;
        const menuW = boxRef.current ? boxRef.current.offsetWidth : 216;
        const pad = 14;
        let targetLeft;
        if (typeof anchorX === 'number') {
          targetLeft = anchorX - menuW / 2;
        } else if (align === 'left') {
          targetLeft = pad;
        } else if (align === 'right') {
          targetLeft = vw - menuW - pad;
        } else {
          targetLeft = (vw - menuW) / 2;
        }
        const clamped = Math.max(pad, Math.min(vw - menuW - pad, targetLeft));
        setLeftPx(clamped);
      };
      updatePos();
      window.addEventListener('resize', updatePos);
      return () => window.removeEventListener('resize', updatePos);
    }, [align, anchorX]);

    return (
      <div
        onTouchStart={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] animate-fade"
        style={{ height: 'var(--app-height, 100dvh)' }}
      >
        <div
          ref={boxRef}
          onTouchStart={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          style={{
            bottom: 'calc(76px + env(safe-area-inset-bottom))',
            left: leftPx !== null ? `${leftPx}px` : '50%',
            transform: leftPx !== null ? undefined : 'translateX(-50%)'
          }}
          className="fixed w-[216px] max-w-[calc(100vw-28px)]"
        >
          <div className="rounded-3xl bg-[#18181B] border border-white/15 shadow-2xl overflow-hidden animate-pop-up">
            {title && (
              <div className="px-4 py-2 border-b border-white/[0.07] flex items-center justify-between text-[10px] font-semibold text-[#8E8E93]">
                <span>{title}</span>
                <span>點選或滑選</span>
              </div>
            )}
            <div className="divide-y divide-white/[0.06]">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  data-popover-idx={idx}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className={`w-full px-4 py-3 text-left text-xs font-semibold flex items-center justify-between gap-2 transition ${
                    hoverIdx === idx
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white/[0.07] active:bg-white/[0.12]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon && <span className={hoverIdx === idx ? 'text-black' : (item.accent || 'text-zinc-300')}>{item.icon}</span>}
                    <span>{item.label}</span>
                  </span>
                  {item.active && <span className={hoverIdx === idx ? 'text-black' : 'text-emerald-400'}><Icons.Check /></span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function BottomSheet({ title, subtitle, onClose, children, maxHeightClass = 'max-h-[88vh]' }) {
    useEffect(() => {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prevOverflow; };
    }, []);

    return (
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade"
        style={{ height: 'var(--app-height, 100dvh)' }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          className={`w-full max-w-[440px] bg-[#141416] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] px-5 pt-3 space-y-4 animate-sheet-up overflow-y-auto ${maxHeightClass}`}
        >
          <div className="w-9 h-1 rounded-full bg-white/15 mx-auto shrink-0" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">{title}</h3>
              {subtitle && <p className="text-[11px] text-[#8E8E93] mt-0.5 truncate">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.08] text-[#8E8E93] hover:text-white flex items-center justify-center shrink-0"
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
      <div className="grid p-1 rounded-2xl bg-[#161618] border border-white/[0.06]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(opt => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                active ? 'bg-[#2C2C2E] text-white shadow-sm' : 'text-[#8E8E93] hover:text-zinc-300'
              }`}
            >
              <span>{opt.label}</span>
              {opt.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>
    );
  }

  function Toast({ message, tone = 'neutral' }) {
    if (!message) return null;
    return (
      <div
        style={{ top: 'max(16px, env(safe-area-inset-top))' }}
        className={`fixed left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-full border text-xs font-medium shadow-2xl backdrop-blur-md animate-fade max-w-[90vw] text-center ${
          tone === 'warning'
            ? 'bg-amber-950/95 border-amber-400/40 text-amber-200'
            : 'bg-zinc-900/95 border-white/15 text-white'
        }`}
      >
        {message}
      </div>
    );
  }

  function OnboardingFlow({ onComplete }) {
    const [baseCurrency, setBaseCurrency] = useState('MOP');
    const currencies = [
      { code: 'MOP', name: '澳門幣 (MOP$)' },
      { code: 'HKD', name: '港幣 (HK$)' },
      { code: 'TWD', name: '新台幣 (NT$)' },
      { code: 'USD', name: '美元 (US$)' }
    ];

    return (
      <div
        style={{
          paddingTop: 'max(36px, env(safe-area-inset-top))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))'
        }}
        className="app-viewport max-w-[440px] mx-auto px-6 justify-between bg-black text-white animate-fade overflow-y-auto"
      >
        <div className="space-y-2 pt-4">
          <div className="w-11 h-11 rounded-2xl bg-[#161618] border border-white/10 flex items-center justify-center text-emerald-400 mb-4">
            <Icons.Wallet />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">歡迎使用個人財務管理</h1>
          <p className="text-xs text-[#8E8E93] leading-relaxed">
            先選擇你的主顯示貨幣，接著可載入通用範例體驗所有功能，或直接從空白帳本開始。
          </p>
        </div>

        <div className="space-y-6 my-auto">
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[#8E8E93]">1. 選擇主顯示貨幣</label>
            <div className="grid grid-cols-2 gap-2.5">
              {currencies.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setBaseCurrency(c.code)}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    baseCurrency === c.code
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-[#111113] text-white border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="font-mono-num text-sm font-bold">{c.code}</div>
                  <div className={`text-[11px] mt-0.5 ${baseCurrency === c.code ? 'text-zinc-600' : 'text-[#8E8E93]'}`}>
                    {c.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[#8E8E93]">2. 選擇初始帳本模式</label>
            <button
              type="button"
              onClick={() => onComplete(baseCurrency, 'SEED')}
              className="w-full min-h-[52px] rounded-2xl bg-white text-black text-sm font-bold active:scale-[0.98] transition"
            >
              載入通用範例體驗
            </button>
            <button
              type="button"
              onClick={() => onComplete(baseCurrency, 'BLANK')}
              className="w-full min-h-[48px] rounded-2xl bg-[#161618] border border-white/10 text-white text-xs font-semibold active:scale-[0.98] transition"
            >
              開始全新空白帳本
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-[#636366]">
          所有數據預設儲存於本機裝置，隨時可至「設定」匯出備份
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
      return { hasError: true, message: error?.message || '畫面載入時發生非預期錯誤' };
    }
    render() {
      if (this.state.hasError) {
        return (
          <div className="app-viewport max-w-[440px] mx-auto px-6 items-center justify-center bg-black text-white text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <Icons.AlertTriangle />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold">安全保護模式</h2>
              <p className="text-xs text-[#8E8E93]">{this.state.message}</p>
            </div>
            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const json = window.WealthStore ? window.WealthStore.exportFullJson() : '{}';
                  downloadFile(`Wealth_Emergency_Backup_${Date.now()}.json`, json, 'application/json');
                }}
                className="w-full min-h-[46px] rounded-2xl bg-white text-black text-xs font-bold"
              >
                緊急匯出目前帳本 JSON
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="w-full min-h-[44px] rounded-2xl bg-[#161618] border border-white/10 text-xs font-semibold text-zinc-200"
              >
                嘗試重新載入畫面
              </button>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
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

  function copyTextToClipboard(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function evaluateMathExpr(expr, allowNegative = false) {
    try {
      const cleaned = String(expr ?? '').replace(/[^0-9.+\-]/g, '');
      if (!cleaned) return 0;
      const tokens = cleaned.match(/[+-]?([0-9]*[.])?[0-9]+/g);
      if (!tokens) return 0;
      const sum = tokens.reduce((acc, t) => acc + parseFloat(t), 0);
      const rounded = Math.round(sum * 100) / 100;
      return allowNegative ? rounded : Math.max(0, rounded);
    } catch (e) {
      return 0;
    }
  }

  function NumericKeypad({
    valueStr,
    onChangeStr,
    confirmLabel = '完成',
    onCollapse,
    onConfirm,
    allowNegative = false
  }) {
    const str = String(valueStr ?? '0');
    const hasOperator = /[+\-]/.test(str.slice(1));

    const handleKey = (k) => {
      if (k === 'C') {
        onChangeStr('0');
        return;
      }
      if (k === '⌫') {
        onChangeStr(str.length > 1 ? str.slice(0, -1) : '0');
        return;
      }
      if (k === '=') {
        const val = evaluateMathExpr(str, allowNegative);
        onChangeStr(String(val));
        return;
      }
      if (k === '+' || k === '-') {
        if (str === '0' && k === '-' && allowNegative) {
          onChangeStr('-');
          return;
        }
        if (/[+\-]$/.test(str)) {
          onChangeStr(str.slice(0, -1) + k);
        } else {
          onChangeStr(str + k);
        }
        return;
      }
      if (k === '.') {
        const parts = str.split(/[+\-]/);
        const lastPart = parts[parts.length - 1] || '';
        if (lastPart.includes('.')) return;
        onChangeStr((lastPart === '' ? str + '0' : str) + '.');
        return;
      }
      if (str === '0') {
        onChangeStr(String(k));
      } else if (str === '-0') {
        onChangeStr('-' + String(k));
      } else {
        onChangeStr(str + String(k));
      }
    };

    return (
      <div
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        className="p-2.5 bg-[#0B0B0D] border-t border-white/[0.08] space-y-1.5 shrink-0"
      >
        <div className="flex items-center justify-between px-1.5 pb-0.5">
          <span className="text-[10px] text-[#8E8E93]">支援加減運算</span>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="px-2.5 py-0.5 rounded-lg bg-[#161618] text-[10px] font-semibold text-zinc-300"
            >
              收起鍵盤 ▾
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 font-mono-num">
          {['7', '8', '9', '⌫', '4', '5', '6', '+', '1', '2', '3', '-'].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => handleKey(k)}
              className={`h-11 rounded-2xl text-base font-bold border active:scale-95 transition ${
                ['⌫', '+', '-'].includes(k)
                  ? 'bg-[#1C1C1E] text-amber-300 border-white/[0.08]'
                  : 'bg-[#161618] text-white border-white/[0.06]'
              }`}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleKey('C')}
            className="h-11 rounded-2xl text-xs font-bold bg-[#1C1C1E] text-rose-400 border border-white/[0.08] active:scale-95 transition"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleKey('0')}
            className="h-11 rounded-2xl text-base font-bold bg-[#161618] text-white border border-white/[0.06] active:scale-95 transition"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleKey('.')}
            className="h-11 rounded-2xl text-base font-bold bg-[#161618] text-white border border-white/[0.06] active:scale-95 transition"
          >
            .
          </button>
          <button
            type="button"
            onClick={() => {
              if (hasOperator) {
                handleKey('=');
              } else if (onConfirm) {
                onConfirm(evaluateMathExpr(str, allowNegative));
              }
            }}
            className="h-11 rounded-2xl text-xs font-bold bg-white text-black shadow active:scale-95 transition"
          >
            {hasOperator ? '=' : confirmLabel}
          </button>
        </div>
      </div>
    );
  }

  function openKeypad(options) {
    window.dispatchEvent(new CustomEvent('wealth:open-keypad', { detail: options }));
  }

  function GlobalNumericKeypad() {
    const [session, setSession] = useState(null);
    const [exprStr, setExprStr] = useState('0');

    useEffect(() => {
      const handler = (e) => {
        const detail = e.detail || {};
        const initNum = Number(detail.initialValue);
        setExprStr(Number.isFinite(initNum) ? String(initNum) : '0');
        setSession(detail);
      };
      window.addEventListener('wealth:open-keypad', handler);
      return () => window.removeEventListener('wealth:open-keypad', handler);
    }, []);

    if (!session) return null;

    const allowNeg = Boolean(session.allowNegative);
    const previewVal = evaluateMathExpr(exprStr, allowNeg);
    const hasOp = /[+\-]/.test(exprStr.slice(1));

    return (
      <div
        onClick={() => setSession(null)}
        style={{ height: 'var(--app-height, 100dvh)' }}
        className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end justify-center animate-fade"
      >
        <div
          onClick={e => e.stopPropagation()}
          className="w-full max-w-[440px] bg-[#141416] border-t border-white/15 rounded-t-[28px] overflow-hidden animate-sheet-up shadow-2xl"
        >
          <div className="px-4 py-3 flex items-center justify-between gap-2 bg-[#18181B] border-b border-white/[0.07]">
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{session.label || '輸入金額'}</div>
              {session.subtitle && (
                <div className="text-[10px] text-[#8E8E93] truncate">{session.subtitle}</div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold font-mono-num text-white">
                {session.currency ? `${window.WealthStore?.CURRENCY_SYMBOLS?.[session.currency] || session.currency} ` : ''}
                {exprStr}
              </div>
              {hasOp && (
                <div className="text-[10px] font-mono-num text-emerald-400">
                  = {previewVal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>

          <NumericKeypad
            valueStr={exprStr}
            onChangeStr={setExprStr}
            allowNegative={allowNeg}
            confirmLabel="確認"
            onCollapse={() => setSession(null)}
            onConfirm={(finalVal) => {
              if (session.onConfirm) session.onConfirm(finalVal);
              setSession(null);
            }}
          />
        </div>
      </div>
    );
  }

  function NumericInput({
    value,
    label,
    subtitle,
    currency,
    allowNegative = false,
    onChange,
    className = '',
    textClassName = 'text-white'
  }) {
    const num = Number(value) || 0;
    const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const display = allowNegative && num > 0 ? `+${formatted}` : formatted;

    return (
      <button
        type="button"
        onClick={() => openKeypad({
          initialValue: num,
          label,
          subtitle,
          currency,
          allowNegative,
          onConfirm: onChange
        })}
        className={`font-mono-num font-bold active:scale-[0.98] transition ${textClassName} ${className}`}
      >
        {display}
      </button>
    );
  }

  window.WealthUI = {
    Icons,
    CategoryIcon,
    useWealthStore,
    useHorizontalSwipe,
    useLongPress,
    QuickPopoverMenu,
    BottomSheet,
    SegmentedControl,
    Toast,
    OnboardingFlow,
    EmergencyRecoveryBoundary,
    downloadFile,
    copyTextToClipboard,
    evaluateMathExpr,
    NumericKeypad,
    GlobalNumericKeypad,
    NumericInput,
    openKeypad
  };
})();
