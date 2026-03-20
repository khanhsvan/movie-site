import { ReactNode } from 'react';
import { requireUser } from '../../lib/session';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return children;
}
