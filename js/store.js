(function () {
  'use strict';

  const STORAGE_KEY = 'wealth_pwa_state_v19';
  const APP_VERSION = 'Stage 1 r12';
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
    { id: 'obsidian', name: '曜石黑', bg: 'linear-gradient(135deg, #1E1F24 0%, #0E0F12 100%)', accent: '#E5E7EB' },
    { id: 'titanium', name: '原色鈦', bg: 'linear-gradient(135deg, #3A3A40 0%, #1C1C20 100%)', accent: '#F3F4F6' },
    { id: 'emerald', name: '深邃綠', bg: 'linear-gradient(135deg, #0D3B2E 0%, #071F18 100%)', accent: '#34D399' },
    { id: 'sapphire', name: '午夜藍', bg: 'linear-gradient(135deg, #12294B 0%, #091528 100%)', accent: '#60A5FA' },
    { id: 'amber', name: '流沙金', bg: 'linear-gradient(135deg, #4B3312 0%, #241707 100%)', accent: '#FBBF24' },
    { id: 'crimson', name: '酒紅釉', bg: 'linear-gradient(135deg, #4C1622 0%, #240A10 100%)', accent: '#FB7185' },
    { id: 'violet', name: '星雲紫', bg: 'linear-gradient(135deg, #311B4E 0%, #160B24 100%)', accent: '#A78BFA' },
    { id: 'copper', name: '暖古銅', bg: 'linear-gradient(135deg, #522916 0%, #261209 100%)', accent: '#FB923C' }
  ];

  const POOL_COLORS = ['#34D399', '#38BDF8', '#60A5FA', '#FBBF24', '#A78BFA', '#FB7185', '#FB923C', '#9CA3AF'];

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

  function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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
      transactions: [],
      splitRules: []
    };
  }

  function createDemoState(baseCurrency) {
    const base = baseCurrency || 'MOP';
    const today = todayISO();
    const pools = JSON.parse(JSON.stringify(DEFAULT_POOLS));
    pools.forEach((p) => {
      if (p.id === 'pool_liquid' || p.id === 'pool_household') {
        p.settlementAccountId = 'acc_bank_main';
        p.settlementBalanceId = 'bal_main_base';
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
        fxRates: buildFxMap(base)
      },
      pools,
      categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      accounts: [
        {
          id: 'acc_bank_main',
          name: '主力綜合銀行',
          subtitle: '綜合活期',
          type: 'BANK',
          theme: 'sapphire',
          balances: [
            { id: 'bal_main_base', currency: base, amount: 48145, poolId: 'pool_liquid', isDefaultPayment: true },
            { id: 'bal_main_hkd', currency: base === 'HKD' ? 'USD' : 'HKD', amount: 12000, poolId: 'pool_reserve', isDefaultPayment: false }
          ],
          allocations: [
            { id: 'alloc_1', currency: base, name: '應急底倉', amount: 20000, locked: true, poolId: 'pool_reserve' },
            { id: 'alloc_2', currency: base, name: '年度旅行基金', amount: 8000, locked: false, poolId: 'pool_goal' }
          ]
        },
        {
          id: 'acc_bank_high',
          name: '高息儲蓄銀行',
          subtitle: '高息活期戶',
          type: 'BANK',
          theme: 'emerald',
          balances: [
            { id: 'bal_high_base', currency: base, amount: 245000, poolId: 'pool_reserve', isDefaultPayment: false }
          ],
          allocations: [
            { id: 'alloc_3', currency: base, name: '核心凍結底倉', amount: 200000, locked: true, poolId: 'pool_reserve' }
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
          unbilled: 4280,
          billed: 0,
          theme: 'titanium',
          autoPayAccountId: 'acc_bank_main'
        },
        {
          id: 'card_2',
          name: '餐飲消費卡',
          last4: '3094',
          currency: base,
          creditLimit: 50000,
          statementDay: 25,
          dueDay: 18,
          unbilled: 1320,
          billed: 0,
          theme: 'crimson',
          autoPayAccountId: 'acc_bank_main'
        },
        {
          id: 'card_3',
          name: '網購旅遊卡',
          last4: '5160',
          currency: base,
          creditLimit: 60000,
          statementDay: 10,
          dueDay: 28,
          unbilled: 680,
          billed: 0,
          theme: 'sapphire',
          autoPayAccountId: 'acc_bank_main'
        }
      ],
      investments: [
        {
          id: 'inv_1',
          name: '6個月定期存款',
          type: 'FIXED_DEPOSIT',
          currency: base,
          principal: 100000,
          currentValue: 101850,
          apr: 3.7,
          maturityDate: '2027-02-15'
        },
        {
          id: 'inv_2',
          name: '標普 500 指數 ETF',
          type: 'ETF',
          currency: 'USD',
          principal: 15000,
          currentValue: 17420,
          apr: null,
          maturityDate: null
        }
      ],
      transactions: [
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
          counterparty: '同事 A',
          isLoanSettled: false,
          settlementTxId: null,
          date: today,
          time: '08:40',
          note: '週五聚餐代付'
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
          fxRates: buildFxMap(base)
        },
        raw.meta || {},
        { schemaVersion: SCHEMA_VERSION, appVersion: APP_VERSION }
      ),
      pools: migratedPools,
      categories: migratedCats,
      accounts: Array.isArray(raw.accounts) ? raw.accounts : [],
      cards: Array.isArray(raw.cards) ? raw.cards : [],
      investments: Array.isArray(raw.investments) ? raw.investments : [],
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

  function adjustAccountOrCard(draft, kind, accountId, balanceId, delta) {
    const d = round2(delta);
    if (!d) return;
    if (kind === 'CARD') {
      const card = draft.cards.find((c) => c.id === accountId);
      if (card) {
        card.unbilled = round2((card.unbilled || 0) + d);
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
        adjustAccountOrCard(draft, 'CARD', tx.accountId, null, sign * settled);
      } else {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, -sign * settled);
      }
    } else if (tx.type === 'INCOME') {
      if (tx.accountKind === 'CARD') {
        adjustAccountOrCard(draft, 'CARD', tx.accountId, null, -sign * settled);
      } else {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, sign * settled);
      }
    } else if (tx.type === 'TRANSFER') {
      if (tx.accountKind === 'CARD') {
        adjustAccountOrCard(draft, 'CARD', tx.accountId, null, sign * amt);
      } else {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.accountId, tx.balanceId, -sign * amt);
      }
      if (tx.toAccountKind === 'CARD') {
        adjustAccountOrCard(draft, 'CARD', tx.toAccountId, null, -sign * settled);
      } else {
        adjustAccountOrCard(draft, 'ACCOUNT', tx.toAccountId, tx.toBalanceId, sign * settled);
      }
    } else if (tx.type === 'RECEIVABLE') {
      if (tx.accountKind === 'CARD') {
        adjustAccountOrCard(draft, 'CARD', tx.accountId, null, sign * settled);
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

  function getSummaryMetrics(st) {
    const s = st || state;
    let liquidCash = 0;
    let lockedWallet = 0;

    s.accounts.forEach((acc) => {
      const lockedByCur = {};
      (acc.allocations || []).forEach((al) => {
        if (al.locked) {
          lockedByCur[al.currency] = round2((lockedByCur[al.currency] || 0) + Number(al.amount || 0));
        }
      });
      (acc.balances || []).forEach((bal) => {
        const totalCur = Number(bal.amount || 0);
        const lockedCur = Math.min(Math.max(0, totalCur), lockedByCur[bal.currency] || 0);
        const freeCur = totalCur - lockedCur;
        liquidCash += convertToBase(freeCur, bal.currency, s);
        lockedWallet += convertToBase(lockedCur, bal.currency, s);
      });
    });

    let investmentsTotal = 0;
    (s.investments || []).forEach((inv) => {
      investmentsTotal += convertToBase(inv.currentValue || inv.principal || 0, inv.currency, s);
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

    const lockedAndInvestments = round2(lockedWallet + investmentsTotal);
    const totalNetWorth = round2(liquidCash + lockedAndInvestments + pendingReceivables - pendingPayables - cardDebt);

    return {
      liquidCash: round2(liquidCash),
      lockedWallet: round2(lockedWallet),
      investmentsTotal: round2(investmentsTotal),
      lockedAndInvestments,
      cardDebt: round2(cardDebt),
      pendingReceivables: round2(pendingReceivables),
      pendingPayables: round2(pendingPayables),
      totalNetWorth
    };
  }

  function getCreditCardCycle(card) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayD = now.getDate();
    const stmtDay = Math.min(28, Math.max(1, Number(card.statementDay || 15)));
    const dueDay = Math.min(28, Math.max(1, Number(card.dueDay || 5)));

    let cycleStart, cycleEnd;
    if (todayD <= stmtDay) {
      cycleStart = new Date(y, m - 1, stmtDay + 1);
      cycleEnd = new Date(y, m, stmtDay);
    } else {
      cycleStart = new Date(y, m, stmtDay + 1);
      cycleEnd = new Date(y, m + 1, stmtDay);
    }

    let dueDate = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), dueDay);
    if (dueDate <= cycleEnd) {
      dueDate = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth() + 1, dueDay);
    }
    const daysToDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    return {
      periodLabel: `${fmt(cycleStart)} – ${fmt(cycleEnd)}`,
      dueLabel: `${dueDate.getMonth() + 1}月${dueDate.getDate()}日`,
      daysToDue: Math.max(0, daysToDue)
    };
  }

  const WealthStore = {
    APP_VERSION,
    SCHEMA_VERSION,
    CURRENCIES,
    CARD_THEMES,
    POOL_COLORS,
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
    getSummaryMetrics,
    getCreditCardCycle,

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
        locked: Boolean(payload.locked),
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
        note: `對應${isReceivable ? '代墊' : '借款'}原單結清`
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
        label: '應收／應付成對結清一致性',
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
