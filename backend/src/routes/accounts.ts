import { Router, Request, Response } from 'express';
import {
  listAccounts,
  parseAccount,
  removeAccount,
  upsertAccount,
} from '../services/accountStore.js';

const router = Router();

router.get('/accounts', (_req: Request, res: Response) => {
  res.json(listAccounts());
});

router.post('/accounts', (req: Request, res: Response) => {
  const account = parseAccount(req.body);
  if (!account) {
    res.status(400).json({ error: 'Invalid account payload' });
    return;
  }

  const saved = upsertAccount(account);
  res.json(saved);
});

router.put('/accounts/:email', (req: Request, res: Response) => {
  const account = parseAccount(req.body);
  if (!account) {
    res.status(400).json({ error: 'Invalid account payload' });
    return;
  }

  if (account.email !== req.params.email) {
    res.status(400).json({ error: 'Email in payload must match URL' });
    return;
  }

  const saved = upsertAccount(account);
  res.json(saved);
});

router.delete('/accounts/:email', (req: Request, res: Response) => {
  const emailParam = req.params.email;
  const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Invalid email parameter' });
    return;
  }

  const removed = removeAccount(email);
  if (!removed) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  res.status(204).send();
});

export default router;
