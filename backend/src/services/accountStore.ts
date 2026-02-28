import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export interface StoredCookie {
  name: string;
  value: string;
  path: string;
  domain?: string;
  expiresAt?: number;
  httpOnly: boolean;
  secure: boolean;
}

export interface StoredAccount {
  email: string;
  password: string;
  appleId: string;
  store: string;
  firstName: string;
  lastName: string;
  passwordToken: string;
  directoryServicesIdentifier: string;
  cookies: StoredCookie[];
  deviceIdentifier: string;
  pod?: string;
}

const ACCOUNTS_FILE = path.join(config.dataDir, 'accounts.json');
const accounts = new Map<string, StoredAccount>();

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeCookie(value: unknown): StoredCookie | null {
  if (!isObject(value)) return null;
  if (
    typeof value.name !== 'string' ||
    typeof value.value !== 'string' ||
    typeof value.path !== 'string' ||
    typeof value.httpOnly !== 'boolean' ||
    typeof value.secure !== 'boolean'
  ) {
    return null;
  }

  return {
    name: value.name,
    value: value.value,
    path: value.path,
    domain: typeof value.domain === 'string' ? value.domain : undefined,
    expiresAt:
      typeof value.expiresAt === 'number' ? value.expiresAt : undefined,
    httpOnly: value.httpOnly,
    secure: value.secure,
  };
}

function normalizeAccount(value: unknown): StoredAccount | null {
  if (!isObject(value)) return null;

  const rawCookies = Array.isArray(value.cookies) ? value.cookies : [];
  const cookies = rawCookies
    .map((cookie) => normalizeCookie(cookie))
    .filter((cookie): cookie is StoredCookie => cookie !== null);

  if (
    typeof value.email !== 'string' ||
    value.email.length === 0 ||
    typeof value.password !== 'string' ||
    typeof value.appleId !== 'string' ||
    typeof value.store !== 'string' ||
    typeof value.firstName !== 'string' ||
    typeof value.lastName !== 'string' ||
    typeof value.passwordToken !== 'string' ||
    typeof value.directoryServicesIdentifier !== 'string' ||
    typeof value.deviceIdentifier !== 'string'
  ) {
    return null;
  }

  return {
    email: value.email,
    password: value.password,
    appleId: value.appleId,
    store: value.store,
    firstName: value.firstName,
    lastName: value.lastName,
    passwordToken: value.passwordToken,
    directoryServicesIdentifier: value.directoryServicesIdentifier,
    cookies,
    deviceIdentifier: value.deviceIdentifier,
    pod: typeof value.pod === 'string' ? value.pod : undefined,
  };
}

function persistAccounts() {
  const payload = Array.from(accounts.values()).sort((a, b) =>
    a.email.localeCompare(b.email),
  );
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(payload, null, 2));
}

function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) return;

  try {
    const raw = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
    if (!Array.isArray(raw)) return;

    for (const item of raw) {
      const account = normalizeAccount(item);
      if (account) {
        accounts.set(account.email, account);
      }
    }
  } catch {
    accounts.clear();
  }
}

loadAccounts();

export function listAccounts(): StoredAccount[] {
  return Array.from(accounts.values()).sort((a, b) =>
    a.email.localeCompare(b.email),
  );
}

export function upsertAccount(account: StoredAccount): StoredAccount {
  accounts.set(account.email, account);
  persistAccounts();
  return account;
}

export function replaceAllAccounts(nextAccounts: StoredAccount[]): StoredAccount[] {
  accounts.clear();
  for (const account of nextAccounts) {
    accounts.set(account.email, account);
  }
  persistAccounts();
  return listAccounts();
}

export function removeAccount(email: string): boolean {
  const removed = accounts.delete(email);
  if (removed) {
    persistAccounts();
  }
  return removed;
}

export function parseAccount(value: unknown): StoredAccount | null {
  return normalizeAccount(value);
}
