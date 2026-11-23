(() => {
      const { useState, useMemo, useRef } = React;
      const { Icons, useWealthStore, downloadFile, BottomSheet, SegmentedControl, Toast, OnboardingFlow, EmergencyRecoveryBoundary } = window.WealthUI;
      const Store = window.WealthStore;

      // 生成 GitHub Pages 零編譯多檔案部署檔案內容（零重複程式碼，直接抽取 DOM 內的模組腳本）
      function buildGitHubKitFiles() {
        const readModule = (name) => {
          const el = document.querySelector(`script[data-module="${name}"]`);
          return el ? el.textContent.trim() + '\n' : '';
        };

        const manifestJson = JSON.stringify({
          name: 'Wealth 個人財務管理',
          short_name: 'Wealth',
          start_url: './index.html',
          display: 'standalone',
          background_color: '#000000',
          theme_color: '#000000',
          icons: [
            {
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'%3E%3Crect width='180' height='180' rx='40' fill='%23000000'/%3E%3Crect x='22' y='22' width='136' height='136' rx='30' fill='%23111113' stroke='%23ffffff' stroke-opacity='0.14' stroke-width='2'/%3E%3Cpath d='M48 118 L74 62 L92 98 L112 62 L132 118' fill='none' stroke='%23ffffff' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='132' cy='58' r='8' fill='%2334D399'/%3E%3C/svg%3E",
              sizes: '180x180',
              type: 'image/svg+xml'
            }
          ]
        }, null, 2);

        const swJs = [
          "const CACHE_NAME = 'wealth-app-v1.9-stage0';",
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
          '  <script src="https://cdn.tailwindcss.com">' + sClose,
          '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap" rel="stylesheet" />',
          '  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin>' + sClose,
          '  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin>' + sClose,
          '  <script src="https://unpkg.com/@babel/standalone/babel.min.js">' + sClose,
          '  <style>',
          '    :root { --safe-top: env(safe-area-inset-top, 0px); --safe-bottom: env(safe-area-inset-bottom, 0px); }',
          '    html, body { margin: 0; padding: 0; background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, Inter, Noto Sans TC, sans-serif; overscroll-behavior-y: none; min-height: 100dvh; }',
          '    input, select, textarea { font-size: 16px !important; }',
          '    .font-mono-num { font-family: "JetBrains Mono", monospace; font-variant-numeric: tabular-nums; }',
          '    .app-shell { min-height: 100dvh; padding-top: var(--safe-top); }',
          '    .bottom-nav-safe { padding-bottom: calc(var(--safe-bottom) + 8px); }',
          '    .sheet-safe { padding-bottom: calc(var(--safe-bottom) + 22px); }',
          '    @keyframes slideUpSheet { from { transform: translateY(100%); opacity: 0.7; } to { transform: translateY(0); opacity: 1; } }',
          '    .animate-sheet-up { animation: slideUpSheet 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards; }',
          '    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
          '    .animate-fade { animation: fadeIn 0.22s ease forwards; }',
          '    ::-webkit-scrollbar { width: 0; height: 0; }',
          '  </style>',
          '</head>',
          '<body class="bg-black text-white select-none">',
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
          { path: 'index.html',    desc: 'GitHub Pages 零編譯載入外殼 (~45 行)', content: loaderHtml, mime: 'text/html;charset=utf-8;' },
          { path: 'manifest.json', desc: 'iPhone 主畫面 PWA 設定檔',            content: manifestJson, mime: 'application/json;charset=utf-8;' },
          { path: 'sw.js',         desc: '離線快取 Service Worker',              content: swJs, mime: 'application/javascript;charset=utf-8;' },
          { path: 'js/store.js',   desc: 'Schema v1.9 狀態中心、回滾與診斷引擎',  content: readModule('js/store.js'), mime: 'application/javascript;charset=utf-8;' },
          { path: 'js/ui.js',      desc: '純黑設計系統、SVG 圖標與引導元件',     content: readModule('js/ui.js'), mime: 'application/javascript;charset=utf-8;' },
          { path: 'js/app.js',     desc: '主導航外殼與分頁路由',                 content: readModule('js/app.js'), mime: 'application/javascript;charset=utf-8;' }
        ];
      }

      // 階段 0 置中「＋」快速記帳驗證抽屜（驗證 16px 防縮放輸入框 ＋ 寫入 Store 即時連動餘額與凍結提醒）
      function QuickAddTestSheet({ state, onClose, onSaved }) {
        const flatAccounts = useMemo(() => Store.getFlatAccounts(state), [state]);
        const buckets = state.settings.buckets.filter(b => !b.archived);
        const [type, setType] = useState('EXPENSE');
        const [amount, setAmount] = useState('');
        const [title, setTitle] = useState('');
        const [accountId, setAccountId] = useState(flatAccounts[0]?.id || '');
        const [bucketId, setBucketId] = useState(buckets[0]?.id || 'PUBLIC');

        const selectedAcc = flatAccounts.find(a => a.id === accountId);

        const handleSubmit = (e) => {
          e.preventDefault();
          const num = Number(amount);
          if (!num || num <= 0 || !selectedAcc) return;

          const now = new Date();
          const tx = {
            id: 'tx_' + Date.now(),
            date: Store.todayISO(),
            time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            type,
            mainCatId: type === 'INCOME' ? 'cat_salary' : 'cat_food',
            subCatId: type === 'INCOME' ? 'sub_main_sal' : 'sub_dining',
            title: title.trim() || (type === 'INCOME' ? '快速入帳' : '日常消費'),
            merchant: '',
            bucketId,
            accountId: selectedAcc.id,
            toAccountId: null,
            currency: selectedAcc.currency,
            amount: num,
            accountAmount: num,
            creditCycle: selectedAcc.kind === 'CREDIT' ? 'UNBILLED' : null,
            counterparty: '',
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
                  { id: 'EXPENSE', label: '支出' },
                  { id: 'INCOME',  label: '收入' }
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

              <div className="space-y-1.5">
                <label className="text-xs text-[#8E8E93]">項目名稱</label>
                <input
                  type="text"
                  placeholder="例如：午餐、交通"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none focus:border-white/35"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8E8E93]">帳戶</label>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-[#111113] border border-white/10 text-white focus:outline-none"
                >
                  {flatAccounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="bg-zinc-900">
                      {acc.displayName} ({Store.formatMoney(acc.balance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8E8E93]">資金池</label>
                <div className="flex gap-2 overflow-x-auto snap-x-rail pb-1">
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

      // 內建帳務一致性診斷抽屜
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
                    <div className="text-[11px] text-[#8E8E93] mt-1 font-mono-num">{c.detail}</div>
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

      // GitHub 零編譯多檔案結構匯出抽屜
      function GitHubKitSheet({ onClose, onNotify }) {
        const files = useMemo(() => buildGitHubKitFiles(), []);

        return (
          <BottomSheet
            title="GitHub 零編譯多檔匯出"
            subtitle="階段 0 骨架檔案，可直接上傳至 GitHub 倉庫啟用 Pages"
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

      // 主應用外殼
      function WealthAppShell() {
        const state = useWealthStore();
        const [activeTab, setActiveTab] = useState('LEDGER'); // LEDGER | ASSETS | REPORT | SETTINGS
        const [assetSubTab, setAssetSubTab] = useState('WALLET'); // WALLET | CARDS | WEALTH
        const [hideMoney, setHideMoney] = useState(() => !!state.settings?.preferences?.hideBalancesOnLaunch);
        const [showQuickAdd, setShowQuickAdd] = useState(false);
        const [showDiagnostics, setShowDiagnostics] = useState(false);
        const [showGitHubKit, setShowGitHubKit] = useState(false);
        const [toastMsg, setToastMsg] = useState('');
        const toastRef = useRef(null);
        const fileInputRef = useRef(null);

        const notify = (msg) => {
          setToastMsg(msg);
          if (toastRef.current) clearTimeout(toastRef.current);
          toastRef.current = setTimeout(() => setToastMsg(''), 3000);
        };

        // 若尚未完成首次 2 步驟引導，顯示 Onboarding
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

        return (
          <div className="app-shell max-w-[440px] mx-auto flex flex-col bg-black text-white relative">
            <Toast message={toastMsg} />

            {/* =====================================================
                主內容滾動視區（底部預留導航安全間距）
               ===================================================== */}
            <main className="flex-1 px-4 pt-4 pb-28 space-y-5">

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

                  {/* 階段 0 即時連結狀態卡 */}
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

                  {/* 即時帳目清單（點擊置中 ＋ 新增會立刻出現並扣減餘額） */}
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
                                </div>
                                <div className="text-[11px] text-[#8E8E93] mt-0.5 truncate">
                                  {acc?.name || '帳戶'} · {tx.date.slice(5)} {tx.time}
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className={`text-sm font-bold font-mono-num ${
                                  tx.type === 'INCOME' ? 'text-emerald-400' : tx.type === 'RECEIVABLE' ? 'text-amber-300' : 'text-white'
                                }`}>
                                  {tx.type === 'INCOME' ? '+' : '-'}{Store.formatMoney(tx.amount, tx.currency, hideMoney)}
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

              {/* ==================== 分頁 2：資產 (三段切換：銀包 / 信用卡 / 定存投資) ==================== */}
              {activeTab === 'ASSETS' && (
                <div className="space-y-4 animate-fade">
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

                  {/* 方案 A 資產 3 格原生分段切換 */}
                  <SegmentedControl
                    value={assetSubTab}
                    onChange={setAssetSubTab}
                    options={[
                      { id: 'WALLET', label: '銀包' },
                      { id: 'CARDS',  label: '信用卡' },
                      { id: 'WEALTH', label: '定存投資' }
                    ]}
                  />

                  {assetSubTab === 'WALLET' && (
                    <div className="space-y-3 animate-fade">
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
                      <p className="text-[11px] text-[#636366] text-center pt-1">階段 1 將接入完整 Apple Wallet 層疊卡包與份額滑桿</p>
                    </div>
                  )}

                  {assetSubTab === 'CARDS' && (
                    <div className="space-y-3 animate-fade">
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
                      <p className="text-[11px] text-[#636366] text-center pt-1">階段 2 將接入實體晶片卡面與跨行補水導航</p>
                    </div>
                  )}

                  {assetSubTab === 'WEALTH' && (
                    <div className="space-y-3 animate-fade">
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
                      <p className="text-[11px] text-[#636366] text-center pt-1">階段 2 將接入定存到期結算、投資買賣與 AI 季報 Skill v2.1</p>
                    </div>
                  )}
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

                  {/* 數據與備份 */}
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
                            <div className="text-sm font-semibold text-white">帳務一致性診斷</div>
                            <div className="text-[11px] text-[#8E8E93]">檢查數值、ID 參照與差額回滾對稱性</div>
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

                  {/* 階段 0 開發與 GitHub Pages 部署工具 */}
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
                    Wealth v{Store.SCHEMA_VERSION} · Stage 0 Ready · Rev #{state.revision}
                  </div>
                </div>
              )}
            </main>

            {/* =====================================================
                方案 A：iPhone 14 底部 5 格導航列（置中大 ＋ 記帳鍵）
               ===================================================== */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
              <div className="pointer-events-auto w-full max-w-[440px] bg-[#0B0B0D]/92 backdrop-blur-2xl border-t border-white/[0.08] px-2 pt-2 bottom-nav-safe grid grid-cols-5 items-end">
                {[
                  { id: 'LEDGER', label: '明細', Icon: Icons.Ledger },
                  { id: 'ASSETS', label: '資產', Icon: Icons.Assets },
                  { id: 'ADD',    label: '記一筆', isCenter: true },
                  { id: 'REPORT', label: '報表', Icon: Icons.Report },
                  { id: 'SETTINGS', label: '設定', Icon: Icons.Settings }
                ].map(item => {
                  if (item.isCenter) {
                    return (
                      <div key="ADD" className="flex flex-col items-center justify-center -mt-2">
                        <button
                          type="button"
                          onClick={() => setShowQuickAdd(true)}
                          className="w-13 h-11 px-4 rounded-2xl bg-white text-black shadow-[0_6px_22px_rgba(255,255,255,0.22)] flex items-center justify-center active:scale-92 transition"
                          aria-label="記一筆"
                        >
                          <Icons.Plus />
                        </button>
                      </div>
                    );
                  }

                  const active = activeTab === item.id;
                  const IconComp = item.Icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition ${
                        active ? 'text-white' : 'text-[#636366] hover:text-zinc-300'
                      }`}
                    >
                      <IconComp active={active} />
                      <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* 彈出抽屜群 */}
            {showQuickAdd && (
              <QuickAddTestSheet
                state={state}
                onClose={() => setShowQuickAdd(false)}
                onSaved={(tx, warnings) => {
                  setShowQuickAdd(false);
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
        );
      }

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(
        <EmergencyRecoveryBoundary>
          <WealthAppShell />
        </EmergencyRecoveryBoundary>
      );
    })();
