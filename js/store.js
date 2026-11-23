(() => {
      const SCHEMA_VERSION = '1.9.0';
      const STORAGE_KEY = 'WEALTH_APP_STATE_V1';
      const PRE_MIGRATION_KEY = 'WEALTH_APP_PRE_MIGRATION_BACKUP';

      const CURRENCY_META = {
        MOP: { code: 'MOP', symbol: 'MOP$', name: '澳門幣', defaultToMOP: 1.0 },
        HKD: { code: 'HKD', symbol: 'HK$',  name: '港幣',   defaultToMOP: 1.03 },
        TWD: { code: 'TWD', symbol: 'NT$',  name: '新台幣', defaultToMOP: 0.25 },
        USD: { code: 'USD', symbol: 'US$',  name: '美元',   defaultToMOP: 8.03 },
        CNY: { code: 'CNY', symbol: '¥',    name: '人民幣', defaultToMOP: 1.12 },
        JPY: { code: 'JPY', symbol: 'JP¥',  name: '日圓',   defaultToMOP: 0.053 },
        EUR: { code: 'EUR', symbol: '€',    name: '歐元',   defaultToMOP: 8.65 }
      };

      function buildFxRatesForBase(baseCurrency) {
        const baseToMOP = CURRENCY_META[baseCurrency]?.defaultToMOP || 1.0;
        const coreCodes = ['MOP', 'HKD', 'USD', 'CNY', 'TWD'].filter(c => c !== baseCurrency);
        return coreCodes.map(code => {
          const toMOP = CURRENCY_META[code]?.defaultToMOP || 1.0;
          const rate = Math.round((toMOP / baseToMOP) * 10000) / 10000;
          return {
            code,
            name: CURRENCY_META[code]?.name || code,
            rate,
            isCore: ['MOP', 'HKD', 'USD', 'CNY'].includes(code)
          };
        });
      }

      function createDefaultCategories() {
        return {
          EXPENSE: [
            {
              id: 'cat_food', name: '飲食', color: '#FB923C', archived: false,
              subs: [
                { id: 'sub_grocery', name: '超市買菜', defaultBucket: 'PUBLIC', merchants: ['超市', '生鮮市場'], archived: false },
                { id: 'sub_dining',  name: '三餐外食', defaultBucket: 'PUBLIC', merchants: ['餐廳', '外賣'], archived: false },
                { id: 'sub_coffee',  name: '咖啡輕食', defaultBucket: 'PERSONAL', merchants: ['咖啡店', '便利店'], archived: false }
              ]
            },
            {
              id: 'cat_transport', name: '交通', color: '#38BDF8', archived: false,
              subs: [
                { id: 'sub_fuel',    name: '油費與充電', defaultBucket: 'PUBLIC', merchants: ['加油站'], archived: false },
                { id: 'sub_parking', name: '泊車與通行', defaultBucket: 'PUBLIC', merchants: ['停車場'], archived: false },
                { id: 'sub_car_mnt', name: '保養與稅費', defaultBucket: 'SINKING', merchants: ['保養中心'], archived: false }
              ]
            },
            {
              id: 'cat_home', name: '居住', color: '#6366F1', archived: false,
              subs: [
                { id: 'sub_housing', name: '房租與按揭', defaultBucket: 'FIXED', merchants: ['銀行按揭'], archived: false },
                { id: 'sub_utility', name: '水電煤與通訊', defaultBucket: 'PUBLIC', merchants: ['電力公司', '電訊'], archived: false },
                { id: 'sub_service', name: '管理與家務', defaultBucket: 'PUBLIC', merchants: ['物業管理'], archived: false }
              ]
            },
            {
              id: 'cat_shopping', name: '日用購物', color: '#14B8A6', archived: false,
              subs: [
                { id: 'sub_home_daily', name: '家居日用品', defaultBucket: 'PUBLIC', merchants: ['藥妝日用'], archived: false },
                { id: 'sub_self_daily', name: '個人服飾護理', defaultBucket: 'PERSONAL', merchants: ['個人護理'], archived: false }
              ]
            },
            {
              id: 'cat_health', name: '醫療保險', color: '#A855F7', archived: false,
              subs: [
                { id: 'sub_ins',    name: '年度保費', defaultBucket: 'SINKING', merchants: ['保險機構'], archived: false },
                { id: 'sub_clinic', name: '門診與健康', defaultBucket: 'PUBLIC', merchants: ['診所'], archived: false }
              ]
            },
            {
              id: 'cat_leisure', name: '個人娛樂', color: '#F59E0B', archived: false,
              subs: [
                { id: 'sub_digital', name: '數碼與訂閱', defaultBucket: 'PERSONAL', merchants: ['App Store'], archived: false },
                { id: 'sub_hobby',   name: '運動與消遣', defaultBucket: 'PERSONAL', merchants: ['運動場館'], archived: false }
              ]
            }
          ],
          INCOME: [
            {
              id: 'cat_salary', name: '薪資收入', color: '#34D399', archived: false,
              subs: [
                { id: 'sub_main_sal', name: '正職薪資', defaultBucket: 'FIXED', merchants: ['薪資入帳'], archived: false },
                { id: 'sub_bonus',    name: '獎金與津貼', defaultBucket: 'SINKING', merchants: ['年度獎金'], archived: false }
              ]
            },
            {
              id: 'cat_passive', name: '被動收益', color: '#FBBF24', archived: false,
              subs: [
                { id: 'sub_td_int',   name: '定存利息', defaultBucket: 'PERSONAL', merchants: ['銀行定存'], archived: false },
                { id: 'sub_cashback', name: '回贈與股息', defaultBucket: 'PERSONAL', merchants: ['現金回贈'], archived: false }
              ]
            }
          ]
        };
      }

      function createDefaultBuckets(primaryAccIds = {}) {
        return [
          { id: 'PUBLIC',   name: '日常營運', color: '#38BDF8', monthlyBudget: 15000, primaryAccountId: primaryAccIds.PUBLIC || '',   archived: false },
          { id: 'PERSONAL', name: '個人消費', color: '#F59E0B', monthlyBudget: 3000,  primaryAccountId: primaryAccIds.PERSONAL || '', archived: false },
          { id: 'SINKING',  name: '年度預留', color: '#A855F7', monthlyBudget: 8000,  primaryAccountId: primaryAccIds.SINKING || '',  archived: false },
          { id: 'FIXED',    name: '固定開支', color: '#34D399', monthlyBudget: 20000, primaryAccountId: primaryAccIds.FIXED || '',    archived: false }
        ];
      }

      function todayISO() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }

      function createBlankState(baseCurrency = 'MOP') {
        const today = todayISO();
        return {
          schemaVersion: SCHEMA_VERSION,
          onboardingCompleted: true,
          lastModifiedAt: new Date().toISOString(),
          revision: 1,
          settings: {
            baseCurrency,
            fxRates: buildFxRatesForBase(baseCurrency),
            preferences: {
              hideBalancesOnLaunch: false,
              defaultExcludeTransfers: true,
              monthStartDay: 1
            },
            buckets: createDefaultBuckets(),
            categories: createDefaultCategories(),
            paydayTemplates: [],
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
              id: 'card_main_cash',
              institution: '主力活期銀行',
              type: 'BANK',
              themeId: 'titanium',
              archived: false,
              accounts: [
                {
                  id: 'acc_main_base',
                  currency: baseCurrency,
                  name: '綜合活期戶',
                  balance: 0,
                  lockedBalance: 0,
                  purpose: 'PUBLIC',
                  isPrimary: true,
                  archived: false,
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
          netWorthSnapshots: [
            { month: today.slice(0, 7), netWorth: 0, liquidCash: 0, lockedAndFrozen: 0, investments: 0, debt: 0 }
          ]
        };
      }

      function createDemoState(baseCurrency = 'MOP') {
        const today = todayISO();
        const ym = today.slice(0, 7);
        const state = {
          schemaVersion: SCHEMA_VERSION,
          onboardingCompleted: true,
          lastModifiedAt: new Date().toISOString(),
          revision: 1,
          settings: {
            baseCurrency,
            fxRates: buildFxRatesForBase(baseCurrency),
            preferences: {
              hideBalancesOnLaunch: false,
              defaultExcludeTransfers: true,
              monthStartDay: 1
            },
            buckets: createDefaultBuckets({
              PUBLIC: 'acc_bank_a_base',
              PERSONAL: 'acc_wallet_base',
              SINKING: 'acc_bank_b_base',
              FIXED: 'acc_bank_a_base'
            }),
            categories: createDefaultCategories(),
            paydayTemplates: [
              { id: 'pt_1', enabled: true, title: '正職月薪入帳', type: 'INCOME',   amount: 45000, bucketId: 'FIXED',    accountId: 'acc_bank_a_base', toAccountId: '' },
              { id: 'pt_2', enabled: true, title: '固定居住開支', type: 'EXPENSE',  amount: 16000, bucketId: 'FIXED',    accountId: 'acc_bank_a_base', toAccountId: '' },
              { id: 'pt_3', enabled: true, title: '撥入年度預留', type: 'TRANSFER', amount: 8000,  bucketId: 'SINKING',  accountId: 'acc_bank_a_base', toAccountId: 'acc_bank_b_base' },
              { id: 'pt_4', enabled: true, title: '撥入個人錢包', type: 'TRANSFER', amount: 3000,  bucketId: 'PERSONAL', accountId: 'acc_bank_a_base', toAccountId: 'acc_wallet_base' }
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
              id: 'card_bank_a',
              institution: '主力綜合銀行',
              type: 'BANK',
              themeId: 'crimson',
              archived: false,
              accounts: [
                {
                  id: 'acc_bank_a_base',
                  currency: baseCurrency,
                  name: '綜合活期',
                  balance: 48200,
                  lockedBalance: 50000,
                  purpose: 'PUBLIC',
                  isPrimary: true,
                  archived: false,
                  subBuckets: [
                    { id: 'sb_a1', name: '本月營運配額', amount: 15000, isFrozen: false, color: '#38BDF8' },
                    { id: 'sb_a2', name: '固定支出預留', amount: 16000, isFrozen: true,  color: '#34D399' }
                  ]
                },
                {
                  id: 'acc_bank_a_hkd',
                  currency: baseCurrency === 'HKD' ? 'USD' : 'HKD',
                  name: '外幣活期',
                  balance: 12000,
                  lockedBalance: 0,
                  purpose: 'PUBLIC',
                  isPrimary: false,
                  archived: false,
                  subBuckets: []
                }
              ]
            },
            {
              id: 'card_bank_b',
              institution: '高息儲蓄銀行',
              type: 'BANK',
              themeId: 'purple',
              archived: false,
              accounts: [
                {
                  id: 'acc_bank_b_base',
                  currency: baseCurrency,
                  name: '高息活期戶',
                  balance: 245000,
                  lockedBalance: 0,
                  purpose: 'SINKING',
                  isPrimary: true,
                  archived: false,
                  subBuckets: [
                    { id: 'sb_b1', name: '緊急預備底倉', amount: 180000, isFrozen: true,  color: '#F43F5E' },
                    { id: 'sb_b2', name: '年度保險與稅費', amount: 42000,  isFrozen: false, color: '#A855F7' }
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
                  id: 'acc_wallet_base',
                  currency: baseCurrency,
                  name: '消費餘額',
                  balance: 2460,
                  lockedBalance: 0,
                  purpose: 'PERSONAL',
                  isPrimary: true,
                  archived: false,
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
                  lockedBalance: 0,
                  purpose: 'SINKING',
                  isPrimary: false,
                  archived: false,
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
              settlementAccountId: 'acc_bank_a_base',
              archived: false,
              annualFee: {
                hasFee: true,
                feeAmount: 600,
                billingMonth: 6,
                waiverType: 'SWIPE_COUNT',
                currentProgress: 5,
                waiverTarget: 6
              },
              statements: {
                [baseCurrency]: {
                  settlementAccountId: 'acc_bank_a_base',
                  settlementMode: 'SAME_CCY',
                  customFxRate: 1.0,
                  billedAmount: 6850,
                  unbilledAmount: 2140,
                  isSettled: false,
                  lastSettledInfo: null,
                  lastSettlementSnapshot: null,
                  bucketBreakdown: { PUBLIC: 4450, SINKING: 1600, PERSONAL: 800 },
                  unbilledBreakdown: { PUBLIC: 1540, SINKING: 0, PERSONAL: 600 }
                }
              }
            },
            {
              id: 'cc_rebate',
              name: '現金回贈卡',
              institution: '發卡銀行 B',
              network: 'Visa',
              last4: '8821',
              themeId: 'titanium',
              creditLimit: 60000,
              billingDay: 15,
              dueDay: 5,
              settlementAccountId: 'acc_bank_a_base',
              archived: false,
              annualFee: {
                hasFee: true,
                feeAmount: 800,
                billingMonth: 11,
                waiverType: 'SPEND_AMOUNT',
                currentProgress: 16400,
                waiverTarget: 20000
              },
              statements: {
                [baseCurrency]: {
                  settlementAccountId: 'acc_bank_a_base',
                  settlementMode: 'SAME_CCY',
                  customFxRate: 1.0,
                  billedAmount: 3200,
                  unbilledAmount: 980,
                  isSettled: false,
                  lastSettledInfo: null,
                  lastSettlementSnapshot: null,
                  bucketBreakdown: { PUBLIC: 2200, SINKING: 0, PERSONAL: 1000 },
                  unbilledBreakdown: { PUBLIC: 680, SINKING: 0, PERSONAL: 300 }
                }
              }
            }
          ],
          transactions: [
            {
              id: 'tx_demo_1',
              date: today,
              time: '12:30',
              type: 'EXPENSE',
              mainCatId: 'cat_food',
              subCatId: 'sub_dining',
              title: '午餐外食',
              merchant: '餐廳',
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
              id: 'tx_demo_2',
              date: today,
              time: '09:15',
              type: 'EXPENSE',
              mainCatId: 'cat_food',
              subCatId: 'sub_coffee',
              title: '手沖咖啡',
              merchant: '咖啡店',
              bucketId: 'PERSONAL',
              accountId: 'acc_wallet_base',
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
              id: 'tx_demo_3',
              date: today,
              time: '08:40',
              type: 'RECEIVABLE',
              mainCatId: 'cat_food',
              subCatId: 'sub_dining',
              title: '代墊聚餐款項',
              merchant: '茶餐廳',
              bucketId: 'PERSONAL',
              accountId: 'acc_wallet_base',
              toAccountId: null,
              currency: baseCurrency,
              amount: 140,
              accountAmount: 140,
              creditCycle: null,
              counterparty: '同事 A',
              receivableMode: 'NEW',
              isLoanSettled: false,
              isLockedSettled: false,
              note: '待轉帳收回'
            }
          ],
          timeDeposits: [
            {
              id: 'td_demo_1',
              bankAccountId: 'acc_bank_a_base',
              bankName: '主力綜合銀行',
              label: '90天定期',
              currency: baseCurrency,
              principal: 50000,
              ratePct: 3.65,
              termDays: 90,
              elapsedDays: 52,
              dayBasis: 365,
              startDate: '2026-10-02',
              maturityDate: '2026-12-31'
            }
          ],
          settledDeposits: [],
          investments: [
            {
              id: 'inv_demo_voo',
              code: 'VOO',
              assetType: 'ETF',
              accent: '#38BDF8',
              institution: '證券投資帳戶',
              brokerAccountId: 'acc_broker_usd',
              name: '標普 500 指數 ETF',
              currency: 'USD',
              principalCost: 18500,
              marketValue: 21840,
              realizedPnlAccum: 0,
              monthlyDCA: 800,
              dcaFreq: 'MONTHLY',
              dcaDay: 5,
              dcaSourceAccId: 'acc_broker_usd',
              dcaEndMonth: '',
              lastUpdated: today,
              snapshots: [
                { date: '2025-12-31', principalCost: 12000, marketValue: 13560, dividends: 180, fees: 6, source: 'REPORT', note: '年度結單' },
                { date: today, principalCost: 18500, marketValue: 21840, dividends: 145, fees: 4, source: 'MANUAL', note: '現時市值' }
              ]
            }
          ],
          closedInvestments: [],
          netWorthSnapshots: [
            { month: '2026-08', netWorth: 468000, liquidCash: 122000, lockedAndFrozen: 220000, investments: 136000, debt: 10000 },
            { month: '2026-09', netWorth: 492000, liquidCash: 128000, lockedAndFrozen: 225000, investments: 149000, debt: 10000 },
            { month: '2026-10', netWorth: 515000, liquidCash: 132000, lockedAndFrozen: 230000, investments: 162000, debt: 9000 }
          ]
        };

        // 寫入當月真實快照
        const snap = computeNetWorthSummary(state);
        state.netWorthSnapshots.push({
          month: ym,
          netWorth: snap.netWorth,
          liquidCash: snap.liquidCash,
          lockedAndFrozen: snap.lockedAndFrozen,
          investments: snap.investments,
          debt: snap.debt
        });

        return state;
      }

      // 無損版本遷移管線 (Schema Migration Pipeline)
      function migrateState(raw) {
        if (!raw || typeof raw !== 'object') return null;

        try {
          if (raw.schemaVersion && raw.schemaVersion !== SCHEMA_VERSION && window.localStorage) {
            window.localStorage.setItem(PRE_MIGRATION_KEY, JSON.stringify({
              savedAt: new Date().toISOString(),
              previousVersion: raw.schemaVersion,
              payload: raw
            }));
          }
        } catch (e) {}

        const baseCurr = raw.settings?.baseCurrency || 'MOP';
        const fallback = createBlankState(baseCurr);

        return {
          ...fallback,
          ...raw,
          schemaVersion: SCHEMA_VERSION,
          onboardingCompleted: raw.onboardingCompleted !== undefined ? !!raw.onboardingCompleted : true,
          lastModifiedAt: raw.lastModifiedAt || new Date().toISOString(),
          revision: Number(raw.revision) || 1,
          settings: {
            ...fallback.settings,
            ...(raw.settings || {}),
            preferences: {
              ...fallback.settings.preferences,
              ...(raw.settings?.preferences || {})
            },
            cloudSync: {
              ...fallback.settings.cloudSync,
              ...(raw.settings?.cloudSync || {})
            },
            fxRates: Array.isArray(raw.settings?.fxRates) ? raw.settings.fxRates : fallback.settings.fxRates,
            buckets: Array.isArray(raw.settings?.buckets) ? raw.settings.buckets : fallback.settings.buckets,
            categories: raw.settings?.categories?.EXPENSE ? raw.settings.categories : fallback.settings.categories,
            paydayTemplates: Array.isArray(raw.settings?.paydayTemplates) ? raw.settings.paydayTemplates : []
          },
          walletCards: Array.isArray(raw.walletCards) ? raw.walletCards : fallback.walletCards,
          creditCards: Array.isArray(raw.creditCards) ? raw.creditCards : [],
          transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
          timeDeposits: Array.isArray(raw.timeDeposits) ? raw.timeDeposits : [],
          settledDeposits: Array.isArray(raw.settledDeposits) ? raw.settledDeposits : [],
          investments: Array.isArray(raw.investments) ? raw.investments : [],
          closedInvestments: Array.isArray(raw.closedInvestments) ? raw.closedInvestments : [],
          netWorthSnapshots: Array.isArray(raw.netWorthSnapshots) ? raw.netWorthSnapshots : []
        };
      }

      // 匯率折算至主貨幣
      function convertToBase(state, amount, currency) {
        const val = Number(amount) || 0;
        const base = state?.settings?.baseCurrency || 'MOP';
        if (!currency || currency === base) return Math.round(val * 100) / 100;
        const found = (state?.settings?.fxRates || []).find(r => r.code === currency);
        const rate = found ? Number(found.rate) || 1 : 1;
        return Math.round(val * rate * 100) / 100;
      }

      function formatMoney(amount, currency = 'MOP', hide = false, maxDecimals = 0) {
        if (hide) return '••••••';
        const sym = CURRENCY_META[currency]?.symbol || `${currency} `;
        const num = Number(amount) || 0;
        return `${sym} ${num.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: maxDecimals
        })}`;
      }

      // 動態計算信用卡截數日、到期日與剩餘天數（修訂缺口 #1）
      function computeDynamicCardCycle(billingDay, dueDay, refDate = new Date()) {
        const bDay = Math.min(31, Math.max(1, Number(billingDay) || 1));
        const dDay = Math.min(31, Math.max(1, Number(dueDay) || 1));

        const clampDate = (y, m, d) => {
          const last = new Date(y, m + 1, 0).getDate();
          return new Date(y, m, Math.min(d, last));
        };

        const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
        const y = today.getFullYear();
        const m = today.getMonth();

        const lastCut = today.getDate() >= bDay
          ? clampDate(y, m, bDay)
          : clampDate(y, m - 1, bDay);

        const nextCut = clampDate(lastCut.getFullYear(), lastCut.getMonth() + 1, bDay);
        const unbilledStart = new Date(lastCut.getFullYear(), lastCut.getMonth(), lastCut.getDate() + 1);

        const dueDate = dDay > bDay
          ? clampDate(lastCut.getFullYear(), lastCut.getMonth(), dDay)
          : clampDate(lastCut.getFullYear(), lastCut.getMonth() + 1, dDay);

        const msPerDay = 24 * 60 * 60 * 1000;
        const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / msPerDay);

        const fmtMD = (dt) => `${dt.getMonth() + 1}/${String(dt.getDate()).padStart(2, '0')}`;

        return {
          daysUntilDue,
          billedRange: `${fmtMD(lastCut)} 截數 ➔ ${fmtMD(dueDate)} 找數`,
          unbilledRange: `${fmtMD(unbilledStart)} 起 · ${fmtMD(nextCut)} 截數`
        };
      }

      // 跨模組單一事實來源總淨資產計算（現金歸模組一、持倉歸模組四，絕不重複計算）
      function computeNetWorthSummary(state) {
        let liquidCash = 0;
        let lockedAndFrozen = 0;
        let investments = 0;
        let debt = 0;

        (state.walletCards || []).forEach(card => {
          if (card.archived) return;
          (card.accounts || []).forEach(acc => {
            if (acc.archived) return;
            const balBase = convertToBase(state, acc.balance, acc.currency);
            const lockedBase = convertToBase(state, acc.lockedBalance || 0, acc.currency);
            const frozenSub = (acc.subBuckets || [])
              .filter(sb => sb.isFrozen)
              .reduce((s, sb) => s + (Number(sb.amount) || 0), 0);
            const frozenBase = convertToBase(state, frozenSub, acc.currency);

            lockedAndFrozen += lockedBase + Math.min(balBase, frozenBase);
            liquidCash += Math.max(0, balBase - frozenBase);
          });
        });

        (state.investments || []).forEach(inv => {
          investments += convertToBase(state, inv.marketValue, inv.currency);
        });

        (state.creditCards || []).forEach(card => {
          if (card.archived) return;
          Object.entries(card.statements || {}).forEach(([curr, st]) => {
            if (!st.isSettled && Number(st.billedAmount) > 0) {
              debt += convertToBase(state, st.billedAmount, curr);
            }
            if (Number(st.unbilledAmount) > 0) {
              debt += convertToBase(state, st.unbilledAmount, curr);
            }
          });
        });

        const grossAssets = Math.round((liquidCash + lockedAndFrozen + investments) * 100) / 100;
        const netWorth = Math.round((grossAssets - debt) * 100) / 100;

        return {
          grossAssets,
          netWorth,
          liquidCash: Math.round(liquidCash * 100) / 100,
          lockedAndFrozen: Math.round(lockedAndFrozen * 100) / 100,
          investments: Math.round(investments * 100) / 100,
          debt: Math.round(debt * 100) / 100
        };
      }

      // 扁平化查詢所有銀包帳戶與信用卡
      function getFlatAccounts(state) {
        const list = [];
        (state.walletCards || []).forEach(c => {
          if (c.archived) return;
          (c.accounts || []).forEach(a => {
            if (a.archived) return;
            const frozenSum = (a.subBuckets || []).filter(sb => sb.isFrozen).reduce((s, sb) => s + (Number(sb.amount) || 0), 0);
            list.push({
              id: a.id,
              cardId: c.id,
              kind: c.type,
              institution: c.institution,
              name: a.name,
              displayName: `${c.institution} · ${a.name}`,
              currency: a.currency,
              balance: Number(a.balance) || 0,
              frozenSum,
              purpose: a.purpose,
              isPrimary: !!a.isPrimary
            });
          });
        });
        (state.creditCards || []).forEach(cc => {
          if (cc.archived) return;
          const primaryCurr = Object.keys(cc.statements || {})[0] || state.settings.baseCurrency;
          const st = cc.statements?.[primaryCurr];
          list.push({
            id: cc.id,
            cardId: cc.id,
            kind: 'CREDIT',
            institution: cc.institution,
            name: cc.name,
            displayName: `${cc.name} (•••• ${cc.last4})`,
            currency: primaryCurr,
            balance: (Number(st?.billedAmount) || 0) + (Number(st?.unbilledAmount) || 0),
            frozenSum: 0,
            purpose: 'PUBLIC',
            isPrimary: false
          });
        });
        return list;
      }

      // 核心差額回滾連動引擎 (Delta Rollback Engine)
      // direction = +1 套用交易影響；direction = -1 完整回滾舊影響
      function applyTransactionDelta(prevState, tx, direction = 1) {
        if (!tx) return { state: prevState, warnings: [] };
        if ((tx.type === 'RECEIVABLE' || tx.type === 'PAYABLE') && tx.receivableMode === 'EXISTING') {
          return { state: prevState, warnings: [] };
        }

        const warnings = [];
        const rawAmt = Number(tx.accountAmount ?? tx.amount) || 0;
        const amt = rawAmt * direction;
        if (amt === 0) return { state: prevState, warnings: [] };

        let nextWalletCards = prevState.walletCards;
        let nextCreditCards = prevState.creditCards;

        // 1. 檢查是否作用於銀包帳戶 (BANK / EWALLET / INVEST)
        nextWalletCards = (prevState.walletCards || []).map(card => ({
          ...card,
          accounts: (card.accounts || []).map(acc => {
            let delta = 0;
            if (tx.type === 'TRANSFER') {
              if (acc.id === tx.accountId) delta = -amt;
              else if (acc.id === tx.toAccountId) delta = +amt;
            } else if (acc.id === tx.accountId) {
              delta = (tx.type === 'INCOME' || tx.type === 'PAYABLE') ? +amt : -amt;
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

        // 2. 檢查是否作用於信用卡（同步更新雙週期三池帳單 ＋ 免年費進度）
        nextCreditCards = (prevState.creditCards || []).map(cc => {
          if (cc.id !== tx.accountId) return cc;
          if (tx.type === 'TRANSFER' || tx.type === 'SETTLEMENT') return cc;

          const baseCurr = prevState.settings?.baseCurrency || 'MOP';
          const stmtCurr = cc.statements?.[tx.currency] ? tx.currency : (Object.keys(cc.statements || {})[0] || baseCurr);
          const st = cc.statements?.[stmtCurr];
          if (!st) return cc;

          const stmtDelta = (tx.type === 'EXPENSE' || tx.type === 'RECEIVABLE') ? +amt : -amt;
          const bucketKey = tx.bucketId || 'PUBLIC';
          const isBilled = tx.creditCycle === 'BILLED';

          const nextStmt = isBilled
            ? {
                ...st,
                billedAmount: Math.max(0, Math.round(((Number(st.billedAmount) || 0) + stmtDelta) * 100) / 100),
                isSettled: Math.max(0, Math.round(((Number(st.billedAmount) || 0) + stmtDelta) * 100) / 100) === 0,
                bucketBreakdown: {
                  ...(st.bucketBreakdown || {}),
                  [bucketKey]: Math.max(0, Math.round(((Number(st.bucketBreakdown?.[bucketKey]) || 0) + stmtDelta) * 100) / 100)
                }
              }
            : {
                ...st,
                unbilledAmount: Math.max(0, Math.round(((Number(st.unbilledAmount) || 0) + stmtDelta) * 100) / 100),
                unbilledBreakdown: {
                  ...(st.unbilledBreakdown || {}),
                  [bucketKey]: Math.max(0, Math.round(((Number(st.unbilledBreakdown?.[bucketKey]) || 0) + stmtDelta) * 100) / 100)
                }
              };

          // 同步推進免年費進度 (修訂缺口 #2)
          let nextFee = cc.annualFee;
          if (cc.annualFee?.hasFee && (tx.type === 'EXPENSE' || tx.type === 'RECEIVABLE')) {
            const feeStep = cc.annualFee.waiverType === 'SWIPE_COUNT'
              ? (1 * direction)
              : (convertToBase(prevState, rawAmt, stmtCurr) * direction);
            nextFee = {
              ...cc.annualFee,
              currentProgress: Math.max(0, Math.round(((Number(cc.annualFee.currentProgress) || 0) + feeStep) * 100) / 100)
            };
          }

          return {
            ...cc,
            annualFee: nextFee,
            statements: { ...cc.statements, [stmtCurr]: nextStmt }
          };
        });

        return {
          state: {
            ...prevState,
            walletCards: nextWalletCards,
            creditCards: nextCreditCards
          },
          warnings
        };
      }

      // 內建帳務一致性自檢引擎 (Debug by Design)
      function runConsistencyDiagnostics(state) {
        const checks = [];

        // 1. 檢查數值健康度 (有無 NaN / Infinity)
        let nanCount = 0;
        (state.walletCards || []).forEach(c => (c.accounts || []).forEach(a => {
          if (!Number.isFinite(Number(a.balance))) nanCount += 1;
        }));
        (state.creditCards || []).forEach(cc => Object.values(cc.statements || {}).forEach(st => {
          if (!Number.isFinite(Number(st.billedAmount)) || !Number.isFinite(Number(st.unbilledAmount))) nanCount += 1;
        }));
        (state.transactions || []).forEach(t => {
          if (!Number.isFinite(Number(t.amount))) nanCount += 1;
        });
        checks.push({
          id: 'numeric',
          title: '數值完整性檢查 (無 NaN / 異常值)',
          pass: nanCount === 0,
          detail: nanCount === 0 ? '全部帳戶、信用卡與交易金額數值正常' : `發現 ${nanCount} 處異常數值`
        });

        // 2. 檢查參照完整性 (所有交易與帳戶的 bucketId / accountId 是否皆可解析)
        const validBucketIds = new Set((state.settings?.buckets || []).map(b => b.id));
        const validAccIds = new Set(getFlatAccounts(state).map(a => a.id));
        let orphanRefs = 0;
        (state.transactions || []).forEach(t => {
          if (t.bucketId && !validBucketIds.has(t.bucketId)) orphanRefs += 1;
          if (t.accountId && t.receivableMode !== 'EXISTING' && !validAccIds.has(t.accountId)) orphanRefs += 1;
        });
        checks.push({
          id: 'refs',
          title: '跨模組 ID 參照完整性',
          pass: orphanRefs === 0,
          detail: orphanRefs === 0 ? '所有交易皆正確關聯有效資金池與帳戶 ID' : `發現 ${orphanRefs} 筆孤兒 ID 參照`
        });

        // 3. 記憶體內差額回滾對稱性測試 (Add -> Edit -> Delete 精準歸零驗證)
        const accounts = getFlatAccounts(state);
        const testAcc = accounts[0];
        let symmetryPass = true;
        let symmetryDetail = '無測試帳戶可模擬';
        if (testAcc) {
          const beforeNw = computeNetWorthSummary(state).netWorth;
          const clone = JSON.parse(JSON.stringify(state));
          const mockTx = {
            id: '__diag_tx__',
            type: 'EXPENSE',
            bucketId: state.settings.buckets[0]?.id || 'PUBLIC',
            accountId: testAcc.id,
            currency: testAcc.currency,
            amount: 123.45,
            accountAmount: 123.45,
            creditCycle: 'UNBILLED'
          };
          const afterAdd = applyTransactionDelta(clone, mockTx, +1).state;
          const afterDel = applyTransactionDelta(afterAdd, mockTx, -1).state;
          const afterNw = computeNetWorthSummary(afterDel).netWorth;
          const drift = Math.abs(afterNw - beforeNw);
          symmetryPass = drift < 0.01;
          symmetryDetail = symmetryPass
            ? `模擬新增再撤銷 ${testAcc.currency} 123.45，淨資產誤差 0.00`
            : `偵測到回滾漂移誤差：${drift}`;
        }
        checks.push({
          id: 'rollback',
          title: '差額回滾對稱性驗證 (Add ➔ Delete)',
          pass: symmetryPass,
          detail: symmetryDetail
        });

        // 4. 檢查 Schema 版本與備份狀態
        checks.push({
          id: 'schema',
          title: `統一資料結構 Schema v${SCHEMA_VERSION}`,
          pass: state.schemaVersion === SCHEMA_VERSION,
          detail: `Revision #${state.revision} · 最後更新 ${(state.lastModifiedAt || '').slice(0, 16).replace('T', ' ')}`
        });

        return {
          allPassed: checks.every(c => c.pass),
          checks
        };
      }

      // 雲端同步衝突防呆判斷（防止新機空白資料覆蓋雲端帳本）
      function evaluateCloudConflict(localState, remoteState) {
        if (!remoteState) return { action: 'PUSH_LOCAL', reason: '雲端尚無備份，可安全上傳本機帳本' };
        const localCount = (localState.transactions || []).length + (localState.investments || []).length;
        const remoteCount = (remoteState.transactions || []).length + (remoteState.investments || []).length;
        if (localCount === 0 && remoteCount > 0) {
          return { action: 'FORCE_PULL_REMOTE', reason: '本機為空白帳本，已攔截上傳並建議從雲端還原' };
        }
        const localTs = new Date(localState.lastModifiedAt || 0).getTime();
        const remoteTs = new Date(remoteState.lastModifiedAt || 0).getTime();
        if (remoteTs > localTs) {
          return { action: 'CONFIRM_CONFLICT', reason: '雲端版本較新，請手動確認同步方向' };
        }
        return { action: 'PUSH_LOCAL', reason: '本機版本較新，可安全推送至雲端' };
      }

      // 讀取本地狀態（若首次開啟則回傳 onboardingCompleted: false 的待引導狀態）
      function loadInitialState() {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
              const migrated = migrateState(JSON.parse(raw));
              if (migrated) return migrated;
            }
          }
        } catch (e) {}

        // 首次開啟：尚未完成引導
        return {
          ...createBlankState('MOP'),
          onboardingCompleted: false
        };
      }

      let currentState = loadInitialState();
      const listeners = new Set();

      function persist(nextState) {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
          }
        } catch (e) {}
      }

      function emit() {
        listeners.forEach(fn => {
          try { fn(currentState); } catch (e) {}
        });
      }

      const WealthStore = {
        SCHEMA_VERSION,
        STORAGE_KEY,
        CURRENCY_META,

        getState: () => currentState,

        subscribe: (fn) => {
          listeners.add(fn);
          return () => listeners.delete(fn);
        },

        setState: (updater) => {
          const draft = typeof updater === 'function' ? updater(currentState) : updater;
          if (!draft) return;
          currentState = {
            ...draft,
            schemaVersion: SCHEMA_VERSION,
            lastModifiedAt: new Date().toISOString(),
            revision: (Number(currentState.revision) || 0) + 1
          };
          persist(currentState);
          emit();
          return currentState;
        },

        // 首次引導完成：建立範例帳本或空白帳本
        completeOnboarding: (baseCurrency, mode) => {
          const next = mode === 'DEMO'
            ? createDemoState(baseCurrency)
            : createBlankState(baseCurrency);
          currentState = next;
          persist(currentState);
          emit();
          return currentState;
        },

        // 重新進入引導（方便測試）
        resetToOnboarding: () => {
          currentState = { ...createBlankState(currentState.settings.baseCurrency), onboardingCompleted: false };
          persist(currentState);
          emit();
        },

        // 寫入單筆交易並即時觸發差額回滾與連動
        saveTransaction: (tx) => {
          let warnings = [];
          WealthStore.setState(prev => {
            const existing = (prev.transactions || []).find(t => t.id === tx.id);
            let working = prev;
            if (existing) {
              working = applyTransactionDelta(working, existing, -1).state;
            }
            const applied = applyTransactionDelta(working, tx, +1);
            warnings = applied.warnings;

            const nextTxs = existing
              ? (applied.state.transactions || []).map(t => t.id === tx.id ? tx : t)
              : [tx, ...(applied.state.transactions || [])];

            // 同步更新當月淨資產快照
            const snap = computeNetWorthSummary(applied.state);
            const curMonth = todayISO().slice(0, 7);
            const otherSnaps = (applied.state.netWorthSnapshots || []).filter(s => s.month !== curMonth);

            return {
              ...applied.state,
              transactions: nextTxs.sort((a, b) => b.date.localeCompare(a.date)),
              netWorthSnapshots: [
                ...otherSnaps,
                { month: curMonth, netWorth: snap.netWorth, liquidCash: snap.liquidCash, lockedAndFrozen: snap.lockedAndFrozen, investments: snap.investments, debt: snap.debt }
              ].sort((a, b) => a.month.localeCompare(b.month))
            };
          });
          return { warnings };
        },

        deleteTransaction: (txId) => {
          WealthStore.setState(prev => {
            const target = (prev.transactions || []).find(t => t.id === txId);
            if (!target) return prev;
            const rolled = applyTransactionDelta(prev, target, -1).state;
            return {
              ...rolled,
              transactions: (rolled.transactions || []).filter(t => t.id !== txId)
            };
          });
        },

        importFullBackup: (rawObj) => {
          const migrated = migrateState(rawObj);
          if (!migrated) throw new Error('無效的備份檔格式');
          currentState = { ...migrated, onboardingCompleted: true };
          persist(currentState);
          emit();
          return currentState;
        },

        // 工具函式輸出
        convertToBase,
        formatMoney,
        computeDynamicCardCycle,
        computeNetWorthSummary,
        getFlatAccounts,
        applyTransactionDelta,
        runConsistencyDiagnostics,
        evaluateCloudConflict,
        todayISO
      };

      window.WealthStore = WealthStore;
    })();
