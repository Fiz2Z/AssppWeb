import { create } from 'zustand';
import { openDB, type IDBPDatabase } from 'idb';
import * as accountsApi from '../api/accounts';
import type { Account } from '../types';

const LEGACY_DB_NAME = 'asspp-accounts';
const LEGACY_STORE_NAME = 'accounts';
const LEGACY_MIGRATION_FLAG = 'asspp-accounts-migrated-v1';

let legacyDbPromise: Promise<IDBPDatabase> | null = null;

function getLegacyDB(): Promise<IDBPDatabase> {
  if (!legacyDbPromise) {
    legacyDbPromise = openDB(LEGACY_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
          db.createObjectStore(LEGACY_STORE_NAME, { keyPath: 'email' });
        }
      },
    });
  }
  return legacyDbPromise;
}

async function readLegacyAccounts(): Promise<Account[]> {
  try {
    const db = await getLegacyDB();
    return (await db.getAll(LEGACY_STORE_NAME)) as Account[];
  } catch {
    return [];
  }
}

async function clearLegacyAccounts(): Promise<void> {
  try {
    const db = await getLegacyDB();
    await db.clear(LEGACY_STORE_NAME);
  } catch {
    // ignore legacy cleanup failures
  }
}

async function migrateLegacyAccountsIfNeeded(serverAccounts: Account[]): Promise<Account[]> {
  if (localStorage.getItem(LEGACY_MIGRATION_FLAG) === 'true') {
    return serverAccounts;
  }

  const legacyAccounts = await readLegacyAccounts();
  if (legacyAccounts.length === 0) {
    localStorage.setItem(LEGACY_MIGRATION_FLAG, 'true');
    return serverAccounts;
  }

  const merged = [...serverAccounts];
  const existingEmails = new Set(serverAccounts.map((a) => a.email));

  for (const account of legacyAccounts) {
    if (existingEmails.has(account.email)) {
      continue;
    }
    const created = await accountsApi.createAccount(account);
    merged.push(created);
    existingEmails.add(created.email);
  }

  await clearLegacyAccounts();
  localStorage.setItem(LEGACY_MIGRATION_FLAG, 'true');
  return merged;
}

interface AccountsState {
  accounts: Account[];
  loading: boolean;
  loadAccounts: () => Promise<void>;
  addAccount: (account: Account) => Promise<void>;
  removeAccount: (email: string) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  loading: true,

  loadAccounts: async () => {
    set({ loading: true });
    try {
      const serverAccounts = await accountsApi.fetchAccounts();
      const accounts = await migrateLegacyAccountsIfNeeded(serverAccounts);
      set({ accounts, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addAccount: async (account: Account) => {
    const saved = await accountsApi.createAccount(account);
    set({
      accounts: [...get().accounts.filter((a) => a.email !== saved.email), saved],
    });
  },

  removeAccount: async (email: string) => {
    await accountsApi.deleteAccountOnServer(email);
    set({ accounts: get().accounts.filter((a) => a.email !== email) });
  },

  updateAccount: async (account: Account) => {
    const saved = await accountsApi.updateAccountOnServer(account);
    set({
      accounts: get().accounts.map((a) =>
        a.email === saved.email ? saved : a,
      ),
    });
  },
}));

// Auto-load accounts on import
useAccountsStore.getState().loadAccounts();
