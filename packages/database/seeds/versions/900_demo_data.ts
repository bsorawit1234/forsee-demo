import { scryptSync } from 'node:crypto';
import type { VersionedSeed } from '../seed-types.js';

const passwordHash = () => {
  const salt = 'forsee-demo-salt';
  return `scrypt$${salt}$${scryptSync('demo1234', salt, 64).toString('hex')}`;
};

export const seed: VersionedSeed = {
  version: '900',
  name: 'demo organization and operations data',
  scope: 'demo',
  async up(tx) {
    const operator = await tx.organization.upsert({ where: { id: '00000000-0000-4000-8000-000000000001' }, update: {}, create: { id: '00000000-0000-4000-8000-000000000001', name: 'Foresee Corporation', type: 'OPERATOR' } });
    const customer = await tx.organization.upsert({ where: { id: '00000000-0000-4000-8000-000000000002' }, update: { name: 'บริษัท ไทยรุ่งอุตสาหกรรม', type: 'CUSTOMER' }, create: { id: '00000000-0000-4000-8000-000000000002', name: 'บริษัท ไทยรุ่งอุตสาหกรรม', type: 'CUSTOMER' } });
    const owner = await tx.user.upsert({ where: { email: 'owner@forsee.example' }, update: { displayName: 'อนุชา วัฒนกุล', status: 'ACTIVE' }, create: { email: 'owner@forsee.example', passwordHash: passwordHash(), displayName: 'อนุชา วัฒนกุล', status: 'ACTIVE', emailVerifiedAt: new Date() } });
    const customerUser = await tx.user.upsert({ where: { email: 'customer@thairung.example' }, update: { displayName: 'ธนกร รุ่งเรือง', status: 'ACTIVE' }, create: { email: 'customer@thairung.example', passwordHash: passwordHash(), displayName: 'ธนกร รุ่งเรือง', status: 'ACTIVE', emailVerifiedAt: new Date() } });
    await tx.organizationMembership.upsert({ where: { organizationId_userId: { organizationId: operator.id, userId: owner.id } }, update: { role: 'OWNER', status: 'ACTIVE' }, create: { organizationId: operator.id, userId: owner.id, role: 'OWNER' } });
    await tx.organizationMembership.upsert({ where: { organizationId_userId: { organizationId: customer.id, userId: customerUser.id } }, update: { role: 'CUSTOMER', status: 'ACTIVE' }, create: { organizationId: customer.id, userId: customerUser.id, role: 'CUSTOMER' } });
    const site = await tx.customerSite.upsert({ where: { id: '00000000-0000-4000-8000-000000000010' }, update: {}, create: { id: '00000000-0000-4000-8000-000000000010', customerOrganizationId: customer.id, name: 'โรงงาน ไทยรุ่ง', addressLine: 'บางปะกง', district: 'บางปะกง', province: 'ฉะเชิงเทรา', zoneCode: 'EAST' } });
    const vacuumType = await tx.vehicleType.findUniqueOrThrow({ where: { code: 'VACUUM_TRUCK' } });
    const wasteType = await tx.vehicleType.findUniqueOrThrow({ where: { code: 'WASTE_TRUCK' } });
    const sludgeType = await tx.vehicleType.findUniqueOrThrow({ where: { code: 'SLUDGE_TRUCK' } });
    const waterType = await tx.vehicleType.findUniqueOrThrow({ where: { code: 'WATER_TRUCK' } });
    await tx.vehicle.upsert({ where: { registrationNumber: 'ฟส-1001' }, update: {}, create: { registrationNumber: 'ฟส-1001', displayName: 'รถดูดสูญญากาศ 10 ลบ.ม.', vehicleTypeId: vacuumType.id, capacity: 10, status: 'IN_USE' } });
    await tx.vehicle.upsert({ where: { registrationNumber: 'ฟส-2001' }, update: {}, create: { registrationNumber: 'ฟส-2001', displayName: 'รถขนกากอุตสาหกรรม', vehicleTypeId: wasteType.id, capacity: 12, status: 'AVAILABLE' } });
    await tx.vehicle.upsert({ where: { registrationNumber: 'ฟส-3001' }, update: {}, create: { registrationNumber: 'ฟส-3001', displayName: 'รถดูดตะกอน 6 ลบ.ม.', vehicleTypeId: sludgeType.id, capacity: 6, status: 'IN_USE' } });
    await tx.vehicle.upsert({ where: { registrationNumber: 'ฟส-4001' }, update: {}, create: { registrationNumber: 'ฟส-4001', displayName: 'รถบรรทุกน้ำ 12 ลบ.ม.', vehicleTypeId: waterType.id, capacity: 12, status: 'AVAILABLE' } });
    const grease = await tx.serviceType.findUniqueOrThrow({ where: { code: 'GREASE_TRAP' } });
    await tx.booking.upsert({ where: { bookingNumber: 'BK-260829-018' }, update: {}, create: { bookingNumber: 'BK-260829-018', customerOrganizationId: customer.id, customerSiteId: site.id, serviceTypeId: grease.id, requestedStartAt: new Date('2026-08-29T02:00:00Z'), requestedEndAt: new Date('2026-08-29T04:30:00Z'), confirmedStartAt: new Date('2026-08-29T02:00:00Z'), confirmedEndAt: new Date('2026-08-29T04:30:00Z'), bookingStatus: 'CONFIRMED', assignmentStatus: 'UNASSIGNED', jobStage: 'IN_SERVICE', createdByUserId: customerUser.id } });
  },
};
