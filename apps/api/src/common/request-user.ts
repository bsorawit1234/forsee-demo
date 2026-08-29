import type { Request } from 'express';

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  organizationId: string;
  organizationType: 'OPERATOR' | 'CUSTOMER';
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
};

export type AuthenticatedRequest = Request & { user: SessionUser };
