import { UserRole } from '@netflix-mini/types';
import { ReactNode } from 'react';
import { requireRole } from '../../lib/session';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole([UserRole.ADMIN, UserRole.MODERATOR]);
  return children;
}
