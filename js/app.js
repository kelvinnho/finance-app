(function () {
  const { useState, useMemo, useRef } = React;
  const Store = window.WealthStore;
  const UI = window.WealthUI;
  const { Icons } = UI;

  function AssetsHubView({ subTab, onChangeSubTab, hideMoney, onToggleHideMoney, onNotify }) {
    const state = UI.useWealthStore();
    const baseCurrency = state.settings?.baseCurrency || 'MOP';
    const ORDER = ['WALLET', 'CARDS', 'WEALTH'];

    const swipeHandlers = UI.useHorizontalSwipe({
      enabled: true,
      onSwipeLeft: () => {
        const idx = ORDER.indexOf(subTab);
        onChangeSubTab(ORDER[(idx + 1) % ORDER.length]);
      },
      onSwipeRight: () => {
        const idx = ORDER.indexOf(subTab);
        onChangeSubTab(ORDER[(idx - 1 + ORDER.length) % ORDER.length]);
      }
    });

    const cards = (state.creditCards || []).filter(c => !c.archived);
    const tds = state.timeDeposits || [];
    const invs = state.investments || [];

    return (
      <div {...swipeHandlers} className="space-y-4 animate-fade min-h-[70vh]">
        <header className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-tight text-white">資產</h1>
          <button
            type="button"
            onClick={onToggleHideMoney}
            className="w-9 h-9 rounded-full bg-[#161618] border border-white/[0.07] text-zinc-400 hover:text-white flex items-center justify-center"
          >
            {hideMoney ? <Icons.EyeOff /> : <Icons.Eye />}
          </button>
        </header>

        <UI.SegmentedControl
          value={subTab}
          onChange={onChangeSubTab}
          options={[
            { id: 'WALLET', label: '銀包' },
            { id: 'CARDS',  label: '信用卡' },
            { id: 'WEALTH', label: '定存投資' }
          ]}
        />

        {subTab === 'WALLET' && (
          <window.WealthMod1.WalletView hideMoney={hideMoney} onNotify={onNotify} />
        )}

        {subTab === 'CARDS' && (
          <div className="rounded-3xl bg-[#111113] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden animate-fade">
            {cards.map(cc => {
              const st = cc.statements[baseCurrency] || Object.values(cc.statements)[0] || { billedAmount: 0, unbilledAmount: 0 };
              return (
                <div key={cc.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{cc.name} · {cc.last4}</div>
                    <div className="text-xs text-[#8E8E93] mt-0.5">每月 {cc.billingDay} 號截數 · {cc.dueDay} 號找數</div>
                  </div>
                  <div className="text-right font-mono-num">
                    <div className="text-sm font-bold text-white">{Store.formatMoney(st.billedAmount, baseCurrency, hideMoney)}</div>
                    <div className="text-[11px] text-[#8E8E93] mt-0.5">未出帳 {Store.formatMoney(st.unbilledAmount, baseCurrency, hideMoney)}</div>
                  </div>
                </div>
              );
            })}
            <div className="p-3.5 text-center text-[11px] text-[#636366]">
              階段 2 將接入完整實體信用卡面、跨行補水導航與免年費進度
            </div>
          </div>
        )}

        {subTab === 'WEALTH' && (
          <div className="space-y-3 animate-fade">
            <div className="rounded-3xl bg-[#111113] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
              {tds.map(td => (
                <div key={td.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{td.bankName} · {td.ratePct}%</div>
                    <div className="text-xs text-[#8E8E93] mt-0.5">{td.label} · {td.maturityDate} 到期</div>
                  </div>
                  <div className="text-sm font-bold font-mono-num text-white">
                    {Store.formatMoney(td.principal, td.currency, hideMoney)}
                  </div>
                </div>
              ))}
              {invs.map(inv => (
                <div key={inv.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{inv.code} · {inv.name}</div>
                    <div className="text-xs text-[#8E8E93] mt-0.5">{inv.institution}</div>
                  </div>
                  <div className="text-sm font-bold font-mono-num text-emerald-400">
                    {Store.formatMoney(inv.marketValue, inv.currency, hideMoney)}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center text-[11px] text-[#636366]">
              階段 2 將接入定存到期結算、投資買賣與 AI 季報匯入 v2.1
            </div>
          </div>
        )}
      </div>
    );
  }

  function AnalyticsPlaceholderView({ hideMoney }) {
    const state = UI.useWealthStore();
    const net = useMemo(() => Store.computeNetWorthSummary(), [state]);
    const baseCurrency = state.settings?.baseCurrency || 'MOP';
    const buckets = state.settings?.buckets || [];

    const stats = useMemo(() => {
      let inc = 0;
      let exp = 0;
      const byBucket = {};
      (state.transactions || []).forEach(t => {
        const v = Store.convertToBase(t.amount, t.currency);
        if (t.type === 'INCOME') inc += v;
        if (t.type === 'EXPENSE') {
          exp += v;
          byBucket[t.bucketId] = (byBucket[t.bucketId] || 0) + v;
        }
      });
      return { inc, exp, byBucket };
    }, [state.transactions]);

    return (
      <div className="space-y-4 animate-fade">
        <header className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-tight text-white">報表</h1>
          <span className="text-xs text-[#8E8E93]">即時統計</span>
        </header>

        <div className="p-5 rounded-3xl bg-[#111113] border border-white/[0.06] space-y-4">
          <div>
            <div className="text-xs text-[#8E8E93]">總淨資產</div>
            <div className="text-3xl font-bold font-mono-num text-white mt-0.5">
              {Store.formatMoney(net.netWorth, baseCurrency, hideMoney)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06] text-xs">
            <div>
              <div className="text-[#8E8E93]">期內收入</div>
              <div className="text-sm font-bold font-mono-num text-emerald-400 mt-1">
                +{Store.formatMoney(stats.inc, baseCurrency, hideMoney)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[#8E8E93]">期內支出</div>
              <div className="text-sm font-bold font-mono-num text-white mt-1">
                -{Store.formatMoney(stats.exp, baseCurrency, hideMoney)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[#111113] border border-white/[0.06] space-y-3">
          <div className="text-xs font-semibold text-[#8E8E93]">資金池消耗</div>
          {buckets.filter(b => !b.archived).map(b => {
            const spent = stats.byBucket[b.id] || 0;
            const pct = b.monthlyBudget > 0 ? Math.min(100, Math.round((spent / b.monthlyBudget) * 100)) : 0;
            return (
              <div key={b.id} className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">{b.name}</span>
                  <span className="font-mono-num text-zinc-300">
                    {Store.formatMoney(spent, baseCurrency, hideMoney)} / {Store.formatMoney(b.monthlyBudget, baseCurrency, hideMoney)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div style={{ width: `${pct}%`, backgroundColor: b.color }} className="h-full rounded-full" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center text-[11px] text-[#636366] pt-2">
          階段 3 將接入完整類別下鑽、趨勢排行與 CSV / Markdown 匯出
        </div>
      </div>
    );
  }

  function SettingsHubView({ onNotify }) {
    const state = UI.useWealthStore();
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [showExportSheet, setShowExportSheet] = useState(false);
    const fileInputRef = useRef(null);

    const diagResults = useMemo(() => (showDiagnostics ? Store.runConsistencyDiagnostics() : []), [showDiagnostics, state]);
    const viewportInfo = useMemo(() => {
      if (!showDiagnostics) return null;
      const isStandalone = window.navigator.standalone === true ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      return {
        standalone: isStandalone ? '獨立主畫面模式 (Standalone)' : '瀏覽器分頁模式',
        innerH: window.innerHeight,
        screenH: window.screen?.height || 0
      };
    }, [showDiagnostics]);

    const handleImportJson = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          Store.importFullJson(parsed);
          onNotify('已成功還原完整 JSON 帳本');
        } catch (err) {
          onNotify('JSON 格式錯誤，還原失敗', 'warning');
        }
      };
      reader.readAsText(file);
    };

    return (
      <div className="space-y-5 animate-fade">
        <header>
          <h1 className="text-[22px] font-bold tracking-tight text-white">設定</h1>
        </header>

        <section className="space-y-2">
          <div className="text-[11px] font-semibold text-[#8E8E93] px-1">基準與偏好</div>
          <div className="rounded-3xl bg-[#111113] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
            <div className="px-4 py-3.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">主顯示貨幣</span>
              <select
                value={state.settings?.baseCurrency || 'MOP'}
                onChange={e => Store.setState(prev => ({
                  ...prev,
                  settings: { ...prev.settings, baseCurrency: e.target.value }
                }))}
                className="px-3 py-1.5 rounded-xl bg-[#1C1C1E] border border-white/10 font-mono-num text-xs font-bold text-white"
              >
                {['MOP', 'HKD', 'USD', 'CNY', 'TWD'].map(c => (
                  <option key={c} value={c} className="bg-zinc-900">{c}</option>
                ))}
              </select>
            </div>

            <div className="px-4 py-3.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">啟動時預設隱藏金額</div>
              </div>
              <button
                type="button"
                onClick={() => Store.setState(prev => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    preferences: { ...prev.settings.preferences, hideBalancesOnLaunch: !prev.settings.preferences?.hideBalancesOnLaunch }
                  }
                }))}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                  state.settings?.preferences?.hideBalancesOnLaunch ? 'bg-emerald-400' : 'bg-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  state.settings?.preferences?.hideBalancesOnLaunch ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-[11px] font-semibold text-[#8E8E93] px-1">數據安全與架構工具</div>
          <div className="rounded-3xl bg-[#111113] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
            <div
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
            >
              <div>
                <div className="text-sm font-semibold text-white">帳務一致性與視區診斷</div>
                <div className="text-[11px] text-[#8E8E93] mt-0.5">驗證餘額平衡、回滾對稱性與 PWA 高度</div>
              </div>
              <span className="text-[#636366]"><Icons.ChevronRight /></span>
            </div>

            {showDiagnostics && (
              <div className="p-4 bg-black/50 space-y-2.5 text-xs animate-fade">
                {diagResults.map(chk => (
                  <div key={chk.id} className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-zinc-200">{chk.label}</div>
                      <div className="text-[10px] text-[#8E8E93]">{chk.detail}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      chk.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {chk.ok ? '通過' : '異常'}
                    </span>
                  </div>
                ))}
                {viewportInfo && (
                  <div className="pt-2 border-t border-white/[0.06] text-[10px] font-mono-num text-[#8E8E93] flex justify-between">
                    <span>{viewportInfo.standalone}</span>
                    <span>innerH:{viewportInfo.innerH} / screenH:{viewportInfo.screenH}</span>
                  </div>
                )}
              </div>
            )}

            <div
              onClick={() => setShowExportSheet(true)}
              className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
            >
              <div>
                <div className="text-sm font-semibold text-sky-300">匯出 GitHub 零編譯多檔結構</div>
                <div className="text-[11px] text-[#8E8E93] mt-0.5">下載分離之 index.html、manifest、sw 與 js 模組</div>
              </div>
              <span className="text-[#636366]"><Icons.ChevronRight /></span>
            </div>

            <div
              onClick={() => {
                const dateStr = Store.todayISO();
                UI.downloadFile(`Wealth_Backup_${dateStr}.json`, Store.exportFullJson(), 'application/json');
                onNotify('已匯出完整 JSON 備份');
              }}
              className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
            >
              <div>
                <div className="text-sm font-semibold text-white">匯出整機 JSON 備份</div>
              </div>
              <span className="text-zinc-400"><Icons.Download /></span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
            >
              <div>
                <div className="text-sm font-semibold text-white">從 JSON 備份檔還原</div>
              </div>
              <span className="text-zinc-400"><Icons.Upload /></span>
              <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
            </div>

            <div
              onClick={() => Store.resetToOnboarding()}
              className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
            >
              <div>
                <div className="text-sm font-semibold text-amber-300">重新執行首次引導 / 切換範例與空白帳本</div>
              </div>
              <span className="text-amber-300"><Icons.RefreshCw /></span>
            </div>
          </div>
        </section>

        <div className="text-center text-[11px] font-mono-num text-[#636366] pt-2">
          Wealth v{Store.SCHEMA_VERSION} · Stage 1 r9 · Rev #{state.revision}
        </div>

        {showExportSheet && (
          <ExportMultifileSheet onClose={() => setShowExportSheet(false)} onNotify={onNotify} />
        )}
      </div>
    );
  }

  function ExportMultifileSheet({ onClose, onNotify }) {
    const [copiedFile, setCopiedFile] = useState(null);
    const ASSET_VER = '1.9-stage1-r9';

    const files = useMemo(() => {
      const bundleEl = document.getElementById('wealth-app-bundle');
      const fullSource = bundleEl ? bundleEl.textContent : '';

      // 從整合腳本中精準擷取各獨立模組程式碼
      const extractModuleCode = (modName) => {
        const startTag = `// === MODULE_START: ${modName} ===`;
        const endTag = `// === MODULE_END: ${modName} ===`;
        const sIdx = fullSource.indexOf(startTag);
        const eIdx = fullSource.indexOf(endTag);
        if (sIdx === -1 || eIdx === -1 || eIdx <= sIdx) return '';
        return fullSource.slice(sIdx + startTag.length, eIdx).trim() + '\n';
      };

      // 即時以 Babel 驗證每個拆出檔案的 JS/JSX 語法是否完全正確
      const verifyJsSyntax = (code) => {
        if (!code) return false;
        try {
          if (window.Babel && typeof window.Babel.transform === 'function') {
            window.Babel.transform(code, { presets: ['react'] });
          }
          return true;
        } catch (e) {
          return false;
        }
      };

      // PWA 主畫面設定檔
      const manifestJson = JSON.stringify({
        name: 'Wealth · 個人財務管理',
        short_name: 'Wealth',
        start_url: './',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          {
            src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='44' fill='%230B0B0D'/><rect x='36' y='56' width='120' height='80' rx='18' fill='none' stroke='%23FFFFFF' stroke-width='8'/><circle cx='128' cy='96' r='9' fill='%2334D399'/></svg>",
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }, null, 2);

      // Network-First 離線快取策略＋版本化防快取路徑，徹底杜絕舊檔殘留快取
      const swJs = [
        `const CACHE_NAME = 'wealth-app-v${ASSET_VER}';`,
        `const CORE_ASSETS = ['./', './index.html', './manifest.json', './js/store.js?v=${ASSET_VER}', './js/ui.js?v=${ASSET_VER}', './js/mod1_wallet.js?v=${ASSET_VER}', './js/mod3_ledger.js?v=${ASSET_VER}', './js/app.js?v=${ASSET_VER}'];`,
        "self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS))); self.skipWaiting(); });",
        "self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });",
        "self.addEventListener('fetch', (e) => {",
        "  if (e.request.method !== 'GET') return;",
        "  e.respondWith(",
        "    fetch(e.request).then((res) => {",
        "      if (res && res.status === 200 && res.type === 'basic') {",
        "        const copy = res.clone();",
        "        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));",
        "      }",
        "      return res;",
        "    }).catch(() => caches.match(e.request))",
        "  );",
        "});"
      ].join('\n');

      const styleEl = document.querySelector('head style');
      const baseCss = styleEl ? styleEl.textContent : '';

      // js/store.js 不含 JSX，改以原生 script 同步載入，速度更快且零編譯誤差
      const scriptTagsBlock = [
        `  <script src="js/store.js?v=${ASSET_VER}"><\/script>`,
        `  <script type="text/babel" src="js/ui.js?v=${ASSET_VER}"><\/script>`,
        `  <script type="text/babel" src="js/mod1_wallet.js?v=${ASSET_VER}"><\/script>`,
        `  <script type="text/babel" src="js/mod3_ledger.js?v=${ASSET_VER}"><\/script>`,
        `  <script type="text/babel" src="js/app.js?v=${ASSET_VER}"><\/script>`
      ].join('\n');

      const cleanIndexHtml = `<!DOCTYPE html>
<html lang="zh-HK">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Wealth" />
  <meta name="theme-color" content="#000000" />
  <title>Wealth · 個人財務管理</title>
  <link rel="manifest" href="./manifest.json" />
  <link rel="apple-touch-icon" href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'><rect width='180' height='180' rx='40' fill='%230B0B0D'/><rect x='34' y='52' width='112' height='76' rx='18' fill='none' stroke='%23FFFFFF' stroke-width='8'/><circle cx='122' cy='90' r='8' fill='%2334D399'/></svg>" />
  <script>
    (function () {
      var isStandalone = window.navigator.standalone === true ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      function syncAppHeight() {
        var h = window.innerHeight;
        if (isStandalone && isIOS && window.screen && window.screen.height) {
          h = Math.max(window.innerHeight, window.screen.height);
        }
        document.documentElement.style.setProperty('--app-height', h + 'px');
      }
      syncAppHeight();
      window.addEventListener('resize', syncAppHeight);
      window.addEventListener('orientationchange', function () { setTimeout(syncAppHeight, 120); });
      window.addEventListener('focusout', function () { setTimeout(syncAppHeight, 80); });
    })();
  <\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <style>${baseCss}</style>
</head>
<body class="bg-black text-white select-none">
  <div id="root"></div>
${scriptTagsBlock}
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').then(function (reg) {
          reg.update();
        }).catch(function () {});
      });
    }
  <\/script>
</body>
</html>
`;

      const singleFileFallbackHtml = fullSource
        ? cleanIndexHtml.replace(
            scriptTagsBlock,
            `  <script type="text/babel" id="wealth-app-bundle">\n${fullSource}\n  <\/script>`
          )
        : '';

      const jsModules = [
        { path: 'js/store.js', name: 'store.js', content: extractModuleCode('js/store.js'), mime: 'application/javascript;charset=utf-8;' },
        { path: 'js/ui.js', name: 'ui.js', content: extractModuleCode('js/ui.js'), mime: 'application/javascript;charset=utf-8;' },
        { path: 'js/mod1_wallet.js', name: 'mod1_wallet.js', content: extractModuleCode('js/mod1_wallet.js'), mime: 'application/javascript;charset=utf-8;' },
        { path: 'js/mod3_ledger.js', name: 'mod3_ledger.js', content: extractModuleCode('js/mod3_ledger.js'), mime: 'application/javascript;charset=utf-8;' },
        { path: 'js/app.js', name: 'app.js', content: extractModuleCode('js/app.js'), mime: 'application/javascript;charset=utf-8;' }
      ].map(m => ({ ...m, valid: verifyJsSyntax(m.content) }));

      return {
        hasBundle: Boolean(fullSource),
        list: [
          { path: 'index.html', name: 'index.html', content: cleanIndexHtml, mime: 'text/html;charset=utf-8;', valid: true },
          { path: 'manifest.json', name: 'manifest.json', content: manifestJson, mime: 'application/json;charset=utf-8;', valid: true },
          { path: 'sw.js', name: 'sw.js', content: swJs, mime: 'application/javascript;charset=utf-8;', valid: true },
          ...jsModules
        ],
        singleFileFallbackHtml
      };
    }, []);

    return (
      <UI.BottomSheet title="GitHub 零編譯多檔下載" subtitle="請逐一點擊「下載」或「複製」並按路徑放上 GitHub" onClose={onClose}>
        {!files.hasBundle ? (
          <div className="p-4 rounded-2xl bg-black border border-white/10 text-xs text-[#8E8E93] text-center">
            目前已在分離多檔模式運行，請直接於 Canvas 預覽視窗進行多檔匯出。
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-black border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
              {files.list.map(f => (
                <div key={f.path} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-num font-bold text-white truncate">{f.path}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold shrink-0 ${
                        f.valid ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {f.valid ? '✓ 語法通過' : '✕ 異常'}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono-num text-[#636366]">{f.content.split('\n').length} 行</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        UI.copyTextToClipboard(f.content);
                        setCopiedFile(f.path);
                        onNotify(`已複製 ${f.path}`);
                        setTimeout(() => setCopiedFile(null), 1800);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        copiedFile === f.path
                          ? 'bg-emerald-400 text-black border-emerald-300'
                          : 'bg-[#161618] text-zinc-200 border-white/10'
                      }`}
                    >
                      {copiedFile === f.path ? '已複製' : '複製'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        UI.downloadFile(f.name, f.content, f.mime);
                        onNotify(`已下載 ${f.path}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white text-black text-[11px] font-bold"
                    >
                      下載
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-2">
              <div className="text-[11px] text-[#8E8E93]">備用方案：單檔部署（只需上傳一個 index.html）</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    UI.downloadFile('index.html', files.singleFileFallbackHtml, 'text/html;charset=utf-8;');
                    onNotify('已下載完整單檔 index.html');
                  }}
                  className="min-h-[40px] rounded-xl bg-sky-500/20 border border-sky-400/35 text-sky-300 text-xs font-bold"
                >
                  下載單檔 index.html
                </button>
                <button
                  type="button"
                  onClick={() => {
                    UI.copyTextToClipboard(files.singleFileFallbackHtml);
                    onNotify('已複製完整單檔 index.html');
                  }}
                  className="min-h-[40px] rounded-xl bg-[#161618] border border-white/10 text-zinc-200 text-xs font-semibold"
                >
                  複製單檔內容
                </button>
              </div>
            </div>
          </>
        )}
      </UI.BottomSheet>
    );
  }

  function AppShell() {
    const state = UI.useWealthStore();
    const [activeTab, setActiveTab] = useState('LEDGER');
    const [assetsSubTab, setAssetsSubTab] = useState('WALLET');
    const [hideMoney, setHideMoney] = useState(() => Boolean(state.settings?.preferences?.hideBalancesOnLaunch));
    const [editorState, setEditorState] = useState({ open: false, preset: null });
    const [quickMenu, setQuickMenu] = useState(null);
    const [toast, setToast] = useState({ message: '', tone: 'neutral' });
    const assetsBtnRef = useRef(null);
    const addBtnRef = useRef(null);

    const showToast = (message, tone = 'neutral') => {
      setToast({ message, tone });
      setTimeout(() => setToast({ message: '', tone: 'neutral' }), 3000);
    };

    const openEditor = (preset = null) => {
      setEditorState({ open: true, preset });
    };

    if (!state.hasCompletedOnboarding) {
      return (
        <UI.OnboardingFlow
          onComplete={(baseCurrency, mode) => {
            Store.completeOnboarding(baseCurrency, mode);
            showToast(mode === 'BLANK' ? '已建立全新空白帳本' : '已載入通用範例帳本');
          }}
        />
      );
    }

    const assetsPressHandlers = UI.useLongPress(
      () => setQuickMenu('ASSETS'),
      () => {
        if (activeTab === 'ASSETS') {
          const order = ['WALLET', 'CARDS', 'WEALTH'];
          setAssetsSubTab(order[(order.indexOf(assetsSubTab) + 1) % order.length]);
        } else {
          setActiveTab('ASSETS');
        }
      }
    );

    const addPressHandlers = UI.useLongPress(
      () => setQuickMenu('ADD'),
      () => openEditor(null)
    );

    return (
      <div className="app-viewport max-w-[440px] mx-auto bg-black text-white relative">
        <UI.Toast message={toast.message} tone={toast.tone} />

        <main
          style={{
            paddingTop: 'max(14px, env(safe-area-inset-top))',
            paddingBottom: '24px'
          }}
          className="app-scroll-main px-4"
        >
          {activeTab === 'LEDGER' && (
            <window.WealthMod3.LedgerMainView
              hideMoney={hideMoney}
              onToggleHideMoney={() => setHideMoney(!hideMoney)}
              onOpenEditor={(preset) => openEditor(preset)}
              onNotify={(msg, tone) => showToast(msg, tone)}
            />
          )}

          {activeTab === 'ASSETS' && (
            <AssetsHubView
              subTab={assetsSubTab}
              onChangeSubTab={setAssetsSubTab}
              hideMoney={hideMoney}
              onToggleHideMoney={() => setHideMoney(!hideMoney)}
              onNotify={(msg, tone) => showToast(msg, tone)}
            />
          )}

          {activeTab === 'ANALYTICS' && (
            <AnalyticsPlaceholderView hideMoney={hideMoney} />
          )}

          {activeTab === 'SETTINGS' && (
            <SettingsHubView onNotify={(msg, tone) => showToast(msg, tone)} />
          )}
        </main>

        <nav
          style={{ paddingBottom: 'max(10px, calc(env(safe-area-inset-bottom) - 10px))' }}
          className="shrink-0 w-full z-30 bg-[#0B0B0D]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 pt-1.5"
        >
          <div className="grid grid-cols-5 items-center">
            <button
              type="button"
              onClick={() => setActiveTab('LEDGER')}
              className={`min-h-[46px] flex flex-col items-center justify-center gap-1 transition ${
                activeTab === 'LEDGER' ? 'text-white' : 'text-[#636366] hover:text-zinc-300'
              }`}
            >
              <Icons.Calendar />
              <span className="text-[10px] font-semibold">明細</span>
            </button>

            <button
              ref={assetsBtnRef}
              type="button"
              {...assetsPressHandlers}
              className={`min-h-[46px] flex flex-col items-center justify-center gap-1 transition ${
                activeTab === 'ASSETS' ? 'text-white' : 'text-[#636366] hover:text-zinc-300'
              }`}
            >
              <Icons.Wallet />
              <span className="text-[10px] font-semibold">資產</span>
            </button>

            <div className="flex items-center justify-center">
              <button
                ref={addBtnRef}
                type="button"
                {...addPressHandlers}
                aria-label="記一筆"
                className="w-12 h-11 -mt-2 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_6px_20px_rgba(255,255,255,0.22)] active:scale-95 transition"
              >
                <Icons.Plus />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('ANALYTICS')}
              className={`min-h-[46px] flex flex-col items-center justify-center gap-1 transition ${
                activeTab === 'ANALYTICS' ? 'text-white' : 'text-[#636366] hover:text-zinc-300'
              }`}
            >
              <Icons.PieChart />
              <span className="text-[10px] font-semibold">報表</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              className={`min-h-[46px] flex flex-col items-center justify-center gap-1 transition ${
                activeTab === 'SETTINGS' ? 'text-white' : 'text-[#636366] hover:text-zinc-300'
              }`}
            >
              <Icons.Settings />
              <span className="text-[10px] font-semibold">設定</span>
            </button>
          </div>
        </nav>

        {quickMenu === 'ASSETS' && (
          <UI.QuickPopoverMenu
            title="切換資產子頁"
            align="left"
            anchorX={assetsBtnRef.current ? assetsBtnRef.current.getBoundingClientRect().left + assetsBtnRef.current.offsetWidth / 2 : null}
            onClose={() => setQuickMenu(null)}
            items={[
              { id: 'WALLET', label: '銀包帳戶', icon: <Icons.Wallet />, active: activeTab === 'ASSETS' && assetsSubTab === 'WALLET', onSelect: () => { setActiveTab('ASSETS'); setAssetsSubTab('WALLET'); } },
              { id: 'CARDS',  label: '信用卡',   icon: <Icons.CreditCard />, active: activeTab === 'ASSETS' && assetsSubTab === 'CARDS', onSelect: () => { setActiveTab('ASSETS'); setAssetsSubTab('CARDS'); } },
              { id: 'WEALTH', label: '定存投資', icon: <Icons.TrendingUp />, active: activeTab === 'ASSETS' && assetsSubTab === 'WEALTH', onSelect: () => { setActiveTab('ASSETS'); setAssetsSubTab('WEALTH'); } }
            ]}
          />
        )}

        {quickMenu === 'ADD' && (
          <UI.QuickPopoverMenu
            title="快速記帳類型"
            align="center"
            anchorX={addBtnRef.current ? addBtnRef.current.getBoundingClientRect().left + addBtnRef.current.offsetWidth / 2 : null}
            onClose={() => setQuickMenu(null)}
            items={[
              { id: 'EXPENSE',    label: '記支出',   accent: 'text-rose-400',    icon: <Icons.ArrowUpRight />,   onSelect: () => openEditor({ type: 'EXPENSE' }) },
              { id: 'INCOME',     label: '記收入',   accent: 'text-emerald-400', icon: <Icons.ArrowDownLeft />,  onSelect: () => openEditor({ type: 'INCOME' }) },
              { id: 'TRANSFER',   label: '帳戶轉帳', accent: 'text-sky-400',     icon: <Icons.ArrowLeftRight />, onSelect: () => openEditor({ type: 'TRANSFER' }) },
              { id: 'RECEIVABLE', label: '應收代墊', accent: 'text-amber-400',   icon: <Icons.Users />,          onSelect: () => openEditor({ type: 'RECEIVABLE' }) }
            ]}
          />
        )}

        {editorState.open && (
          <window.WealthMod3.MozeRecordEditorSheet
            preset={editorState.preset}
            onClose={() => setEditorState({ open: false, preset: null })}
            onSaved={(warnings) => {
              if (warnings && warnings.length > 0) {
                showToast(warnings[0], 'warning');
              } else {
                showToast('已儲存並同步更新帳戶餘額');
              }
            }}
          />
        )}

        <UI.GlobalNumericKeypad />
      </div>
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <UI.EmergencyRecoveryBoundary>
      <AppShell />
    </UI.EmergencyRecoveryBoundary>
  );
})();
