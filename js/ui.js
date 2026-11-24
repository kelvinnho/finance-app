(function () {
  'use strict';

  const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;
  const { createPortal } = ReactDOM;

  // ---- Minimal Inline SVG Icons ----
  function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
    const props = {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className
    };
    switch (name) {
      case 'calendar':
        return (
          <svg {...props}>
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case 'wallet':
        return (
          <svg {...props}>
            <rect x="2" y="5" width="20" height="14" rx="3" />
            <path d="M16 12h.01" strokeWidth="2.6" />
            <path d="M2 9h20" />
          </svg>
        );
      case 'plus':
        return (
          <svg {...props}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        );
      case 'pie':
        return (
          <svg {...props}>
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        );
      case 'settings':
        return (
          <svg {...props}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        );
      case 'eye':
        return (
          <svg {...props}>
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        );
      case 'eyeOff':
        return (
          <svg {...props}>
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a21.8 21.8 0 0 1-3.17 4.49" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        );
      case 'search':
        return (
          <svg {...props}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        );
      case 'split':
        return (
          <svg {...props}>
            <path d="M16 3h5v5" />
            <path d="M8 3H3v5" />
            <path d="M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3" />
            <path d="m15 9 6-6" />
          </svg>
        );
      case 'chevronLeft':
        return <svg {...props}><polyline points="15 18 9 12 15 6" /></svg>;
      case 'chevronRight':
        return <svg {...props}><polyline points="9 18 15 12 9 6" /></svg>;
      case 'chevronDown':
        return <svg {...props}><polyline points="6 9 12 15 18 9" /></svg>;
      case 'close':
        return (
          <svg {...props}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        );
      case 'check':
        return <svg {...props}><polyline points="20 6 9 17 4 12" /></svg>;
      case 'lock':
        return (
          <svg {...props}>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        );
      case 'unlock':
        return (
          <svg {...props}>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 7.8-1" />
          </svg>
        );
      case 'star':
        return (
          <svg {...props}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      case 'swap':
        return (
          <svg {...props}>
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        );
      case 'trash':
        return (
          <svg {...props}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        );
      case 'edit':
        return (
          <svg {...props}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        );
      case 'undo':
        return (
          <svg {...props}>
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        );
      case 'arrowUpRight':
        return (
          <svg {...props}>
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        );
      case 'arrowDownLeft':
        return (
          <svg {...props}>
            <line x1="17" y1="7" x2="7" y2="17" />
            <polyline points="17 17 7 17 7 7" />
          </svg>
        );
      case 'users':
        return (
          <svg {...props}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'utensils':
        return (
          <svg {...props}>
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v7" />
          </svg>
        );
      case 'car':
        return (
          <svg {...props}>
            <path d="M5 17h14v-5l-2-5H7l-2 5v5z" />
            <circle cx="7.5" cy="17.5" r="1.5" />
            <circle cx="16.5" cy="17.5" r="1.5" />
          </svg>
        );
      case 'bag':
        return (
          <svg {...props}>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        );
      case 'home':
        return (
          <svg {...props}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case 'sparkles':
        return (
          <svg {...props}>
            <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" />
          </svg>
        );
      case 'heart':
        return (
          <svg {...props}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        );
      case 'briefcase':
        return (
          <svg {...props}>
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
        );
      case 'gift':
        return (
          <svg {...props}>
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M12 8v13" />
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          </svg>
        );
      case 'trend':
        return (
          <svg {...props}>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        );
      case 'coins':
        return (
          <svg {...props}>
            <circle cx="8" cy="8" r="6" />
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
          </svg>
        );
      case 'card':
        return (
          <svg {...props}>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        );
      case 'alert':
        return (
          <svg {...props}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'download':
        return (
          <svg {...props}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        );
      case 'upload':
        return (
          <svg {...props}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        );
      default:
        return (
          <svg {...props}>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        );
    }
  }

  // ---- Store Subscription Hook ----
  function useWealthStore() {
    const [st, setSt] = useState(() => window.WealthStore.getState());
    useEffect(() => {
      return window.WealthStore.subscribe((next) => setSt(next));
    }, []);
    return st;
  }

  // ---- Horizontal Swipe Hook (with edge & horizontal-track guard) ----
  function useHorizontalSwipe(onSwipeLeft, onSwipeRight) {
    const startRef = useRef(null);

    const onTouchStart = useCallback((e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const target = e.target;
      if (target && target.closest && target.closest('[data-no-swipe]')) return;
      const t = e.touches[0];
      if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
      startRef.current = { x: t.clientX, y: t.clientY };
    }, []);

    const onTouchEnd = useCallback((e) => {
      if (!startRef.current || !e.changedTouches || !e.changedTouches.length) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      startRef.current = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx < 0 && onSwipeLeft) onSwipeLeft();
        if (dx > 0 && onSwipeRight) onSwipeRight();
      }
    }, [onSwipeLeft, onSwipeRight]);

    return { onTouchStart, onTouchEnd };
  }

  // ---- Long Press + Slide-to-Select Hook ----
  function useLongPress({ onShortTap, onLongPress, onDragOverKey, onDragRelease, delay = 360 }) {
    const timerRef = useRef(null);
    const triggeredRef = useRef(false);
    const startPosRef = useRef({ x: 0, y: 0 });
    const touchActiveRef = useRef(false);
    const hoveredKeyRef = useRef(null);

    const clearTimer = useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }, []);

    useEffect(() => clearTimer, [clearTimer]);

    const onTouchStart = useCallback((e) => {
      touchActiveRef.current = true;
      triggeredRef.current = false;
      hoveredKeyRef.current = null;
      const t = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const anchorX = rect.left + rect.width / 2;
      startPosRef.current = { x: t.clientX, y: t.clientY };
      clearTimer();
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        if (navigator.vibrate) {
          try { navigator.vibrate(12); } catch (_) {}
        }
        if (onLongPress) onLongPress(anchorX);
      }, delay);
    }, [clearTimer, delay, onLongPress]);

    const onTouchMove = useCallback((e) => {
      const t = e.touches[0];
      if (!triggeredRef.current) {
        const dx = Math.abs(t.clientX - startPosRef.current.x);
        const dy = Math.abs(t.clientY - startPosRef.current.y);
        if (dx > 12 || dy > 12) clearTimer();
        return;
      }
      // 已彈出快捷選單：支援手指直接上滑高亮選取
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const itemEl = el && el.closest ? el.closest('[data-quick-item]') : null;
      const key = itemEl ? itemEl.getAttribute('data-quick-item') : null;
      if (key !== hoveredKeyRef.current) {
        hoveredKeyRef.current = key;
        if (onDragOverKey) onDragOverKey(key);
      }
    }, [clearTimer, onDragOverKey]);

    const onTouchEnd = useCallback((e) => {
      clearTimer();
      const wasLong = triggeredRef.current;
      const hovered = hoveredKeyRef.current;
      hoveredKeyRef.current = null;

      if (wasLong) {
        // 阻止鬆手後的瀏覽器補發點擊事件
        if (e.cancelable) e.preventDefault();
        if (hovered && onDragRelease) {
          onDragRelease(hovered);
        }
        // 若手指離開時沒有停在選項上，保持選單開啟等待從容點選
      } else {
        const t = e.changedTouches && e.changedTouches[0];
        if (t) {
          const dx = Math.abs(t.clientX - startPosRef.current.x);
          const dy = Math.abs(t.clientY - startPosRef.current.y);
          if (dx <= 14 && dy <= 14 && onShortTap) {
            if (e.cancelable) e.preventDefault();
            onShortTap();
          }
        }
      }
      setTimeout(() => {
        touchActiveRef.current = false;
      }, 350);
    }, [clearTimer, onDragRelease, onShortTap]);

    const onMouseDown = useCallback((e) => {
      if (touchActiveRef.current || e.button !== 0) return;
      triggeredRef.current = false;
      const rect = e.currentTarget.getBoundingClientRect();
      const anchorX = rect.left + rect.width / 2;
      clearTimer();
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        if (onLongPress) onLongPress(anchorX);
      }, delay);
    }, [clearTimer, delay, onLongPress]);

    const onMouseUp = useCallback(() => {
      if (touchActiveRef.current) return;
      clearTimer();
      if (!triggeredRef.current && onShortTap) {
        onShortTap();
      }
    }, [clearTimer, onShortTap]);

    const onMouseLeave = useCallback(() => {
      clearTimer();
    }, [clearTimer]);

    const onContextMenu = useCallback((e) => {
      e.preventDefault();
    }, []);

    return {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseUp,
      onMouseLeave,
      onContextMenu
    };
  }

  // ---- Viewport-Clamped Quick Popover Menu (Portal z-[65]) ----
  function QuickPopoverMenu({ open, title, items, anchorX, highlightedKey, onSelect, onClose }) {
    const openedAtRef = useRef(0);

    useEffect(() => {
      if (open) openedAtRef.current = Date.now();
    }, [open]);

    if (!open) return null;

    const menuWidth = 224;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const rawLeft = (anchorX != null ? anchorX : vw / 2) - menuWidth / 2;
    const clampedLeft = Math.max(16, Math.min(rawLeft, vw - menuWidth - 16));

    const handleBackdropDown = (e) => {
      if (e.target !== e.currentTarget) return;
      if (Date.now() - openedAtRef.current < 260) return;
      onClose();
    };

    return createPortal(
      <div
        onTouchStart={handleBackdropDown}
        onMouseDown={handleBackdropDown}
        className="fixed inset-0 z-[65] bg-black/55 backdrop-blur-[2px] anim-fade-in"
      >
        <div
          style={{
            position: 'fixed',
            left: `${clampedLeft}px`,
            width: `${menuWidth}px`,
            bottom: 'calc(84px + env(safe-area-inset-bottom))'
          }}
        >
          <div className="anim-pop-scale rounded-2xl bg-[#18181C]/95 border border-white/15 shadow-2xl overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-400">{title}</span>
              <span className="text-[10px] text-zinc-500">點選或滑選</span>
            </div>
            <div className="p-1.5 space-y-0.5">
              {items.map((item) => {
                const active = highlightedKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    data-quick-item={item.key}
                    onClick={() => {
                      onSelect(item.key);
                      onClose();
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left text-[14px] font-medium transition ${
                      active ? 'bg-white text-black' : 'text-zinc-100 hover:bg-white/10 active:bg-white/15'
                    }`}
                  >
                    <span className={active ? 'text-black' : (item.colorClass || 'text-zinc-300')}>
                      <Icon name={item.icon} size={17} />
                    </span>
                    <span className="flex-1 whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ---- Portal BottomSheet (z-[60], Never Obstructed by Bottom Nav) ----
  function BottomSheet({ open, title, subtitle, onClose, footer, children, maxHeight = '86dvh' }) {
    if (!open) return null;

    return createPortal(
      <div
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onTouchStart={(e) => { if (e.target === e.currentTarget) onClose(); }}
        className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-end justify-center anim-fade-in"
      >
        <div
          style={{ maxHeight }}
          className="w-full max-w-[480px] bg-[#141417] border-t border-white/15 rounded-t-[24px] flex flex-col overflow-hidden anim-sheet-up shadow-2xl"
        >
          {/* Grab Handle + Sticky Header */}
          <div className="shrink-0 px-5 pt-2.5 pb-3 border-b border-white/[0.08]">
            <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-3" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold text-white truncate">{title}</h3>
                {subtitle && <p className="text-[12px] text-zinc-400 mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-300 active:scale-95 shrink-0"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-5 py-4"
            style={footer ? undefined : { paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 20px))' }}
          >
            {children}
          </div>

          {/* Optional Sticky Footer Always Above Home Indicator */}
          {footer && (
            <div
              className="shrink-0 px-5 pt-3 border-t border-white/[0.08] bg-[#141417]"
              style={{ paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom) + 8px))' }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // ---- Unified Apple-Dark Numeric Calculator Keypad (Context + Portal z-[90]) ----
  const KeypadContext = createContext({ openKeypad: () => {} });

  function safeEvalAddSub(expr) {
    const cleaned = String(expr || '').replace(/[^0-9.+\-]/g, '');
    if (!cleaned) return 0;
    const tokens = cleaned.match(/[+\-]?[0-9]*\.?[0-9]+/g);
    if (!tokens) return 0;
    let total = 0;
    for (let i = 0; i < tokens.length; i++) {
      const n = parseFloat(tokens[i]);
      if (Number.isFinite(n)) total += n;
    }
    return Math.round(total * 100) / 100;
  }

  function NumericKeypadPanel({ expr, setExpr, label, currency, quickAdds, onConfirm, onCancel }) {
    const hasOperator = /[+\-]/.test(expr.slice(1));
    const previewVal = safeEvalAddSub(expr);
    const sym = currency ? window.WealthStore.getCurrencySymbol(currency) : '';

    const press = (k) => {
      if (k === 'C') {
        setExpr('0');
        return;
      }
      if (k === 'BACK') {
        setExpr((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
        return;
      }
      if (k === '=') {
        const res = safeEvalAddSub(expr);
        setExpr(String(Math.max(0, res)));
        return;
      }
      if (k === '+' || k === '-') {
        setExpr((prev) => {
          if (!prev || prev === '0') return '0';
          if (/[+\-]$/.test(prev)) return prev.slice(0, -1) + k;
          return prev + k;
        });
        return;
      }
      if (k === '.') {
        setExpr((prev) => {
          const parts = prev.split(/[+\-]/);
          const last = parts[parts.length - 1] || '';
          if (last.includes('.')) return prev;
          return prev + '.';
        });
        return;
      }
      setExpr((prev) => {
        if (prev === '0') return k;
        if (prev.length >= 18) return prev;
        return prev + k;
      });
    };

    const addQuick = (delta) => {
      const next = Math.max(0, Math.round((safeEvalAddSub(expr) + delta) * 100) / 100);
      setExpr(String(next));
    };

    const keys = [
      ['7', '8', '9', 'BACK'],
      ['4', '5', '6', '+'],
      ['1', '2', '3', '-'],
      ['C', '0', '.', hasOperator ? '=' : 'OK']
    ];

    return (
      <div className="bg-[#121215] border-t border-white/15 rounded-t-[24px] w-full max-w-[480px] overflow-hidden shadow-2xl anim-sheet-up">
        <div className="px-5 pt-3.5 pb-2.5 flex items-center justify-between border-b border-white/[0.08]">
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-400">{label || '輸入金額'}</div>
            <div className="text-[26px] font-bold text-white tabular-nums tracking-tight truncate">
              {sym && <span className="text-[16px] text-zinc-400 mr-1.5 font-medium">{sym}</span>}
              {expr}
            </div>
            {hasOperator && (
              <div className="text-[12px] text-emerald-400 tabular-nums">= {sym} {previewVal.toLocaleString('en-US')}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/10 text-zinc-300 flex items-center justify-center shrink-0"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {Array.isArray(quickAdds) && quickAdds.length > 0 && (
          <div className="px-4 pt-2.5 flex gap-2">
            {quickAdds.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => addQuick(n)}
                className="flex-1 py-1.5 rounded-xl bg-white/[0.07] border border-white/10 text-[12px] font-medium text-zinc-200 active:bg-white/20 tabular-nums"
              >
                +{n}
              </button>
            ))}
          </div>
        )}

        <div
          className="p-3.5 grid grid-cols-4 gap-2"
          style={{ paddingBottom: 'max(18px, calc(env(safe-area-inset-bottom) + 8px))' }}
        >
          {keys.flat().map((k) => {
            const isConfirm = k === 'OK';
            const isOp = k === '+' || k === '-' || k === '=';
            const isUtil = k === 'BACK' || k === 'C';
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (isConfirm) {
                    onConfirm(Math.max(0, safeEvalAddSub(expr)));
                  } else {
                    press(k);
                  }
                }}
                className={`h-[52px] rounded-2xl text-[18px] font-semibold flex items-center justify-center transition active:scale-95 tabular-nums ${
                  isConfirm
                    ? 'bg-white text-black font-bold'
                    : isOp
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : isUtil
                    ? 'bg-white/[0.06] text-zinc-300'
                    : 'bg-[#1D1D22] text-white border border-white/[0.06]'
                }`}
              >
                {k === 'BACK' ? '⌫' : k === 'OK' ? '確認' : k}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function KeypadProvider({ children }) {
    const [config, setConfig] = useState(null);
    const [expr, setExpr] = useState('0');

    const openKeypad = useCallback((opts) => {
      const initial = opts && opts.value != null && opts.value !== '' ? String(opts.value) : '0';
      setExpr(initial === 'NaN' ? '0' : initial);
      setConfig(opts);
    }, []);

    const close = useCallback(() => setConfig(null), []);

    return (
      <KeypadContext.Provider value={{ openKeypad }}>
        {children}
        {config && createPortal(
          <div
            onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
            onTouchStart={(e) => { if (e.target === e.currentTarget) close(); }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] flex items-end justify-center anim-fade-in"
          >
            <NumericKeypadPanel
              expr={expr}
              setExpr={setExpr}
              label={config.label}
              currency={config.currency}
              quickAdds={config.quickAdds}
              onCancel={close}
              onConfirm={(val) => {
                if (config.onConfirm) config.onConfirm(val);
                close();
              }}
            />
          </div>,
          document.body
        )}
      </KeypadContext.Provider>
    );
  }

  function useKeypad() {
    return useContext(KeypadContext);
  }

  function NumericInput({ value, onChange, currency, label, quickAdds, placeholder = '0', className = '', size = 'md' }) {
    const { openKeypad } = useKeypad();
    const sym = currency ? window.WealthStore.getCurrencySymbol(currency) : '';
    const num = Number(value);
    const display = Number.isFinite(num) && value !== '' && value != null
      ? num.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : placeholder;

    const handleOpen = () => {
      openKeypad({
        value: Number.isFinite(num) ? num : 0,
        currency,
        label,
        quickAdds,
        onConfirm: (nextVal) => onChange(nextVal)
      });
    };

    const padClass = size === 'sm' ? 'px-3 py-2 text-[14px]' : size === 'lg' ? 'px-4 py-3.5 text-[24px]' : 'px-3.5 py-2.5 text-[16px]';

    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full rounded-xl bg-black/60 border border-white/[0.12] text-left flex items-center justify-between gap-2 active:border-white/40 transition tabular-nums ${padClass} ${className}`}
      >
        <span className="truncate font-semibold text-white">
          {sym && <span className="text-zinc-400 text-[0.78em] mr-1 font-normal">{sym}</span>}
          {display}
        </span>
        <span className="text-[11px] text-zinc-500 shrink-0">計算機</span>
      </button>
    );
  }

  // ---- Segmented Control ----
  function SegmentedControl({ options, value, onChange, className = '' }) {
    return (
      <div className={`p-1 rounded-2xl bg-[#141417] border border-white/[0.08] flex items-center gap-1 ${className}`}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 py-2 px-2 rounded-xl text-[13px] font-medium transition whitespace-nowrap ${
                active ? 'bg-[#26262C] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // ---- Toast (Portal z-[100]) ----
  function Toast({ message }) {
    if (!message) return null;
    return createPortal(
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold shadow-2xl whitespace-nowrap max-w-[90vw] truncate anim-fade-in"
        style={{ top: 'max(18px, calc(env(safe-area-inset-top) + 10px))' }}
      >
        {message}
      </div>,
      document.body
    );
  }

  // ---- Emergency Recovery ErrorBoundary ----
  class EmergencyRecoveryBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, errorMsg: '' };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, errorMsg: error ? String(error.message || error) : 'Unknown error' };
    }
    render() {
      if (!this.state.hasError) return this.props.children;
      const exportEmergency = () => {
        try {
          const raw = window.WealthStore ? window.WealthStore.exportJSON() : '{}';
          const blob = new Blob([raw], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `wealth-emergency-backup-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (_) {}
      };
      return (
        <div className="h-full w-full bg-black text-white flex flex-col items-center justify-center px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <Icon name="alert" size={24} />
          </div>
          <h2 className="text-[19px] font-semibold mb-2">安全保護模式</h2>
          <p className="text-[13px] text-zinc-400 mb-6 break-all max-w-[320px]">{this.state.errorMsg}</p>
          <div className="w-full max-w-[300px] space-y-3">
            <button
              type="button"
              onClick={exportEmergency}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-[14px] font-semibold"
            >
              緊急匯出目前帳本 JSON
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3.5 rounded-2xl bg-white/10 text-zinc-200 text-[14px] font-medium"
            >
              嘗試重新載入畫面
            </button>
          </div>
        </div>
      );
    }
  }

  window.WealthUI = {
    Icon,
    useWealthStore,
    useHorizontalSwipe,
    useLongPress,
    QuickPopoverMenu,
    BottomSheet,
    KeypadProvider,
    useKeypad,
    NumericInput,
    SegmentedControl,
    Toast,
    EmergencyRecoveryBoundary
  };
})();
