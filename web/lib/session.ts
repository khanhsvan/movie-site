import { UserRole, UserSummary } from '@netflix-mini/types';
import { redirect } from 'next/navigation';
import { ApiError, fetchJson } from './api';

export async function getCurrentUser(): Promise<UserSummary | null> {
  try {
    return await fetchJson<UserSummary>('/users/me');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }

    return null;
  }
}

export async function requireUser(): Promise<UserSummary> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function requireRole(roles: UserRole[]): Promise<UserSummary> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect('/');
  }

  return user;
}
