import type { PrismaClient } from '@prisma/client';

export type SeedScope = 'core' | 'demo' | 'test';
export type SeedTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export type VersionedSeed = {
  version: string;
  name: string;
  scope: SeedScope;
  up: (tx: SeedTransaction) => Promise<void>;
};
