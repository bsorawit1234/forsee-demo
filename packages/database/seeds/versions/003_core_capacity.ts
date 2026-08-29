import type { VersionedSeed } from '../seed-types.js';

export const seed: VersionedSeed = {
  version: '003',
  name: 'core capacity rules',
  scope: 'core',
  async up(tx) {
    const rules = [
      { code: 'WEEKDAY_DAY_SHIFT', nameTh: 'กะกลางวันวันทำงาน', startTime: '08:00', endTime: '17:00', maxConcurrent: 4 },
      { code: 'WEEKDAY_EVENING_SHIFT', nameTh: 'กะเย็นวันทำงาน', startTime: '17:00', endTime: '21:00', maxConcurrent: 2 },
      { code: 'SATURDAY_DAY_SHIFT', nameTh: 'กะกลางวันวันเสาร์', dayOfWeek: 6, startTime: '08:00', endTime: '17:00', maxConcurrent: 2 },
    ];
    for (const rule of rules) {
      await tx.capacityRule.upsert({ where: { code: rule.code }, update: { ...rule, isActive: true }, create: rule });
    }
  },
};
