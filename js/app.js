(() => {
      const { useState, useMemo, useRef } = React;
      const {
        Icons,
        useWealthStore,
        useHorizontalSwipe,
        useLongPress,
        QuickPopoverMenu,
        downloadFile,
        BottomSheet,
        SegmentedControl,
        Toast,
        OnboardingFlow,
        EmergencyRecoveryBoundary
      } = window.WealthUI;
      const Store = window.WealthStore;

      const ASSET_SUB_TABS = ['WALLET', 'CARDS', 'WEALTH'];

      function buildGitHubKitFiles() {
        const readModule = (name) => {
          const el = document.querySelector(`script[data-module="${name}"]`);
          return el ? el.textContent.trim() + '\n' : '';
        };

        const iconDataUri = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'%3E%3Crect width='180' height='180' rx='40' fill='%23000000'/%3E%3Crect x='22' y='22' width='136' height='136' rx='30' fill='%23111113' stroke='%23ffffff' stroke-opacity='0.14' stroke-width='2'/%3E%3Cpath d='M48 118 L74 62 L92 98 L112 62 L132 118' fill='none' stroke='%23ffffff' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='132' cy='58' r='8' fill='%2334D399'/%3E%3C/svg%3E";

        const manifestJson = JSON.stringify({
          name: 'Wealth 個人財務管理',
          short_name: 'Wealth',
          start_url: './index.html',
          display: 'standalone',
          background_color: '#000000',
          theme_color: '#000000',
          icons: [{ src: iconDataUri, sizes: '180x180', type: 'image/svg+xml' }]
        }, null, 2);

        const swJs = [
          "const CACHE_NAME = 'wealth-app-v1.9-stage0-r5';",
          "const CORE_ASSETS = ['./', './index.html', './manifest.json', './js/store.js', './js/ui.js', './js/app.js'];",
          "self.addEventListener('install', e => {",
          "  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));",
          "});",
          "self.addEventListener('activate', e => {",
          "  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));",
          "});",
          "self.addEventListener('fetch', e => {",
          "  if (e.request.method !== 'GET') return;",
          "  e.respondWith(fetch(e.request).then(res => {",
          "    const copy = res.clone();",
          "    caches.open(CACHE_NAME).then(c => c.put(e.request, copy));",
          "    return res;",
          "  }).catch(() => caches.match(e.request)));",
          "});"
        ].join('\n');

        const sClose = '<' + '/script>';
        const loaderHtml = [
          '<!DOCTYPE html>',
          '<html lang="zh-HK">',
          '<head>',
          '  <meta charset="UTF-8" />',
          '  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />',
          '  <meta name="apple-mobile-web-app-capable" content="yes" />',
          '  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
          '  <meta name="apple-mobile-web-app-title" content="Wealth" />',
          '  <meta name="theme-color" content="#000000" />',
          '  <title>Wealth — 個人財務管理</title>',
          '  <link rel="manifest" href="./manifest.json" />',
          '  <link rel="apple-touch-icon" href="' + iconDataUri + '" />',
          '  <script src="https://cdn.tailwindcss.com">' + sClose,
          '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap" rel="stylesheet" />',
          '  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin>' + sClose,
          '  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin>' + sClose,
          '  <script src="https://unpkg.com/@babel/standalone/babel.min.js">' + sClose,
          '  <style>',
          '    :root { --safe-top: env(safe-area-inset-top, 0px); --safe-bottom: env(safe-area-inset-bottom, 0px); --app-height: 100dvh; }',
          '    html, body, #root { margin: 0; padding: 0; width: 100%; height: var(--app-height, 100dvh); min-height: var(--app-height, 100dvh); overflow: hidden; background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, Inter, Noto Sans TC, sans-serif; -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; overscroll-behavior: none; }',
          '    input, select, textarea { font-size: 16px !important; -webkit-user-select: text; user-select: text; }',
          '    button { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }',
          '    .font-mono-num { font-family: "JetBrains Mono", monospace; font-variant-numeric: tabular-nums; }',
          '    .app-viewport { position: fixed; top: 0; left: 0; right: 0; width: 100%; height: var(--app-height, 100dvh); display: flex; flex-direction: column; overflow: hidden; background: #000; }',
          '    .app-overlay { position: fixed; top: 0; left: 0; right: 0; width: 100%; height: var(--app-height, 100dvh); }',
          '    .app-shell-frame { width: 100%; max-width: 440px; height: 100%; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; padding-top: var(--safe-top); position: relative; }',
          '    .app-scroll-main { flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }',
          '    .bottom-nav-safe { padding-top: 8px; padding-bottom: max(10px, var(--safe-bottom)); }',
          '    html.ios-standalone .bottom-nav-safe { padding-top: 8px; padding-bottom: max(22px, var(--safe-bottom)); }',
          '    .sheet-safe { padding-bottom: calc(var(--safe-bottom) + 20px); }',
          '    .snap-x-rail { scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }',
          '    .snap-x-item { scroll-snap-align: start; }',
          '    @keyframes slideUpSheet { from { transform: translateY(100%); opacity: 0.7; } to { transform: translateY(0); opacity: 1; } }',
          '    .animate-sheet-up { animation: slideUpSheet 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards; }',
          '    @keyframes popUpMenu { from { transform: scale(0.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }',
          '    .animate-pop-up { animation: popUpMenu 0.18s cubic-bezier(0.22, 1, 0.36, 1) forwards; }',
          '    @keyframes slideFromRight { from { transform: translateX(18px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }',
          '    .animate-slide-left { animation: slideFromRight 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards; }',
          '    @keyframes slideFromLeft { from { transform: translateX(-18px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }',
          '    .animate-slide-right { animation: slideFromLeft 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards; }',
          '    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
          '    .animate-fade { animation: fadeIn 0.22s ease forwards; }',
          '    ::-webkit-scrollbar { width: 0; height: 0; }',
          '  </style>',
          '</head>',
          '<body class="bg-black text-white select-none">',
          '  <script>',
          '    (function(){function u(){var a=navigator.userAgent||"",i=/iP(ad|hone|od)/.test(a)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1),s=window.navigator.standalone===true||(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches),r=document.documentElement;if(i&&s){r.classList.add("ios-standalone");var l=window.innerWidth>window.innerHeight,p=l?Math.min(window.screen.width,window.screen.height):Math.max(window.screen.width,window.screen.height),t=Math.max(window.innerHeight||0,p||0);if(t>0)r.style.setProperty("--app-height",t+"px");}else{r.classList.remove("ios-standalone");r.style.setProperty("--app-height","100dvh");}}u();window.addEventListener("resize",u);window.addEventListener("orientationchange",function(){setTimeout(u,120);});window.addEventListener("focusout",function(){setTimeout(u,180);});window.addEventListener("pageshow",u);})();',
          '  ' + sClose,
          '  <div id="root"></div>',
          '  <script src="./js/store.js">' + sClose,
          '  <script type="text/babel" src="./js/ui.js">' + sClose,
          '  <script type="text/babel" src="./js/app.js">' + sClose,
          '  <script>',
          "    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }",
          '  ' + sClose,
          '</body>',
          '</html>'
        ].join('\n');

        return [
          { path: 'index.html',    desc: 'GitHub Pages 載入外殼 (含 iOS Standalone 實體高度修正)', content: loaderHtml, mime: 'text/html;charset=utf-8;' },
          { path: 'manifest.json', desc: 'iPhone 主畫面 PWA 設定檔',                               content: manifestJson, mime: 'application/json;charset=utf-8;' },
          { path: 'sw.js',         desc: '離線快取 Service Worker (v1.9-r5)',                      content: swJs, mime: 'application/javascript;charset=utf-8;' },
          { path: 'js/store.js',   desc: 'Schema v1.9 狀態中心、回滾與視區診斷',                    content: readModule('js/store.js'), mime: 'application/javascript;charset=utf-8;' },
          { path: 'js/ui.js',      desc: '純黑設計系統、螢幕邊界自動鉗制長按與滑選選單元件',        content: readModule('js/ui.js'), mime: 'application/javascript;charset=utf-8;' },
          { path: 'js/app.js',     desc: '主導航外殼、左右滑動與單手快捷路由',                      content: readModule('js/app.js'), mime: 'application/javascript;charset=utf-8;' }
        ];
      }

      function QuickAddTestSheet({ state, initialType = 'EXPENSE', onClose, onSaved }) {
        const flatAccounts = useMemo(() => Store.getFlatAccounts(state), [state]);
        const cashAccounts = useMemo(() => flatAccounts.filter(a => a.kind !== 'CREDIT'), [flatAccounts]);
        const buckets = state.settings.buckets.filter(b => !b.archived);
        const [type, setType] = useState(initialType || 'EXPENSE');
        const [amount, setAmount] = useState('');
        const [title, setTitle] = useState('');
        const [counterparty, setCounterparty] = useState('');
        const [accountId, setAccountId] = useState(flatAccounts[0]?.id || '');
        const [toAccountId, setToAccountId] = useState(cashAccounts[1]?.id || cashAccounts[0]?.id || '');
        const [bucketId, setBucketId] = useState(buckets[0]?.id || 'PUBLIC');

        const activeAccountPool = type === 'TRANSFER' ? cashAccounts : flatAccounts;
        const selectedAcc = activeAccountPool.find(a => a.id === accountId) || activeAccountPool[0];
        const selectedToAcc = cashAccounts.find(a => a.id === toAccountId) || cashAccounts[0];

        const handleSubmit = (e) => {
          e.preventDefault();
          const num = Number(amount);
          if (!num || num <= 0 || !selectedAcc) return;
          if (type === 'TRANSFER' && (!selectedToAcc || selectedToAcc.id === selectedAcc.id)) return;

          const now = new Date();
          const defaultTitles = {
            EXPENSE: '日常消費',
            INCOME: '快速入帳',
            TRANSFER: `${selectedAcc.name} ➔ ${selectedToAcc?.name || ''}`,
            RECEIVABLE: counterparty.trim() ? `代墊 · ${counterparty.trim()}` : '應收代墊款項'
          };

          const tx = {
            id: 'tx_' + Date.now(),
            date: Store.todayISO(),
            time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            type,
            mainCatId: type === 'INCOME' ? 'cat_salary' : 'cat_food',
            subCatId: type === 'INCOME' ? 'sub_main_sal' : 'sub_dining',
            title: title.trim() || defaultTitles[type],
            merchant: '',
            bucketId,
            accountId: selectedAcc.id,
            toAccountId: type === 'TRANSFER' ? selectedToAcc.id : null,
            currency: selectedAcc.currency,
            amount: num,
            accountAmount: num,
            creditCycle: selectedAcc.kind === 'CREDIT' ? 'UNBILLED' : null,
            counterparty: type === 'RECEIVABLE' ? (counterparty.trim() || '未指定對象') : '',
            receivableMode: 'NEW',
            isLoanSettled: false,
            isLockedSettled: false,
            note: ''
          };

          const { warnings } = Store.saveTransaction(tx);
          onSaved(tx, warnings);
        };

        return (
          <BottomSheet title="記一筆" subtitle="階段 0 骨架驗證 · 階段 1 將升級為完整 MOZE 日曆與計算機記帳頁" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <SegmentedControl
                value={type}
                onChange={setType}
                options={[
                  { id: 'EXPENSE',    label: '支出' },
                  { id: 'INCOME',     label: '收入' },
                  { id: 'TRANSFER',   label: '轉帳' },
                  { id: 'RECEIVABLE', label: '應收' }
                ]}
              />

              <div className="space-y-1.5">
                <label className="text-xs text-[#8E8E93]">金額 ({selectedAcc?.currency || state.settings.baseCurrency})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full min-h-[52px] px-4 rounded-2xl bg-[#111113] border border-white/10 font-mono-num font-bold text-white focus:outline-none focus:border-white/35"
                />
              </div>

              {type === 'RECEIVABLE' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-[#8E8E93]">收款對象</label>
                  <input
                    type="text"
                    placeholder="例如：同事 A、朋友"
                    value={counterparty}
                    onChange={e => setCounterparty(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none focus:border-white/35"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-[#8E8E93]">項目名稱</label>
                <input
                  type="text"
                  placeholder={type === 'TRANSFER' ? '選填（預設顯示帳戶流向）' : '例如：午餐、交通'}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none focus:border-white/35"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8E8E93]">{type === 'TRANSFER' ? '轉出帳戶' : '帳戶'}</label>
                <select
                  value={selectedAcc?.id || ''}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none"
                >
                  {activeAccountPool.map(acc => (
                    <option key={acc.id} value={acc.id} className="bg-zinc-900">
                      {acc.displayName} ({Store.formatMoney(acc.balance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>

              {type === 'TRANSFER' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-[#8E8E93]">轉入帳戶</label>
                  <select
                    value={selectedToAcc?.id || ''}
                    onChange={e => setToAccountId(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none"
                  >
                    {cashAccounts.map(acc => (
                      <option key={acc.id} value={acc.id} className="bg-zinc-900">
                        {acc.displayName} ({Store.formatMoney(acc.balance, acc.currency)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-[#8E8E93]">資金池</label>
                <div data-no-swipe="true" className="flex gap-2 overflow-x-auto snap-x-rail pb-1">
                  {buckets.map(b => {
                    const sel = bucketId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBucketId(b.id)}
                        className={`snap-x-item shrink-0 min-h-[44px] px-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition ${
                          sel ? 'bg-white text-black border-white' : 'bg-[#111113] text-zinc-300 border-white/[0.08]'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                        <span>{b.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[52px] rounded-2xl bg-white text-black text-sm font-bold active:scale-[0.98] transition"
              >
                儲存並即時連動帳戶
              </button>
            </form>
          </BottomSheet>
        );
      }

      function DiagnosticsSheet({ state, onClose }) {
        const result = useMemo(() => Store.runConsistencyDiagnostics(state), [state]);

        return (
          <BottomSheet
            title="數據診斷與帳務自檢"
            subtitle={result.allPassed ? '全部核心規則與回滾驗證皆通過' : '偵測到異常項目，請檢查下方明細'}
            onClose={onClose}
          >
            <div className="space-y-2.5">
              {result.checks.map(c => (
                <div key={c.id} className="p-3.5 rounded-2xl bg-[#111113] border border-white/[0.07] flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{c.title}</div>
                    <div className="text-[11px] text-[#8E8E93] mt-1 font-mono-num break-all">{c.detail}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    c.pass ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    {c.pass ? '通過' : '異常'}
                  </span>
                </div>
              ))}
            </div>
          </BottomSheet>
        );
      }

      function GitHubKitSheet({ onClose, onNotify }) {
        const files = useMemo(() => buildGitHubKitFiles(), []);

        return (
          <BottomSheet
            title="GitHub 零編譯多檔匯出"
            subtitle="階段 0 r3 骨架檔案，可直接覆蓋上傳至 GitHub 倉庫"
            onClose={onClose}
          >
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.path} className="p-3.5 rounded-2xl bg-[#111113] border border-white/[0.07] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-mono-num font-bold text-white truncate">{f.path}</div>
                    <div className="text-[11px] text-[#8E8E93] mt-0.5 truncate">{f.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      downloadFile(f.path.split('/').pop(), f.content, f.mime);
                      onNotify(`已下載 ${f.path}`);
                    }}
                    className="min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
                  >
                    <Icons.Download />
                    <span>下載</span>
                  </button>
                </div>
              ))}
            </div>
          </BottomSheet>
        );
      }

      function WealthAppShell() {
        const state = useWealthStore();
        const [activeTab, setActiveTab] = useState('LEDGER');
        const [assetSubTab, setAssetSubTab] = useState('WALLET');
        const [assetSlideAnim, setAssetSlideAnim] = useState('animate-fade');
        const [hideMoney, setHideMoney] = useState(() => !!state.settings?.preferences?.hideBalancesOnLaunch);
        const [quickAddState, setQuickAddState] = useState({ open: false, initialType: 'EXPENSE' });
        const [quickMenu, setQuickMenu] = useState(null); // null | 'ASSETS' | 'ADD'
        const [hoveredQuickItem, setHoveredQuickItem] = useState(null);
        const [showDiagnostics, setShowDiagnostics] = useState(false);
        const [showGitHubKit, setShowGitHubKit] = useState(false);
        const [toastMsg, setToastMsg] = useState('');
        const toastRef = useRef(null);
        const fileInputRef = useRef(null);
        const scrollMainRef = useRef(null);

        const notify = (msg) => {
          setToastMsg(msg);
          if (toastRef.current) clearTimeout(toastRef.current);
          toastRef.current = setTimeout(() => setToastMsg(''), 3000);
        };

        const selectAssetSubTab = (nextId, dir = null) => {
          const curIdx = ASSET_SUB_TABS.indexOf(assetSubTab);
          const nextIdx = ASSET_SUB_TABS.indexOf(nextId);
          if (dir === 'LEFT' || (dir === null && nextIdx > curIdx)) {
            setAssetSlideAnim('animate-slide-left');
          } else if (dir === 'RIGHT' || (dir === null && nextIdx < curIdx)) {
            setAssetSlideAnim('animate-slide-right');
          } else {
            setAssetSlideAnim('animate-fade');
          }
          setAssetSubTab(nextId);
        };

        // 偵測手指滑動停留在哪一個快捷選單欄目上方
        const detectQuickItemAtPoint = (x, y) => {
          const el = document.elementFromPoint(x, y);
          const btn = el && el.closest ? el.closest('[data-quick-item-id]') : null;
          return btn ? btn.getAttribute('data-quick-item-id') : null;
        };

        // 執行快捷選單項目動作（同時供「點選」與「長按滑選」共用）
        const runQuickMenuAction = (menuType, itemId) => {
          if (menuType === 'ASSETS') {
            setActiveTab('ASSETS');
            selectAssetSubTab(itemId);
            if (scrollMainRef.current) scrollMainRef.current.scrollTop = 0;
          } else if (menuType === 'ADD') {
            setQuickAddState({ open: true, initialType: itemId });
          }
        };

        const assetSwipeHandlers = useHorizontalSwipe({
          enabled: activeTab === 'ASSETS',
          onSwipeLeft: () => {
            const idx = ASSET_SUB_TABS.indexOf(assetSubTab);
            if (idx < ASSET_SUB_TABS.length - 1) {
              selectAssetSubTab(ASSET_SUB_TABS[idx + 1], 'LEFT');
            }
          },
          onSwipeRight: () => {
            const idx = ASSET_SUB_TABS.indexOf(assetSubTab);
            if (idx > 0) {
              selectAssetSubTab(ASSET_SUB_TABS[idx - 1], 'RIGHT');
            }
          }
        });

        // 底部「資產」按鈕：短按進入/循環；長按彈出選單（原地鬆手停留可點，或直接滑到項目鬆手）
        const assetsNavPress = useLongPress({
          onTap: () => {
            if (activeTab === 'ASSETS') {
              const idx = ASSET_SUB_TABS.indexOf(assetSubTab);
              const next = ASSET_SUB_TABS[(idx + 1) % ASSET_SUB_TABS.length];
              selectAssetSubTab(next, 'LEFT');
            } else {
              setActiveTab('ASSETS');
              if (scrollMainRef.current) scrollMainRef.current.scrollTop = 0;
            }
          },
          onLongPress: () => {
            setHoveredQuickItem(null);
            setQuickMenu('ASSETS');
          },
          onLongDragMove: (x, y) => {
            setHoveredQuickItem(detectQuickItemAtPoint(x, y));
          },
          onLongDragEnd: (x, y) => {
            const hitId = detectQuickItemAtPoint(x, y);
            setHoveredQuickItem(null);
            if (hitId) {
              runQuickMenuAction('ASSETS', hitId);
              setQuickMenu(null);
            }
            // 若手指未滑到任何欄目上而原地鬆手，選單會穩穩保持開啟等待點選
          }
        });

        // 底部置中「＋」按鈕：短按記支出；長按彈出快速類型選單
        const addNavPress = useLongPress({
          onTap: () => setQuickAddState({ open: true, initialType: 'EXPENSE' }),
          onLongPress: () => {
            setHoveredQuickItem(null);
            setQuickMenu('ADD');
          },
          onLongDragMove: (x, y) => {
            setHoveredQuickItem(detectQuickItemAtPoint(x, y));
          },
          onLongDragEnd: (x, y) => {
            const hitId = detectQuickItemAtPoint(x, y);
            setHoveredQuickItem(null);
            if (hitId) {
              runQuickMenuAction('ADD', hitId);
              setQuickMenu(null);
            }
          }
        });

        if (!state.onboardingCompleted) {
          return (
            <OnboardingFlow
              onComplete={(curr, mode) => {
                Store.completeOnboarding(curr, mode);
                notify(mode === 'DEMO' ? `已建立 ${curr} 通用範例帳本` : `已建立 ${curr} 全新空白帳本`);
              }}
            />
          );
        }

        const baseCurr = state.settings.baseCurrency || 'MOP';
        const nw = Store.computeNetWorthSummary(state);
        const pendingLoansCount = (state.transactions || []).filter(
          t => (t.type === 'RECEIVABLE' || t.type === 'PAYABLE') && !t.isLoanSettled
        ).length;

        const handleBackupExport = () => {
          downloadFile(
            `Wealth_Backup_${Store.todayISO()}.json`,
            JSON.stringify(state, null, 2),
            'application/json;charset=utf-8;'
          );
          Store.setState(prev => ({
            ...prev,
            settings: { ...prev.settings, lastBackupAt: new Date().toLocaleString('zh-HK', { hour12: false }).slice(0, 16) }
          }));
          notify('已下載完整帳本 JSON 備份');
        };

        const handleBackupImport = (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              Store.importFullBackup(JSON.parse(evt.target.result));
              notify('已成功還原帳本備份');
            } catch (err) {
              notify('匯入失敗：備份檔格式無效');
            }
          };
          reader.readAsText(file);
          e.target.value = '';
        };

        const switchPrimaryTab = (tabId) => {
          setActiveTab(tabId);
          if (scrollMainRef.current) scrollMainRef.current.scrollTop = 0;
        };

        return (
          <div className="app-viewport">
            <div className="app-shell-frame bg-black text-white">
              <Toast message={toastMsg} />

              <main
                ref={scrollMainRef}
                {...assetSwipeHandlers}
                className="app-scroll-main px-4 pt-4 pb-6 space-y-5"
              >
                {/* ==================== 分頁 1：明細 ==================== */}
                {activeTab === 'LEDGER' && (
                  <div className="space-y-4 animate-fade">
                    <header className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h1 className="text-[22px] font-bold tracking-tight">明細</h1>
                        {pendingLoansCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[11px] font-semibold text-amber-300">
                            待收 {pendingLoansCount} 筆
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setHideMoney(!hideMoney)}
                        className="w-10 h-10 rounded-full bg-[#161618] border border-white/[0.07] text-zinc-400 hover:text-white flex items-center justify-center transition"
                        aria-label="切換金額顯示"
                      >
                        {hideMoney ? <Icons.EyeOff /> : <Icons.Eye />}
                      </button>
                    </header>

                    <section className="p-4 rounded-3xl bg-[#111113] border border-white/[0.07] flex items-center justify-between">
                      <div>
                        <div className="text-xs text-[#8E8E93]">總淨資產</div>
                        <div className="text-2xl font-bold font-mono-num mt-0.5">
                          {Store.formatMoney(nw.netWorth, baseCurr, hideMoney)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-[#8E8E93]">可動用現金</div>
                        <div className="text-sm font-mono-num font-semibold text-emerald-400 mt-0.5">
                          {Store.formatMoney(nw.liquidCash, baseCurr, hideMoney)}
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2.5">
                      <div className="flex items-center justify-between px-0.5">
                        <h2 className="text-xs font-semibold text-[#8E8E93]">最近紀錄 ({state.transactions.length})</h2>
                        <span className="text-[11px] text-[#636366]">階段 1 將接上完整日曆明細</span>
                      </div>

                      {state.transactions.length === 0 ? (
                        <div className="py-14 rounded-3xl bg-[#111113] border border-white/[0.06] text-center space-y-2">
                          <div className="text-sm font-semibold text-zinc-300">尚無交易紀錄</div>
                          <div className="text-xs text-[#8E8E93]">點擊底部中央「＋」立即記錄第一筆</div>
                        </div>
                      ) : (
                        <div className="rounded-3xl bg-[#111113] border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
                          {state.transactions.map(tx => {
                            const bucket = state.settings.buckets.find(b => b.id === tx.bucketId);
                            const acc = Store.getFlatAccounts(state).find(a => a.id === tx.accountId);
                            return (
                              <div key={tx.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bucket?.color || '#38BDF8' }} />
                                    <span className="text-sm font-semibold text-white truncate">{tx.title}</span>
                                    {tx.type === 'RECEIVABLE' && !tx.isLoanSettled && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-[10px] font-semibold text-amber-300 shrink-0">
                                        待收
                                      </span>
                                    )}
                                    {tx.type === 'TRANSFER' && (
                                      <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-[10px] font-semibold text-sky-300 shrink-0">
                                        轉帳
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#8E8E93] mt-0.5 truncate">
                                    {acc?.name || '帳戶'} · {tx.date.slice(5)} {tx.time}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span className={`text-sm font-bold font-mono-num ${
                                    tx.type === 'INCOME'
                                      ? 'text-emerald-400'
                                      : tx.type === 'TRANSFER'
                                      ? 'text-sky-400'
                                      : tx.type === 'RECEIVABLE'
                                      ? 'text-amber-300'
                                      : 'text-white'
                                  }`}>
                                    {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '' : '-'}{Store.formatMoney(tx.amount, tx.currency, hideMoney)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      Store.deleteTransaction(tx.id);
                                      notify('已刪除並精準回滾帳戶餘額');
                                    }}
                                    className="w-7 h-7 rounded-full bg-white/[0.06] text-zinc-400 hover:text-rose-400 flex items-center justify-center"
                                    title="測試刪除回滾"
                                  >
                                    <Icons.X />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {/* ==================== 分頁 2：資產 ==================== */}
                {activeTab === 'ASSETS' && (
                  <div className="space-y-4 animate-fade min-h-full">
                    <header className="flex items-center justify-between">
                      <h1 className="text-[22px] font-bold tracking-tight">資產</h1>
                      <button
                        type="button"
                        onClick={() => setHideMoney(!hideMoney)}
                        className="w-10 h-10 rounded-full bg-[#161618] border border-white/[0.07] text-zinc-400 hover:text-white flex items-center justify-center"
                      >
                        {hideMoney ? <Icons.EyeOff /> : <Icons.Eye />}
                      </button>
                    </header>

                    <SegmentedControl
                      value={assetSubTab}
                      onChange={(id) => selectAssetSubTab(id)}
                      options={[
                        { id: 'WALLET', label: '銀包' },
                        { id: 'CARDS',  label: '信用卡' },
                        { id: 'WEALTH', label: '定存投資' }
                      ]}
                    />

                    <div key={assetSubTab} className={assetSlideAnim}>
                      {assetSubTab === 'WALLET' && (
                        <div className="space-y-3">
                          <div className="p-4 rounded-3xl bg-[#111113] border border-white/[0.07] flex items-center justify-between">
                            <div>
                              <div className="text-xs text-[#8E8E93]">活期與錢包可用</div>
                              <div className="text-2xl font-bold font-mono-num mt-0.5">
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

                          <div className="rounded-3xl bg-[#111113] border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
                            {state.walletCards.map(card => (
                              <div key={card.id} className="p-4 flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-white">{card.institution}</div>
                                  <div className="text-xs text-[#8E8E93] mt-0.5">
                                    {card.accounts.map(a => a.currency).join(' / ')} · {card.accounts[0]?.name}
                                  </div>
                                </div>
                                <div className="text-right font-mono-num">
                                  <div className="text-sm font-bold text-white">
                                    {Store.formatMoney(card.accounts[0]?.balance, card.accounts[0]?.currency, hideMoney)}
                                  </div>
                                  {card.accounts[0]?.subBuckets?.some(s => s.isFrozen) && (
                                    <div className="text-[10px] text-[#8E8E93] mt-0.5">含凍結底倉</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {assetSubTab === 'CARDS' && (
                        <div className="space-y-3">
                          {state.creditCards.length === 0 ? (
                            <div className="py-12 rounded-3xl bg-[#111113] border border-white/[0.06] text-center text-xs text-[#8E8E93]">
                              尚未新增信用卡
                            </div>
                          ) : (
                            state.creditCards.map(cc => {
                              const cycle = Store.computeDynamicCardCycle(cc.billingDay, cc.dueDay);
                              const curr = Object.keys(cc.statements)[0] || baseCurr;
                              const st = cc.statements[curr];
                              return (
                                <div key={cc.id} className="p-4 rounded-3xl bg-[#111113] border border-white/[0.07] space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-zinc-400"><Icons.CreditCard /></span>
                                      <span className="text-sm font-bold text-white">{cc.name}</span>
                                      <span className="text-xs font-mono-num text-[#8E8E93]">•••• {cc.last4}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono-num font-semibold ${
                                      st.isSettled || st.billedAmount === 0
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : cycle.daysUntilDue <= 5
                                        ? 'bg-rose-500/20 text-rose-300'
                                        : 'bg-white/[0.08] text-zinc-200'
                                    }`}>
                                      {st.isSettled || st.billedAmount === 0
                                        ? '已結清'
                                        : cycle.daysUntilDue < 0
                                        ? `逾期 ${Math.abs(cycle.daysUntilDue)} 天`
                                        : cycle.daysUntilDue === 0
                                        ? '今日到期'
                                        : `剩 ${cycle.daysUntilDue} 天`}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-2xl bg-black/45 border border-white/[0.05]">
                                      <div className="text-[10px] text-[#8E8E93]">本期應繳</div>
                                      <div className="text-sm font-bold font-mono-num mt-0.5">
                                        {Store.formatMoney(st.billedAmount, curr, hideMoney)}
                                      </div>
                                      <div className="text-[10px] font-mono-num text-[#636366] mt-0.5">{cycle.billedRange}</div>
                                    </div>
                                    <div className="p-2.5 rounded-2xl bg-black/45 border border-white/[0.05]">
                                      <div className="text-[10px] text-[#8E8E93]">進行中下期</div>
                                      <div className="text-sm font-bold font-mono-num mt-0.5">
                                        {Store.formatMoney(st.unbilledAmount, curr, hideMoney)}
                                      </div>
                                      <div className="text-[10px] font-mono-num text-[#636366] mt-0.5">{cycle.unbilledRange}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {assetSubTab === 'WEALTH' && (
                        <div className="space-y-3">
                          <div className="p-4 rounded-3xl bg-[#111113] border border-white/[0.07] flex items-center justify-between">
                            <div>
                              <div className="text-xs text-[#8E8E93]">投資持倉總市值</div>
                              <div className="text-2xl font-bold font-mono-num mt-0.5">
                                {Store.formatMoney(nw.investments, baseCurr, hideMoney)}
                              </div>
                            </div>
                            <span className="text-emerald-400"><Icons.TrendingUp /></span>
                          </div>
                          <div className="p-4 rounded-3xl bg-[#111113] border border-white/[0.07] flex items-center justify-between text-xs">
                            <span className="text-[#8E8E93]">進行中定期存款</span>
                            <span className="font-mono-num font-bold text-white">{state.timeDeposits.length} 筆</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 pt-2">
                      {ASSET_SUB_TABS.map(id => (
                        <span
                          key={id}
                          className={`h-1 rounded-full transition-all ${
                            assetSubTab === id ? 'w-4 bg-white/70' : 'w-1.5 bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ==================== 分頁 3：報表 ==================== */}
                {activeTab === 'REPORT' && (
                  <div className="space-y-4 animate-fade">
                    <header className="flex items-center justify-between">
                      <h1 className="text-[22px] font-bold tracking-tight">報表</h1>
                      <button
                        type="button"
                        onClick={() => setHideMoney(!hideMoney)}
                        className="w-10 h-10 rounded-full bg-[#161618] border border-white/[0.07] text-zinc-400 hover:text-white flex items-center justify-center"
                      >
                        {hideMoney ? <Icons.EyeOff /> : <Icons.Eye />}
                      </button>
                    </header>

                    <section className="p-5 rounded-3xl bg-[#111113] border border-white/[0.07] space-y-3">
                      <div className="text-xs text-[#8E8E93]">總淨資產</div>
                      <div className="text-3xl font-bold font-mono-num">
                        {Store.formatMoney(nw.netWorth, baseCurr, hideMoney)}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06] text-xs">
                        <div>
                          <div className="text-[#8E8E93]">總資產</div>
                          <div className="font-mono-num font-semibold text-white mt-0.5">
                            {Store.formatMoney(nw.grossAssets, baseCurr, hideMoney)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#8E8E93]">信用卡未繳</div>
                          <div className="font-mono-num font-semibold text-rose-400 mt-0.5">
                            -{Store.formatMoney(nw.debt, baseCurr, hideMoney)}
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="p-4 rounded-3xl bg-[#111113] border border-white/[0.06] text-xs text-[#8E8E93] leading-relaxed">
                      階段 3 將完整接通 MOZE 包含／排除篩選、資金池⇄類別雙向拆解、投資與定存深度圖表，以及 CSV／Markdown 報表匯出。
                    </div>
                  </div>
                )}

                {/* ==================== 分頁 4：設定 ==================== */}
                {activeTab === 'SETTINGS' && (
                  <div className="space-y-5 animate-fade">
                    <header className="flex items-center justify-between">
                      <h1 className="text-[22px] font-bold tracking-tight">設定</h1>
                    </header>

                    <section className="space-y-2">
                      <h2 className="text-[11px] font-semibold text-[#8E8E93] px-1">數據安全與診斷</h2>
                      <div className="rounded-3xl bg-[#111113] border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowDiagnostics(true)}
                          className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                              <Icons.Shield />
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-white">帳務一致性與視區診斷</div>
                              <div className="text-[11px] text-[#8E8E93]">檢查數值、ID 參照、回滾與 PWA 螢幕高度</div>
                            </div>
                          </div>
                          <span className="text-[#636366]"><Icons.ChevronRight /></span>
                        </button>

                        <button
                          type="button"
                          onClick={handleBackupExport}
                          className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                              <Icons.Download />
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-white">匯出整機 JSON 備份</div>
                              <div className="text-[11px] text-[#8E8E93] font-mono-num">
                                {state.settings.lastBackupAt ? `上次備份 ${state.settings.lastBackupAt}` : '尚未匯出備份'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[#636366]"><Icons.ChevronRight /></span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                              <Icons.Refresh />
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-white">從 JSON 備份檔還原</div>
                              <div className="text-[11px] text-[#8E8E93]">自動執行無損版本遷移</div>
                            </div>
                          </div>
                          <span className="text-[#636366]"><Icons.ChevronRight /></span>
                        </button>
                        <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleBackupImport} className="hidden" />
                      </div>
                    </section>

                    <section className="space-y-2">
                      <h2 className="text-[11px] font-semibold text-[#8E8E93] px-1">GitHub 部署與階段驗證</h2>
                      <div className="rounded-3xl bg-[#111113] border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowGitHubKit(true)}
                          className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-2xl bg-white/10 text-white flex items-center justify-center">
                              <Icons.Code />
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-white">匯出 GitHub 零編譯多檔結構</div>
                              <div className="text-[11px] text-[#8E8E93]">下載 index.html、manifest、sw 與 js/*</div>
                            </div>
                          </div>
                          <span className="text-[#636366]"><Icons.ChevronRight /></span>
                        </button>

                        <button
                          type="button"
                          onClick={() => Store.resetToOnboarding()}
                          className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition"
                        >
                          <span className="text-sm font-semibold text-amber-300">重新體驗首次 2 步驟引導</span>
                          <span className="text-[#636366]"><Icons.ChevronRight /></span>
                        </button>
                      </div>
                    </section>

                    <div className="text-center text-[11px] font-mono-num text-[#636366] pt-2">
                      Wealth v{Store.SCHEMA_VERSION} · Stage 0 r5 · Rev #{state.revision}
                    </div>
                  </div>
                )}
              </main>

              {/* =====================================================
                  方案 A：緊貼 iPhone 14 物理底緣的 5 格導航列
                 ===================================================== */}
              <nav className="shrink-0 z-30 w-full bg-[#0B0B0D]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 bottom-nav-safe grid grid-cols-5 items-end">
                <button
                  type="button"
                  onClick={() => switchPrimaryTab('LEDGER')}
                  className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    activeTab === 'LEDGER' ? 'text-white' : 'text-[#636366] hover:text-zinc-300'
                  }`}
                >
                  <Icons.Ledger active={activeTab === 'LEDGER'} />
                  <span className="text-[10px] font-semibold leading-none">明細</span>
                </button>

                <button
                  type="button"
                  {...assetsNavPress}
                  className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    activeTab === 'ASSETS' ? 'text-white' : 'text-[#636366] hover:text-zinc-300'
                  }`}
                >
                  <Icons.Assets active={activeTab === 'ASSETS'} />
                  <span className="text-[10px] font-semibold leading-none">資產</span>
                </button>

                <div className="flex flex-col items-center justify-center -mt-1.5">
                  <button
                    type="button"
                    {...addNavPress}
                    className="h-11 px-4 rounded-2xl bg-white text-black shadow-[0_4px_18px_rgba(255,255,255,0.22)] flex items-center justify-center active:scale-90 transition"
                    aria-label="記一筆（長按可選快捷類型）"
                  >
                    <Icons.Plus />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => switchPrimaryTab('REPORT')}
                  className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    activeTab === 'REPORT' ? 'text-white' : 'text-[#636366] hover:text-zinc-300'
                  }`}
                >
                  <Icons.Report active={activeTab === 'REPORT'} />
                  <span className="text-[10px] font-semibold leading-none">報表</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchPrimaryTab('SETTINGS')}
                  className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    activeTab === 'SETTINGS' ? 'text-white' : 'text-[#636366] hover:text-zinc-300'
                  }`}
                >
                  <Icons.Settings active={activeTab === 'SETTINGS'} />
                  <span className="text-[10px] font-semibold leading-none">設定</span>
                </button>
              </nav>

              {/* 長按底部「資產」快捷選單 */}
              {quickMenu === 'ASSETS' && (
                <QuickPopoverMenu
                  align="left"
                  title="快速切換資產視角"
                  hoveredItemId={hoveredQuickItem}
                  onClose={() => {
                    setHoveredQuickItem(null);
                    setQuickMenu(null);
                  }}
                  items={[
                    {
                      id: 'WALLET',
                      label: '銀包帳戶',
                      icon: <Icons.Wallet />,
                      active: activeTab === 'ASSETS' && assetSubTab === 'WALLET',
                      onSelect: () => runQuickMenuAction('ASSETS', 'WALLET')
                    },
                    {
                      id: 'CARDS',
                      label: '信用卡與找數',
                      icon: <Icons.CreditCard />,
                      active: activeTab === 'ASSETS' && assetSubTab === 'CARDS',
                      onSelect: () => runQuickMenuAction('ASSETS', 'CARDS')
                    },
                    {
                      id: 'WEALTH',
                      label: '定存與投資',
                      icon: <Icons.TrendingUp />,
                      active: activeTab === 'ASSETS' && assetSubTab === 'WEALTH',
                      onSelect: () => runQuickMenuAction('ASSETS', 'WEALTH')
                    }
                  ]}
                />
              )}

              {/* 長按底部置中「＋」快捷選單 */}
              {quickMenu === 'ADD' && (
                <QuickPopoverMenu
                  align="center"
                  title="快速記帳類型"
                  hoveredItemId={hoveredQuickItem}
                  onClose={() => {
                    setHoveredQuickItem(null);
                    setQuickMenu(null);
                  }}
                  items={[
                    {
                      id: 'EXPENSE',
                      label: '記支出',
                      icon: <Icons.ArrowUpRight />,
                      iconClass: 'text-rose-400',
                      onSelect: () => runQuickMenuAction('ADD', 'EXPENSE')
                    },
                    {
                      id: 'INCOME',
                      label: '記收入',
                      icon: <Icons.ArrowDownLeft />,
                      iconClass: 'text-emerald-400',
                      onSelect: () => runQuickMenuAction('ADD', 'INCOME')
                    },
                    {
                      id: 'TRANSFER',
                      label: '帳戶轉帳',
                      icon: <Icons.ArrowLeftRight />,
                      iconClass: 'text-sky-400',
                      onSelect: () => runQuickMenuAction('ADD', 'TRANSFER')
                    },
                    {
                      id: 'RECEIVABLE',
                      label: '應收代墊',
                      icon: <Icons.Users />,
                      iconClass: 'text-amber-300',
                      onSelect: () => runQuickMenuAction('ADD', 'RECEIVABLE')
                    }
                  ]}
                />
              )}

              {quickAddState.open && (
                <QuickAddTestSheet
                  state={state}
                  initialType={quickAddState.initialType}
                  onClose={() => setQuickAddState(prev => ({ ...prev, open: false }))}
                  onSaved={(tx, warnings) => {
                    setQuickAddState(prev => ({ ...prev, open: false }));
                    if (warnings.length > 0) {
                      notify(`已記帳 · 注意：${warnings[0]}`);
                    } else {
                      notify(`已記帳 ${Store.formatMoney(tx.amount, tx.currency)} 並即時更新餘額`);
                    }
                  }}
                />
              )}

              {showDiagnostics && (
                <DiagnosticsSheet state={state} onClose={() => setShowDiagnostics(false)} />
              )}

              {showGitHubKit && (
                <GitHubKitSheet onClose={() => setShowGitHubKit(false)} onNotify={notify} />
              )}
            </div>
          </div>
        );
      }

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(
        <EmergencyRecoveryBoundary>
          <WealthAppShell />
        </EmergencyRecoveryBoundary>
      );
    })();
