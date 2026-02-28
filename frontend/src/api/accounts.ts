import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type { Account } from '../types';

export function fetchAccounts(): Promise<Account[]> {
  return apiGet<Account[]>('/api/accounts');
}

export function createAccount(account: Account): Promise<Account> {
  return apiPost<Account>('/api/accounts', account);
}

export function updateAccountOnServer(account: Account): Promise<Account> {
  return apiPut<Account>(`/api/accounts/${encodeURIComponent(account.email)}`, account);
}

export function deleteAccountOnServer(email: string): Promise<void> {
  return apiDelete(`/api/accounts/${encodeURIComponent(email)}`);
}
