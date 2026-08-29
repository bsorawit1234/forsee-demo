import type { VersionedSeed } from '../seed-types.js';

/**
 * Add the second and third units for each core vehicle type. Capacity is
 * calculated from these individual vehicles, so bookings may overlap while
 * there are still free units in the same fleet type.
 */
export const seed: VersionedSeed = {
  version: '004',
  name: 'core fleet units for concurrent bookings',
  scope: 'core',
  async up(tx) {
    const types = await tx.vehicleType.findMany({ where: { code: { in: ['VACUUM_TRUCK', 'WASTE_TRUCK', 'SLUDGE_TRUCK', 'WATER_TRUCK'] } } });
    const byCode = new Map(types.map((type) => [type.code, type]));
    const units = [
      { registrationNumber: 'ฟส-1002', displayName: 'รถดูดสูญญากาศ 10 ลบ.ม. · คัน 2', code: 'VACUUM_TRUCK', capacity: 10 },
      { registrationNumber: 'ฟส-1003', displayName: 'รถดูดสูญญากาศ 10 ลบ.ม. · คัน 3', code: 'VACUUM_TRUCK', capacity: 10 },
      { registrationNumber: 'ฟส-2002', displayName: 'รถขนกากอุตสาหกรรม · คัน 2', code: 'WASTE_TRUCK', capacity: 12 },
      { registrationNumber: 'ฟส-2003', displayName: 'รถขนกากอุตสาหกรรม · คัน 3', code: 'WASTE_TRUCK', capacity: 12 },
      { registrationNumber: 'ฟส-3002', displayName: 'รถดูดตะกอน 6 ลบ.ม. · คัน 2', code: 'SLUDGE_TRUCK', capacity: 6 },
      { registrationNumber: 'ฟส-3003', displayName: 'รถดูดตะกอน 6 ลบ.ม. · คัน 3', code: 'SLUDGE_TRUCK', capacity: 6 },
      { registrationNumber: 'ฟส-4002', displayName: 'รถบรรทุกน้ำ 12 ลบ.ม. · คัน 2', code: 'WATER_TRUCK', capacity: 12 },
      { registrationNumber: 'ฟส-4003', displayName: 'รถบรรทุกน้ำ 12 ลบ.ม. · คัน 3', code: 'WATER_TRUCK', capacity: 12 },
    ] as const;

    for (const unit of units) {
      const vehicleType = byCode.get(unit.code);
      if (!vehicleType) continue;
      await tx.vehicle.upsert({
        where: { registrationNumber: unit.registrationNumber },
        update: { displayName: unit.displayName, vehicleTypeId: vehicleType.id, capacity: unit.capacity, isActive: true },
        create: { registrationNumber: unit.registrationNumber, displayName: unit.displayName, vehicleTypeId: vehicleType.id, capacity: unit.capacity, status: 'AVAILABLE' },
      });
    }
  },
};
