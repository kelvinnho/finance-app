(function () {
  const SCHEMA_VERSION = '1.9.0';
  const STORAGE_KEY = 'WEALTH_APP_GLOBAL_STATE_V1_9';
  const BACKUP_KEY = 'WEALTH_APP_PRE_MIGRATION_BACKUP';

  const CURRENCY_SYMBOLS = {
    MOP: 'MOP$',
    HKD: 'HK$',
    USD: 'US$',
    CNY: '¥',
    TWD: 'NT$',
    JPY: '¥',
    EUR: '€',
    GBP: '£'
  };

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDaysISO(baseISO, days) {
    const [y, m, d] = (baseISO || todayISO()).split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setDate(dt.getDate() + (Number(days) || 0));
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  const DEFAULT_CATEGORIES = {
    EXPENSE: [
      {
        id: 'cat_food', name: '飲食買餸', iconKey: 'utensils', color: '#FB923C', archived: false,
        subs: [
          { id: 'sub_dining',  name: '三餐外食', defaultBucket: 'PUBLIC',   merchants: ['茶餐廳', '外賣平台', '餐廳聚餐'], archived: false },
          { id: 'sub_grocery', name: '超市買餸', defaultBucket: 'PUBLIC',   merchants: ['超級市場', '生鮮市場'], archived: false },
          { id: 'sub_coffee',  name: '咖啡輕食', defaultBucket: 'PERSONAL', merchants: ['咖啡店', '便利店'], archived: false }
        ]
      },
      {
        id: 'cat_transport', name: '交通出行', iconKey: 'car', color: '#38BDF8', archived: false,
        subs: [
          { id: 'sub_fuel',    name: '加油充電', defaultBucket: 'PUBLIC',  merchants: ['油站', '充電站'], archived: false },
          { id: 'sub_parking', name: '泊車交通', defaultBucket: 'PUBLIC',  merchants: ['停車場', '公共交通'], archived: false },
          { id: 'sub_maint',   name: '保養稅費', defaultBucket: 'SINKING', merchants: ['汽車保養'], archived: false }
        ]
      },
      {
        id: 'cat_home', name: '居住家居', iconKey: 'home', color: '#818CF8', archived: false,
        subs: [
          { id: 'sub_mortgage', name: '按揭租金', defaultBucket: 'FIXED',  merchants: ['銀行按揭'], archived: false },
          { id: 'sub_utility',  name: '水電通訊', defaultBucket: 'PUBLIC', merchants: ['電力公司', '電訊寬頻'], archived: false },
          { id: 'sub_daily',    name: '日用消耗', defaultBucket: 'PUBLIC', merchants: ['藥妝日用', '家居用品'], archived: false }
        ]
      },
      {
        id: 'cat_personal', name: '個人消遣', iconKey: 'bag', color: '#F59E0B', archived: false,
        subs: [
          { id: 'sub_shopping', name: '數碼服飾', defaultBucket: 'PERSONAL', merchants: ['網購平台', '百貨商場'], archived: false },
          { id: 'sub_sport',    name: '運動娛樂', defaultBucket: 'PERSONAL', merchants: ['體育場館', '電影院'], archived: false }
        ]
      },
      {
        id: 'cat_edu_ins', name: '教育醫療', iconKey: 'shield', color: '#A855F7', archived: false,
        subs: [
          { id: 'sub_edu',     name: '進修教育', defaultBucket: 'SINKING', merchants: ['學校機構'], archived: false },
          { id: 'sub_ins',     name: '保險醫療', defaultBucket: 'SINKING', merchants: ['保險公司', '門診醫療'], archived: false }
        ]
      }
    ],
    INCOME: [
      {
        id: 'cat_salary', name: '薪資收入', iconKey: 'briefcase', color: '#34D399', archived: false,
        subs: [
          { id: 'sub_main_sal', name: '每月薪資', defaultBucket: 'FIXED',   merchants: ['薪資入帳'], archived: false },
          { id: 'sub_bonus',    name: '獎金津貼', defaultBucket: 'SINKING', merchants: ['年度獎金'], archived: false }
        ]
      },
      {
        id: 'cat_passive', name: '被動收益', iconKey: 'sparkles', color: '#FBBF24', archived: false,
        subs: [
          { id: 'sub_td_int',   name: '定存利息',   defaultBucket: 'PERSONAL', merchants: ['銀行定存'], archived: false },
          { id: 'sub_cashback', name: '回贈與股息', defaultBucket: 'PERSONAL', merchants: ['信用卡回贈'], archived: false }
        ]
      }
    ]
  };

  function createSeedState(baseCurrency = 'MOP') {
    const today = todayISO();
    return {
      schemaVersion: SCHEMA_VERSION,
      hasCompletedOnboarding: true,
      lastModifiedAt: new Date().toISOString(),
      revision: 1,
      settings: {
        baseCurrency,
        fxRates: [
          { code: 'MOP', name: '澳門幣', rate: 1.0,  isCore: true },
          { code: 'HKD', name: '港幣',   rate: 1.03, isCore: true },
          { code: 'USD', name: '美元',   rate: 8.03, isCore: true },
          { code: 'CNY', name: '人民幣', rate: 1.12, isCore: true },
          { code: 'TWD', name: '新台幣', rate: 0.25, isCore: false },
          { code: 'JPY', name: '日圓',   rate: 0.053, isCore: false }
        ],
        preferences: {
          hideBalancesOnLaunch: false,
          defaultExcludeTransfers: true,
          monthStartDay: 1
        },
        buckets: [
          { id: 'PUBLIC',   name: '公共營運', color: '#38BDF8', monthlyBudget: 18000, primaryAccountId: 'acc_main_mop', archived: false },
          { id: 'PERSONAL', name: '個人消費', color: '#F59E0B', monthlyBudget: 2500,  primaryAccountId: 'acc_ewallet',  archived: false },
          { id: 'SINKING',  name: '年度預留', color: '#A855F7', monthlyBudget: 12000, primaryAccountId: 'acc_hy_mop',   archived: false },
          { id: 'FIXED',    name: '固定開支', color: '#34D399', monthlyBudget: 25000, primaryAccountId: 'acc_main_mop', archived: false }
        ],
        categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
        paydayTemplates: [
          { id: 'pt_1', enabled: true, title: '每月薪資入帳',   type: 'INCOME',   mainCatId: 'cat_salary', subCatId: 'sub_main_sal', amount: 45000, currency: baseCurrency, bucketId: 'FIXED',    accountId: 'acc_main_mop', toAccountId: null },
          { id: 'pt_2', enabled: true, title: '物業按揭扣款',   type: 'EXPENSE',  mainCatId: 'cat_home',   subCatId: 'sub_mortgage', amount: 15000, currency: baseCurrency, bucketId: 'FIXED',    accountId: 'acc_main_mop', toAccountId: null },
          { id: 'pt_3', enabled: true, title: '撥入年度預留戶', type: 'TRANSFER', mainCatId: 'TRANSFER',   subCatId: 'TRANSFER',     amount: 10000, currency: baseCurrency, bucketId: 'SINKING',  accountId: 'acc_main_mop', toAccountId: 'acc_hy_mop' },
          { id: 'pt_4', enabled: true, title: '撥入個人消費池', type: 'TRANSFER', mainCatId: 'TRANSFER',   subCatId: 'TRANSFER',     amount: 2500,  currency: baseCurrency, bucketId: 'PERSONAL', accountId: 'acc_main_mop', toAccountId: 'acc_ewallet' }
        ],
        customTemplates: [
          { id: 'tpl_coffee', name: '日常咖啡輕食', type: 'EXPENSE', mainCatId: 'cat_food',      subCatId: 'sub_coffee', bucketId: 'PERSONAL', accountId: 'acc_ewallet', amount: 45,  currency: baseCurrency, merchant: '咖啡店' },
          { id: 'tpl_fuel',   name: '日常油費',     type: 'EXPENSE', mainCatId: 'cat_transport', subCatId: 'sub_fuel',   bucketId: 'PUBLIC',   accountId: 'cc_dual',     amount: 450, currency: baseCurrency, merchant: '油站' }
        ],
        cloudSync: {
          connected: false,
          clientId: '',
          accountEmail: '',
          autoSync: false,
          lastSyncAt: null
        },
        lastBackupAt: null
      },
      walletCards: [
        {
          id: 'card_main_bank',
          institution: '主力綜合銀行',
          type: 'BANK',
          themeId: 'titanium',
          archived: false,
          accounts: [
            {
              id: 'acc_main_mop',
              currency: baseCurrency,
              name: '綜合活期',
              balance: 48145,
              lockedBalance: 0,
              purpose: 'PUBLIC',
              isPrimary: true,
              subBuckets: [
                { id: 'sb_1', name: '緊急備用底倉', amount: 30000, isFrozen: true,  color: '#F43F5E' },
                { id: 'sb_2', name: '本月營運預留', amount: 12000, isFrozen: false, color: '#38BDF8' }
              ]
            },
            {
              id: 'acc_main_hkd',
              currency: 'HKD',
              name: '港幣活期',
              balance: 15000,
              lockedBalance: 0,
              purpose: 'PUBLIC',
              isPrimary: false,
              subBuckets: []
            }
          ]
        },
        {
          id: 'card_high_yield',
          institution: '高息儲蓄銀行',
          type: 'BANK',
          themeId: 'purple',
          archived: false,
          accounts: [
            {
              id: 'acc_hy_mop',
              currency: baseCurrency,
              name: '高息活期戶',
              balance: 245000,
              lockedBalance: 16000,
              purpose: 'SINKING',
              isPrimary: true,
              subBuckets: [
                { id: 'sb_3', name: '年度預留底倉', amount: 200000, isFrozen: true, color: '#A855F7' }
              ]
            }
          ]
        },
        {
          id: 'card_ewallet',
          institution: '日常電子錢包',
          type: 'EWALLET',
          themeId: 'sunset',
          archived: false,
          accounts: [
            {
              id: 'acc_ewallet',
              currency: baseCurrency,
              name: '消費餘額',
              balance: 2460,
              lockedBalance: 0,
              purpose: 'PERSONAL',
              isPrimary: true,
              subBuckets: []
            }
          ]
        },
        {
          id: 'card_broker',
          institution: '證券投資帳戶',
          type: 'INVEST',
          themeId: 'emerald',
          archived: false,
          accounts: [
            {
              id: 'acc_broker_usd',
              currency: 'USD',
              name: '美金交割現金',
              balance: 1650,
              principalCost: 23500,
              lockedBalance: 0,
              purpose: 'SINKING',
              isPrimary: false,
              subBuckets: []
            }
          ]
        }
      ],
      creditCards: [
        {
          id: 'cc_dual',
          name: '全幣種信用卡',
          institution: '主力綜合銀行',
          network: 'UnionPay',
          last4: '3910',
          themeId: 'crimson',
          creditLimit: 80000,
          billingDay: 8,
          dueDay: 28,
          settlementAccountId: 'acc_main_mop',
          archived: false,
          annualFee: { hasFee: true, feeAmount: 600, billingMonth: 6, waiverType: 'SWIPE_COUNT', currentProgress: 5, waiverTarget: 6 },
          statements: {
            [baseCurrency]: {
              settlementAccountId: 'acc_main_mop',
              settlementMode: 'SAME_CCY',
              customFxRate: 1.0,
              billedAmount: 4200,
              unbilledAmount: 1680,
              isSettled: false,
              lastSettledInfo: null,
              lastSettlementSnapshot: null,
              bucketBreakdown: { PUBLIC: 3000, SINKING: 800, PERSONAL: 400, FIXED: 0 },
              unbilledBreakdown: { PUBLIC: 1200, SINKING: 0, PERSONAL: 480, FIXED: 0 }
            }
          }
        },
        {
          id: 'cc_cashback',
          name: '現金回贈卡',
          institution: '高息儲蓄銀行',
          network: 'Mastercard',
          last4: '8821',
          themeId: 'ocean',
          creditLimit: 60000,
          billingDay: 25,
          dueDay: 15,
          settlementAccountId: 'acc_hy_mop',
          archived: false,
          annualFee: { hasFee: true, feeAmount: 800, billingMonth: 11, waiverType: 'SPEND_AMOUNT', currentProgress: 16400, waiverTarget: 20000 },
          statements: {
            [baseCurrency]: {
              settlementAccountId: 'acc_hy_mop',
              settlementMode: 'SAME_CCY',
              customFxRate: 1.0,
              billedAmount: 0,
              unbilledAmount: 950,
              isSettled: true,
              lastSettledInfo: null,
              lastSettlementSnapshot: null,
              bucketBreakdown: { PUBLIC: 0, SINKING: 0, PERSONAL: 0, FIXED: 0 },
              unbilledBreakdown: { PUBLIC: 650, SINKING: 0, PERSONAL: 300, FIXED: 0 }
            }
          }
        }
      ],
      transactions: [
        {
          id: 'tx_seed_1',
          date: today,
          time: '12:30',
          type: 'EXPENSE',
          mainCatId: 'cat_food',
          subCatId: 'sub_dining',
          title: '午餐外食',
          merchant: '茶餐廳',
          bucketId: 'PUBLIC',
          accountId: 'cc_dual',
          toAccountId: null,
          currency: baseCurrency,
          amount: 168,
          accountAmount: 168,
          creditCycle: 'UNBILLED',
          counterparty: '',
          receivableMode: 'NEW',
          isLoanSettled: false,
          isLockedSettled: false,
          note: ''
        },
        {
          id: 'tx_seed_2',
          date: today,
          time: '09:15',
          type: 'EXPENSE',
          mainCatId: 'cat_food',
          subCatId: 'sub_coffee',
          title: '手沖咖啡',
          merchant: '咖啡店',
          bucketId: 'PERSONAL',
          accountId: 'acc_ewallet',
          toAccountId: null,
          currency: baseCurrency,
          amount: 46,
          accountAmount: 46,
          creditCycle: null,
          counterparty: '',
          receivableMode: 'NEW',
          isLoanSettled: false,
          isLockedSettled: false,
          note: ''
        },
        {
          id: 'tx_seed_3',
          date: today,
          time: '08:40',
          type: 'RECEIVABLE',
          mainCatId: 'cat_food',
          subCatId: 'sub_dining',
          title: '代墊聚餐款項',
          merchant: '茶餐廳',
          bucketId: 'PERSONAL',
          accountId: 'acc_ewallet',
          toAccountId: null,
          currency: baseCurrency,
          amount: 140,
          accountAmount: 140,
          creditCycle: null,
          counterparty: '同事 A',
          receivableMode: 'NEW',
          isLoanSettled: false,
          settlementTxId: null,
          isLockedSettled: false,
          note: '待轉帳收回'
        }
      ],
      timeDeposits: [
        {
          id: 'td_seed_1',
          bankAccountId: 'acc_hy_mop',
          bankName: '高息儲蓄銀行',
          label: '3個月定期',
          currency: baseCurrency,
          principal: 16000,
          ratePct: 3.6,
          termDays: 90,
          elapsedDays: 45,
          dayBasis: 365,
          startDate: addDaysISO(today, -45),
          maturityDate: addDaysISO(today, 45)
        }
      ],
      settledDeposits: [],
      investments: [
        {
          id: 'inv_seed_1',
          code: 'VOO',
          assetType: 'ETF',
          accent: '#38BDF8',
          institution: '證券投資帳戶',
          brokerAccountId: 'acc_broker_usd',
          name: '標普 500 指數 ETF',
          currency: 'USD',
          principalCost: 23500,
          marketValue: 26800,
          realizedPnlAccum: 0,
          monthlyDCA: 800,
          dcaFreq: 'MONTHLY',
          dcaDay: 5,
          dcaSourceAccId: 'acc_broker_usd',
          dcaEndMonth: '',
          lastUpdated: today,
          snapshots: [
            { date: today, principalCost: 23500, marketValue: 26800, dividends: 0, fees: 0, source: 'MANUAL', note: '初始持倉' }
          ]
        }
      ],
      closedInvestments: [],
      netWorthSnapshots: [
        { month: today.slice(0, 7), netWorth: 533475, liquidCash: 125270, lockedAndFrozen: 246000, investments: 215204, debt: 6830 }
      ]
    };
  }

  function createEmptyState(baseCurrency = 'MOP') {
    const seed = createSeedState(baseCurrency);
    return {
      ...seed,
      hasCompletedOnboarding: true,
      settings: {
        ...seed.settings,
        baseCurrency,
        paydayTemplates: [],
        customTemplates: []
      },
      walletCards: [
        {
          id: 'card_default_cash',
          institution: '預設銀行帳戶',
          type: 'BANK',
          themeId: 'titanium',
          archived: false,
          accounts: [
            {
              id: 'acc_default_main',
              currency: baseCurrency,
              name: '綜合活期',
              balance: 0,
              lockedBalance: 0,
              purpose: 'PUBLIC',
              isPrimary: true,
              subBuckets: []
            }
          ]
        }
      ],
      creditCards: [],
      transactions: [],
      timeDeposits: [],
      settledDeposits: [],
      investments: [],
      closedInvestments: [],
      netWorthSnapshots: []
    };
  }

  function migrateState(raw) {
    if (!raw || typeof raw !== 'object') {
      const initial = createSeedState('MOP');
      initial.hasCompletedOnboarding = false;
      return initial;
    }
    const base = createSeedState(raw.settings?.baseCurrency || 'MOP');
    if (raw.schemaVersion && raw.schemaVersion !== SCHEMA_VERSION) {
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(raw));
      } catch (e) {}
    }
    return {
      ...base,
      ...raw,
      schemaVersion: SCHEMA_VERSION,
      hasCompletedOnboarding: raw.hasCompletedOnboarding !== undefined ? raw.hasCompletedOnboarding : true,
      settings: {
        ...base.settings,
        ...(raw.settings || {}),
        preferences: { ...base.settings.preferences, ...(raw.settings?.preferences || {}) },
        categories: {
          EXPENSE: Array.isArray(raw.settings?.categories?.EXPENSE) ? raw.settings.categories.EXPENSE : base.settings.categories.EXPENSE,
          INCOME: Array.isArray(raw.settings?.categories?.INCOME) ? raw.settings.categories.INCOME : base.settings.categories.INCOME
        },
        paydayTemplates: Array.isArray(raw.settings?.paydayTemplates) ? raw.settings.paydayTemplates : base.settings.paydayTemplates,
        customTemplates: Array.isArray(raw.settings?.customTemplates) ? raw.settings.customTemplates : base.settings.customTemplates,
        cloudSync: { ...base.settings.cloudSync, ...(raw.settings?.cloudSync || {}) }
      },
      walletCards: Array.isArray(raw.walletCards) ? raw.walletCards : base.walletCards,
      creditCards: Array.isArray(raw.creditCards) ? raw.creditCards : base.creditCards,
      transactions: Array.isArray(raw.transactions) ? raw.transactions : base.transactions,
      timeDeposits: Array.isArray(raw.timeDeposits) ? raw.timeDeposits : [],
      settledDeposits: Array.isArray(raw.settledDeposits) ? raw.settledDeposits : [],
      investments: Array.isArray(raw.investments) ? raw.investments : [],
      closedInvestments: Array.isArray(raw.closedInvestments) ? raw.closedInvestments : [],
      netWorthSnapshots: Array.isArray(raw.netWorthSnapshots) ? raw.netWorthSnapshots : []
    };
  }

  function getRateToBase(state, currency) {
    const base = state.settings?.baseCurrency || 'MOP';
    if (!currency || currency === base) return 1;
    const found = (state.settings?.fxRates || []).find(f => f.code === currency);
    return found && Number(found.rate) > 0 ? Number(found.rate) : 1;
  }

  function convertToBase(state, amount, currency) {
    return Math.round((Number(amount) || 0) * getRateToBase(state, currency) * 100) / 100;
  }

  function formatMoney(amount, currency = 'MOP', hide = false) {
    if (hide) return '••••••';
    const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
    return `${sym} ${Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  function computeNetWorthSummary(state) {
    let liquidCash = 0;
    let lockedAndFrozen = 0;
    let investments = 0;
    let debt = 0;

    (state.walletCards || []).filter(c => !c.archived).forEach(card => {
      (card.accounts || []).forEach(acc => {
        const balBase = convertToBase(state, acc.balance, acc.currency);
        const lockedBase = convertToBase(state, acc.lockedBalance || 0, acc.currency);
        const frozenRaw = (acc.subBuckets || []).filter(sb => sb.isFrozen).reduce((s, sb) => s + (Number(sb.amount) || 0), 0);
        const frozenBase = convertToBase(state, frozenRaw, acc.currency);

        lockedAndFrozen += lockedBase + frozenBase;
        liquidCash += Math.max(0, balBase - frozenBase);
      });
    });

    (state.investments || []).forEach(inv => {
      investments += convertToBase(state, inv.marketValue, inv.currency);
    });

    (state.creditCards || []).filter(c => !c.archived).forEach(cc => {
      Object.entries(cc.statements || {}).forEach(([curr, st]) => {
        const fx = st.settlementMode === 'MOP_FX' && st.customFxRate ? Number(st.customFxRate) : getRateToBase(state, curr);
        const billed = st.isSettled ? 0 : (Number(st.billedAmount) || 0);
        const unbilled = Number(st.unbilledAmount) || 0;
        debt += (billed + unbilled) * fx;
      });
    });

    let receivables = 0;
    (state.transactions || []).forEach(t => {
      if (t.isLoanSettled) return;
      if (t.type === 'RECEIVABLE') {
        receivables += convertToBase(state, t.amount, t.currency);
      } else if (t.type === 'PAYABLE') {
        debt += convertToBase(state, t.amount, t.currency);
      }
    });

    const grossAssets = Math.round((liquidCash + lockedAndFrozen + investments + receivables) * 100) / 100;
    const netWorth = Math.round((grossAssets - debt) * 100) / 100;

    return {
      grossAssets,
      netWorth,
      liquidCash: Math.round(liquidCash * 100) / 100,
      lockedAndFrozen: Math.round(lockedAndFrozen * 100) / 100,
      investments: Math.round(investments * 100) / 100,
      receivables: Math.round(receivables * 100) / 100,
      debt: Math.round(debt * 100) / 100
    };
  }

  function getFlatAccounts(state) {
    const list = [];
    (state.walletCards || []).filter(c => !c.archived).forEach(card => {
      const groupLabel = card.type === 'EWALLET' ? '電子錢包' : card.type === 'INVEST' ? '投資保單' : '銀行活期';
      (card.accounts || []).forEach(acc => {
        list.push({
          id: acc.id,
          cardId: card.id,
          name: `${acc.name}`,
          fullName: `${card.institution} · ${acc.name}`,
          institution: card.institution,
          group: groupLabel,
          kind: card.type,
          currency: acc.currency,
          balance: acc.balance,
          purpose: acc.purpose,
          isPrimary: acc.isPrimary
        });
      });
    });

    (state.creditCards || []).filter(c => !c.archived).forEach(cc => {
      const baseCurr = state.settings?.baseCurrency || 'MOP';
      const mainCurr = cc.statements?.[baseCurr] ? baseCurr : (Object.keys(cc.statements || {})[0] || baseCurr);
      const st = cc.statements?.[mainCurr] || { billedAmount: 0, unbilledAmount: 0 };
      list.push({
        id: cc.id,
        cardId: cc.id,
        name: cc.name,
        fullName: `${cc.institution} · ${cc.name}`,
        institution: cc.institution,
        group: '信用卡',
        kind: 'CREDIT',
        currency: mainCurr,
        balance: (st.isSettled ? 0 : (st.billedAmount || 0)) + (st.unbilledAmount || 0),
        purpose: 'PUBLIC',
        isPrimary: false
      });
    });

    return list;
  }

  // 核心差額回滾與跨模組連動引擎 (direction: +1 套用 / -1 回滾)
  function applyTransactionDelta(prevState, tx, direction = 1) {
    if (!tx) return { state: prevState, warnings: [] };
    if ((tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE') && tx.receivableMode === 'EXISTING') {
      return { state: prevState, warnings: [] };
    }

    const warnings = [];
    const rawAmt = Number(tx.amount) || 0;
    const accAmt = tx.accountAmount !== undefined && tx.accountAmount !== null ? Number(tx.accountAmount) : rawAmt;
    const amt = accAmt * direction;
    if (amt === 0) return { state: prevState, warnings };

    let nextWalletCards = (prevState.walletCards || []).map(card => ({
      ...card,
      accounts: (card.accounts || []).map(acc => {
        let delta = 0;
        if (tx.type === 'TRANSFER') {
          if (acc.id === tx.accountId) delta = -amt;
          else if (acc.id === tx.toAccountId) delta = +amt;
        } else if (acc.id === tx.accountId) {
          const isInflow = tx.type === 'INCOME' || tx.type === 'PAYABLE' || (tx.type === 'LOAN_SETTLEMENT' && tx.loanDirection === 'IN');
          delta = isInflow ? +amt : -amt;
        }
        if (delta === 0) return acc;

        const nextBalance = Math.round(((Number(acc.balance) || 0) + delta) * 100) / 100;
        const frozenSum = (acc.subBuckets || []).filter(sb => sb.isFrozen).reduce((s, sb) => s + (Number(sb.amount) || 0), 0);
        if (direction === 1 && frozenSum > 0 && nextBalance < frozenSum) {
          warnings.push(`「${card.institution} · ${acc.name}」餘額已低於凍結底倉`);
        }
        return { ...acc, balance: nextBalance };
      })
    }));

    let nextCreditCards = (prevState.creditCards || []).map(cc => {
      if (cc.id !== tx.accountId) return cc;
      if (tx.type === 'TRANSFER' || tx.type === 'SETTLEMENT') return cc;

      const baseCurr = prevState.settings?.baseCurrency || 'MOP';
      const stmtCurr = cc.statements?.[tx.currency] ? tx.currency : (Object.keys(cc.statements || {})[0] || baseCurr);
      const st = cc.statements?.[stmtCurr];
      if (!st) return cc;

      const isCardCharge = tx.type === 'EXPENSE' || tx.type === 'RECEIVABLE' || (tx.type === 'LOAN_SETTLEMENT' && tx.loanDirection === 'OUT');
      const stmtDelta = isCardCharge ? +amt : -amt;
      const bucketKey = tx.bucketId || 'PUBLIC';
      const isBilled = tx.creditCycle === 'BILLED';

      const nextStmt = isBilled
        ? {
            ...st,
            billedAmount: Math.max(0, Math.round(((st.billedAmount || 0) + stmtDelta) * 100) / 100),
            isSettled: Math.max(0, (st.billedAmount || 0) + stmtDelta) === 0,
            bucketBreakdown: {
              ...(st.bucketBreakdown || {}),
              [bucketKey]: Math.max(0, ((st.bucketBreakdown?.[bucketKey]) || 0) + stmtDelta)
            }
          }
        : {
            ...st,
            unbilledAmount: Math.max(0, Math.round(((st.unbilledAmount || 0) + stmtDelta) * 100) / 100),
            unbilledBreakdown: {
              ...(st.unbilledBreakdown || {}),
              [bucketKey]: Math.max(0, ((st.unbilledBreakdown?.[bucketKey]) || 0) + stmtDelta)
            }
          };

      let nextAnnualFee = cc.annualFee;
      if (cc.annualFee?.hasFee && isCardCharge) {
        const feeDelta = cc.annualFee.waiverType === 'SWIPE_COUNT' ? (1 * direction) : stmtDelta;
        nextAnnualFee = {
          ...cc.annualFee,
          currentProgress: Math.max(0, Math.round(((cc.annualFee.currentProgress || 0) + feeDelta) * 100) / 100)
        };
      }

      return {
        ...cc,
        annualFee: nextAnnualFee,
        statements: { ...cc.statements, [stmtCurr]: nextStmt }
      };
    });

    return {
      state: { ...prevState, walletCards: nextWalletCards, creditCards: nextCreditCards },
      warnings
    };
  }

  let currentState = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return migrateState(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return migrateState(null);
    }
  })();

  const listeners = new Set();

  function persistAndEmit(nextState) {
    currentState = {
      ...nextState,
      lastModifiedAt: new Date().toISOString(),
      revision: (nextState.revision || 0) + 1
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (e) {}
    listeners.forEach(fn => fn(currentState));
  }

  window.WealthStore = {
    SCHEMA_VERSION,
    STORAGE_KEY,
    CURRENCY_SYMBOLS,
    todayISO,
    addDaysISO,
    getState: () => currentState,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setState: (updater) => {
      const next = typeof updater === 'function' ? updater(currentState) : updater;
      persistAndEmit(next);
    },
    completeOnboarding: (baseCurrency, mode) => {
      const next = mode === 'BLANK' ? createEmptyState(baseCurrency) : createSeedState(baseCurrency);
      persistAndEmit(next);
    },
    resetToOnboarding: () => {
      persistAndEmit({ ...currentState, hasCompletedOnboarding: false });
    },
    convertToBase: (amount, currency) => convertToBase(currentState, amount, currency),
    getRateToBase: (currency) => getRateToBase(currentState, currency),
    formatMoney,
    computeNetWorthSummary: () => computeNetWorthSummary(currentState),
    getFlatAccounts: () => getFlatAccounts(currentState),
    saveTransaction: (txInput, saveAsTemplate = false) => {
      let warnings = [];
      WealthStore.setState(prev => {
        const oldTx = (prev.transactions || []).find(t => t.id === txInput.id);
        let working = prev;
        if (oldTx) {
          working = applyTransactionDelta(working, oldTx, -1).state;
        }
        const applied = applyTransactionDelta(working, txInput, +1);
        working = applied.state;
        warnings = applied.warnings;

        let nextCategories = working.settings.categories;
        if (txInput.merchant && (txInput.type === 'EXPENSE' || txInput.type === 'INCOME')) {
          const flow = txInput.type;
          nextCategories = {
            ...nextCategories,
            [flow]: (nextCategories[flow] || []).map(cat => {
              if (cat.id !== txInput.mainCatId) return cat;
              return {
                ...cat,
                subs: (cat.subs || []).map(sub => {
                  if (sub.id !== txInput.subCatId) return sub;
                  const exists = (sub.merchants || []).includes(txInput.merchant);
                  return exists ? sub : { ...sub, merchants: [txInput.merchant, ...(sub.merchants || [])].slice(0, 12) };
                })
              };
            })
          };
        }

        let nextCustomTemplates = working.settings.customTemplates || [];
        if (saveAsTemplate) {
          nextCustomTemplates = [
            {
              id: 'tpl_' + Date.now(),
              name: txInput.title || '常用範本',
              type: txInput.type,
              mainCatId: txInput.mainCatId,
              subCatId: txInput.subCatId,
              bucketId: txInput.bucketId,
              accountId: txInput.accountId,
              amount: txInput.amount,
              currency: txInput.currency,
              merchant: txInput.merchant || ''
            },
            ...nextCustomTemplates
          ];
        }

        const exists = (working.transactions || []).some(t => t.id === txInput.id);
        const nextTxs = exists
          ? working.transactions.map(t => t.id === txInput.id ? txInput : t)
          : [txInput, ...(working.transactions || [])];
        nextTxs.sort((a, b) => b.date.localeCompare(a.date));

        const snap = computeNetWorthSummary(working);
        const curMonth = todayISO().slice(0, 7);
        const otherSnaps = (working.netWorthSnapshots || []).filter(s => s.month !== curMonth);

        return {
          ...working,
          settings: {
            ...working.settings,
            categories: nextCategories,
            customTemplates: nextCustomTemplates
          },
          transactions: nextTxs,
          netWorthSnapshots: [
            ...otherSnaps,
            { month: curMonth, netWorth: snap.netWorth, liquidCash: snap.liquidCash, lockedAndFrozen: snap.lockedAndFrozen, investments: snap.investments, debt: snap.debt }
          ].sort((a, b) => a.month.localeCompare(b.month))
        };
      });
      return warnings;
    },
    deleteTransaction: (txId) => {
      let outcome = 'DELETED';
      WealthStore.setState(prev => {
        const target = (prev.transactions || []).find(t => t.id === txId);
        if (!target) return prev;

        let working = applyTransactionDelta(prev, target, -1).state;
        const idsToRemove = new Set([txId]);
        let revertLoanId = null;

        if ((target.type === 'RECEIVABLE' || target.type === 'PAYABLE') && target.isLoanSettled) {
          const pairedSettle = (working.transactions || []).find(
            t => t.id === target.settlementTxId || t.linkedLoanTxId === target.id
          );
          if (pairedSettle) {
            working = applyTransactionDelta(working, pairedSettle, -1).state;
            idsToRemove.add(pairedSettle.id);
            outcome = 'PAIR_DELETED';
          }
        }

        if (target.type === 'LOAN_SETTLEMENT' && target.linkedLoanTxId) {
          revertLoanId = target.linkedLoanTxId;
          outcome = 'REVERTED_LOAN';
        }

        const nextTxs = (working.transactions || [])
          .filter(t => !idsToRemove.has(t.id))
          .map(t => t.id === revertLoanId ? { ...t, isLoanSettled: false, settlementTxId: null } : t);

        const snap = computeNetWorthSummary(working);
        const curMonth = todayISO().slice(0, 7);
        const otherSnaps = (working.netWorthSnapshots || []).filter(s => s.month !== curMonth);

        return {
          ...working,
          transactions: nextTxs,
          netWorthSnapshots: [
            ...otherSnaps,
            { month: curMonth, netWorth: snap.netWorth, liquidCash: snap.liquidCash, lockedAndFrozen: snap.lockedAndFrozen, investments: snap.investments, debt: snap.debt }
          ].sort((a, b) => a.month.localeCompare(b.month))
        };
      });
      return outcome;
    },
    settleLoanTransaction: (loanTxId, settleAccountId) => {
      const prev = currentState;
      const loan = (prev.transactions || []).find(t => t.id === loanTxId);
      if (!loan || loan.isLoanSettled) return null;
      const flat = getFlatAccounts(prev);
      const settleAcc = flat.find(a => a.id === settleAccountId) || flat.find(a => a.id === loan.accountId) || flat[0];
      const now = new Date();
      const settleTx = {
        id: 'tx_settle_' + Date.now(),
        date: todayISO(),
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        type: 'LOAN_SETTLEMENT',
        loanDirection: loan.type === 'RECEIVABLE' ? 'IN' : 'OUT',
        linkedLoanTxId: loan.id,
        mainCatId: loan.mainCatId,
        subCatId: loan.subCatId,
        title: `${loan.type === 'RECEIVABLE' ? '已收回' : '已償還'} · ${loan.counterparty || loan.title}`,
        merchant: loan.counterparty || '',
        bucketId: loan.bucketId,
        accountId: settleAcc ? settleAcc.id : loan.accountId,
        toAccountId: null,
        currency: settleAcc ? settleAcc.currency : loan.currency,
        amount: loan.amount,
        accountAmount: loan.amount,
        creditCycle: settleAcc?.kind === 'CREDIT' ? 'UNBILLED' : null,
        counterparty: loan.counterparty || '',
        receivableMode: 'NEW',
        isLoanSettled: true,
        isLockedSettled: false,
        note: `結清原單 (${loan.date} ${loan.title})`
      };
      WealthStore.setState(curr => {
        const applied = applyTransactionDelta(curr, settleTx, +1).state;
        const marked = (applied.transactions || []).map(t =>
          t.id === loanTxId ? { ...t, isLoanSettled: true, settlementTxId: settleTx.id } : t
        );
        const snap = computeNetWorthSummary(applied);
        const curMonth = todayISO().slice(0, 7);
        const otherSnaps = (applied.netWorthSnapshots || []).filter(s => s.month !== curMonth);
        return {
          ...applied,
          transactions: [settleTx, ...marked].sort((a, b) => b.date.localeCompare(a.date)),
          netWorthSnapshots: [
            ...otherSnaps,
            { month: curMonth, netWorth: snap.netWorth, liquidCash: snap.liquidCash, lockedAndFrozen: snap.lockedAndFrozen, investments: snap.investments, debt: snap.debt }
          ].sort((a, b) => a.month.localeCompare(b.month))
        };
      });
      return settleTx;
    },
    unsettleLoanTransaction: (loanTxId) => {
      let ok = false;
      WealthStore.setState(curr => {
        const loan = (curr.transactions || []).find(t => t.id === loanTxId);
        if (!loan || !loan.isLoanSettled) return curr;

        const settleTx = (curr.transactions || []).find(
          t => t.id === loan.settlementTxId || t.linkedLoanTxId === loan.id
        );
        const working = settleTx ? applyTransactionDelta(curr, settleTx, -1).state : curr;
        const nextTxs = (working.transactions || [])
          .filter(t => !settleTx || t.id !== settleTx.id)
          .map(t => t.id === loanTxId ? { ...t, isLoanSettled: false, settlementTxId: null } : t);

        const snap = computeNetWorthSummary(working);
        const curMonth = todayISO().slice(0, 7);
        const otherSnaps = (working.netWorthSnapshots || []).filter(s => s.month !== curMonth);
        ok = true;
        return {
          ...working,
          transactions: nextTxs,
          netWorthSnapshots: [
            ...otherSnaps,
            { month: curMonth, netWorth: snap.netWorth, liquidCash: snap.liquidCash, lockedAndFrozen: snap.lockedAndFrozen, investments: snap.investments, debt: snap.debt }
          ].sort((a, b) => a.month.localeCompare(b.month))
        };
      });
      return ok;
    },
    savePaydayTemplates: (nextTemplates) => {
      WealthStore.setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          paydayTemplates: Array.isArray(nextTemplates) ? nextTemplates : []
        }
      }));
    },
    executePaydayBatch: (batchItems, targetDate) => {
      WealthStore.setState(prev => {
        let working = prev;
        const flat = getFlatAccounts(prev);
        const created = [];
        (batchItems || []).forEach((it, idx) => {
          if (!it.enabled || Number(it.amount) <= 0) return;
          const srcAcc = flat.find(a => a.id === it.accountId);
          const tx = {
            id: `tx_batch_${Date.now()}_${idx}`,
            date: targetDate || todayISO(),
            time: '09:00',
            type: it.type,
            mainCatId: it.type === 'TRANSFER' ? 'TRANSFER' : (it.mainCatId || (it.type === 'INCOME' ? 'cat_salary' : 'cat_home')),
            subCatId: it.type === 'TRANSFER' ? 'TRANSFER' : (it.subCatId || (it.type === 'INCOME' ? 'sub_main_sal' : 'sub_mortgage')),
            title: it.title,
            merchant: '',
            bucketId: it.bucketId || 'PUBLIC',
            accountId: it.accountId,
            toAccountId: it.type === 'TRANSFER' ? (it.toAccountId || null) : null,
            currency: it.currency || srcAcc?.currency || prev.settings.baseCurrency,
            amount: Number(it.amount),
            accountAmount: Number(it.amount),
            creditCycle: srcAcc?.kind === 'CREDIT' && it.type !== 'TRANSFER' ? 'UNBILLED' : null,
            counterparty: '',
            receivableMode: 'NEW',
            isLoanSettled: false,
            isLockedSettled: false,
            note: '月度固定分流'
          };
          working = applyTransactionDelta(working, tx, +1).state;
          created.push(tx);
        });
        const snap = computeNetWorthSummary(working);
        const curMonth = todayISO().slice(0, 7);
        const otherSnaps = (working.netWorthSnapshots || []).filter(s => s.month !== curMonth);
        return {
          ...working,
          transactions: [...created, ...(working.transactions || [])].sort((a, b) => b.date.localeCompare(a.date)),
          netWorthSnapshots: [
            ...otherSnaps,
            { month: curMonth, netWorth: snap.netWorth, liquidCash: snap.liquidCash, lockedAndFrozen: snap.lockedAndFrozen, investments: snap.investments, debt: snap.debt }
          ].sort((a, b) => a.month.localeCompare(b.month))
        };
      });
    },
    runConsistencyDiagnostics: () => {
      const st = currentState;
      const checks = [];

      let invalidNumbers = 0;
      (st.walletCards || []).forEach(c => (c.accounts || []).forEach(a => {
        if (!Number.isFinite(Number(a.balance))) invalidNumbers++;
      }));
      (st.creditCards || []).forEach(cc => Object.values(cc.statements || {}).forEach(s => {
        if (!Number.isFinite(Number(s.billedAmount)) || !Number.isFinite(Number(s.unbilledAmount))) invalidNumbers++;
      }));
      checks.push({
        id: 'CHK_NUM',
        label: '帳戶與信用卡數值完整性',
        ok: invalidNumbers === 0,
        detail: invalidNumbers === 0 ? '所有帳戶餘額與帳單欄位皆為有效數值' : `發現 ${invalidNumbers} 筆異常數值`
      });

      const validBucketIds = new Set((st.settings?.buckets || []).map(b => b.id));
      const orphanTxs = (st.transactions || []).filter(t => t.bucketId && !validBucketIds.has(t.bucketId));
      checks.push({
        id: 'CHK_REF',
        label: '資金池與分類引用一致性',
        ok: orphanTxs.length === 0,
        detail: orphanTxs.length === 0 ? `${(st.transactions || []).length} 筆交易關聯完整無斷鏈` : `${orphanTxs.length} 筆交易資金池未對齊`
      });

      const firstAcc = getFlatAccounts(st)[0];
      let rollbackOk = true;
      if (firstAcc) {
        const probeTx = {
          id: 'probe_tx',
          type: 'EXPENSE',
          amount: 123.45,
          accountAmount: 123.45,
          currency: firstAcc.currency,
          accountId: firstAcc.id,
          bucketId: 'PUBLIC',
          creditCycle: 'UNBILLED'
        };
        const afterAdd = applyTransactionDelta(st, probeTx, +1).state;
        const afterDel = applyTransactionDelta(afterAdd, probeTx, -1).state;
        rollbackOk = JSON.stringify(afterDel.walletCards) === JSON.stringify(st.walletCards) &&
                     JSON.stringify(afterDel.creditCards) === JSON.stringify(st.creditCards);
      }
      checks.push({
        id: 'CHK_ROLLBACK',
        label: '差額回滾引擎對稱性自檢',
        ok: rollbackOk,
        detail: rollbackOk ? '新增 ➔ 回滾 100% 精準歸零還原' : '差額回滾偵測到偏差'
      });

      return checks;
    },
    exportFullJson: () => JSON.stringify(currentState, null, 2),
    importFullJson: (parsed) => {
      const migrated = migrateState(parsed);
      persistAndEmit(migrated);
    }
  };
})();
