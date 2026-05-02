import { headers } from 'next/headers';

export async function getCurrentUser(): Promise<string> {
  const h = await headers();
  return h.get('cf-access-authenticated-user-email') ?? 'dev@local';
}
