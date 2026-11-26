(function () {
  'use strict';

  const STORAGE_KEY = 'wealth_pwa_state_v19';
  const APP_VERSION = 'Stage 3 r2';
  const SCHEMA_VERSION = '1.9';

  const CURRENCIES = [
    { code: 'MOP', symbol: 'MOP$', name: '澳門元', rateToBase: 1.0 },
    { code: 'HKD', symbol: 'HK$', name: '港元', rateToBase: 1.03 },
    { code: 'USD', symbol: 'US$', name: '美元', rateToBase: 8.03 },
    { code: 'CNY', symbol: '¥', name: '人民幣', rateToBase: 1.11 },
    { code: 'TWD', symbol: 'NT$', name: '新台幣', rateToBase: 0.25 },
    { code: 'JPY', symbol: 'JP¥', name: '日圓', rateToBase: 0.053 }
  ];

  const CARD_THEMES = [
    {
      id: 'obsidian', name: '曜石黑',
      bg: 'linear-gradient(140deg, #2A2D37 0%, #161820 52%, #0C0D12 100%)',
      glow: 'radial-gradient(circle at 86% 14%, rgba(226,232,240,0.20) 0%, rgba(148,163,184,0.06) 36%, transparent 68%)',
      accent: '#E2E8F0'
    },
    {
      id: 'titanium', name: '原色鈦',
      bg: 'linear-gradient(140deg, #51535F 0%, #30323C 48%, #1A1B22 100%)',
      glow: 'radial-gradient(circle at 84% 16%, rgba(255,255,255,0.24) 0%, rgba(212,212,216,0.08) 38%, transparent 70%)',
      accent: '#F8FAFC'
    },
    {
      id: 'emerald', name: '極光綠',
      bg: 'linear-gradient(140deg, #10634B 0%, #0A3C2E 52%, #051D17 100%)',
      glow: 'radial-gradient(circle at 86% 14%, rgba(52,211,153,0.34) 0%, rgba(16,185,129,0.10) 38%, transparent 70%)',
      accent: '#34D399'
    },
    {
      id: 'sapphire', name: '深海藍',
      bg: 'linear-gradient(140deg, #1C4A8A 0%, #112C56 52%, #08152B 100%)',
      glow: 'radial-gradient(circle at 86% 14%, rgba(96,165,250,0.36) 0%, rgba(56,189,248,0.10) 38%, transparent 70%)',
      accent: '#60A5FA'
    },
    {
      id: 'amber', name: '香檳金',
      bg: 'linear-gradient(140deg, #74501B 0%, #442D0D 52%, #1E1305 100%)',
      glow: 'radial-gradient(circle at 86% 14%, rgba(251,191,36,0.34) 0%, rgba(245,158,11,0.10) 38%, transparent 70%)',
      accent: '#FBBF24'
    },
    {
      id: 'crimson', name: '酒紅釉',
      bg: 'linear-gradient(140deg, #7A1F38 0%, #481122 52%, #1F070F 100%)',
      glow: 'radial-gradient(circle at 86% 14%, rgba(251,113,133,0.34) 0%, rgba(244,63,94,0.10) 38%, transparent 70%)',
      accent: '#FB7185'
    },
    {
      id: 'violet', name: '星雲紫',
      bg: 'linear-gradient(140deg, #532B88 0%, #2F1651 52%, #140924 100%)',
      glow: 'radial-gradient(circle at 86% 14%, rgba(167,139,250,0.36) 0%, rgba(139,92,246,0.10) 38%, transparent 70%)',
      accent: '#A78BFA'
    },
    {
      id: 'copper', name: '日落銅',
      bg: 'linear-gradient(140deg, #7D3E1E 0%, #49220F 52%, #200E06 100%)',
      glow: 'radial-gradient(circle at 86% 14%, rgba(251,146,60,0.34) 0%, rgba(249,115,22,0.10) 38%, transparent 70%)',
      accent: '#FB923C'
    }
  ];

  const POOL_COLORS = ['#34D399', '#38BDF8', '#60A5FA', '#FBBF24', '#A78BFA', '#FB7185', '#FB923C', '#9CA3AF'];

  const INVESTMENT_TYPES = [
    { id: 'FIXED_DEPOSIT', label: '定期存款', shortLabel: '定期', color: '#FBBF24', isTerm: true, theme: 'amber' },
    { id: 'TBILL', label: '美國國債 / 債券', shortLabel: '美債', color: '#38BDF8', isTerm: true, theme: 'sapphire' },
    { id: 'STOCK_ETF', label: '股票 / ETF', shortLabel: '股/ETF', color: '#34D399', isTerm: false, theme: 'emerald' }
  ];

  const CATEGORY_ICONS = [
    { id: 'utensils', label: '飲食' },
    { id: 'car', label: '交通' },
    { id: 'bag', label: '購物' },
    { id: 'home', label: '居家' },
    { id: 'sparkles', label: '娛樂' },
    { id: 'heart', label: '醫療' },
    { id: 'briefcase', label: '工作' },
    { id: 'gift', label: '禮金' },
    { id: 'trend', label: '收益' },
    { id: 'coins', label: '資金' },
    { id: 'tag', label: '其他' }
  ];

  const DEFAULT_POOLS = [
    { id: 'pool_liquid', name: '日常流動', color: '#34D399', settlementAccountId: null, settlementBalanceId: null, note: '日常飲食、個人消費與生活開支' },
    { id: 'pool_household', name: '家庭共同', color: '#38BDF8', settlementAccountId: null, settlementBalanceId: null, note: '居家帳單、買菜日用與共同支出' },
    { id: 'pool_reserve', name: '備用底倉', color: '#60A5FA', settlementAccountId: null, settlementBalanceId: null, note: '應急備用金與大額固定支出' },
    { id: 'pool_goal', name: '專項目標', color: '#FBBF24', settlementAccountId: null, settlementBalanceId: null, note: '旅遊、換車或年度儲蓄專項' },
    { id: 'pool_invest', name: '投資交割', color: '#A78BFA', settlementAccountId: null, settlementBalanceId: null, note: '券商入金、定期與投資收益' }
  ];

  const DEFAULT_CATEGORIES = [
    {
      id: 'cat_food', type: 'EXPENSE', name: '日常飲食', icon: 'utensils', color: '#F59E0B', defaultPoolId: 'pool_liquid',
      subcategories: [
        { id: 'sub_food_1', name: '早餐', defaultPoolId: null },
        { id: 'sub_food_2', name: '午餐', defaultPoolId: null },
        { id: 'sub_food_3', name: '晚餐', defaultPoolId: null },
        { id: 'sub_food_4', name: '咖啡飲品', defaultPoolId: null },
        { id: 'sub_food_5', name: '聚餐外食', defaultPoolId: null },
        { id: 'sub_food_6', name: '超市買菜', defaultPoolId: 'pool_household' }
      ]
    },
    {
      id: 'cat_transport', type: 'EXPENSE', name: '交通出行', icon: 'car', color: '#38BDF8', defaultPoolId: 'pool_liquid',
      subcategories: [
        { id: 'sub_tr_1', name: '加油充電', defaultPoolId: null },
        { id: 'sub_tr_2', name: '泊車路費', defaultPoolId: null },
        { id: 'sub_tr_3', name: '公共交通', defaultPoolId: null },
        { id: 'sub_tr_4', name: '的士網約車', defaultPoolId: null },
        { id: 'sub_tr_5', name: '車輛保養', defaultPoolId: 'pool_reserve' }
      ]
    },
    {
      id: 'cat_shopping', type: 'EXPENSE', name: '日用購物', icon: 'bag', color: '#EC4899', defaultPoolId: 'pool_liquid',
      subcategories: [
        { id: 'sub_sh_1', name: '日用百貨', defaultPoolId: 'pool_household' },
        { id: 'sub_sh_2', name: '服飾鞋包', defaultPoolId: null },
        { id: 'sub_sh_3', name: '數碼家電', defaultPoolId: 'pool_goal' },
        { id: 'sub_sh_4', name: '網購消費', defaultPoolId: null }
      ]
    },
    {
      id: 'cat_home', type: 'EXPENSE', name: '居家帳單', icon: 'home', color: '#818CF8', defaultPoolId: 'pool_household',
      subcategories: [
        { id: 'sub_hm_1', name: '水電煤網', defaultPoolId: null },
        { id: 'sub_hm_2', name: '大廈管理費', defaultPoolId: null },
        { id: 'sub_hm_3', name: '電話月費', defaultPoolId: 'pool_liquid' },
        { id: 'sub_hm_4', name: '訂閱服務', defaultPoolId: 'pool_liquid' },
        { id: 'sub_hm_5', name: '家居維修', defaultPoolId: 'pool_reserve' }
      ]
    },
    {
      id: 'cat_leisure', type: 'EXPENSE', name: '休閒娛樂', icon: 'sparkles', color: '#C084FC', defaultPoolId: 'pool_liquid',
      subcategories: [
        { id: 'sub_le_1', name: '電影演出', defaultPoolId: null },
        { id: 'sub_le_2', name: '運動健身', defaultPoolId: null },
        { id: 'sub_le_3', name: '旅遊度假', defaultPoolId: 'pool_goal' },
        { id: 'sub_le_4', name: '興趣愛好', defaultPoolId: null }
      ]
    },
    {
      id: 'cat_health', type: 'EXPENSE', name: '醫療保險', icon: 'heart', color: '#FB7185', defaultPoolId: 'pool_reserve',
      subcategories: [
        { id: 'sub_hl_1', name: '門診醫藥', defaultPoolId: 'pool_liquid' },
        { id: 'sub_hl_2', name: '保費支出', defaultPoolId: 'pool_reserve' },
        { id: 'sub_hl_3', name: '體檢保健', defaultPoolId: null }
      ]
    },
    {
      id: 'cat_other_exp', type: 'EXPENSE', name: '其他支出', icon: 'tag', color: '#9CA3AF', defaultPoolId: 'pool_liquid',
      subcategories: [
        { id: 'sub_oe_1', name: '人情禮金', defaultPoolId: null },
        { id: 'sub_oe_2', name: '教育進修', defaultPoolId: 'pool_household' },
        { id: 'sub_oe_3', name: '雜項開支', defaultPoolId: null }
      ]
    },
    {
      id: 'cat_salary', type: 'INCOME', name: '薪資收入', icon: 'briefcase', color: '#34D399', defaultPoolId: 'pool_liquid',
      subcategories: [
        { id: 'sub_sa_1', name: '月薪入帳', defaultPoolId: null },
        { id: 'sub_sa_2', name: '加班津貼', defaultPoolId: null },
        { id: 'sub_sa_3', name: '兼職副業', defaultPoolId: null }
      ]
    },
    {
      id: 'cat_bonus', type: 'INCOME', name: '獎金轉入', icon: 'gift', color: '#60A5FA', defaultPoolId: 'pool_goal',
      subcategories: [
        { id: 'sub_bn_1', name: '績效獎金', defaultPoolId: null },
        { id: 'sub_bn_2', name: '家庭共同轉入', defaultPoolId: 'pool_household' },
        { id: 'sub_bn_3', name: '節日津貼', defaultPoolId: null }
      ]
    },
    {
      id: 'cat_dividend', type: 'INCOME', name: '股息回贈', icon: 'trend', color: '#A78BFA', defaultPoolId: 'pool_invest',
      subcategories: [
        { id: 'sub_dv_1', name: '信用卡回贈', defaultPoolId: 'pool_liquid' },
        { id: 'sub_dv_2', name: '定存利息', defaultPoolId: 'pool_reserve' },
        { id: 'sub_dv_3', name: '股息分紅', defaultPoolId: 'pool_invest' }
      ]
    },
    {
      id: 'cat_other_inc', type: 'INCOME', name: '其他收入', icon: 'coins', color: '#9CA3AF', defaultPoolId: 'pool_liquid',
      subcategories: [
        { id: 'sub_oi_1', name: '退款退稅', defaultPoolId: null },
        { id: 'sub_oi_2', name: '二手出讓', defaultPoolId: null },
        { id: 'sub_oi_3', name: '其他入帳', defaultPoolId: null }
      ]
    }
  ];

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function formatDateISO(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function todayISO() {
    return formatDateISO(new Date());
  }

  function demoDateForStmt(stmtDay, isBilled, offsetDays) {
    const now = new Date();
    const todayD = now.getDate();
    const lastStmt = todayD >= stmtDay
      ? new Date(now.getFullYear(), now.getMonth(), stmtDay)
      : new Date(now.getFullYear(), now.getMonth() - 1, stmtDay);
    const d = new Date(lastStmt.getTime());
    if (isBilled) {
      d.setDate(d.getDate() - Math.max(1, offsetDays || 2));
    } else {
      d.setDate(d.getDate() + Math.max(1, offsetDays || 1));
      if (d.getTime() > now.getTime()) return formatDateISO(now);
    }
    return formatDateISO(d);
  }

  function nowTimeHM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function round2(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return 0;
    return Math.round(num * 100) / 100;
  }

  function buildFxMap(baseCurrency) {
    const baseObj = CURRENCIES.find((c) => c.code === baseCurrency) || CURRENCIES[0];
    const rates = {};
    CURRENCIES.forEach((c) => {
      rates[c.code] = round2(c.rateToBase / baseObj.rateToBase) || 1;
    });
    rates[baseObj.code] = 1;
    return rates;
  }

  function createBlankState(baseCurrency) {
    const base = baseCurrency || 'MOP';
    const accId = 'acc_main';
    const balId = 'bal_main_1';
    const pools = JSON.parse(JSON.stringify(DEFAULT_POOLS));
    pools[0].settlementAccountId = accId;
    pools[0].settlementBalanceId = balId;
    return {
      meta: {
        schemaVersion: SCHEMA_VERSION,
        appVersion: APP_VERSION,
        onboardingDone: true,
        baseCurrency: base,
        privacyMode: false,
        defaultExpenseSource: `ACCOUNT::${accId}::${balId}`,
        fxRates: buildFxMap(base)
      },
      pools,
      categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      accounts: [
        {
          id: accId,
          name: '主力銀行帳戶',
          subtitle: '綜合活期',
          type: 'BANK',
          theme: 'obsidian',
          balances: [
            { id: balId, currency: base, amount: 0, poolId: 'pool_liquid', isDefaultPayment: true }
          ],
          allocations: []
        }
      ],
      cards: [],
      investments: [],
      wealthSnapshots: [],
      transactions: [],
      splitRules: []
    };
  }

  function createDemoState(baseCurrency) {
    const base = baseCurrency || 'MOP';
    const today = todayISO();
    const pools = JSON.parse(JSON.stringify(DEFAULT_POOLS));
    pools.forEach((p) => {
      if (p.id === 'pool_liquid') {
        p.settlementAccountId = 'acc_bank_main';
        p.settlementBalanceId = 'bal_main_base';
      } else if (p.id === 'pool_household') {
        p.settlementAccountId = 'acc_bank_family';
        p.settlementBalanceId = 'bal_fam_base';
      } else if (p.id === 'pool_reserve' || p.id === 'pool_goal') {
        p.settlementAccountId = 'acc_bank_high';
        p.settlementBalanceId = 'bal_high_base';
      } else if (p.id === 'pool_invest') {
        p.settlementAccountId = 'acc_broker';
        p.settlementBalanceId = 'bal_brk_usd';
      }
    });

    return {
      meta: {
        schemaVersion: SCHEMA_VERSION,
        appVersion: APP_VERSION,
        onboardingDone: true,
        baseCurrency: base,
        privacyMode: false,
        defaultExpenseSource: 'CARD::card_1::',
        fxRates: buildFxMap(base)
      },
      pools,
      categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      accounts: [
        {
          id: 'acc_bank_main',
          name: '主力綜合銀行',
          subtitle: '日常活期・主找數戶',
          type: 'BANK',
          theme: 'sapphire',
          balances: [
            { id: 'bal_main_base', currency: base, amount: 48145, poolId: 'pool_liquid', isDefaultPayment: true },
            { id: 'bal_main_hkd', currency: base === 'HKD' ? 'USD' : 'HKD', amount: 12000, poolId: 'pool_reserve', isDefaultPayment: false }
          ],
          allocations: [
            { id: 'alloc_1', currency: base, name: '應急底倉', amount: 20000, locked: false, poolId: 'pool_reserve' }
          ]
        },
        {
          id: 'acc_bank_family',
          name: '家庭聯名銀行',
          subtitle: '家庭共同開支戶',
          type: 'BANK',
          theme: 'amber',
          balances: [
            { id: 'bal_fam_base', currency: base, amount: 32600, poolId: 'pool_household', isDefaultPayment: false }
          ],
          allocations: []
        },
        {
          id: 'acc_bank_high',
          name: '高息儲蓄銀行',
          subtitle: '高息底倉與目標戶',
          type: 'BANK',
          theme: 'emerald',
          balances: [
            { id: 'bal_high_base', currency: base, amount: 245000, poolId: 'pool_reserve', isDefaultPayment: false }
          ],
          allocations: [
            { id: 'alloc_3', currency: base, name: '核心凍結底倉', amount: 200000, locked: false, poolId: 'pool_reserve' },
            { id: 'alloc_2', currency: base, name: '年度旅行基金', amount: 18000, locked: false, poolId: 'pool_goal' }
          ]
        },
        {
          id: 'acc_ewallet',
          name: '日常電子錢包',
          subtitle: '消費餘額',
          type: 'EWALLET',
          theme: 'copper',
          balances: [
            { id: 'bal_ew_base', currency: base, amount: 2460, poolId: 'pool_liquid', isDefaultPayment: false }
          ],
          allocations: []
        },
        {
          id: 'acc_broker',
          name: '證券投資帳戶',
          subtitle: '美金交割現金',
          type: 'BROKER',
          theme: 'violet',
          balances: [
            { id: 'bal_brk_usd', currency: 'USD', amount: 1650, poolId: 'pool_invest', isDefaultPayment: false }
          ],
          allocations: []
        }
      ],
      cards: [
        {
          id: 'card_1',
          name: '全幣種回贈卡',
          last4: '8821',
          currency: base,
          creditLimit: 80000,
          statementDay: 15,
          dueDay: 5,
          billed: 2680,
          unbilled: 948,
          theme: 'titanium',
          autoPayAccountId: 'acc_bank_main',
          autoPayBalanceId: 'bal_main_base',
          note: '日常與海外消費 2% 回贈'
        },
        {
          id: 'card_2',
          name: '餐飲消費卡',
          last4: '3094',
          currency: base,
          creditLimit: 50000,
          statementDay: 20,
          dueDay: 10,
          billed: 1180,
          unbilled: 240,
          theme: 'crimson',
          autoPayAccountId: 'acc_bank_main',
          autoPayBalanceId: 'bal_main_base',
          note: '餐飲與外賣專享回贈'
        },
        {
          id: 'card_3',
          name: '網購旅遊卡',
          last4: '5160',
          currency: base,
          creditLimit: 60000,
          statementDay: 10,
          dueDay: 28,
          billed: 680,
          unbilled: 0,
          theme: 'sapphire',
          autoPayAccountId: 'acc_bank_high',
          autoPayBalanceId: 'bal_high_base',
          note: '機票酒店與網購專卡'
        }
      ],
      investments: [
        {
          id: 'inv_1',
          name: '6個月定期存款',
          ticker: '',
          type: 'FIXED_DEPOSIT',
          status: 'ACTIVE',
          entryMode: 'EXISTING',
          fundingSource: null,
          currency: base,
          principal: 100000,
          currentValue: 100000,
          shares: null,
          apr: 3.7,
          faceValue: null,
          startDate: '2026-08-15',
          maturityDate: '2027-02-15',
          closedDate: null,
          realizedPnl: 0,
          cumulativeDividends: 0,
          linkedAccountId: 'acc_bank_high',
          linkedBalanceId: 'bal_high_base',
          dca: null,
          dcaHistory: [],
          lastUpdated: today,
          note: '高息銀行 6 個月新資金定存'
        },
        {
          id: 'inv_2',
          name: 'VANGUARD S&P 500 ETF',
          ticker: 'VOO',
          type: 'STOCK_ETF',
          status: 'ACTIVE',
          entryMode: 'EXISTING',
          fundingSource: null,
          currency: 'USD',
          principal: 15000,
          currentValue: 17420,
          shares: 30,
          apr: null,
          faceValue: null,
          startDate: '2025-11-10',
          maturityDate: null,
          closedDate: null,
          realizedPnl: 0,
          cumulativeDividends: 185,
          linkedAccountId: 'acc_broker',
          linkedBalanceId: 'bal_brk_usd',
          dca: { enabled: true, frequency: 'MONTHLY', dayOfMonth: 25, amount: 500, lastExecutedDate: '2026-10-25' },
          dcaHistory: [],
          lastUpdated: today,
          note: '長期核心定投持倉'
        },
        {
          id: 'inv_3',
          name: '6個月美國短期國債',
          ticker: 'T-Bill',
          type: 'TBILL',
          status: 'ACTIVE',
          entryMode: 'EXISTING',
          fundingSource: null,
          currency: 'USD',
          principal: 9790,
          currentValue: 9885,
          shares: null,
          apr: 4.3,
          faceValue: 10000,
          startDate: '2026-08-20',
          maturityDate: '2027-02-18',
          closedDate: null,
          realizedPnl: 0,
          cumulativeDividends: 0,
          linkedAccountId: 'acc_broker',
          linkedBalanceId: 'bal_brk_usd',
          dca: null,
          dcaHistory: [],
          lastUpdated: today,
          note: '貼現買入 · 到期面值 US$ 10,000'
        }
      ],
      wealthSnapshots: [
        {
          id: 'snap_demo_1',
          label: '2026 Q3 季報快照',
          date: '2026-09-30',
          baseCurrency: base,
          totalPrincipalBase: round2(100000 + convertToBase(24790, 'USD', { meta: { baseCurrency: base, fxRates: buildFxMap(base) } })),
          totalValueBase: round2(100000 + convertToBase(26580, 'USD', { meta: { baseCurrency: base, fxRates: buildFxMap(base) } })),
          totalPnlBase: round2(convertToBase(1790, 'USD', { meta: { baseCurrency: base, fxRates: buildFxMap(base) } })),
          note: '第三季券商對帳單歸檔',
          items: [
            { id: 'inv_1', name: '6個月定期存款', ticker: '', type: 'FIXED_DEPOSIT', currency: base, principal: 100000, currentValue: 100000 },
            { id: 'inv_2', name: '標普 500 指數 ETF', ticker: 'VOO', type: 'ETF', currency: 'USD', principal: 15000, currentValue: 16750 },
            { id: 'inv_3', name: '6個月美國短期國債', ticker: 'T-Bill', type: 'TBILL', currency: 'USD', principal: 9790, currentValue: 9830 }
          ]
        }
      ],
      transactions: [
        // --- Card 1: Unbilled (下期) ---
        {
          id: 'tx_demo_1',
          type: 'EXPENSE',
          title: '午餐',
          amount: 168,
          currency: base,
          settledAmount: 168,
          settledCurrency: base,
          accountKind: 'CARD',
          accountId: 'card_1',
          balanceId: null,
          categoryId: 'cat_food',
          subCategoryId: 'sub_food_2',
          subCategoryName: '午餐',
          poolId: 'pool_liquid',
          billingBucket: 'UNBILLED',
          date: today,
          time: '12:30',
          note: ''
        },
        {
          id: 'tx_demo_2',
          type: 'EXPENSE',
          title: '手沖咖啡',
          amount: 46,
          currency: base,
          settledAmount: 46,
          settledCurrency: base,
          accountKind: 'ACCOUNT',
          accountId: 'acc_ewallet',
          balanceId: 'bal_ew_base',
          categoryId: 'cat_food',
          subCategoryId: 'sub_food_4',
          subCategoryName: '咖啡飲品',
          poolId: 'pool_liquid',
          billingBucket: null,
          date: today,
          time: '09:15',
          note: ''
        },
        {
          id: 'tx_demo_3',
          type: 'RECEIVABLE',
          title: '代墊聚餐款項',
          amount: 140,
          currency: base,
          settledAmount: 140,
          settledCurrency: base,
          accountKind: 'ACCOUNT',
          accountId: 'acc_ewallet',
          balanceId: 'bal_ew_base',
          categoryId: 'cat_food',
          subCategoryId: 'sub_food_5',
          subCategoryName: '聚餐外食',
          poolId: 'pool_liquid',
          billingBucket: null,
          counterparty: '同事 A',
          isLoanSettled: false,
          settlementTxId: null,
          date: today,
          time: '08:40',
          note: '週五聚餐代付'
        },
        {
          id: 'tx_demo_c1_u2',
          type: 'EXPENSE',
          title: '水電煤網',
          amount: 780,
          currency: base,
          settledAmount: 780,
          settledCurrency: base,
          accountKind: 'CARD',
          accountId: 'card_1',
          balanceId: null,
          categoryId: 'cat_home',
          subCategoryId: 'sub_hm_1',
          subCategoryName: '水電煤網',
          poolId: 'pool_household',
          billingBucket: 'UNBILLED',
          date: demoDateForStmt(15, false, 3),
          time: '18:20',
          note: '居家月費自動扣刷'
        },
        // --- Card 1: Billed (本期已出帳 2,680 = 1,500 專項 + 720 家庭 + 460 日常) ---
        {
          id: 'tx_demo_c1_b1',
          type: 'EXPENSE',
          title: '旅遊機票預訂',
          amount: 1500,
          currency: base,
          settledAmount: 1500,
          settledCurrency: base,
          accountKind: 'CARD',
          accountId: 'card_1',
          balanceId: null,
          categoryId: 'cat_leisure',
          subCategoryId: 'sub_le_3',
          subCategoryName: '旅遊度假',
          poolId: 'pool_goal',
          billingBucket: 'BILLED',
          date: demoDateForStmt(15, true, 3),
          time: '20:15',
          note: '由高息儲蓄銀行專項目標歸墊'
        },
        {
          id: 'tx_demo_c1_b2',
          type: 'EXPENSE',
          title: '超市買菜',
          amount: 720,
          currency: base,
          settledAmount: 720,
          settledCurrency: base,
          accountKind: 'CARD',
          accountId: 'card_1',
          balanceId: null,
          categoryId: 'cat_food',
          subCategoryId: 'sub_food_6',
          subCategoryName: '超市買菜',
          poolId: 'pool_household',
          billingBucket: 'BILLED',
          date: demoDateForStmt(15, true, 5),
          time: '17:45',
          note: '由家庭聯名銀行歸墊'
        },
        {
          id: 'tx_demo_c1_b3',
          type: 'EXPENSE',
          title: '商務午餐與交通',
          amount: 460,
          currency: base,
          settledAmount: 460,
          settledCurrency: base,
          accountKind: 'CARD',
          accountId: 'card_1',
          balanceId: null,
          categoryId: 'cat_food',
          subCategoryId: 'sub_food_2',
          subCategoryName: '午餐',
          poolId: 'pool_liquid',
          billingBucket: 'BILLED',
          date: demoDateForStmt(15, true, 7),
          time: '13:10',
          note: ''
        },
        // --- Card 2: Billed (1,180 = 860 家庭 + 320 日常) & Unbilled (240) ---
        {
          id: 'tx_demo_c2_u1',
          type: 'EXPENSE',
          title: '咖啡飲品與輕食',
          amount: 240,
          currency: base,
          settledAmount: 240,
          settledCurrency: base,
          accountKind: 'CARD',
          accountId: 'card_2',
          balanceId: null,
          categoryId: 'cat_food',
          subCategoryId: 'sub_food_4',
          subCategoryName: '咖啡飲品',
          poolId: 'pool_liquid',
          billingBucket: 'UNBILLED',
          date: demoDateForStmt(20, false, 2),
          time: '15:20',
          note: ''
        },
        {
          id: 'tx_demo_c2_b1',
          type: 'EXPENSE',
          title: '家庭週末聚餐',
          amount: 860,
          currency: base,
          settledAmount: 860,
          settledCurrency: base,
          accountKind: 'CARD',
          accountId: 'card_2',
          balanceId: null,
          categoryId: 'cat_food',
          subCategoryId: 'sub_food_5',
          subCategoryName: '聚餐外食',
          poolId: 'pool_household',
          billingBucket: 'BILLED',
          date: demoDateForStmt(20, true, 2),
          time: '19:30',
          note: '由家庭聯名銀行歸墊至主力綜合銀行'
        },
        {
          id: 'tx_demo_c2_b2',
          type: 'EXPENSE',
          title: '工作日午餐',
          amount: 320,
          currency: base,
          settledAmount: 320,
          settledCurrency: base,
          accountKind: 'CARD',
          accountId: 'card_2',
          balanceId: null,
          categoryId: 'cat_food',
          subCategoryId: 'sub_food_2',
          subCategoryName: '午餐',
          poolId: 'pool_liquid',
          billingBucket: 'BILLED',
          date: demoDateForStmt(20, true, 6),
          time: '12:40',
          note: ''
        },
        // --- Card 3: Main Bank is 高息儲蓄銀行; Billed 680 from 日常流動 (主力綜合銀行) ---
        {
          id: 'tx_demo_c3_b1',
          type: 'EXPENSE',
          title: '運動用品網購',
          amount: 680,
          currency: base,
          settledAmount: 680,
          settledCurrency: base,
          accountKind: 'CARD',
          accountId: 'card_3',
          balanceId: null,
          categoryId: 'cat_shopping',
          subCategoryId: 'sub_sh_4',
          subCategoryName: '網購消費',
          poolId: 'pool_liquid',
          billingBucket: 'BILLED',
          date: demoDateForStmt(10, true, 3),
          time: '21:10',
          note: '由主力綜合銀行轉入高息儲蓄銀行找數'
        }
      ],
      splitRules: [
        {
          id: 'sr_1',
          name: '每月薪資入帳',
          enabled: true,
          type: 'INCOME',
          amount: 32000,
          currency: base,
          fromAccountId: null,
          fromBalanceId: null,
          toAccountId: 'acc_bank_main',
          toBalanceId: 'bal_main_base',
          categoryId: 'cat_salary',
          poolId: 'pool_liquid'
        },
        {
          id: 'sr_2',
          name: '自動撥入高息儲蓄',
          enabled: true,
          type: 'TRANSFER',
          amount: 10000,
          currency: base,
          fromAccountId: 'acc_bank_main',
          fromBalanceId: 'bal_main_base',
          toAccountId: 'acc_bank_high',
          toBalanceId: 'bal_high_base',
          categoryId: null,
          poolId: 'pool_reserve'
        },
        {
          id: 'sr_3',
          name: '撥入家庭共同戶',
          enabled: true,
          type: 'TRANSFER',
          amount: 6000,
          currency: base,
          fromAccountId: 'acc_bank_main',
          fromBalanceId: 'bal_main_base',
          toAccountId: 'acc_bank_family',
          toBalanceId: 'bal_fam_base',
          categoryId: null,
          poolId: 'pool_household'
        },
        {
          id: 'sr_4',
          name: '電子錢包月度增值',
          enabled: true,
          type: 'TRANSFER',
          amount: 3000,
          currency: base,
          fromAccountId: 'acc_bank_main',
          fromBalanceId: 'bal_main_base',
          toAccountId: 'acc_ewallet',
          toBalanceId: 'bal_ew_base',
          categoryId: null,
          poolId: 'pool_liquid'
        }
      ]
    };
  }

  function createInitialUnboardedState() {
    const st = createBlankState('MOP');
    st.meta.onboardingDone = false;
    return st;
  }

  function migrateState(raw) {
    if (!raw || typeof raw !== 'object') return createInitialUnboardedState();
    const base = (raw.meta && raw.meta.baseCurrency) || 'MOP';
    const rawPools = Array.isArray(raw.pools) && raw.pools.length
      ? raw.pools
      : JSON.parse(JSON.stringify(DEFAULT_POOLS));

    const migratedPools = rawPools.map((p) => Object.assign(
      { settlementAccountId: null, settlementBalanceId: null, note: '' },
      p
    ));

    const rawCats = Array.isArray(raw.categories) && raw.categories.length
      ? raw.categories
      : JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));

    const migratedCats = rawCats.map((c) => {
      const defMatch = DEFAULT_CATEGORIES.find((d) => d.id === c.id);
      const subs = Array.isArray(c.subcategories)
        ? c.subcategories.map((s) => Object.assign({ defaultPoolId: null }, s))
        : (defMatch ? JSON.parse(JSON.stringify(defMatch.subcategories)) : []);
      return Object.assign({}, c, { subcategories: subs });
    });

    const next = {
      meta: Object.assign(
        {
          schemaVersion: SCHEMA_VERSION,
          appVersion: APP_VERSION,
          onboardingDone: true,
          baseCurrency: base,
          privacyMode: false,
          defaultExpenseSource: null,
          fxRates: buildFxMap(base)
        },
        raw.meta || {},
        { schemaVersion: SCHEMA_VERSION, appVersion: APP_VERSION }
      ),
      pools: migratedPools,
      categories: migratedCats,
      accounts: Array.isArray(raw.accounts) ? raw.accounts : [],
      cards: Array.isArray(raw.cards) ? raw.cards.map((c) => Object.assign(
        { last4: '', currency: base, creditLimit: 50000, statementDay: 15, dueDay: 5, unbilled: 0, billed: 0, theme: 'titanium', autoPayAccountId: null, autoPayBalanceId: null, note: '' },
        c
      )) : [],
      investments: Array.isArray(raw.investments) ? raw.investments.map((inv) => {
        const baseObj = Object.assign({
          ticker: '',
          type: 'FIXED_DEPOSIT',
          status: 'ACTIVE',
          entryMode: 'EXISTING',
          fundingSource: null,
          currency: base,
          principal: 0,
          currentValue: 0,
          shares: null,
          apr: null,
          faceValue: null,
          startDate: null,
          maturityDate: null,
          closedDate: null,
          realizedPnl: 0,
          cumulativeDividends: 0,
          linkedAccountId: null,
          linkedBalanceId: null,
          dca: null,
          dcaHistory: [],
          lastUpdated: todayISO(),
          note: ''
        }, inv || {});
        if (baseObj.type === 'ETF' || baseObj.type === 'STOCK') {
          baseObj.type = 'STOCK_ETF';
        }
        if (baseObj.id === 'inv_1' && baseObj.type === 'FIXED_DEPOSIT' && !baseObj.linkedAccountId && Array.isArray(raw.accounts) && raw.accounts.some((a) => a.id === 'acc_bank_high')) {
          baseObj.linkedAccountId = 'acc_bank_high';
          baseObj.linkedBalanceId = 'bal_high_base';
        }
        if (baseObj.type === 'FIXED_DEPOSIT' && !baseObj.startDate && baseObj.maturityDate) {
          const md = new Date(baseObj.maturityDate);
          if (!Number.isNaN(md.getTime())) {
            md.setMonth(md.getMonth() - 6);
            baseObj.startDate = formatDateISO(md);
          }
        }
        if (!Array.isArray(baseObj.dcaHistory)) baseObj.dcaHistory = [];
        return baseObj;
      }) : [],
      wealthSnapshots: Array.isArray(raw.wealthSnapshots) ? raw.wealthSnapshots : [],
      transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
      splitRules: Array.isArray(raw.splitRules) ? raw.splitRules : []
    };
    if (!next.meta.fxRates || typeof next.meta.fxRates !== 'object') {
      next.meta.fxRates = buildFxMap(base);
    }
    return next;
  }

  let state = (function loadInitial() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return migrateState(JSON.parse(saved));
    } catch (e) {}
    return createInitialUnboardedState();
  })();

  const listeners = new Set();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function notify() {
    persist();
    listeners.forEach((fn) => {
      try { fn(state); } catch (e) {}
    });
  }

  function cloneState() {
    return JSON.parse(JSON.stringify(state));
  }

  function adjustAccountOrCard(draft, kind, accountId, balanceId, delta, cardBucket) {
    const d = round2(delta);
    if (!d) return;
    if (kind === 'CARD') {
      const card = draft.cards.find((c) => c.id === accountId);
      if (card) {
        if (cardBucket === 'BILLED') {
          card.billed = round2((card.billed || 0) + d);
        } else {
          card.unbilled = round2((card.unbilled || 0) + d);
        }
      }
      return;
    }
    const acc = draft.accounts.find((a) => a.id === accountId);
    if (!acc) return;
    let bal = balanceId ? acc.balances.find((b) => b.id === balanceId) : acc.balances[0];
    if (!bal && acc.balances.length > 0) bal = acc.balances[0];
    if (bal) {
      bal.amount = round2((bal.amount || 0) + d);
    }
  }

  function applyTransactionEffect(draft, tx, sign) {
    const amt = round2(tx.amount);
    const settled = round2(tx.settledAmount != null ? tx.settledAmount : amt);

    if (tx.type === 'EXPENSE') {
      if (tx.accountKind === 'CARD') {
        adjustAccountOrCard(draft, 'CARD', tx.accountId, null, sign * settled, tx.billingBucket);
      } else {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, -sign * settled);
      }
    } else if (tx.type === 'INCOME') {
      if (tx.accountKind === 'CARD') {
        adjustAccountOrCard(draft, 'CARD', tx.accountId, null, -sign * settled, tx.billingBucket);
      } else {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, sign * settled);
      }
    } else if (tx.type === 'TRANSFER') {
      if (tx.accountKind === 'CARD') {
        adjustAccountOrCard(draft, 'CARD', tx.accountId, null, sign * amt, tx.billingBucket);
      } else {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, -sign * amt);
      }
      if (tx.toAccountKind === 'CARD') {
        if (tx.billedApplied != null || tx.unbilledApplied != null) {
          if (tx.billedApplied) adjustAccountOrCard(draft, 'CARD', tx.toAccountId, null, -sign * tx.billedApplied, 'BILLED');
          if (tx.unbilledApplied) adjustAccountOrCard(draft, 'CARD', tx.toAccountId, null, -sign * tx.unbilledApplied, 'UNBILLED');
        } else {
          adjustAccountOrCard(draft, 'CARD', tx.toAccountId, null, -sign * settled, tx.billingBucket);
        }
      } else {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.toAccountId, tx.toBalanceId, sign * settled);
      }
    } else if (tx.type === 'RECEIVABLE') {
      if (tx.accountKind === 'CARD') {
        adjustAccountOrCard(draft, 'CARD', tx.accountId, null, sign * settled, tx.billingBucket);
      } else {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, -sign * settled);
      }
    } else if (tx.type === 'PAYABLE') {
      if (tx.accountId && tx.accountKind !== 'CARD') {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, sign * settled);
      }
    } else if (tx.type === 'LOAN_SETTLEMENT') {
      if (tx.settlementDirection === 'IN') {
        if (tx.accountKind === 'CARD') {
          adjustAccountOrCard(draft, 'CARD', tx.accountId, null, -sign * settled);
        } else {
          adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, sign * settled);
        }
      } else {
        if (tx.accountKind === 'CARD') {
          adjustAccountOrCard(draft, 'CARD', tx.accountId, null, sign * settled);
        } else {
          adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, -sign * settled);
        }
      }
    } else if (tx.type === 'INVEST_FLOW') {
      if (tx.accountId && tx.accountKind !== 'CARD') {
        const dir = tx.flowDirection === 'IN' ? 1 : -1;
        adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, dir * sign * settled);
      }
    }
  }

  function convertToBase(amount, currency, st) {
    const s = st || state;
    const base = s.meta.baseCurrency || 'MOP';
    if (!currency || currency === base) return round2(amount);
    const rate = (s.meta.fxRates && s.meta.fxRates[currency]) || 1;
    return round2(Number(amount || 0) * rate);
  }

  function getCurrencySymbol(code) {
    const found = CURRENCIES.find((c) => c.code === code);
    return found ? found.symbol : (code || '') + '$';
  }

  function formatMoney(amount, currency, options) {
    const opts = options || {};
    const hide = opts.privacy != null ? opts.privacy : state.meta.privacyMode;
    const cur = currency || state.meta.baseCurrency || 'MOP';
    const sym = getCurrencySymbol(cur);
    if (hide) return `${sym} •••••`;
    const num = Number(amount || 0);
    const absNum = Math.abs(num);
    const hasDecimal = Math.abs(absNum - Math.round(absNum)) > 0.001;
    const formatted = absNum.toLocaleString('en-US', {
      minimumFractionDigits: opts.forceDecimals ? 2 : (hasDecimal ? 2 : 0),
      maximumFractionDigits: 2
    });
    const prefix = num < 0 ? '-' : (opts.showPlus && num > 0 ? '+' : '');
    return `${prefix}${sym} ${formatted}`;
  }

  function resolveEffectivePoolId(categoryId, subCategoryId, st) {
    const s = st || state;
    const fallback = (s.pools[0] && s.pools[0].id) || 'pool_liquid';
    const cat = (s.categories || []).find((c) => c.id === categoryId);
    if (!cat) return fallback;
    if (subCategoryId && Array.isArray(cat.subcategories)) {
      const sub = cat.subcategories.find((x) => x.id === subCategoryId);
      if (sub && sub.defaultPoolId && s.pools.some((p) => p.id === sub.defaultPoolId)) {
        return sub.defaultPoolId;
      }
    }
    if (cat.defaultPoolId && s.pools.some((p) => p.id === cat.defaultPoolId)) {
      return cat.defaultPoolId;
    }
    return fallback;
  }

  function getPoolSettlementLabel(poolId, st) {
    const s = st || state;
    const pool = (s.pools || []).find((p) => p.id === poolId);
    if (!pool || !pool.settlementAccountId) return null;
    const acc = (s.accounts || []).find((a) => a.id === pool.settlementAccountId);
    if (!acc) return null;
    const bal = pool.settlementBalanceId
      ? (acc.balances || []).find((b) => b.id === pool.settlementBalanceId)
      : (acc.balances || [])[0];
    return bal && acc.balances.length > 1 ? `${acc.name} (${bal.currency})` : acc.name;
  }

  function getAccountOverflowInfo(acc, st) {
    if (!acc) return { hasOverflow: false, currencies: [], primaryOverflow: null };
    const allocByCur = {};
    (acc.allocations || []).forEach((al) => {
      allocByCur[al.currency] = round2((allocByCur[al.currency] || 0) + Math.max(0, Number(al.amount || 0)));
    });
    const currencies = [];
    (acc.balances || []).forEach((bal) => {
      const total = round2(bal.amount || 0);
      const allocated = round2(allocByCur[bal.currency] || 0);
      if (allocated > Math.max(0, total) + 0.01) {
        currencies.push({
          balanceId: bal.id,
          currency: bal.currency,
          total,
          allocated,
          deficit: round2(allocated - Math.max(0, total))
        });
      }
    });
    return {
      hasOverflow: currencies.length > 0,
      currencies,
      primaryOverflow: currencies[0] || null
    };
  }

  function getSummaryMetrics(st) {
    const s = st || state;
    let walletTotal = 0;
    let freeWallet = 0;
    let allocatedWallet = 0;
    let overflowAccountCount = 0;

    s.accounts.forEach((acc) => {
      const allocByCur = {};
      (acc.allocations || []).forEach((al) => {
        allocByCur[al.currency] = round2((allocByCur[al.currency] || 0) + Math.max(0, Number(al.amount || 0)));
      });
      let accHasOverflow = false;
      (acc.balances || []).forEach((bal) => {
        const totalCur = round2(bal.amount || 0);
        const allocCur = round2(allocByCur[bal.currency] || 0);
        if (allocCur > Math.max(0, totalCur) + 0.01) accHasOverflow = true;
        const effectiveAllocCur = Math.min(Math.max(0, totalCur), allocCur);
        const freeCur = totalCur > 0 ? round2(totalCur - effectiveAllocCur) : 0;
        walletTotal += convertToBase(totalCur, bal.currency, s);
        allocatedWallet += convertToBase(effectiveAllocCur, bal.currency, s);
        freeWallet += convertToBase(freeCur, bal.currency, s);
      });
      if (accHasOverflow) overflowAccountCount += 1;
    });

    let investmentsTotal = 0;
    (s.investments || []).forEach((inv) => {
      if (inv.status === 'CLOSED') return;
      const val = inv.type === 'FIXED_DEPOSIT'
        ? (inv.principal || inv.currentValue || 0)
        : (inv.currentValue != null ? inv.currentValue : (inv.principal || 0));
      investmentsTotal += convertToBase(val, inv.currency, s);
    });

    let cardDebt = 0;
    (s.cards || []).forEach((c) => {
      cardDebt += convertToBase((c.unbilled || 0) + (c.billed || 0), c.currency, s);
    });

    let pendingReceivables = 0;
    let pendingPayables = 0;
    (s.transactions || []).forEach((tx) => {
      if (tx.type === 'RECEIVABLE' && !tx.isLoanSettled) {
        pendingReceivables += convertToBase(tx.amount, tx.currency, s);
      } else if (tx.type === 'PAYABLE' && !tx.isLoanSettled) {
        pendingPayables += convertToBase(tx.amount, tx.currency, s);
      }
    });

    const walletTotalR = round2(walletTotal);
    const investmentsTotalR = round2(investmentsTotal);
    const totalNetWorth = round2(walletTotalR + investmentsTotalR + pendingReceivables - pendingPayables - cardDebt);

    return {
      walletTotal: walletTotalR,
      freeWallet: round2(freeWallet),
      allocatedWallet: round2(allocatedWallet),
      overflowAccountCount,
      liquidCash: walletTotalR,
      lockedWallet: 0,
      investmentsTotal: investmentsTotalR,
      lockedAndInvestments: investmentsTotalR,
      cardDebt: round2(cardDebt),
      pendingReceivables: round2(pendingReceivables),
      pendingPayables: round2(pendingPayables),
      totalNetWorth
    };
  }

  function getCreditCardCycle(card, bucket) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayD = now.getDate();
    const todayMid = new Date(y, m, todayD);
    const stmtDay = Math.min(28, Math.max(1, Number((card && card.statementDay) || 15)));
    const dueDay = Math.min(28, Math.max(1, Number((card && card.dueDay) || 5)));
    const hasBilledDebt = Boolean(card && Number(card.billed || 0) > 0);

    // 1. 本期已出帳 (BILLED): Most recently closed statement cycle
    const billedEnd = todayD >= stmtDay
      ? new Date(y, m, stmtDay)
      : new Date(y, m - 1, stmtDay);
    const billedStart = new Date(billedEnd.getFullYear(), billedEnd.getMonth() - 1, stmtDay + 1);
    let billedDue = new Date(billedEnd.getFullYear(), billedEnd.getMonth(), dueDay);
    if (billedDue.getTime() <= billedEnd.getTime()) {
      billedDue = new Date(billedEnd.getFullYear(), billedEnd.getMonth() + 1, dueDay);
    }

    // 2. 未出帳下期 (UNBILLED): Currently accumulating cycle (closing next statementDay)
    const unbilledStart = new Date(billedEnd.getFullYear(), billedEnd.getMonth(), billedEnd.getDate() + 1);
    const unbilledEnd = new Date(billedEnd.getFullYear(), billedEnd.getMonth() + 1, stmtDay);
    let unbilledDue = new Date(unbilledEnd.getFullYear(), unbilledEnd.getMonth(), dueDay);
    if (unbilledDue.getTime() <= unbilledEnd.getTime()) {
      unbilledDue = new Date(unbilledEnd.getFullYear(), unbilledEnd.getMonth() + 1, dueDay);
    }

    const fmtSlash = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    const fmtZh = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;

    const buildCycleInfo = (startD, endD, dueD, kind) => {
      const diffDays = Math.round((dueD.getTime() - todayMid.getTime()) / 86400000);
      const isOverdue = kind === 'BILLED' && diffDays < 0 && hasBilledDebt;
      const isUrgent = kind === 'BILLED' && diffDays >= 0 && diffDays <= 5 && hasBilledDebt;
      let countdownText;
      if (diffDays < 0) {
        countdownText = hasBilledDebt && kind === 'BILLED'
          ? `已逾期 ${Math.abs(diffDays)} 天`
          : `已過到期日`;
      } else if (diffDays === 0) {
        countdownText = '今日到期';
      } else {
        countdownText = `${diffDays} 天後到期`;
      }
      return {
        kind,
        monthNum: endD.getMonth() + 1,
        monthLabel: `${endD.getMonth() + 1}月帳單`,
        periodLabel: `${fmtSlash(startD)} – ${fmtSlash(endD)}`,
        stmtDateLabel: `${fmtSlash(endD)} 截數`,
        dueLabel: fmtZh(dueD),
        shortDueLabel: fmtSlash(dueD),
        daysToDue: diffDays,
        countdownText,
        isOverdue,
        isUrgent
      };
    };

    const billed = buildCycleInfo(billedStart, billedEnd, billedDue, 'BILLED');
    const unbilled = buildCycleInfo(unbilledStart, unbilledEnd, unbilledDue, 'UNBILLED');

    let active;
    if (bucket === 'BILLED') {
      active = billed;
    } else if (bucket === 'UNBILLED') {
      active = unbilled;
    } else {
      active = hasBilledDebt ? billed : unbilled;
    }

    return Object.assign({}, active, {
      billed,
      unbilled,
      active
    });
  }

  function getAutoCardBillingBucket(card, txDateISO) {
    const stmtDay = Math.min(28, Math.max(1, Number((card && card.statementDay) || 15)));
    const now = new Date();
    const todayD = now.getDate();
    const lastStmtDate = todayD >= stmtDay
      ? new Date(now.getFullYear(), now.getMonth(), stmtDay)
      : new Date(now.getFullYear(), now.getMonth() - 1, stmtDay);

    const parts = String(txDateISO || todayISO()).split('-').map(Number);
    const txD = new Date(parts[0] || now.getFullYear(), (parts[1] || (now.getMonth() + 1)) - 1, parts[2] || todayD);
    return txD.getTime() <= lastStmtDate.getTime() ? 'BILLED' : 'UNBILLED';
  }

  function resolveBankAccountInfo(accId, balId, preferredCurrency, st) {
    const s = st || state;
    let acc = accId ? (s.accounts || []).find((a) => a.id === accId) : null;
    if (!acc) {
      for (let i = 0; i < (s.accounts || []).length; i++) {
        const a = s.accounts[i];
        const defB = (a.balances || []).find((b) => b.isDefaultPayment);
        if (defB) {
          return {
            key: `${a.id}::${defB.id}`,
            accountId: a.id,
            balanceId: defB.id,
            currency: defB.currency,
            balanceAmount: round2(defB.amount || 0),
            label: a.balances.length > 1 ? `${a.name} (${defB.currency})` : a.name,
            shortName: a.name
          };
        }
      }
      acc = (s.accounts || [])[0] || null;
    }
    if (!acc || !(acc.balances || []).length) return null;
    let bal = balId ? acc.balances.find((b) => b.id === balId) : null;
    if (!bal && preferredCurrency) bal = acc.balances.find((b) => b.currency === preferredCurrency);
    if (!bal) bal = acc.balances[0];
    return {
      key: `${acc.id}::${bal.id}`,
      accountId: acc.id,
      balanceId: bal.id,
      currency: bal.currency,
      balanceAmount: round2(bal.amount || 0),
      label: acc.balances.length > 1 ? `${acc.name} (${bal.currency})` : acc.name,
      shortName: acc.name
    };
  }

  function convertBetweenCurrencies(amount, fromCur, toCur, st) {
    if (!fromCur || !toCur || fromCur === toCur) return round2(amount);
    const s = st || state;
    const inBase = convertToBase(amount, fromCur, s);
    const toRate = (s.meta.fxRates && s.meta.fxRates[toCur]) || 1;
    return round2(inBase / toRate);
  }

  function getCardPoolBreakdown(cardId, bucketFilter, st) {
    const s = st || state;
    const card = (s.cards || []).find((c) => c.id === cardId);
    if (!card) return { targetTotal: 0, pools: [], byBank: [] };

    const mode = bucketFilter || 'ALL';
    const targetTotal = mode === 'BILLED'
      ? Math.max(0, round2(card.billed || 0))
      : mode === 'UNBILLED'
      ? Math.max(0, round2(card.unbilled || 0))
      : Math.max(0, round2((card.billed || 0) + (card.unbilled || 0)));

    const mainBank = resolveBankAccountInfo(card.autoPayAccountId, card.autoPayBalanceId, card.currency, s);

    const poolTotals = {};
    const txCharges = (s.transactions || []).filter((tx) => {
      if (tx.accountKind !== 'CARD' || tx.accountId !== cardId) return false;
      if (tx.type !== 'EXPENSE' && tx.type !== 'RECEIVABLE' && tx.type !== 'INCOME') return false;
      const b = tx.billingBucket || 'UNBILLED';
      if (mode === 'BILLED' && b !== 'BILLED') return false;
      if (mode === 'UNBILLED' && b !== 'UNBILLED') return false;
      return true;
    });

    txCharges.forEach((tx) => {
      const pid = tx.poolId || (s.pools[0] && s.pools[0].id) || 'pool_liquid';
      const amt = round2(tx.settledAmount != null ? tx.settledAmount : tx.amount);
      const signed = tx.type === 'INCOME' ? -amt : amt;
      poolTotals[pid] = round2((poolTotals[pid] || 0) + signed);
    });

    const poolsList = [];
    let taggedPositiveSum = 0;
    Object.keys(poolTotals).forEach((pid) => {
      const val = round2(poolTotals[pid]);
      if (val <= 0) return;
      const pObj = (s.pools || []).find((p) => p.id === pid) || { id: pid, name: '一般資金池', color: '#9CA3AF' };
      const bankInfo = resolveBankAccountInfo(
        pObj.settlementAccountId || card.autoPayAccountId,
        pObj.settlementBalanceId || card.autoPayBalanceId,
        card.currency,
        s
      );
      poolsList.push({
        poolId: pObj.id,
        poolName: pObj.name,
        color: pObj.color || '#9CA3AF',
        amount: val,
        bank: bankInfo
      });
      taggedPositiveSum = round2(taggedPositiveSum + val);
    });

    if (targetTotal > 0) {
      if (taggedPositiveSum === 0) {
        poolsList.push({
          poolId: '__unassigned__',
          poolName: '未歸類／期初帳款',
          color: '#71717A',
          amount: targetTotal,
          bank: mainBank
        });
      } else if (taggedPositiveSum < targetTotal - 0.01) {
        poolsList.push({
          poolId: '__unassigned__',
          poolName: '前期結轉／未分類餘額',
          color: '#71717A',
          amount: round2(targetTotal - taggedPositiveSum),
          bank: mainBank
        });
      } else if (taggedPositiveSum > targetTotal + 0.01) {
        const ratio = targetTotal / taggedPositiveSum;
        let running = 0;
        poolsList.forEach((item, idx) => {
          if (idx === poolsList.length - 1) {
            item.amount = Math.max(0, round2(targetTotal - running));
          } else {
            item.amount = round2(item.amount * ratio);
            running = round2(running + item.amount);
          }
        });
      }
    } else {
      poolsList.length = 0;
    }

    const bankMap = new Map();
    poolsList.forEach((item) => {
      const bKey = item.bank ? item.bank.key : '__unassigned_bank__';
      if (!bankMap.has(bKey)) {
        bankMap.set(bKey, {
          key: bKey,
          accountId: item.bank ? item.bank.accountId : null,
          balanceId: item.bank ? item.bank.balanceId : null,
          label: item.bank ? item.bank.label : '未綁定找數戶口',
          shortName: item.bank ? item.bank.shortName : '未綁定戶口',
          bankCurrency: item.bank ? item.bank.currency : card.currency,
          bankBalance: item.bank ? item.bank.balanceAmount : 0,
          currency: card.currency,
          amount: 0,
          pools: []
        });
      }
      const entry = bankMap.get(bKey);
      entry.amount = round2(entry.amount + item.amount);
      entry.pools.push({ poolId: item.poolId, name: item.poolName, color: item.color, amount: item.amount });
    });

    return {
      targetTotal,
      mainBank,
      pools: poolsList.sort((a, b) => b.amount - a.amount),
      byBank: Array.from(bankMap.values()).sort((a, b) => b.amount - a.amount)
    };
  }

  function getCardSettlementPlan(cardId, bucketFilter, st) {
    const s = st || state;
    const card = (s.cards || []).find((c) => c.id === cardId);
    if (!card) {
      return {
        targetTotal: 0,
        currency: s.meta.baseCurrency,
        mainBank: null,
        inboundTransfers: [],
        mainBankSelfAmount: 0,
        mainBankSelfPools: [],
        totalInboundRequired: 0,
        totalInboundRemaining: 0,
        totalInboundDone: 0,
        mainBankAfterInbound: 0,
        mainBankAfterPay: 0,
        isMainBankSufficientAfterInbound: true,
        pools: [],
        byBank: []
      };
    }

    const mode = bucketFilter || 'ALL';
    const bd = getCardPoolBreakdown(cardId, mode, s);
    const mainBank = bd.mainBank;
    const mainKey = mainBank ? mainBank.key : null;

    // Tally already-executed (uncleared) reimbursement transfers into this card's mainBank
    const reimbursedByFromKey = {};
    (s.transactions || []).forEach((tx) => {
      if (tx.type !== 'TRANSFER' || !tx.cardReimbursement) return;
      const cr = tx.cardReimbursement;
      if (cr.cardId !== cardId || cr.cleared) return;
      if (mode !== 'ALL' && cr.bucket && cr.bucket !== 'ALL' && cr.bucket !== mode) return;
      const fKey = `${tx.accountId}::${tx.balanceId || ''}`;
      const amtInCard = round2(cr.amountInCardCur != null ? cr.amountInCardCur : tx.settledAmount);
      reimbursedByFromKey[fKey] = round2((reimbursedByFromKey[fKey] || 0) + amtInCard);
    });

    const inboundTransfers = [];
    let mainBankSelfAmount = 0;
    const mainBankSelfPools = [];

    bd.byBank.forEach((b) => {
      if (mainKey && b.key === mainKey) {
        mainBankSelfAmount = round2(mainBankSelfAmount + b.amount);
        b.pools.forEach((p) => mainBankSelfPools.push(p));
      } else {
        const doneAmt = Math.min(b.amount, round2(reimbursedByFromKey[b.key] || 0));
        const remAmt = Math.max(0, round2(b.amount - doneAmt));
        const remInSourceCur = convertBetweenCurrencies(remAmt, card.currency, b.bankCurrency, s);
        inboundTransfers.push({
          fromKey: b.key,
          fromAccountId: b.accountId,
          fromBalanceId: b.balanceId,
          fromLabel: b.label,
          fromShortName: b.shortName,
          fromCurrency: b.bankCurrency,
          fromBalance: b.bankBalance,
          toKey: mainKey,
          toAccountId: mainBank ? mainBank.accountId : null,
          toBalanceId: mainBank ? mainBank.balanceId : null,
          toLabel: mainBank ? mainBank.label : '未設定主找數戶口',
          toCurrency: mainBank ? mainBank.currency : card.currency,
          cardCurrency: card.currency,
          requiredAmount: b.amount,
          alreadyReimbursed: doneAmt,
          remainingAmount: remAmt,
          remainingInSourceCur: remInSourceCur,
          isDone: remAmt <= 0.01,
          pools: b.pools
        });
      }
    });

    const totalInboundRequired = round2(inboundTransfers.reduce((acc, x) => acc + x.requiredAmount, 0));
    const totalInboundDone = round2(inboundTransfers.reduce((acc, x) => acc + x.alreadyReimbursed, 0));
    const totalInboundRemaining = round2(inboundTransfers.reduce((acc, x) => acc + x.remainingAmount, 0));

    const mainCur = mainBank ? mainBank.currency : card.currency;
    const mainBalNow = mainBank ? mainBank.balanceAmount : 0;
    const remInboundInMainCur = convertBetweenCurrencies(totalInboundRemaining, card.currency, mainCur, s);
    const totalDueInMainCur = convertBetweenCurrencies(bd.targetTotal, card.currency, mainCur, s);

    const mainBankAfterInbound = round2(mainBalNow + remInboundInMainCur);
    const mainBankAfterPay = round2(mainBankAfterInbound - totalDueInMainCur);

    return {
      targetTotal: bd.targetTotal,
      currency: card.currency,
      mainBank,
      inboundTransfers,
      mainBankSelfAmount,
      mainBankSelfPools,
      totalInboundRequired,
      totalInboundDone,
      totalInboundRemaining,
      mainBankAfterInbound,
      mainBankAfterPay,
      isMainBankSufficientAfterInbound: mainBankAfterPay >= -0.01,
      pools: bd.pools,
      byBank: bd.byBank
    };
  }

  function getAllCardsTransferPlan(bucketFilter, st) {
    const s = st || state;
    const mode = bucketFilter || 'BILLED';
    const routeMap = new Map();
    const mainBankPayMap = new Map();
    let grandDebtBase = 0;
    let grandTransferRemainingBase = 0;
    let grandTransferRequiredBase = 0;

    (s.cards || []).forEach((card) => {
      const plan = getCardSettlementPlan(card.id, mode, s);
      if (plan.targetTotal <= 0) return;

      const cardDebtBase = convertToBase(plan.targetTotal, card.currency, s);
      grandDebtBase = round2(grandDebtBase + cardDebtBase);
      grandTransferRequiredBase = round2(grandTransferRequiredBase + convertToBase(plan.totalInboundRequired, card.currency, s));
      grandTransferRemainingBase = round2(grandTransferRemainingBase + convertToBase(plan.totalInboundRemaining, card.currency, s));

      // Aggregate per-Main-Bank total upcoming autopay deduction
      if (plan.mainBank) {
        const mKey = plan.mainBank.key;
        if (!mainBankPayMap.has(mKey)) {
          mainBankPayMap.set(mKey, {
            key: mKey,
            accountId: plan.mainBank.accountId,
            balanceId: plan.mainBank.balanceId,
            label: plan.mainBank.label,
            currency: plan.mainBank.currency,
            currentBalance: plan.mainBank.balanceAmount,
            totalPayInMainCur: 0,
            totalInboundRemInMainCur: 0,
            cards: []
          });
        }
        const mEntry = mainBankPayMap.get(mKey);
        const payInMain = convertBetweenCurrencies(plan.targetTotal, card.currency, plan.mainBank.currency, s);
        const inRemInMain = convertBetweenCurrencies(plan.totalInboundRemaining, card.currency, plan.mainBank.currency, s);
        mEntry.totalPayInMainCur = round2(mEntry.totalPayInMainCur + payInMain);
        mEntry.totalInboundRemInMainCur = round2(mEntry.totalInboundRemInMainCur + inRemInMain);
        mEntry.cards.push({
          cardId: card.id,
          cardName: card.name,
          last4: card.last4,
          currency: card.currency,
          amount: plan.targetTotal
        });
      }

      // Aggregate cross-bank transfer routes: (fromBank -> toMainBank)
      plan.inboundTransfers.forEach((tr) => {
        const rKey = `${tr.fromKey}==>${tr.toKey}`;
        if (!routeMap.has(rKey)) {
          routeMap.set(rKey, {
            routeKey: rKey,
            fromKey: tr.fromKey,
            fromAccountId: tr.fromAccountId,
            fromBalanceId: tr.fromBalanceId,
            fromLabel: tr.fromLabel,
            fromShortName: tr.fromShortName,
            fromCurrency: tr.fromCurrency,
            toKey: tr.toKey,
            toAccountId: tr.toAccountId,
            toBalanceId: tr.toBalanceId,
            toLabel: tr.toLabel,
            toCurrency: tr.toCurrency,
            totalRequiredBase: 0,
            totalRemainingBase: 0,
            totalRemainingInToCur: 0,
            isDone: true,
            breakdown: []
          });
        }
        const rEntry = routeMap.get(rKey);
        rEntry.totalRequiredBase = round2(rEntry.totalRequiredBase + convertToBase(tr.requiredAmount, card.currency, s));
        rEntry.totalRemainingBase = round2(rEntry.totalRemainingBase + convertToBase(tr.remainingAmount, card.currency, s));
        rEntry.totalRemainingInToCur = round2(
          rEntry.totalRemainingInToCur + convertBetweenCurrencies(tr.remainingAmount, card.currency, tr.toCurrency, s)
        );
        if (!tr.isDone) rEntry.isDone = false;
        rEntry.breakdown.push({
          cardId: card.id,
          cardName: card.name,
          last4: card.last4,
          currency: card.currency,
          requiredAmount: tr.requiredAmount,
          remainingAmount: tr.remainingAmount,
          isDone: tr.isDone,
          pools: tr.pools
        });
      });
    });

    const routes = Array.from(routeMap.values()).sort((a, b) => b.totalRemainingBase - a.totalRemainingBase);
    const mainBanks = Array.from(mainBankPayMap.values()).map((m) => {
      const afterInbound = round2(m.currentBalance + m.totalInboundRemInMainCur);
      const afterPay = round2(afterInbound - m.totalPayInMainCur);
      return Object.assign({}, m, { afterInbound, afterPay, isSufficient: afterPay >= -0.01 });
    }).sort((a, b) => b.totalPayInMainCur - a.totalPayInMainCur);

    return {
      grandDebtBase,
      grandTransferRequiredBase,
      grandTransferRemainingBase,
      pendingRouteCount: routes.filter((r) => !r.isDone).length,
      routes,
      mainBanks
    };
  }

  function getAllCardsSettlementSummary(bucketFilter, st) {
    // Kept for backwards compatibility
    const plan = getAllCardsTransferPlan(bucketFilter, st);
    return { grandBase: plan.grandDebtBase, banks: plan.mainBanks };
  }

  function getDefaultExpenseSourceKey(st) {
    const s = st || state;
    const saved = s.meta && s.meta.defaultExpenseSource;
    if (saved) {
      if (saved.startsWith('CARD::')) {
        const cid = saved.split('::')[1];
        if ((s.cards || []).some((c) => c.id === cid)) return saved;
      } else if (saved.startsWith('ACCOUNT::')) {
        const parts = saved.split('::');
        const acc = (s.accounts || []).find((a) => a.id === parts[1]);
        if (acc && (acc.balances || []).some((b) => b.id === parts[2])) return saved;
      }
    }
    for (let i = 0; i < (s.accounts || []).length; i++) {
      const a = s.accounts[i];
      const defB = (a.balances || []).find((b) => b.isDefaultPayment);
      if (defB) return `ACCOUNT::${a.id}::${defB.id}`;
    }
    if ((s.accounts || []).length && (s.accounts[0].balances || []).length) {
      return `ACCOUNT::${s.accounts[0].id}::${s.accounts[0].balances[0].id}`;
    }
    if ((s.cards || []).length) {
      return `CARD::${s.cards[0].id}::`;
    }
    return '';
  }

  function getAccountLinkedDeposits(accId, st) {
    const s = st || state;
    const items = (s.investments || []).filter(
      (inv) => inv.type === 'FIXED_DEPOSIT' && inv.status !== 'CLOSED' && inv.linkedAccountId === accId
    );
    let totalBase = 0;
    const byCur = {};
    items.forEach((inv) => {
      const val = round2(inv.principal || inv.currentValue || 0);
      const cur = inv.currency || s.meta.baseCurrency;
      totalBase = round2(totalBase + convertToBase(val, cur, s));
      byCur[cur] = round2((byCur[cur] || 0) + val);
    });
    return {
      count: items.length,
      items,
      totalBase,
      byCurrency: byCur
    };
  }

  function getInvestmentMetrics(inv) {
    if (!inv) return { isTerm: false, marketValue: 0, principal: 0, pnl: 0, pnlPct: 0, expectedInterest: 0, maturityTotal: 0, totalDays: 0, elapsedDays: 0, remainingDays: null, progressPct: 0, isMatured: false, impliedApr: 0 };
    const isFD = inv.type === 'FIXED_DEPOSIT';
    const isTBill = inv.type === 'TBILL';
    const isTerm = isFD || isTBill;
    const principal = Math.max(0, round2(inv.principal || 0));
    const faceValue = inv.faceValue ? Math.max(0, round2(inv.faceValue)) : null;
    const apr = Number(inv.apr || 0);

    const parseISO = (iso) => {
      if (!iso) return null;
      const p = String(iso).split('-').map(Number);
      if (p.length !== 3 || !p[0]) return null;
      return new Date(p[0], p[1] - 1, p[2]);
    };

    const now = new Date();
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startD = parseISO(inv.startDate);
    const matD = parseISO(inv.maturityDate);

    let totalDays = 0;
    let elapsedDays = 0;
    let remainingDays = null;
    let progressPct = 0;
    let isMatured = false;

    if (matD) {
      remainingDays = Math.round((matD.getTime() - todayMid.getTime()) / 86400000);
      isMatured = remainingDays <= 0;
      if (startD && matD.getTime() > startD.getTime()) {
        totalDays = Math.max(1, Math.round((matD.getTime() - startD.getTime()) / 86400000));
        elapsedDays = Math.max(0, Math.min(totalDays, Math.round((todayMid.getTime() - startD.getTime()) / 86400000)));
        progressPct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
      } else {
        totalDays = 180;
        progressPct = isMatured ? 100 : 50;
      }
    }

    let expectedInterest = 0;
    let impliedApr = apr;
    if (isFD) {
      const daysForCalc = totalDays > 0 ? totalDays : 180;
      expectedInterest = apr > 0 ? round2(principal * (apr / 100) * (daysForCalc / 365)) : 0;
    } else if (isTBill) {
      if (faceValue && faceValue > principal) {
        expectedInterest = round2(faceValue - principal);
        if (principal > 0 && totalDays > 0) {
          impliedApr = round2((expectedInterest / principal) * (365 / totalDays) * 100);
        }
      } else if (apr > 0) {
        const daysForCalc = totalDays > 0 ? totalDays : 180;
        expectedInterest = round2(principal * (apr / 100) * (daysForCalc / 365));
      }
    }

    const maturityTotal = isTBill && faceValue && faceValue > 0
      ? faceValue
      : round2(principal + expectedInterest);

    const marketValue = isFD
      ? principal
      : round2(inv.currentValue != null ? inv.currentValue : principal);

    const pnl = isFD
      ? expectedInterest
      : round2(marketValue - principal);

    const pnlPct = principal > 0 ? round2((pnl / principal) * 100) : 0;

    return {
      isTerm,
      isFD,
      isTBill,
      principal,
      marketValue,
      faceValue,
      pnl,
      pnlPct,
      expectedInterest,
      impliedApr,
      maturityTotal,
      totalDays,
      elapsedDays,
      remainingDays,
      progressPct,
      isMatured
    };
  }

  function checkSufficientBalance(accountId, balanceId, requiredAmount, requiredCurrency, st) {
    const s = st || state;
    const acc = (s.accounts || []).find((a) => a.id === accountId);
    if (!acc || !(acc.balances || []).length) {
      return { ok: false, available: 0, required: round2(requiredAmount), shortfall: round2(requiredAmount), bankCurrency: requiredCurrency || s.meta.baseCurrency, accountLabel: '未指定帳戶' };
    }
    const bal = (balanceId ? acc.balances.find((b) => b.id === balanceId) : null)
      || (requiredCurrency ? acc.balances.find((b) => b.currency === requiredCurrency) : null)
      || acc.balances[0];
    const reqInBankCur = convertBetweenCurrencies(Math.max(0, round2(requiredAmount || 0)), requiredCurrency || bal.currency, bal.currency, s);
    const avail = round2(bal.amount || 0);
    const shortfall = Math.max(0, round2(reqInBankCur - avail));
    return {
      ok: avail + 0.005 >= reqInBankCur,
      available: avail,
      required: reqInBankCur,
      shortfall,
      bankCurrency: bal.currency,
      balanceId: bal.id,
      accountLabel: acc.balances.length > 1 ? `${acc.name} (${bal.currency})` : acc.name
    };
  }

  function getDcaStatus(inv) {
    if (!inv || inv.type !== 'STOCK_ETF' || inv.status === 'CLOSED' || !inv.dca || !inv.dca.enabled || Number(inv.dca.amount || 0) <= 0) {
      return { enabled: false, isDue: false, isSoon: false, nextDueDate: null, freqLabel: '' };
    }
    const dca = inv.dca;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayD = now.getDate();
    const todayMid = new Date(y, m, todayD);
    const curYM = `${y}-${String(m + 1).padStart(2, '0')}`;
    const last = dca.lastExecutedDate || '';
    const freq = dca.frequency || 'MONTHLY';

    const parseISO = (iso) => {
      if (!iso) return null;
      const p = String(iso).split('-').map(Number);
      return p.length === 3 && p[0] ? new Date(p[0], p[1] - 1, p[2]) : null;
    };

    let nextD;
    let isDue = false;
    let freqLabel = '';

    if (freq === 'MONTHLY') {
      const dom = Math.min(28, Math.max(1, Number(dca.dayOfMonth || 15)));
      freqLabel = `每月 ${dom} 日`;
      const doneThisMonth = last.startsWith(curYM);
      if (doneThisMonth) {
        nextD = new Date(y, m + 1, dom);
        isDue = false;
      } else {
        nextD = new Date(y, m, dom);
        isDue = todayD >= dom;
      }
    } else {
      const stepDays = freq === 'WEEKLY' ? 7 : 14;
      freqLabel = freq === 'WEEKLY' ? '每週' : '每兩週';
      const lastD = parseISO(last);
      if (!lastD) {
        nextD = todayMid;
        isDue = true;
      } else {
        nextD = new Date(lastD.getTime() + stepDays * 86400000);
        isDue = todayMid.getTime() >= nextD.getTime();
      }
    }

    const diffDays = Math.round((nextD.getTime() - todayMid.getTime()) / 86400000);
    const isSoon = !isDue && diffDays >= 0 && diffDays <= 3;

    return {
      enabled: true,
      isDue,
      isSoon,
      diffDays,
      nextDueDate: formatDateISO(nextD),
      freqLabel
    };
  }

  function cleanNumeric(val) {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    const str = String(val == null ? '' : val).replace(/[,$\sA-Za-z¥]/g, '');
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeBrokerInvType(rawType) {
    const t = String(rawType || '').toUpperCase().trim();
    if (t === 'FIXED_DEPOSIT' || t === 'FD' || t === 'DEPOSIT') return 'FIXED_DEPOSIT';
    if (t === 'TBILL' || t === 'T-BILL' || t === 'BOND' || t === 'TREASURY' || t === 'BILL') return 'TBILL';
    return 'STOCK_ETF';
  }

  function parseBrokerSyncPayload(rawInput) {
    let obj = rawInput;
    if (typeof rawInput === 'string') {
      let cleaned = rawInput.trim();
      // Strip optional markdown code fences (```json ... ```)
      const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fence && fence[1]) cleaned = fence[1].trim();
      obj = JSON.parse(cleaned);
    }
    if (!obj || typeof obj !== 'object') {
      throw new Error('JSON 根結構必須為物件');
    }

    const rawPositions = Array.isArray(obj.positions) ? obj.positions : [];
    const rawClosed = Array.isArray(obj.closedPositions) ? obj.closedPositions : [];
    const rawCash = Array.isArray(obj.cashBalances) ? obj.cashBalances : [];

    if (rawPositions.length === 0 && rawCash.length === 0 && rawClosed.length === 0) {
      throw new Error('找不到 positions、cashBalances 或 closedPositions 欄位');
    }

    const positions = rawPositions.map((p) => {
      const ticker = String(p.ticker || p.symbol || p.code || '').trim().toUpperCase();
      const name = String(p.name || p.description || ticker || '未命名持倉').trim();
      const shares = round2(cleanNumeric(p.shares != null ? p.shares : (p.quantity != null ? p.quantity : p.qty)));
      const costBasis = Math.max(0, round2(cleanNumeric(p.costBasis != null ? p.costBasis : (p.principal != null ? p.principal : p.cost))));
      const marketValue = Math.max(0, round2(cleanNumeric(p.marketValue != null ? p.marketValue : (p.currentValue != null ? p.currentValue : p.value))));
      const closePrice = cleanNumeric(p.closePrice != null ? p.closePrice : p.price);
      return {
        ticker,
        name,
        type: normalizeBrokerInvType(p.type),
        currency: String(p.currency || 'USD').trim().toUpperCase(),
        shares: shares > 0 ? shares : null,
        costBasis,
        marketValue,
        closePrice: closePrice > 0 ? round2(closePrice) : null,
        maturityDate: p.maturityDate || null,
        faceValue: p.faceValue ? round2(cleanNumeric(p.faceValue)) : null
      };
    }).filter((p) => p.ticker || p.name);

    const closedPositions = rawClosed.map((c) => ({
      ticker: String(c.ticker || c.symbol || c.code || '').trim().toUpperCase(),
      name: String(c.name || c.ticker || '已平倉標的').trim(),
      currency: String(c.currency || 'USD').trim().toUpperCase(),
      realizedPnl: round2(cleanNumeric(c.realizedPnl)),
      closedDate: c.closedDate || obj.statementDate || obj.periodEnd || todayISO()
    })).filter((c) => c.ticker || c.name);

    const cashBalances = rawCash.map((cb) => ({
      currency: String(cb.currency || '').trim().toUpperCase(),
      amount: round2(cleanNumeric(cb.amount))
    })).filter((cb) => cb.currency);

    const statementDate = obj.statementDate || obj.periodEnd || todayISO();
    const broker = String(obj.broker || '券商結單').trim();
    const accountRef = String(obj.accountRef || obj.account || '').trim();
    const label = String(obj.label || `${broker}${accountRef ? ' ' + accountRef : ''} (${statementDate})`).trim();

    return {
      schema: obj.schema || 'wealth-broker-sync-v1',
      broker,
      accountRef,
      baseCurrency: String(obj.baseCurrency || state.meta.baseCurrency).toUpperCase(),
      statementDate,
      periodStart: obj.periodStart || null,
      periodEnd: obj.periodEnd || statementDate,
      label,
      fxRatesToBase: obj.fxRatesToBase || null,
      cashBalances,
      positions,
      closedPositions,
      periodSummary: obj.periodSummary || null
    };
  }

  function findMatchingInvestment(list, ticker, name) {
    const tk = String(ticker || '').trim().toUpperCase();
    const nm = String(name || '').trim().toUpperCase();
    if (tk) {
      const byTk = list.find((x) => x.status !== 'CLOSED' && String(x.ticker || '').trim().toUpperCase() === tk);
      if (byTk) return byTk;
    }
    if (nm) {
      const byNm = list.find((x) => x.status !== 'CLOSED' && String(x.name || '').trim().toUpperCase() === nm);
      if (byNm) return byNm;
    }
    return null;
  }

  function previewBrokerSync(parsed, brokerAccountId, st) {
    const s = st || state;
    const invs = s.investments || [];
    const positionDiffs = [];
    const matchedIds = new Set();

    (parsed.positions || []).forEach((p) => {
      const existing = findMatchingInvestment(invs, p.ticker, p.name);
      if (existing) {
        matchedIds.add(existing.id);
        positionDiffs.push({
          action: 'UPDATE',
          existingId: existing.id,
          ticker: p.ticker || existing.ticker,
          name: existing.name || p.name,
          currency: p.currency,
          before: {
            shares: existing.shares,
            costBasis: round2(existing.principal || 0),
            marketValue: round2(existing.currentValue != null ? existing.currentValue : (existing.principal || 0))
          },
          after: {
            shares: p.shares,
            costBasis: p.costBasis,
            marketValue: p.marketValue
          }
        });
      } else {
        positionDiffs.push({
          action: 'CREATE',
          existingId: null,
          ticker: p.ticker,
          name: p.name,
          currency: p.currency,
          before: null,
          after: {
            shares: p.shares,
            costBasis: p.costBasis,
            marketValue: p.marketValue
          }
        });
      }
    });

    (parsed.closedPositions || []).forEach((cp) => {
      const existing = findMatchingInvestment(invs, cp.ticker, cp.name);
      if (existing) {
        matchedIds.add(existing.id);
        positionDiffs.push({
          action: 'CLOSE',
          existingId: existing.id,
          ticker: cp.ticker || existing.ticker,
          name: existing.name || cp.name,
          currency: cp.currency,
          realizedPnl: cp.realizedPnl,
          before: {
            shares: existing.shares,
            costBasis: round2(existing.principal || 0),
            marketValue: round2(existing.currentValue || 0)
          },
          after: { shares: 0, costBasis: 0, marketValue: 0 }
        });
      }
    });

    const cashDiffs = [];
    const brokerAcc = brokerAccountId ? (s.accounts || []).find((a) => a.id === brokerAccountId) : null;
    (parsed.cashBalances || []).forEach((cb) => {
      const existingBal = brokerAcc ? (brokerAcc.balances || []).find((b) => b.currency === cb.currency) : null;
      cashDiffs.push({
        currency: cb.currency,
        action: existingBal ? 'UPDATE' : 'CREATE_CUR',
        beforeAmount: existingBal ? round2(existingBal.amount || 0) : null,
        afterAmount: cb.amount
      });
    });

    return {
      brokerAccountName: brokerAcc ? brokerAcc.name : null,
      positionDiffs,
      cashDiffs,
      counts: {
        create: positionDiffs.filter((d) => d.action === 'CREATE').length,
        update: positionDiffs.filter((d) => d.action === 'UPDATE').length,
        close: positionDiffs.filter((d) => d.action === 'CLOSE').length
      }
    };
  }

  function checkAccountDeductions(events, st) {
    // Virtual allocations do NOT block or trigger warnings; warn ONLY when real balance would go negative (OVERDRAFT)
    const s = st || state;
    if (!Array.isArray(events) || !events.length) {
      return { hasRisk: false, highestSeverity: 'OK', warnings: [] };
    }

    const simMap = new Map();
    const touchedOrder = [];

    events.forEach((ev) => {
      if (!ev || !ev.accountId) return;
      const acc = (s.accounts || []).find((a) => a.id === ev.accountId);
      if (!acc || !(acc.balances || []).length) return;
      const bal = ev.balanceId
        ? acc.balances.find((b) => b.id === ev.balanceId)
        : acc.balances[0];
      if (!bal) return;

      const key = `${acc.id}::${bal.id}`;
      if (!simMap.has(key)) {
        const curBal = round2(bal.amount || 0);
        simMap.set(key, {
          key,
          accountId: acc.id,
          balanceId: bal.id,
          accountLabel: acc.balances.length > 1 ? `${acc.name} (${bal.currency})` : acc.name,
          currency: bal.currency,
          initialBalance: curBal,
          runningBalance: curBal,
          totalOutflow: 0
        });
        touchedOrder.push(key);
      }

      const rec = simMap.get(key);
      const d = round2(ev.delta || 0);
      rec.runningBalance = round2(rec.runningBalance + d);
      if (d < 0) rec.totalOutflow = round2(rec.totalOutflow + Math.abs(d));
    });

    const warnings = [];
    touchedOrder.forEach((key) => {
      const rec = simMap.get(key);
      if (rec.totalOutflow <= 0 || rec.runningBalance >= rec.initialBalance) return;
      if (rec.runningBalance < -0.005) {
        warnings.push({
          status: 'OVERDRAFT',
          accountId: rec.accountId,
          balanceId: rec.balanceId,
          accountLabel: rec.accountLabel,
          currency: rec.currency,
          currentBalance: rec.initialBalance,
          deductAmount: round2(rec.initialBalance - rec.runningBalance),
          afterBalance: rec.runningBalance
        });
      }
    });

    return {
      hasRisk: warnings.length > 0,
      highestSeverity: warnings.length > 0 ? 'OVERDRAFT' : 'OK',
      warnings
    };
  }

  const WealthStore = {
    APP_VERSION,
    SCHEMA_VERSION,
    CURRENCIES,
    CARD_THEMES,
    POOL_COLORS,
    INVESTMENT_TYPES,
    CATEGORY_ICONS,
    uid,
    todayISO,
    nowTimeHM,
    round2,
    getCurrencySymbol,
    convertToBase,
    formatMoney,
    resolveEffectivePoolId,
    getPoolSettlementLabel,
    getAccountOverflowInfo,
    getSummaryMetrics,
    getDefaultExpenseSourceKey,
    getAccountLinkedDeposits,
    getInvestmentMetrics,
    checkSufficientBalance,
    getDcaStatus,
    parseBrokerSyncPayload,
    previewBrokerSync,
    checkAccountDeductions,
    getCreditCardCycle,
    getAutoCardBillingBucket,
    getCardPoolBreakdown,
    getCardSettlementPlan,
    getAllCardsTransferPlan,
    getAllCardsSettlementSummary,

    getState() {
      return state;
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    completeOnboarding(baseCurrency, useDemo) {
      state = useDemo ? createDemoState(baseCurrency) : createBlankState(baseCurrency);
      notify();
    },

    resetOnboarding() {
      const draft = cloneState();
      draft.meta.onboardingDone = false;
      state = draft;
      notify();
    },

    setBaseCurrency(code) {
      const draft = cloneState();
      draft.meta.baseCurrency = code;
      draft.meta.fxRates = buildFxMap(code);
      state = draft;
      notify();
    },

    updateFxRate(code, rate) {
      const num = Number(rate);
      if (!Number.isFinite(num) || num <= 0) return;
      const draft = cloneState();
      draft.meta.fxRates[code] = round2(num);
      state = draft;
      notify();
    },

    togglePrivacy() {
      const draft = cloneState();
      draft.meta.privacyMode = !draft.meta.privacyMode;
      state = draft;
      notify();
    },

    setDefaultExpenseSource(sourceKey) {
      const draft = cloneState();
      draft.meta.defaultExpenseSource = sourceKey || null;
      if (sourceKey && sourceKey.startsWith('ACCOUNT::')) {
        const parts = sourceKey.split('::');
        draft.accounts.forEach((a) => {
          (a.balances || []).forEach((b) => {
            b.isDefaultPayment = (a.id === parts[1] && b.id === parts[2]);
          });
        });
      }
      state = draft;
      notify();
    },

    // ---- Accounts & Wallet (Module 1) ----
    addAccount(payload) {
      const draft = cloneState();
      const acc = {
        id: uid('acc'),
        name: (payload.name || '新帳戶').trim(),
        subtitle: (payload.subtitle || '活期帳戶').trim(),
        type: payload.type || 'BANK',
        theme: payload.theme || 'obsidian',
        balances: [
          {
            id: uid('bal'),
            currency: payload.currency || draft.meta.baseCurrency,
            amount: round2(payload.initialAmount || 0),
            poolId: payload.poolId || (draft.pools[0] && draft.pools[0].id) || 'pool_liquid',
            isDefaultPayment: draft.accounts.length === 0
          }
        ],
        allocations: []
      };
      draft.accounts.push(acc);
      state = draft;
      notify();
      return acc;
    },

    updateAccount(accId, patch) {
      const draft = cloneState();
      const acc = draft.accounts.find((a) => a.id === accId);
      if (!acc) return;
      if (patch.name != null) acc.name = patch.name.trim() || acc.name;
      if (patch.subtitle != null) acc.subtitle = patch.subtitle.trim();
      if (patch.type != null) acc.type = patch.type;
      if (patch.theme != null) acc.theme = patch.theme;
      state = draft;
      notify();
    },

    deleteAccount(accId) {
      const draft = cloneState();
      draft.accounts = draft.accounts.filter((a) => a.id !== accId);
      draft.pools.forEach((p) => {
        if (p.settlementAccountId === accId) {
          p.settlementAccountId = null;
          p.settlementBalanceId = null;
        }
      });
      draft.cards.forEach((c) => {
        if (c.autoPayAccountId === accId) {
          c.autoPayAccountId = null;
          c.autoPayBalanceId = null;
        }
      });
      draft.investments.forEach((inv) => {
        if (inv.linkedAccountId === accId) inv.linkedAccountId = null;
      });
      if (draft.meta.defaultExpenseSource && draft.meta.defaultExpenseSource.startsWith(`ACCOUNT::${accId}::`)) {
        draft.meta.defaultExpenseSource = null;
      }
      state = draft;
      notify();
    },

    addAccountCurrency(accId, currency, initialAmount, poolId) {
      const draft = cloneState();
      const acc = draft.accounts.find((a) => a.id === accId);
      if (!acc) return false;
      if (acc.balances.some((b) => b.currency === currency)) return false;
      acc.balances.push({
        id: uid('bal'),
        currency,
        amount: round2(initialAmount || 0),
        poolId: poolId || (draft.pools[0] && draft.pools[0].id) || 'pool_liquid',
        isDefaultPayment: false
      });
      state = draft;
      notify();
      return true;
    },

    calibrateBalance(accId, balId, newAmount, poolId) {
      const draft = cloneState();
      const acc = draft.accounts.find((a) => a.id === accId);
      if (!acc) return;
      const bal = acc.balances.find((b) => b.id === balId);
      if (!bal) return;
      if (newAmount != null && Number.isFinite(Number(newAmount))) {
        bal.amount = round2(newAmount);
      }
      if (poolId) bal.poolId = poolId;
      state = draft;
      notify();
    },

    setDefaultPaymentBalance(accId, balId) {
      const draft = cloneState();
      draft.accounts.forEach((a) => {
        a.balances.forEach((b) => {
          b.isDefaultPayment = (a.id === accId && b.id === balId);
        });
      });
      state = draft;
      notify();
    },

    topUpEWallet(fromAccId, fromBalId, toAccId, toBalId, amount) {
      const amt = round2(amount);
      if (amt <= 0) return null;
      const fromAcc = state.accounts.find((a) => a.id === fromAccId);
      const fromBal = fromAcc && fromAcc.balances.find((b) => b.id === fromBalId);
      const toAcc = state.accounts.find((a) => a.id === toAccId);
      const toBal = toAcc && toAcc.balances.find((b) => b.id === toBalId);
      if (!fromBal || !toBal) return null;

      return this.addTransaction({
        type: 'TRANSFER',
        title: `${toAcc.name} 增值`,
        amount: amt,
        currency: fromBal.currency,
        settledAmount: amt,
        settledCurrency: toBal.currency,
        accountKind: 'ACCOUNT',
        accountId: fromAccId,
        balanceId: fromBalId,
        toAccountKind: 'ACCOUNT',
        toAccountId: toAccId,
        toBalanceId: toBalId,
        poolId: toBal.poolId || 'pool_liquid',
        date: todayISO(),
        time: nowTimeHM(),
        note: `由 ${fromAcc.name} 扣款增值`
      });
    },

    addAllocation(accId, currency, payload) {
      const draft = cloneState();
      const acc = draft.accounts.find((a) => a.id === accId);
      if (!acc) return;
      acc.allocations = acc.allocations || [];
      acc.allocations.push({
        id: uid('alloc'),
        currency,
        name: (payload.name || '新份額').trim(),
        amount: Math.max(0, round2(payload.amount || 0)),
        locked: false,
        poolId: payload.poolId || 'pool_reserve'
      });
      state = draft;
      notify();
    },

    updateAllocation(accId, allocId, patch) {
      const draft = cloneState();
      const acc = draft.accounts.find((a) => a.id === accId);
      if (!acc) return;
      const al = (acc.allocations || []).find((x) => x.id === allocId);
      if (!al) return;
      if (patch.name != null) al.name = patch.name.trim() || al.name;
      if (patch.amount != null) al.amount = Math.max(0, round2(patch.amount));
      if (patch.locked != null) al.locked = Boolean(patch.locked);
      if (patch.poolId != null) al.poolId = patch.poolId;
      state = draft;
      notify();
    },

    deleteAllocation(accId, allocId) {
      const draft = cloneState();
      const acc = draft.accounts.find((a) => a.id === accId);
      if (!acc) return;
      acc.allocations = (acc.allocations || []).filter((x) => x.id !== allocId);
      state = draft;
      notify();
    },

    absorbFreeAmount(accId, currency, allocId) {
      const draft = cloneState();
      const acc = draft.accounts.find((a) => a.id === accId);
      if (!acc) return;
      const bal = acc.balances.find((b) => b.currency === currency);
      if (!bal) return;
      const used = (acc.allocations || [])
        .filter((x) => x.currency === currency)
        .reduce((sum, x) => sum + Number(x.amount || 0), 0);
      const free = Math.max(0, round2(bal.amount - used));
      const target = (acc.allocations || []).find((x) => x.id === allocId);
      if (target && free > 0) {
        target.amount = round2(target.amount + free);
        state = draft;
        notify();
      }
    },

    replaceAccountAllocations(accId, currency, nextList) {
      const draft = cloneState();
      const acc = draft.accounts.find((a) => a.id === accId);
      if (!acc) return;
      const others = (acc.allocations || []).filter((x) => x.currency !== currency);
      const sanitized = (Array.isArray(nextList) ? nextList : [])
        .filter((x) => x && !x.deleted)
        .map((x) => ({
          id: x.id || uid('alloc'),
          currency,
          name: String(x.name || '未命名份額').trim() || '未命名份額',
          amount: Math.max(0, round2(x.amount || 0)),
          locked: false,
          poolId: x.poolId || 'pool_reserve'
        }));
      acc.allocations = others.concat(sanitized);
      state = draft;
      notify();
    },

    // ---- Credit Cards Management & Cross-Pool Settlement (Module 2) ----
    addCard(payload) {
      const draft = cloneState();
      const card = {
        id: uid('card'),
        name: (payload.name || '新信用卡').trim(),
        last4: String(payload.last4 || '').replace(/[^0-9]/g, '').slice(-4),
        currency: payload.currency || draft.meta.baseCurrency,
        creditLimit: Math.max(0, round2(payload.creditLimit || 50000)),
        statementDay: Math.min(28, Math.max(1, Number(payload.statementDay || 15))),
        dueDay: Math.min(28, Math.max(1, Number(payload.dueDay || 5))),
        billed: Math.max(0, round2(payload.billed || 0)),
        unbilled: Math.max(0, round2(payload.unbilled || 0)),
        theme: payload.theme || 'titanium',
        autoPayAccountId: payload.autoPayAccountId || null,
        autoPayBalanceId: payload.autoPayBalanceId || null,
        note: (payload.note || '').trim()
      };
      draft.cards.push(card);
      state = draft;
      notify();
      return card;
    },

    updateCard(cardId, patch) {
      const draft = cloneState();
      const card = draft.cards.find((c) => c.id === cardId);
      if (!card) return;
      if (patch.name != null) card.name = patch.name.trim() || card.name;
      if (patch.last4 != null) card.last4 = String(patch.last4).replace(/[^0-9]/g, '').slice(-4);
      if (patch.currency != null) card.currency = patch.currency;
      if (patch.creditLimit != null && Number.isFinite(Number(patch.creditLimit))) {
        card.creditLimit = Math.max(0, round2(patch.creditLimit));
      }
      if (patch.statementDay != null) card.statementDay = Math.min(28, Math.max(1, Number(patch.statementDay) || 15));
      if (patch.dueDay != null) card.dueDay = Math.min(28, Math.max(1, Number(patch.dueDay) || 5));
      if (patch.billed != null && Number.isFinite(Number(patch.billed))) card.billed = Math.max(0, round2(patch.billed));
      if (patch.unbilled != null && Number.isFinite(Number(patch.unbilled))) card.unbilled = Math.max(0, round2(patch.unbilled));
      if (patch.theme != null) card.theme = patch.theme;
      if ('autoPayAccountId' in patch) card.autoPayAccountId = patch.autoPayAccountId || null;
      if ('autoPayBalanceId' in patch) card.autoPayBalanceId = patch.autoPayBalanceId || null;
      if (patch.note != null) card.note = patch.note.trim();
      state = draft;
      notify();
    },

    deleteCard(cardId) {
      const draft = cloneState();
      draft.cards = draft.cards.filter((c) => c.id !== cardId);
      if (draft.meta.defaultExpenseSource === `CARD::${cardId}::`) {
        draft.meta.defaultExpenseSource = null;
      }
      state = draft;
      notify();
    },

    closeCardStatement(cardId) {
      const draft = cloneState();
      const card = draft.cards.find((c) => c.id === cardId);
      if (!card) return 0;
      const moved = round2(card.unbilled || 0);
      if (moved <= 0) return 0;
      card.billed = round2((card.billed || 0) + moved);
      card.unbilled = 0;
      // Roll matching UNBILLED card transactions to BILLED so cross-pool breakdown stays aligned
      draft.transactions.forEach((tx) => {
        if (tx.accountKind === 'CARD' && tx.accountId === cardId && (tx.billingBucket || 'UNBILLED') === 'UNBILLED') {
          tx.billingBucket = 'BILLED';
        }
      });
      state = draft;
      notify();
      return moved;
    },

    executeCardReimbursements(items) {
      // items: [{ cardId, cardName, bucket, fromAccountId, fromBalanceId, toAccountId, toBalanceId, amountInCardCur, cardCurrency, note }]
      if (!Array.isArray(items) || !items.length) return 0;
      const draft = cloneState();
      const today = todayISO();
      const time = nowTimeHM();
      let count = 0;

      items.forEach((it) => {
        const amtCard = round2(it.amountInCardCur);
        if (amtCard <= 0 || !it.fromAccountId || !it.toAccountId) return;
        if (it.fromAccountId === it.toAccountId && it.fromBalanceId === it.toBalanceId) return;

        const fromAcc = draft.accounts.find((a) => a.id === it.fromAccountId);
        const toAcc = draft.accounts.find((a) => a.id === it.toAccountId);
        if (!fromAcc || !toAcc) return;
        const fromBal = it.fromBalanceId ? fromAcc.balances.find((b) => b.id === it.fromBalanceId) : fromAcc.balances[0];
        const toBal = it.toBalanceId ? toAcc.balances.find((b) => b.id === it.toBalanceId) : toAcc.balances[0];
        if (!fromBal || !toBal) return;

        const cardObj = draft.cards.find((c) => c.id === it.cardId);
        const cardCur = it.cardCurrency || (cardObj ? cardObj.currency : draft.meta.baseCurrency);
        const cardLabel = it.cardName || (cardObj ? cardObj.name : '信用卡');

        const deductFromAmt = convertBetweenCurrencies(amtCard, cardCur, fromBal.currency, draft);
        const creditToAmt = convertBetweenCurrencies(amtCard, cardCur, toBal.currency, draft);

        const tx = {
          id: uid('tx_reimb'),
          type: 'TRANSFER',
          title: `找數歸墊：${fromAcc.name} ➔ ${toAcc.name}`,
          amount: deductFromAmt,
          currency: fromBal.currency,
          settledAmount: creditToAmt,
          settledCurrency: toBal.currency,
          accountKind: 'ACCOUNT',
          accountId: fromAcc.id,
          balanceId: fromBal.id,
          toAccountKind: 'ACCOUNT',
          toAccountId: toAcc.id,
          toBalanceId: toBal.id,
          categoryId: null,
          subCategoryId: null,
          subCategoryName: '',
          poolId: null,
          cardReimbursement: {
            cardId: it.cardId || null,
            bucket: it.bucket || 'ALL',
            amountInCardCur: amtCard,
            cleared: false
          },
          date: today,
          time,
          note: it.note || `為「${cardLabel}」主找數戶口歸墊資金`
        };

        applyTransactionEffect(draft, tx, 1);
        draft.transactions.unshift(tx);
        count++;
      });

      if (count > 0) {
        state = draft;
        notify();
      }
      return count;
    },

    payCardBill(cardId, payments, targetMode) {
      const draft = cloneState();
      const card = draft.cards.find((c) => c.id === cardId);
      if (!card || !Array.isArray(payments) || !payments.length) return 0;

      const today = todayISO();
      const time = nowTimeHM();
      let count = 0;

      // Collect pending reimbursement txs for this card to mark cleared upon payment
      const clearedIds = [];
      draft.transactions.forEach((t) => {
        if (t.type === 'TRANSFER' && t.cardReimbursement && t.cardReimbursement.cardId === cardId && !t.cardReimbursement.cleared) {
          if (targetMode === 'UNBILLED_FIRST' && t.cardReimbursement.bucket === 'BILLED') return;
          if (targetMode === 'BILLED_FIRST' && t.cardReimbursement.bucket === 'UNBILLED') return;
          t.cardReimbursement.cleared = true;
          clearedIds.push(t.id);
        }
      });

      payments.forEach((p, idx) => {
        const payAmt = round2(p.amount);
        if (payAmt <= 0 || !p.fromAccountId) return;
        const fromAcc = draft.accounts.find((a) => a.id === p.fromAccountId);
        if (!fromAcc) return;
        const fromBal = p.fromBalanceId
          ? fromAcc.balances.find((b) => b.id === p.fromBalanceId)
          : fromAcc.balances[0];
        if (!fromBal) return;

        const bankDeduct = convertBetweenCurrencies(payAmt, card.currency, fromBal.currency, draft);

        let billedApplied = 0;
        let unbilledApplied = 0;
        if (targetMode === 'UNBILLED_FIRST') {
          const availUnbilled = Math.max(0, round2(card.unbilled || 0));
          unbilledApplied = Math.min(payAmt, availUnbilled);
          billedApplied = round2(payAmt - unbilledApplied);
        } else {
          const availBilled = Math.max(0, round2(card.billed || 0));
          billedApplied = Math.min(payAmt, availBilled);
          unbilledApplied = round2(payAmt - billedApplied);
        }

        const tx = {
          id: uid('tx_cardpay'),
          type: 'TRANSFER',
          title: `主戶找數 · ${card.name}`,
          amount: bankDeduct,
          currency: fromBal.currency,
          settledAmount: payAmt,
          settledCurrency: card.currency,
          accountKind: 'ACCOUNT',
          accountId: fromAcc.id,
          balanceId: fromBal.id,
          toAccountKind: 'CARD',
          toAccountId: card.id,
          toBalanceId: null,
          billedApplied,
          unbilledApplied,
          clearedReimbursementIds: idx === 0 ? clearedIds : [],
          billingBucket: billedApplied > 0 && unbilledApplied === 0 ? 'BILLED' : 'UNBILLED',
          categoryId: null,
          subCategoryId: null,
          subCategoryName: '',
          poolId: null,
          date: today,
          time,
          note: p.note || `由 ${fromAcc.name} 扣款找數`
        };

        applyTransactionEffect(draft, tx, 1);
        draft.transactions.unshift(tx);
        count++;
      });

      if (count > 0) {
        state = draft;
        notify();
      }
      return count;
    },

    settleCardWithReimbursements(cardId, bucket, reimburseItems, mainPayInfo, targetMode) {
      let reimbCount = 0;
      if (Array.isArray(reimburseItems) && reimburseItems.length > 0) {
        reimbCount = this.executeCardReimbursements(reimburseItems);
      }
      let payCount = 0;
      if (mainPayInfo && Number(mainPayInfo.amount) > 0 && mainPayInfo.fromAccountId) {
        payCount = this.payCardBill(cardId, [mainPayInfo], targetMode || (bucket === 'UNBILLED' ? 'UNBILLED_FIRST' : 'BILLED_FIRST'));
      }
      return { reimbCount, payCount };
    },

    updateCardSettlementTx(txId, patch) {
      // Safely edits a card payment (toAccountKind === 'CARD') or card reimbursement (cardReimbursement)
      // while preserving exact account/card links, cross-currency conversion, and billed/unbilled split.
      const draft = cloneState();
      const idx = draft.transactions.findIndex((t) => t.id === txId);
      if (idx === -1) return null;
      const oldTx = draft.transactions[idx];
      const isCardPay = oldTx.type === 'TRANSFER' && oldTx.toAccountKind === 'CARD';
      const isReimb = oldTx.type === 'TRANSFER' && Boolean(oldTx.cardReimbursement);
      if (!isCardPay && !isReimb) return null;

      applyTransactionEffect(draft, oldTx, -1);

      const updated = Object.assign({}, oldTx);
      if (patch.date) updated.date = patch.date;
      if (patch.time) updated.time = patch.time;
      if (patch.note != null) updated.note = String(patch.note).trim();

      const nextAmt = patch.amount != null ? Math.abs(round2(patch.amount)) : null;
      if (nextAmt != null && nextAmt > 0) {
        if (isCardPay) {
          const card = draft.cards.find((c) => c.id === updated.toAccountId);
          const cardCur = (card && card.currency) || updated.settledCurrency || draft.meta.baseCurrency;
          const bankDeduct = convertBetweenCurrencies(nextAmt, cardCur, updated.currency, draft);
          updated.amount = bankDeduct;
          updated.settledAmount = nextAmt;
          updated.settledCurrency = cardCur;

          const availBilled = card ? Math.max(0, round2(card.billed || 0)) : 0;
          const availUnbilled = card ? Math.max(0, round2(card.unbilled || 0)) : 0;
          if (updated.billingBucket === 'UNBILLED' && availUnbilled > 0 && availBilled === 0) {
            updated.unbilledApplied = Math.min(nextAmt, availUnbilled);
            updated.billedApplied = round2(nextAmt - updated.unbilledApplied);
          } else {
            updated.billedApplied = Math.min(nextAmt, availBilled);
            updated.unbilledApplied = round2(nextAmt - updated.billedApplied);
          }
        } else if (isReimb) {
          const card = draft.cards.find((c) => c.id === updated.cardReimbursement.cardId);
          const cardCur = (card && card.currency) || updated.settledCurrency || draft.meta.baseCurrency;
          const fromAmt = convertBetweenCurrencies(nextAmt, cardCur, updated.currency, draft);
          const toAmt = convertBetweenCurrencies(nextAmt, cardCur, updated.settledCurrency, draft);
          updated.amount = fromAmt;
          updated.settledAmount = toAmt;
          updated.cardReimbursement = Object.assign({}, updated.cardReimbursement, {
            amountInCardCur: nextAmt
          });
        }
      }

      applyTransactionEffect(draft, updated, 1);
      draft.transactions[idx] = updated;
      state = draft;
      notify();
      return updated;
    },

    // ---- Pools Management (Cross-Account Settlement Attribution) ----
    addPool(payload) {
      const draft = cloneState();
      const pool = {
        id: uid('pool'),
        name: (payload.name || '新資金池').trim(),
        color: payload.color || POOL_COLORS[draft.pools.length % POOL_COLORS.length],
        settlementAccountId: payload.settlementAccountId || null,
        settlementBalanceId: payload.settlementBalanceId || null,
        note: (payload.note || '').trim()
      };
      draft.pools.push(pool);
      state = draft;
      notify();
      return pool;
    },

    updatePool(poolId, patch) {
      const draft = cloneState();
      const p = draft.pools.find((x) => x.id === poolId);
      if (!p) return;
      if (patch.name != null) p.name = patch.name.trim() || p.name;
      if (patch.color != null) p.color = patch.color;
      if (patch.note != null) p.note = patch.note.trim();
      if ('settlementAccountId' in patch) p.settlementAccountId = patch.settlementAccountId || null;
      if ('settlementBalanceId' in patch) p.settlementBalanceId = patch.settlementBalanceId || null;
      state = draft;
      notify();
    },

    deletePool(poolId) {
      const draft = cloneState();
      if (draft.pools.length <= 1) return false;
      draft.pools = draft.pools.filter((x) => x.id !== poolId);
      const fallbackId = draft.pools[0].id;
      draft.categories.forEach((c) => {
        if (c.defaultPoolId === poolId) c.defaultPoolId = fallbackId;
        (c.subcategories || []).forEach((s) => {
          if (s.defaultPoolId === poolId) s.defaultPoolId = null;
        });
      });
      draft.transactions.forEach((tx) => {
        if (tx.poolId === poolId) tx.poolId = fallbackId;
      });
      state = draft;
      notify();
      return true;
    },

    // ---- Categories & Subcategories Management ----
    addCategory(payload) {
      const draft = cloneState();
      const cat = {
        id: uid('cat'),
        type: payload.type || 'EXPENSE',
        name: (payload.name || '新分類').trim(),
        icon: payload.icon || 'tag',
        color: payload.color || '#60A5FA',
        defaultPoolId: payload.defaultPoolId || (draft.pools[0] && draft.pools[0].id) || 'pool_liquid',
        subcategories: Array.isArray(payload.subcategories) ? payload.subcategories : []
      };
      draft.categories.push(cat);
      state = draft;
      notify();
      return cat;
    },

    updateCategory(catId, patch) {
      const draft = cloneState();
      const cat = draft.categories.find((c) => c.id === catId);
      if (!cat) return;
      if (patch.name != null) cat.name = patch.name.trim() || cat.name;
      if (patch.icon != null) cat.icon = patch.icon;
      if (patch.color != null) cat.color = patch.color;
      if (patch.defaultPoolId != null) cat.defaultPoolId = patch.defaultPoolId;
      state = draft;
      notify();
    },

    deleteCategory(catId) {
      const draft = cloneState();
      const target = draft.categories.find((c) => c.id === catId);
      if (!target) return false;
      const sameTypeCount = draft.categories.filter((c) => c.type === target.type).length;
      if (sameTypeCount <= 1) return false;
      draft.categories = draft.categories.filter((c) => c.id !== catId);
      state = draft;
      notify();
      return true;
    },

    addSubcategory(catId, payload) {
      const draft = cloneState();
      const cat = draft.categories.find((c) => c.id === catId);
      if (!cat) return null;
      cat.subcategories = cat.subcategories || [];
      const sub = {
        id: uid('sub'),
        name: (payload.name || '新小類別').trim(),
        defaultPoolId: payload.defaultPoolId || null
      };
      cat.subcategories.push(sub);
      state = draft;
      notify();
      return sub;
    },

    updateSubcategory(catId, subId, patch) {
      const draft = cloneState();
      const cat = draft.categories.find((c) => c.id === catId);
      if (!cat || !Array.isArray(cat.subcategories)) return;
      const sub = cat.subcategories.find((s) => s.id === subId);
      if (!sub) return;
      if (patch.name != null) sub.name = patch.name.trim() || sub.name;
      if ('defaultPoolId' in patch) sub.defaultPoolId = patch.defaultPoolId || null;
      state = draft;
      notify();
    },

    deleteSubcategory(catId, subId) {
      const draft = cloneState();
      const cat = draft.categories.find((c) => c.id === catId);
      if (!cat || !Array.isArray(cat.subcategories)) return;
      cat.subcategories = cat.subcategories.filter((s) => s.id !== subId);
      state = draft;
      notify();
    },

    // ---- Transactions & Paired Loan Logic (Module 3) ----
    addTransaction(payload) {
      const draft = cloneState();
      const tx = Object.assign(
        {
          id: uid('tx'),
          type: 'EXPENSE',
          title: '未命名紀錄',
          amount: 0,
          currency: draft.meta.baseCurrency,
          settledAmount: null,
          settledCurrency: null,
          accountKind: 'ACCOUNT',
          accountId: null,
          balanceId: null,
          toAccountKind: null,
          toAccountId: null,
          toBalanceId: null,
          categoryId: null,
          subCategoryId: null,
          subCategoryName: '',
          poolId: (draft.pools[0] && draft.pools[0].id) || 'pool_liquid',
          billingBucket: null,
          counterparty: '',
          isLoanSettled: false,
          settlementTxId: null,
          linkedLoanId: null,
          settlementDirection: null,
          date: todayISO(),
          time: nowTimeHM(),
          note: ''
        },
        payload
      );
      tx.amount = Math.abs(round2(tx.amount));
      tx.settledAmount = tx.settledAmount != null ? Math.abs(round2(tx.settledAmount)) : tx.amount;
      tx.settledCurrency = tx.settledCurrency || tx.currency;

      applyTransactionEffect(draft, tx, 1);
      draft.transactions.unshift(tx);
      state = draft;
      notify();
      return tx;
    },

    updateTransaction(txId, patch) {
      const draft = cloneState();
      const idx = draft.transactions.findIndex((t) => t.id === txId);
      if (idx === -1) return null;
      const oldTx = draft.transactions[idx];
      applyTransactionEffect(draft, oldTx, -1);

      const updated = Object.assign({}, oldTx, patch);
      updated.amount = Math.abs(round2(updated.amount));
      updated.settledAmount = updated.settledAmount != null ? Math.abs(round2(updated.settledAmount)) : updated.amount;
      updated.settledCurrency = updated.settledCurrency || updated.currency;

      applyTransactionEffect(draft, updated, 1);
      draft.transactions[idx] = updated;
      state = draft;
      notify();
      return updated;
    },

    settleLoan(loanTxId, targetAccKind, targetAccId, targetBalId) {
      const draft = cloneState();
      const loanTx = draft.transactions.find((t) => t.id === loanTxId);
      if (!loanTx || loanTx.isLoanSettled) return null;
      if (loanTx.type !== 'RECEIVABLE' && loanTx.type !== 'PAYABLE') return null;

      const isReceivable = loanTx.type === 'RECEIVABLE';
      const settleTx = {
        id: uid('tx_settle'),
        type: 'LOAN_SETTLEMENT',
        settlementDirection: isReceivable ? 'IN' : 'OUT',
        linkedLoanId: loanTx.id,
        title: (isReceivable ? '收回：' : '還款：') + loanTx.title,
        amount: loanTx.amount,
        currency: loanTx.currency,
        settledAmount: loanTx.amount,
        settledCurrency: loanTx.currency,
        accountKind: targetAccKind || 'ACCOUNT',
        accountId: targetAccId,
        balanceId: targetBalId || null,
        categoryId: null,
        subCategoryId: null,
        subCategoryName: '',
        poolId: loanTx.poolId || 'pool_liquid',
        counterparty: loanTx.counterparty || '',
        date: todayISO(),
        time: nowTimeHM(),
        note: `對應${isReceivable ? '代墊' : '借貸'}原單結清`
      };

      applyTransactionEffect(draft, settleTx, 1);
      loanTx.isLoanSettled = true;
      loanTx.settlementTxId = settleTx.id;
      draft.transactions.unshift(settleTx);
      state = draft;
      notify();
      return settleTx;
    },

    unsettleLoan(loanTxId) {
      const draft = cloneState();
      const loanTx = draft.transactions.find((t) => t.id === loanTxId);
      if (!loanTx || !loanTx.isLoanSettled) return false;

      if (loanTx.settlementTxId) {
        const settleIdx = draft.transactions.findIndex((t) => t.id === loanTx.settlementTxId);
        if (settleIdx !== -1) {
          applyTransactionEffect(draft, draft.transactions[settleIdx], -1);
          draft.transactions.splice(settleIdx, 1);
        }
      }
      loanTx.isLoanSettled = false;
      loanTx.settlementTxId = null;
      state = draft;
      notify();
      return true;
    },

    deleteTransaction(txId) {
      const draft = cloneState();
      const idx = draft.transactions.findIndex((t) => t.id === txId);
      if (idx === -1) return { deleted: 0, mode: 'NONE' };
      const tx = draft.transactions[idx];

      if (tx.type === 'LOAN_SETTLEMENT') {
        applyTransactionEffect(draft, tx, -1);
        draft.transactions.splice(idx, 1);
        if (tx.linkedLoanId) {
          const orig = draft.transactions.find((t) => t.id === tx.linkedLoanId);
          if (orig) {
            orig.isLoanSettled = false;
            orig.settlementTxId = null;
          }
        }
        state = draft;
        notify();
        return { deleted: 1, mode: 'REOPEN_LOAN' };
      }

      if ((tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE') && tx.isLoanSettled && tx.settlementTxId) {
        applyTransactionEffect(draft, tx, -1);
        draft.transactions.splice(idx, 1);
        const sIdx = draft.transactions.findIndex((t) => t.id === tx.settlementTxId);
        if (sIdx !== -1) {
          applyTransactionEffect(draft, draft.transactions[sIdx], -1);
          draft.transactions.splice(sIdx, 1);
        }
        state = draft;
        notify();
        return { deleted: 2, mode: 'PAIRED_DELETE' };
      }

      if (Array.isArray(tx.clearedReimbursementIds) && tx.clearedReimbursementIds.length > 0) {
        tx.clearedReimbursementIds.forEach((rid) => {
          const rTx = draft.transactions.find((t) => t.id === rid);
          if (rTx && rTx.cardReimbursement) rTx.cardReimbursement.cleared = false;
        });
      }
      applyTransactionEffect(draft, tx, -1);
      draft.transactions.splice(idx, 1);
      state = draft;
      notify();
      return { deleted: 1, mode: 'SINGLE' };
    },

    // ---- Salary Split Rules (Batch Flow) ----
    addSplitRule(payload) {
      const draft = cloneState();
      const rule = {
        id: uid('sr'),
        name: (payload.name || '新分流項目').trim(),
        enabled: payload.enabled !== false,
        type: payload.type || 'TRANSFER',
        amount: Math.abs(round2(payload.amount || 0)),
        currency: payload.currency || draft.meta.baseCurrency,
        fromAccountId: payload.fromAccountId || null,
        fromBalanceId: payload.fromBalanceId || null,
        toAccountId: payload.toAccountId || null,
        toBalanceId: payload.toBalanceId || null,
        categoryId: payload.categoryId || null,
        poolId: payload.poolId || 'pool_liquid'
      };
      draft.splitRules.push(rule);
      state = draft;
      notify();
      return rule;
    },

    updateSplitRule(ruleId, patch) {
      const draft = cloneState();
      const r = draft.splitRules.find((x) => x.id === ruleId);
      if (!r) return;
      Object.assign(r, patch);
      if (patch.amount != null) r.amount = Math.abs(round2(patch.amount));
      state = draft;
      notify();
    },

    deleteSplitRule(ruleId) {
      const draft = cloneState();
      draft.splitRules = draft.splitRules.filter((x) => x.id !== ruleId);
      state = draft;
      notify();
    },

    executeSplitRules(selectedItems) {
      const draft = cloneState();
      const today = todayISO();
      const time = nowTimeHM();
      let count = 0;

      selectedItems.forEach((item) => {
        const rule = draft.splitRules.find((r) => r.id === item.ruleId);
        if (!rule) return;
        const amt = Math.abs(round2(item.amount != null ? item.amount : rule.amount));
        if (amt <= 0) return;

        let tx;
        if (rule.type === 'INCOME') {
          tx = {
            id: uid('tx'),
            type: 'INCOME',
            title: rule.name,
            amount: amt,
            currency: rule.currency,
            settledAmount: amt,
            settledCurrency: rule.currency,
            accountKind: 'ACCOUNT',
            accountId: rule.toAccountId,
            balanceId: rule.toBalanceId,
            categoryId: rule.categoryId || 'cat_salary',
            subCategoryId: null,
            subCategoryName: '',
            poolId: rule.poolId || 'pool_liquid',
            date: today,
            time,
            note: '發薪分流批次入帳'
          };
        } else if (rule.type === 'EXPENSE') {
          tx = {
            id: uid('tx'),
            type: 'EXPENSE',
            title: rule.name,
            amount: amt,
            currency: rule.currency,
            settledAmount: amt,
            settledCurrency: rule.currency,
            accountKind: 'ACCOUNT',
            accountId: rule.fromAccountId,
            balanceId: rule.fromBalanceId,
            categoryId: rule.categoryId || 'cat_home',
            subCategoryId: null,
            subCategoryName: '',
            poolId: rule.poolId || 'pool_liquid',
            date: today,
            time,
            note: '發薪分流固定支出'
          };
        } else {
          tx = {
            id: uid('tx'),
            type: 'TRANSFER',
            title: rule.name,
            amount: amt,
            currency: rule.currency,
            settledAmount: amt,
            settledCurrency: rule.currency,
            accountKind: 'ACCOUNT',
            accountId: rule.fromAccountId,
            balanceId: rule.fromBalanceId,
            toAccountKind: 'ACCOUNT',
            toAccountId: rule.toAccountId,
            toBalanceId: rule.toBalanceId,
            categoryId: null,
            subCategoryId: null,
            subCategoryName: '',
            poolId: rule.poolId || 'pool_reserve',
            date: today,
            time,
            note: '發薪分流帳戶轉撥'
          };
        }

        applyTransactionEffect(draft, tx, 1);
        draft.transactions.unshift(tx);
        count++;
      });

      if (count > 0) {
        state = draft;
        notify();
      }
      return count;
    },

    // ---- Fixed Deposits & Investments Lifecycle (Module 4 · Plan A Pure Ledger) ----
    addInvestment(payload, opts) {
      const draft = cloneState();
      const options = opts || {};
      const today = todayISO();
      const type = normalizeBrokerInvType(payload.type || 'FIXED_DEPOSIT');
      const principal = Math.max(0, round2(payload.principal || 0));
      const initVal = type === 'FIXED_DEPOSIT'
        ? principal
        : Math.max(0, round2(payload.currentValue != null ? payload.currentValue : principal));

      let fundingSource = null;
      let resolvedLinkedAccId = payload.linkedAccountId || null;
      let resolvedLinkedBalId = payload.linkedBalanceId || null;

      // Plan A: When opening NEW from a bank/broker account, adjust bank balance directly
      // WITHOUT cluttering daily ledger transactions. Store fundingSource for safe refund on delete.
      if (options.deductFromBank && principal > 0 && (options.fromAccountId || resolvedLinkedAccId)) {
        const fromAccId = options.fromAccountId || resolvedLinkedAccId;
        const fromBalId = options.fromBalanceId || resolvedLinkedBalId;
        const fromAcc = draft.accounts.find((a) => a.id === fromAccId);
        if (fromAcc && (fromAcc.balances || []).length) {
          const fromBal = (fromBalId ? fromAcc.balances.find((b) => b.id === fromBalId) : null)
            || fromAcc.balances.find((b) => b.currency === (payload.currency || draft.meta.baseCurrency))
            || fromAcc.balances[0];
          if (fromBal) {
            const deductAmt = convertBetweenCurrencies(principal, payload.currency || draft.meta.baseCurrency, fromBal.currency, draft);
            adjustAccountOrCard(draft, 'ACCOUNT', fromAcc.id, fromBal.id, -deductAmt);
            resolvedLinkedAccId = fromAcc.id;
            resolvedLinkedBalId = fromBal.id;
            fundingSource = {
              deductedFromBank: true,
              accountId: fromAcc.id,
              balanceId: fromBal.id,
              deductedAmount: deductAmt,
              deductedCurrency: fromBal.currency
            };
          }
        }
      }

      const inv = {
        id: uid('inv'),
        name: (payload.name || (type === 'FIXED_DEPOSIT' ? '定期存款' : '新投資部位')).trim(),
        ticker: (payload.ticker || '').trim().toUpperCase(),
        type,
        status: 'ACTIVE',
        entryMode: options.deductFromBank ? 'NEW_OPEN' : 'EXISTING',
        fundingSource,
        currency: payload.currency || draft.meta.baseCurrency,
        principal,
        currentValue: initVal,
        shares: payload.shares != null && Number(payload.shares) > 0 ? round2(payload.shares) : null,
        apr: payload.apr != null && Number(payload.apr) > 0 ? round2(payload.apr) : null,
        faceValue: payload.faceValue != null && Number(payload.faceValue) > 0 ? round2(payload.faceValue) : null,
        startDate: payload.startDate || today,
        maturityDate: payload.maturityDate || null,
        closedDate: null,
        realizedPnl: 0,
        cumulativeDividends: 0,
        linkedAccountId: resolvedLinkedAccId,
        linkedBalanceId: resolvedLinkedBalId,
        dca: payload.dca || null,
        dcaHistory: [],
        lastUpdated: today,
        note: (payload.note || '').trim()
      };

      draft.investments.unshift(inv);
      state = draft;
      notify();
      return inv;
    },

    updateInvestment(invId, patch) {
      const draft = cloneState();
      const inv = draft.investments.find((x) => x.id === invId);
      if (!inv) return null;
      if (patch.name != null) inv.name = String(patch.name).trim() || inv.name;
      if (patch.ticker != null) inv.ticker = String(patch.ticker).trim().toUpperCase();
      if (patch.type != null) inv.type = normalizeBrokerInvType(patch.type);
      if (patch.currency != null) inv.currency = patch.currency;
      if (patch.principal != null && Number.isFinite(Number(patch.principal))) {
        inv.principal = Math.max(0, round2(patch.principal));
        if (inv.type === 'FIXED_DEPOSIT') inv.currentValue = inv.principal;
      }
      if (patch.currentValue != null && Number.isFinite(Number(patch.currentValue))) {
        inv.currentValue = Math.max(0, round2(patch.currentValue));
      }
      if ('shares' in patch) inv.shares = patch.shares != null && Number(patch.shares) > 0 ? round2(patch.shares) : null;
      if ('apr' in patch) inv.apr = patch.apr != null && Number(patch.apr) > 0 ? round2(patch.apr) : null;
      if ('faceValue' in patch) inv.faceValue = patch.faceValue != null && Number(patch.faceValue) > 0 ? round2(patch.faceValue) : null;
      if ('startDate' in patch) inv.startDate = patch.startDate || null;
      if ('maturityDate' in patch) inv.maturityDate = patch.maturityDate || null;
      if ('linkedAccountId' in patch) inv.linkedAccountId = patch.linkedAccountId || null;
      if ('linkedBalanceId' in patch) inv.linkedBalanceId = patch.linkedBalanceId || null;
      if ('dca' in patch) inv.dca = patch.dca || null;
      if (patch.note != null) inv.note = String(patch.note).trim();
      if (patch.status != null) inv.status = patch.status;
      inv.lastUpdated = todayISO();
      state = draft;
      notify();
      return inv;
    },

    deleteInvestment(invId, opts) {
      const draft = cloneState();
      const options = opts || {};
      const inv = draft.investments.find((x) => x.id === invId);
      if (!inv) return { refunded: false, refundAmount: 0, currency: draft.meta.baseCurrency };

      let refunded = false;
      let refundAmount = 0;
      let refundCur = inv.currency || draft.meta.baseCurrency;

      if (options.refundToBank && inv.status !== 'CLOSED') {
        // First check if there were any legacy Stage 3 r1 INVEST_FLOW txs tied to this investment
        const legacyOutTxs = draft.transactions.filter(
          (t) => t.type === 'INVEST_FLOW' && t.flowDirection === 'OUT' && t.linkedInvestmentId === inv.id
        );

        if (inv.fundingSource && inv.fundingSource.deductedFromBank && !options.toAccountId) {
          const fs = inv.fundingSource;
          adjustAccountOrCard(draft, 'ACCOUNT', fs.accountId, fs.balanceId, fs.deductedAmount);
          refunded = true;
          refundAmount = fs.deductedAmount;
          refundCur = fs.deductedCurrency;
        } else if (legacyOutTxs.length > 0 && !options.toAccountId) {
          legacyOutTxs.forEach((lt) => {
            applyTransactionEffect(draft, lt, -1);
            refundAmount = round2(refundAmount + (lt.settledAmount || lt.amount || 0));
            refundCur = lt.settledCurrency || lt.currency;
          });
          draft.transactions = draft.transactions.filter(
            (t) => !(t.type === 'INVEST_FLOW' && t.flowDirection === 'OUT' && t.linkedInvestmentId === inv.id)
          );
          refunded = true;
        } else {
          const targetAccId = options.toAccountId || inv.linkedAccountId;
          const targetBalId = options.toBalanceId || inv.linkedBalanceId;
          const acc = targetAccId ? draft.accounts.find((a) => a.id === targetAccId) : null;
          if (acc && (acc.balances || []).length && inv.principal > 0) {
            const bal = (targetBalId ? acc.balances.find((b) => b.id === targetBalId) : null)
              || acc.balances.find((b) => b.currency === inv.currency)
              || acc.balances[0];
            if (bal) {
              const creditAmt = convertBetweenCurrencies(inv.principal, inv.currency, bal.currency, draft);
              adjustAccountOrCard(draft, 'ACCOUNT', acc.id, bal.id, creditAmt);
              refunded = true;
              refundAmount = creditAmt;
              refundCur = bal.currency;
            }
          }
        }
      }

      draft.investments = draft.investments.filter((x) => x.id !== invId);
      state = draft;
      notify();
      return { refunded, refundAmount, currency: refundCur };
    },

    topUpInvestment(invId, payload) {
      const draft = cloneState();
      const inv = draft.investments.find((x) => x.id === invId);
      if (!inv) return null;
      const addAmt = Math.max(0, round2(payload.addAmount || 0));
      if (addAmt <= 0) return null;

      inv.principal = round2((inv.principal || 0) + addAmt);
      inv.currentValue = round2((inv.currentValue != null ? inv.currentValue : inv.principal) + addAmt);
      if (payload.addShares && Number(payload.addShares) > 0) {
        inv.shares = round2((inv.shares || 0) + Number(payload.addShares));
      }
      inv.lastUpdated = todayISO();

      // Plan A: Deduct from bank/broker cash directly without polluting daily ledger
      if (payload.deductFromBank && (payload.fromAccountId || inv.linkedAccountId)) {
        const fromAccId = payload.fromAccountId || inv.linkedAccountId;
        const fromBalId = payload.fromBalanceId || inv.linkedBalanceId;
        const fromAcc = draft.accounts.find((a) => a.id === fromAccId);
        if (fromAcc && (fromAcc.balances || []).length) {
          const fromBal = (fromBalId ? fromAcc.balances.find((b) => b.id === fromBalId) : null)
            || fromAcc.balances.find((b) => b.currency === inv.currency)
            || fromAcc.balances[0];
          if (fromBal) {
            const deductAmt = convertBetweenCurrencies(addAmt, inv.currency, fromBal.currency, draft);
            adjustAccountOrCard(draft, 'ACCOUNT', fromAcc.id, fromBal.id, -deductAmt);
            if (inv.fundingSource && inv.fundingSource.accountId === fromAcc.id && inv.fundingSource.balanceId === fromBal.id) {
              inv.fundingSource.deductedAmount = round2((inv.fundingSource.deductedAmount || 0) + deductAmt);
            }
          }
        }
      }

      state = draft;
      notify();
      return inv;
    },

    executeDcaInstallment(invId, payload) {
      const draft = cloneState();
      const inv = draft.investments.find((x) => x.id === invId);
      if (!inv) return null;
      const amt = Math.max(0, round2(payload.amount || (inv.dca && inv.dca.amount) || 0));
      if (amt <= 0) return null;
      const execDate = payload.date || todayISO();
      const addShares = payload.shares != null && Number(payload.shares) > 0 ? round2(payload.shares) : 0;

      inv.principal = round2((inv.principal || 0) + amt);
      inv.currentValue = round2((inv.currentValue != null ? inv.currentValue : inv.principal) + amt);
      if (addShares > 0) {
        inv.shares = round2((inv.shares || 0) + addShares);
      }
      inv.dca = Object.assign({ enabled: true, frequency: 'MONTHLY', dayOfMonth: 15, amount: amt }, inv.dca || {}, {
        lastExecutedDate: execDate
      });
      inv.dcaHistory = Array.isArray(inv.dcaHistory) ? inv.dcaHistory : [];
      inv.dcaHistory.unshift({
        id: uid('dca'),
        date: execDate,
        amount: amt,
        shares: addShares > 0 ? addShares : null,
        note: (payload.note || '').trim()
      });
      inv.lastUpdated = execDate;

      // Plan A: Deduct broker cash directly (no daily expense clutter)
      if (payload.deductFromBank !== false && (payload.fromAccountId || inv.linkedAccountId)) {
        const fromAccId = payload.fromAccountId || inv.linkedAccountId;
        const fromBalId = payload.fromBalanceId || inv.linkedBalanceId;
        const fromAcc = draft.accounts.find((a) => a.id === fromAccId);
        if (fromAcc && (fromAcc.balances || []).length) {
          const fromBal = (fromBalId ? fromAcc.balances.find((b) => b.id === fromBalId) : null)
            || fromAcc.balances.find((b) => b.currency === inv.currency)
            || fromAcc.balances[0];
          if (fromBal) {
            const deductAmt = convertBetweenCurrencies(amt, inv.currency, fromBal.currency, draft);
            adjustAccountOrCard(draft, 'ACCOUNT', fromAcc.id, fromBal.id, -deductAmt);
          }
        }
      }

      state = draft;
      notify();
      return inv;
    },

    recordInvestmentCashEvent(invId, payload) {
      // payload.mode: 'DIVIDEND' | 'SELL'
      const draft = cloneState();
      const inv = draft.investments.find((x) => x.id === invId);
      if (!inv) return null;
      const amt = Math.max(0, round2(payload.amount || 0));
      if (amt <= 0) return null;
      const today = todayISO();
      const time = nowTimeHM();

      const resolveDest = () => {
        const accId = payload.toAccountId || inv.linkedAccountId;
        const balId = payload.toBalanceId || inv.linkedBalanceId;
        const acc = accId ? draft.accounts.find((a) => a.id === accId) : null;
        if (!acc || !(acc.balances || []).length) return null;
        const bal = (balId ? acc.balances.find((b) => b.id === balId) : null)
          || acc.balances.find((b) => b.currency === inv.currency)
          || acc.balances[0];
        return bal ? { acc, bal } : null;
      };

      if (payload.mode === 'DIVIDEND') {
        inv.cumulativeDividends = round2((inv.cumulativeDividends || 0) + amt);
        inv.lastUpdated = today;
        const dest = payload.creditToBank !== false ? resolveDest() : null;
        if (dest) {
          const creditAmt = convertBetweenCurrencies(amt, inv.currency, dest.bal.currency, draft);
          const isDeposit = inv.type === 'FIXED_DEPOSIT' || inv.type === 'TBILL';
          const tx = {
            id: uid('tx_div'),
            type: 'INCOME',
            title: `${isDeposit ? '利息入帳' : '股息入帳'}：${inv.name}`,
            amount: amt,
            currency: inv.currency,
            settledAmount: creditAmt,
            settledCurrency: dest.bal.currency,
            accountKind: 'ACCOUNT',
            accountId: dest.acc.id,
            balanceId: dest.bal.id,
            categoryId: 'cat_dividend',
            subCategoryId: isDeposit ? 'sub_dv_2' : 'sub_dv_3',
            subCategoryName: isDeposit ? '定存利息' : '股息分紅',
            poolId: 'pool_invest',
            date: today,
            time,
            note: payload.note || `來自 ${inv.name} 之配息收益`
          };
          applyTransactionEffect(draft, tx, 1);
          draft.transactions.unshift(tx);
        }
      } else {
        // Plan A: SELL / Redemption credits broker/bank cash directly without polluting daily ledger
        const isFull = Boolean(payload.fullClose);
        const costReduce = isFull
          ? round2(inv.principal || 0)
          : (payload.costBasisReduced != null
              ? Math.min(round2(inv.principal || 0), Math.max(0, round2(payload.costBasisReduced)))
              : (inv.currentValue > 0
                  ? Math.min(round2(inv.principal || 0), round2((inv.principal || 0) * (amt / inv.currentValue)))
                  : Math.min(round2(inv.principal || 0), amt)));

        const realizedGain = round2(amt - costReduce);
        inv.realizedPnl = round2((inv.realizedPnl || 0) + realizedGain);

        if (isFull) {
          inv.principal = 0;
          inv.currentValue = 0;
          inv.shares = inv.shares != null ? 0 : null;
          inv.status = 'CLOSED';
          inv.closedDate = today;
        } else {
          inv.principal = Math.max(0, round2((inv.principal || 0) - costReduce));
          inv.currentValue = Math.max(0, round2((inv.currentValue || 0) - amt));
          if (payload.sellShares && inv.shares != null) {
            inv.shares = Math.max(0, round2(inv.shares - Number(payload.sellShares)));
          }
          if (inv.principal <= 0.01 && inv.currentValue <= 0.01) {
            inv.status = 'CLOSED';
            inv.closedDate = today;
          }
        }
        inv.lastUpdated = today;

        const dest = payload.creditToBank !== false ? resolveDest() : null;
        if (dest) {
          const creditAmt = convertBetweenCurrencies(amt, inv.currency, dest.bal.currency, draft);
          adjustAccountOrCard(draft, 'ACCOUNT', dest.acc.id, dest.bal.id, creditAmt);
        }
      }

      state = draft;
      notify();
      return inv;
    },

    settleTermInvestment(invId, payload) {
      // Plan A: Principal moves directly back to bank balance (NO principal ledger tx);
      // ONLY true interest income (>0) is written to daily ledger!
      const draft = cloneState();
      const inv = draft.investments.find((x) => x.id === invId);
      if (!inv) return null;
      const today = todayISO();
      const time = nowTimeHM();
      const actualInterest = Math.max(0, round2(payload.actualInterest || 0));
      const principal = Math.max(0, round2(inv.principal || 0));

      const resolveDest = () => {
        const accId = payload.toAccountId || inv.linkedAccountId;
        const balId = payload.toBalanceId || inv.linkedBalanceId;
        const acc = accId ? draft.accounts.find((a) => a.id === accId) : null;
        if (!acc || !(acc.balances || []).length) return null;
        const bal = (balId ? acc.balances.find((b) => b.id === balId) : null)
          || acc.balances.find((b) => b.currency === inv.currency)
          || acc.balances[0];
        return bal ? { acc, bal } : null;
      };

      const mode = payload.mode || 'CASH_OUT';
      const isTBill = inv.type === 'TBILL';

      if (mode === 'CASH_OUT') {
        inv.status = 'CLOSED';
        inv.closedDate = today;
        inv.realizedPnl = round2((inv.realizedPnl || 0) + actualInterest);
        inv.cumulativeDividends = round2((inv.cumulativeDividends || 0) + actualInterest);
        inv.currentValue = round2(principal + actualInterest);
        inv.lastUpdated = today;

        const dest = resolveDest();
        if (dest) {
          // 1. Principal returns directly to bank balance (Plan A: no ledger noise)
          if (principal > 0) {
            const pCredit = convertBetweenCurrencies(principal, inv.currency, dest.bal.currency, draft);
            adjustAccountOrCard(draft, 'ACCOUNT', dest.acc.id, dest.bal.id, pCredit);
          }

          // 2. Only actual interest is recorded as INCOME in daily ledger
          if (actualInterest > 0) {
            const iCredit = convertBetweenCurrencies(actualInterest, inv.currency, dest.bal.currency, draft);
            const iTx = {
              id: uid('tx_int'),
              type: 'INCOME',
              title: `${isTBill ? '美債到期收益' : '定存利息'}：${inv.name}`,
              amount: actualInterest,
              currency: inv.currency,
              settledAmount: iCredit,
              settledCurrency: dest.bal.currency,
              accountKind: 'ACCOUNT',
              accountId: dest.acc.id,
              balanceId: dest.bal.id,
              categoryId: 'cat_dividend',
              subCategoryId: 'sub_dv_2',
              subCategoryName: '定存利息',
              poolId: 'pool_reserve',
              date: today,
              time,
              note: `${inv.name} 到期實收利息（本金 ${formatMoney(principal, inv.currency, { privacy: false })} 已同步退回活期）`
            };
            applyTransactionEffect(draft, iTx, 1);
            draft.transactions.unshift(iTx);
          }
        }
      } else if (mode === 'ROLLOVER_PRINCIPAL') {
        inv.cumulativeDividends = round2((inv.cumulativeDividends || 0) + actualInterest);
        inv.realizedPnl = round2((inv.realizedPnl || 0) + actualInterest);
        inv.startDate = payload.newStartDate || today;
        inv.maturityDate = payload.newMaturityDate || inv.maturityDate;
        if (payload.newApr != null && Number(payload.newApr) > 0) inv.apr = round2(payload.newApr);
        inv.currentValue = inv.type === 'FIXED_DEPOSIT' ? principal : inv.currentValue;
        inv.lastUpdated = today;

        const dest = resolveDest();
        if (dest && actualInterest > 0) {
          const iCredit = convertBetweenCurrencies(actualInterest, inv.currency, dest.bal.currency, draft);
          const iTx = {
            id: uid('tx_int'),
            type: 'INCOME',
            title: `定存續存領息：${inv.name}`,
            amount: actualInterest,
            currency: inv.currency,
            settledAmount: iCredit,
            settledCurrency: dest.bal.currency,
            accountKind: 'ACCOUNT',
            accountId: dest.acc.id,
            balanceId: dest.bal.id,
            categoryId: 'cat_dividend',
            subCategoryId: 'sub_dv_2',
            subCategoryName: '定存利息',
            poolId: 'pool_reserve',
            date: today,
            time,
            note: `本金續存，利息入帳至 ${dest.acc.name}`
          };
          applyTransactionEffect(draft, iTx, 1);
          draft.transactions.unshift(iTx);
        }
      } else if (mode === 'ROLLOVER_ALL') {
        const nextPrincipal = round2(principal + actualInterest);
        inv.principal = nextPrincipal;
        inv.currentValue = nextPrincipal;
        inv.cumulativeDividends = round2((inv.cumulativeDividends || 0) + actualInterest);
        inv.realizedPnl = round2((inv.realizedPnl || 0) + actualInterest);
        inv.startDate = payload.newStartDate || today;
        inv.maturityDate = payload.newMaturityDate || inv.maturityDate;
        if (payload.newApr != null && Number(payload.newApr) > 0) inv.apr = round2(payload.newApr);
        inv.lastUpdated = today;
      }

      state = draft;
      notify();
      return inv;
    },

    applyBrokerSync(parsed, options) {
      const opts = options || {};
      const draft = cloneState();
      const brokerAccId = opts.brokerAccountId || null;
      const syncPositions = opts.syncPositions !== false;
      const syncCash = opts.syncCash !== false;
      const syncDate = parsed.statementDate || todayISO();

      const brokerAcc = brokerAccId ? draft.accounts.find((a) => a.id === brokerAccId) : null;
      const resolveBrokerBalId = (cur) => {
        if (!brokerAcc) return null;
        const found = (brokerAcc.balances || []).find((b) => b.currency === cur);
        return found ? found.id : ((brokerAcc.balances || [])[0] ? brokerAcc.balances[0].id : null);
      };

      // 1. Sync multi-currency cash balances on the selected broker account
      let cashUpdated = 0;
      if (syncCash && brokerAcc && Array.isArray(parsed.cashBalances)) {
        parsed.cashBalances.forEach((cb) => {
          let bal = (brokerAcc.balances || []).find((b) => b.currency === cb.currency);
          if (bal) {
            bal.amount = round2(cb.amount);
          } else {
            brokerAcc.balances.push({
              id: uid('bal'),
              currency: cb.currency,
              amount: round2(cb.amount),
              poolId: 'pool_invest',
              isDefaultPayment: false
            });
          }
          cashUpdated++;
        });
      }

      // 2. Sync open & closed positions
      let createdCnt = 0;
      let updatedCnt = 0;
      let closedCnt = 0;

      if (syncPositions) {
        (parsed.positions || []).forEach((p) => {
          const existing = findMatchingInvestment(draft.investments, p.ticker, p.name);
          const balId = resolveBrokerBalId(p.currency);
          if (existing) {
            existing.type = p.type;
            existing.ticker = p.ticker || existing.ticker;
            existing.currency = p.currency;
            existing.shares = p.shares;
            existing.principal = p.costBasis;
            existing.currentValue = p.marketValue;
            if (p.maturityDate) existing.maturityDate = p.maturityDate;
            if (p.faceValue) existing.faceValue = p.faceValue;
            if (brokerAccId) {
              existing.linkedAccountId = brokerAccId;
              existing.linkedBalanceId = balId;
            }
            existing.lastUpdated = syncDate;
            updatedCnt++;
          } else {
            draft.investments.unshift({
              id: uid('inv'),
              name: p.name,
              ticker: p.ticker,
              type: p.type,
              status: 'ACTIVE',
              entryMode: 'EXISTING',
              fundingSource: null,
              currency: p.currency,
              principal: p.costBasis,
              currentValue: p.marketValue,
              shares: p.shares,
              apr: null,
              faceValue: p.faceValue || null,
              startDate: parsed.periodStart || syncDate,
              maturityDate: p.maturityDate || null,
              closedDate: null,
              realizedPnl: 0,
              cumulativeDividends: 0,
              linkedAccountId: brokerAccId,
              linkedBalanceId: balId,
              dca: null,
              dcaHistory: [],
              lastUpdated: syncDate,
              note: `由 ${parsed.broker} 結單匯入`
            });
            createdCnt++;
          }
        });

        (parsed.closedPositions || []).forEach((cp) => {
          const existing = findMatchingInvestment(draft.investments, cp.ticker, cp.name);
          if (existing) {
            existing.status = 'CLOSED';
            existing.shares = 0;
            existing.principal = 0;
            existing.currentValue = 0;
            existing.closedDate = cp.closedDate || syncDate;
            existing.realizedPnl = round2((existing.realizedPnl || 0) + (cp.realizedPnl || 0));
            existing.lastUpdated = syncDate;
            closedCnt++;
          }
        });
      }

      // 3. Archive statement snapshot into wealthSnapshots
      const activeInvs = draft.investments.filter((x) => x.status !== 'CLOSED');
      let totalPrincipalBase = 0;
      let totalValueBase = 0;
      const snapItems = activeInvs.map((inv) => {
        const val = inv.type === 'FIXED_DEPOSIT'
          ? round2(inv.principal || 0)
          : round2(inv.currentValue != null ? inv.currentValue : (inv.principal || 0));
        const pri = round2(inv.principal || 0);
        totalPrincipalBase = round2(totalPrincipalBase + convertToBase(pri, inv.currency, draft));
        totalValueBase = round2(totalValueBase + convertToBase(val, inv.currency, draft));
        return {
          id: inv.id,
          name: inv.name,
          ticker: inv.ticker || '',
          type: inv.type,
          currency: inv.currency,
          shares: inv.shares,
          principal: pri,
          currentValue: val
        };
      });

      const snap = {
        id: uid('snap'),
        source: 'BROKER_SYNC',
        broker: parsed.broker,
        accountRef: parsed.accountRef,
        label: parsed.label,
        date: syncDate,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        baseCurrency: draft.meta.baseCurrency,
        totalPrincipalBase,
        totalValueBase,
        totalPnlBase: round2(totalValueBase - totalPrincipalBase),
        cashBalances: parsed.cashBalances || [],
        periodSummary: parsed.periodSummary || null,
        note: `同步：新增 ${createdCnt}、更新 ${updatedCnt}、清倉 ${closedCnt}，現金更新 ${cashUpdated} 幣種`,
        items: snapItems
      };

      draft.wealthSnapshots = draft.wealthSnapshots || [];
      draft.wealthSnapshots.unshift(snap);
      state = draft;
      notify();
      return { snap, createdCnt, updatedCnt, closedCnt, cashUpdated };
    },

    deleteWealthSnapshot(snapId) {
      const draft = cloneState();
      draft.wealthSnapshots = (draft.wealthSnapshots || []).filter((s) => s.id !== snapId);
      state = draft;
      notify();
    },

    // ---- Backup & Diagnostics ----
    exportJSON() {
      return JSON.stringify(state, null, 2);
    },

    importJSON(text) {
      const parsed = JSON.parse(text);
      state = migrateState(parsed);
      notify();
      return state;
    },

    runDiagnostics() {
      const checks = [];
      let nanFound = false;
      state.accounts.forEach((a) => {
        (a.balances || []).forEach((b) => {
          if (!Number.isFinite(Number(b.amount))) nanFound = true;
        });
      });
      checks.push({
        label: '帳戶餘額數值完整性',
        ok: !nanFound,
        detail: nanFound ? '發現無效數值' : `已檢查 ${state.accounts.length} 個帳戶`
      });

      let overflow = false;
      state.accounts.forEach((a) => {
        (a.balances || []).forEach((b) => {
          const sumAl = (a.allocations || [])
            .filter((al) => al.currency === b.currency)
            .reduce((s, al) => s + Number(al.amount || 0), 0);
          if (sumAl > Number(b.amount || 0) + 0.01) overflow = true;
        });
      });
      checks.push({
        label: '戶口內部份額不超額',
        ok: !overflow,
        detail: overflow ? '部分帳戶切分額大於餘額' : '所有切分額均在餘額內'
      });

      let brokenLoan = false;
      state.transactions.forEach((tx) => {
        if ((tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE') && tx.isLoanSettled) {
          if (!tx.settlementTxId || !state.transactions.some((x) => x.id === tx.settlementTxId)) {
            brokenLoan = true;
          }
        }
        if (tx.type === 'LOAN_SETTLEMENT' && tx.linkedLoanId) {
          if (!state.transactions.some((x) => x.id === tx.linkedLoanId)) {
            brokenLoan = true;
          }
        }
      });
      checks.push({
        label: '應收／借貸成對結清一致性',
        ok: !brokenLoan,
        detail: brokenLoan ? '發現孤立結清紀錄' : '雙向關聯 100% 閉環'
      });

      const boundPools = state.pools.filter((p) => p.settlementAccountId).length;
      checks.push({
        label: '分類與資金池交叉結算設定',
        ok: state.pools.length > 0 && state.categories.length > 0,
        detail: `${state.pools.length} 個資金池（已綁定找數戶口 ${boundPools} 個）`
      });

      return checks;
    }
  };

  window.WealthStore = WealthStore;
})();
