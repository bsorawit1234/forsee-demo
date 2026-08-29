import type { VersionedSeed } from '../seed-types.js';

export const seed: VersionedSeed = {
  version: '002',
  name: 'core service and vehicle catalog',
  scope: 'core',
  async up(tx) {
    const vacuum = await tx.vehicleType.upsert({ where: { code: 'VACUUM_TRUCK' }, update: { nameTh: 'รถดูดสูญญากาศ', isActive: true }, create: { code: 'VACUUM_TRUCK', nameTh: 'รถดูดสูญญากาศ', capacityUnit: 'ลบ.ม.', defaultCapacity: 10 } });
    const waste = await tx.vehicleType.upsert({ where: { code: 'WASTE_TRUCK' }, update: { nameTh: 'รถขนกากอุตสาหกรรม', isActive: true }, create: { code: 'WASTE_TRUCK', nameTh: 'รถขนกากอุตสาหกรรม', capacityUnit: 'ตัน', defaultCapacity: 12 } });
    const sludge = await tx.vehicleType.upsert({ where: { code: 'SLUDGE_TRUCK' }, update: { nameTh: 'รถดูดตะกอน', isActive: true }, create: { code: 'SLUDGE_TRUCK', nameTh: 'รถดูดตะกอน', capacityUnit: 'ลบ.ม.', defaultCapacity: 6 } });
    const water = await tx.vehicleType.upsert({ where: { code: 'WATER_TRUCK' }, update: { nameTh: 'รถบรรทุกน้ำ', isActive: true }, create: { code: 'WATER_TRUCK', nameTh: 'รถบรรทุกน้ำ', capacityUnit: 'ลบ.ม.', defaultCapacity: 12 } });
    await tx.serviceType.upsert({ where: { code: 'GREASE_TRAP' }, update: { nameTh: 'ดูดบ่อดักไขมัน', requiredVehicleTypeId: vacuum.id, isActive: true }, create: { code: 'GREASE_TRAP', nameTh: 'ดูดบ่อดักไขมัน', descriptionTh: 'ดูดและขนส่งของเสียจากบ่อดักไขมัน', defaultDurationMinutes: 150, requiredVehicleTypeId: vacuum.id } });
    await tx.serviceType.upsert({ where: { code: 'INDUSTRIAL_WASTE' }, update: { nameTh: 'ขนส่งกากอุตสาหกรรม', requiredVehicleTypeId: waste.id, isActive: true }, create: { code: 'INDUSTRIAL_WASTE', nameTh: 'ขนส่งกากอุตสาหกรรม', descriptionTh: 'ขนส่งกากอุตสาหกรรมตามมาตรฐาน', defaultDurationMinutes: 150, requiredVehicleTypeId: waste.id } });
    await tx.serviceType.upsert({ where: { code: 'WASTEWATER_POND' }, update: { nameTh: 'ล้างบ่อบำบัดน้ำเสีย', requiredVehicleTypeId: sludge.id, isActive: true }, create: { code: 'WASTEWATER_POND', nameTh: 'ล้างบ่อบำบัดน้ำเสีย', descriptionTh: 'ล้างและดูดตะกอนจากระบบบำบัด', defaultDurationMinutes: 150, requiredVehicleTypeId: sludge.id } });
    await tx.serviceType.upsert({ where: { code: 'WASTEWATER_TRANSPORT' }, update: { nameTh: 'ขนส่งน้ำเสีย', requiredVehicleTypeId: water.id, isActive: true }, create: { code: 'WASTEWATER_TRANSPORT', nameTh: 'ขนส่งน้ำเสีย', descriptionTh: 'ขนส่งน้ำเสียไปยังจุดกำจัด', defaultDurationMinutes: 90, requiredVehicleTypeId: water.id } });
  },
};
