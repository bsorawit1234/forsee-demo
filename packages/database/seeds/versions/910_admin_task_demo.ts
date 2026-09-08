import { scryptSync } from 'node:crypto';
import type { VersionedSeed } from '../seed-types.js';

const passwordHash = () => {
  const salt = 'forsee-demo-salt';
  return `scrypt$${salt}$${scryptSync('demo1234', salt, 64).toString('hex')}`;
};

export const seed: VersionedSeed = {
  version: '910',
  name: 'admin staff and task management demo data',
  scope: 'demo',
  async up(tx) {
    const operator = await tx.organization.findUniqueOrThrow({ where: { id: '00000000-0000-4000-8000-000000000001' } });
    const admin = await tx.user.upsert({ where: { email: 'admin@forsee.example' }, update: { displayName: 'สุภาวดี แก้วใจ', status: 'ACTIVE' }, create: { email: 'admin@forsee.example', passwordHash: passwordHash(), displayName: 'สุภาวดี แก้วใจ', status: 'ACTIVE', emailVerifiedAt: new Date() } });
    const staff = await tx.user.upsert({ where: { email: 'staff@forsee.example' }, update: { displayName: 'สมชาย ใจดี', status: 'ACTIVE' }, create: { email: 'staff@forsee.example', passwordHash: passwordHash(), displayName: 'สมชาย ใจดี', status: 'ACTIVE', emailVerifiedAt: new Date() } });
    await tx.organizationMembership.upsert({ where: { organizationId_userId: { organizationId: operator.id, userId: admin.id } }, update: { role: 'ADMIN', status: 'ACTIVE' }, create: { organizationId: operator.id, userId: admin.id, role: 'ADMIN' } });
    await tx.organizationMembership.upsert({ where: { organizationId_userId: { organizationId: operator.id, userId: staff.id } }, update: { role: 'STAFF', status: 'ACTIVE' }, create: { organizationId: operator.id, userId: staff.id, role: 'STAFF' } });
    const booking = await tx.booking.findUnique({ where: { bookingNumber: 'BK-260829-018' } });
    if (booking) {
      await tx.booking.update({ where: { id: booking.id }, data: { responsibleUserId: admin.id, updatedByUserId: admin.id, lastChangeReason: 'ตั้งผู้รับผิดชอบสำหรับ demo' } });
      await tx.operationTask.create({ data: { bookingId: booking.id, title: 'ตรวจสอบข้อมูลก่อนเข้าหน้างาน', description: 'เช็กหมายเหตุและข้อมูลติดต่อกับลูกค้า', assigneeUserId: staff.id, priority: 'HIGH', isRequired: true, createdByUserId: admin.id, updatedByUserId: admin.id, activities: { create: { actorUserId: admin.id, action: 'task.created', afterJson: { status: 'TODO', priority: 'HIGH', assigneeUserId: staff.id } } } } });
    }
  },
};
