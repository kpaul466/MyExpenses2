import { AppCategory, Transaction, Person, ShoppingItem, TransactionGroup, AppPreferences } from './types';

const DEFAULT_CATEGORIES: AppCategory[] = [
  { id: 'cat_gen', name: 'General', icon: 'Wallet', color: '#94a3b8' },
  { id: 'cat_food', name: 'Food', icon: 'Pizza', color: '#f59e0b' },
  { id: 'cat_transport', name: 'Transport', icon: 'Car', color: '#3b82f6' },
];

const DEFAULT_PREFS: AppPreferences = {
  currency: 'INR',
  incomePrivacy: false,
  expensePrivacy: false,
  hasSeenTutorial: false,
  pin: null,
  watchedCategoryIds: [],
  googleDrive: {
    enabled: false,
    lastSyncTime: null,
    fileId: null,
  }
};

const markModified = () => localStorage.setItem('myexpense_last_modified', Date.now().toString());

export const localDB = {
  init: async () => {
    if (!localStorage.getItem('myexpense_prefs')) {
      localStorage.setItem('myexpense_prefs', JSON.stringify(DEFAULT_PREFS));
    }
    if (!localStorage.getItem('myexpense_categories')) {
      localStorage.setItem('myexpense_categories', JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem('myexpense_people')) {
      localStorage.setItem('myexpense_people', JSON.stringify([{ id: 'p1', name: 'Myself' }]));
    }
  },
  getTransactions: (): Transaction[] => JSON.parse(localStorage.getItem('myexpense_transactions') || '[]'),
  saveTransaction: (tx: Transaction) => {
    const txs = localDB.getTransactions();
    const existing = txs.findIndex(t => t.id === tx.id);
    if (existing >= 0) txs[existing] = tx;
    else txs.push(tx);
    localStorage.setItem('myexpense_transactions', JSON.stringify(txs));
    markModified();
  },
  deleteTransaction: (id: string) => {
    const txs = localDB.getTransactions().filter(t => t.id !== id);
    localStorage.setItem('myexpense_transactions', JSON.stringify(txs));
    markModified();
  },
  getPeople: (): Person[] => JSON.parse(localStorage.getItem('myexpense_people') || '[]'),
  savePerson: (person: Person) => {
    const people = localDB.getPeople();
    people.push(person);
    localStorage.setItem('myexpense_people', JSON.stringify(people));
    markModified();
  },
  deletePerson: (id: string) => {
    const people = localDB.getPeople().filter(p => p.id !== id);
    localStorage.setItem('myexpense_people', JSON.stringify(people));
    markModified();
  },
  getCategories: (): AppCategory[] => JSON.parse(localStorage.getItem('myexpense_categories') || '[]'),
  saveCategory: (cat: AppCategory) => {
    const cats = localDB.getCategories();
    const existing = cats.findIndex(c => c.id === cat.id);
    if (existing >= 0) cats[existing] = cat;
    else cats.push(cat);
    localStorage.setItem('myexpense_categories', JSON.stringify(cats));
    markModified();
  },
  deleteCategory: (id: string) => {
    const cats = localDB.getCategories().filter(c => c.id !== id);
    localStorage.setItem('myexpense_categories', JSON.stringify(cats));
    markModified();
  },
  getPrefs: (): AppPreferences => {
    const stored = localStorage.getItem('myexpense_prefs');
    if (!stored) return DEFAULT_PREFS;
    try {
      const parsed = JSON.parse(stored);
      return { 
        ...DEFAULT_PREFS, 
        ...parsed, 
        googleDrive: { ...DEFAULT_PREFS.googleDrive, ...(parsed.googleDrive || {}) },
        watchedCategoryIds: parsed.watchedCategoryIds || DEFAULT_PREFS.watchedCategoryIds
      };
    } catch (e) {
      return DEFAULT_PREFS;
    }
  },
  savePrefs: (prefs: AppPreferences) => {
    localStorage.setItem('myexpense_prefs', JSON.stringify(prefs));
    markModified();
  },
  getPlannerGroups: (): TransactionGroup[] => JSON.parse(localStorage.getItem('myexpense_planner_groups') || '[]'),
  savePlannerGroup: (group: TransactionGroup) => {
    const groups = localDB.getPlannerGroups();
    const existing = groups.findIndex(g => g.id === group.id);
    if (existing >= 0) groups[existing] = group;
    else groups.push(group);
    localStorage.setItem('myexpense_planner_groups', JSON.stringify(groups));
    markModified();
  },
  deletePlannerGroup: (id: string) => {
    const groups = localDB.getPlannerGroups().filter(g => g.id !== id);
    localStorage.setItem('myexpense_planner_groups', JSON.stringify(groups));
    markModified();
  },
  getPlannerItems: (): ShoppingItem[] => JSON.parse(localStorage.getItem('myexpense_planner_items') || '[]'),
  savePlannerItem: (item: ShoppingItem) => {
    const items = localDB.getPlannerItems();
    const existing = items.findIndex(i => i.id === item.id);
    if (existing >= 0) items[existing] = item;
    else items.push(item);
    localStorage.setItem('myexpense_planner_items', JSON.stringify(items));
    markModified();
  },
  deletePlannerItem: (id: string) => {
    const items = localDB.getPlannerItems().filter(i => i.id !== id);
    localStorage.setItem('myexpense_planner_items', JSON.stringify(items));
    markModified();
  },
  settleCredit: (id: string) => {
    const txs = localDB.getTransactions();
    const tx = txs.find(t => t.id === id);
    if (tx) {
      tx.isCleared = true;
      localStorage.setItem('myexpense_transactions', JSON.stringify(txs));
      markModified();
    }
  },
  getFullState: () => {
    return {
      transactions: localDB.getTransactions(),
      people: localDB.getPeople(),
      categories: localDB.getCategories(),
      plannerGroups: localDB.getPlannerGroups(),
      plannerItems: localDB.getPlannerItems(),
      prefs: localDB.getPrefs()
    };
  },
  restoreFullState: (state: any) => {
    if (state.transactions) localStorage.setItem('myexpense_transactions', JSON.stringify(state.transactions));
    if (state.people) localStorage.setItem('myexpense_people', JSON.stringify(state.people));
    if (state.categories) localStorage.setItem('myexpense_categories', JSON.stringify(state.categories));
    if (state.plannerGroups) localStorage.setItem('myexpense_planner_groups', JSON.stringify(state.plannerGroups));
    if (state.plannerItems) localStorage.setItem('myexpense_planner_items', JSON.stringify(state.plannerItems));
    if (state.prefs) localStorage.setItem('myexpense_prefs', JSON.stringify(state.prefs));
    markModified();
  }
};
