export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMode = 'CASH' | 'CREDIT';
export type CreditType = 'LENT' | 'BORROWED';
export type View = 'dashboard' | 'analytics' | 'history' | 'ledger' | 'planner' | 'settings' | 'category_manager' | 'add';

export interface AppCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  personId?: string;
  groupId?: string;
  note: string;
  timestamp: number;
  type: TransactionType;
  paymentMode: PaymentMode;
  creditType?: CreditType;
  isCleared?: boolean;
}

export interface Person {
  id: string;
  name: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  estimatedAmount: number;
  categoryId: string;
  groupId: string;
  isBought: boolean;
  createdAt: number;
}

export interface TransactionGroup {
  id: string;
  name: string;
  budget: number;
  createdAt: number;
}

export interface AppPreferences {
  currency: string;
  incomePrivacy: boolean;
  expensePrivacy: boolean;
  hasSeenTutorial: boolean;
  pin: string | null;
  watchedCategoryIds: string[];
  googleDrive: {
    enabled: boolean;
    lastSyncTime: number | null;
    fileId: string | null;
  };
}
