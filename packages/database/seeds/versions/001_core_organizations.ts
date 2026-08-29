import type { VersionedSeed } from '../seed-types.js';

export const seed: VersionedSeed = {
  version: '001',
  name: 'core organizations',
  scope: 'core',
  async up(tx) {
    await tx.organization.upsert({
      where: { id: '00000000-0000-4000-8000-000000000001' },
      update: { name: 'Foresee Corporation', type: 'OPERATOR' },
      create: { id: '00000000-0000-4000-8000-000000000001', name: 'Foresee Corporation', type: 'OPERATOR' },
    });
  },
};
