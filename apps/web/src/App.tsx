import { useEffect, useMemo, useRef, useState } from 'react';
import { advanceOperationBooking, assignOperationBooking, cancelOperationsBooking, confirmOperationBooking, createBookingTask, createOperationsBooking, fetchBookingTasks, fetchCustomerAvailability, fetchCustomerBookings, fetchCustomerSites, fetchOperationBooking, fetchOperationsBookings, fetchOperationsCustomerSites, fetchOperationsCustomers, fetchOperationsUsers, fetchOperationsVehicles, fetchOwnerAudit, fetchServices, isApiEnabled, loginDemo, submitCustomerBooking, updateBookingTaskStatus, updateOperationsBooking, watchOperationEvents, type ApiAvailabilityResponse, type ApiAuditLog, type ApiBooking, type ApiBookingDetail, type ApiSessionUser, type ApiTask, type ApiVehicle, type OpsBookingPayload, type OpsBookingUpdatePayload } from './lib/api';
import { formatThaiDate } from './lib/format';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Filter,
  Gauge,
  LayoutDashboard,
  ListFilter,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  X,
} from 'lucide-react';

type Portal = 'company' | 'customer';
type CompanyView = 'overview' | 'bookings' | 'calendar' | 'fleet' | 'customers' | 'reports' | 'audit';
type CustomerView = 'new-booking' | 'bookings' | 'company';
type BookingStatus = 'รอยืนยัน' | 'ยืนยันแล้ว' | 'กำลังดำเนินการ' | 'เสร็จสิ้น' | 'ยกเลิก' | 'ปฏิเสธ';
type JobStage = 'รอเริ่มงาน' | 'กำลังเดินทาง' | 'ถึงหน้างาน' | 'กำลังให้บริการ' | 'เสร็จสิ้น';

type Booking = {
  id: string;
  recordId?: string;
  customer: string;
  service: string;
  site: string;
  date: string;
  start: string;
  end: string;
  vehicle: string;
  vehicleId?: string;
  vehicleRegistrationNumber?: string;
  vehicleType?: string;
  driver: string;
  status: BookingStatus;
  stage: JobStage;
  sla: 'ปกติ' | 'ต้องติดตาม' | 'เกินกำหนด';
  customerNote?: string;
  estimatedVolume?: number | string | null;
  volumeUnit?: string | null;
  recordVersion?: number;
  source?: string;
  createdBy?: { id: string; displayName: string; role?: string } | null;
  updatedBy?: { id: string; displayName: string } | null;
  responsibleUser?: { id: string; displayName: string } | null;
  responsibleUserId?: string | null;
  lastChangeReason?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  customerOrganizationId?: string;
  customerSiteId?: string;
  serviceCode?: string;
};

type VehicleResource = {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  status: 'ว่าง' | 'กำลังใช้งาน' | 'ซ่อมบำรุง' | 'ไม่พร้อมใช้งาน';
  bookingId?: string | null;
};

function bangkokIsoDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value).reduce<Record<string, string>>((result, part) => { result[part.type] = part.value; return result; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addIsoDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00+07:00`);
  value.setUTCDate(value.getUTCDate() + amount);
  return bangkokIsoDate(value);
}

const todayIso = bangkokIsoDate();
const tomorrowIso = addIsoDays(todayIso, 1);

const demoVehicles: VehicleResource[] = [
  { id: 'demo-vacuum-1001', registrationNumber: 'ฟส-1001', name: 'รถดูดสูญญากาศ 10 ลบ.ม.', type: 'รถดูดสูญญากาศ 10 ลบ.ม.', status: 'กำลังใช้งาน', bookingId: 'BK-260829-018' },
  { id: 'demo-vacuum-1002', registrationNumber: 'ฟส-1002', name: 'รถดูดสูญญากาศ 10 ลบ.ม. · คัน 2', type: 'รถดูดสูญญากาศ 10 ลบ.ม.', status: 'ว่าง' },
  { id: 'demo-vacuum-1003', registrationNumber: 'ฟส-1003', name: 'รถดูดสูญญากาศ 10 ลบ.ม. · คัน 3', type: 'รถดูดสูญญากาศ 10 ลบ.ม.', status: 'ว่าง' },
  { id: 'demo-waste-2001', registrationNumber: 'ฟส-2001', name: 'รถขนกากอุตสาหกรรม', type: 'รถขนกากอุตสาหกรรม', status: 'ว่าง' },
  { id: 'demo-waste-2002', registrationNumber: 'ฟส-2002', name: 'รถขนกากอุตสาหกรรม · คัน 2', type: 'รถขนกากอุตสาหกรรม', status: 'ว่าง' },
  { id: 'demo-sludge-3001', registrationNumber: 'ฟส-3001', name: 'รถดูดตะกอน 6 ลบ.ม.', type: 'รถดูดตะกอน 6 ลบ.ม.', status: 'กำลังใช้งาน', bookingId: 'BK-260829-020' },
  { id: 'demo-sludge-3002', registrationNumber: 'ฟส-3002', name: 'รถดูดตะกอน 6 ลบ.ม. · คัน 2', type: 'รถดูดตะกอน 6 ลบ.ม.', status: 'ว่าง' },
  { id: 'demo-water-4001', registrationNumber: 'ฟส-4001', name: 'รถบรรทุกน้ำ 12 ลบ.ม.', type: 'รถบรรทุกน้ำ 12 ลบ.ม.', status: 'ว่าง' },
  { id: 'demo-water-4002', registrationNumber: 'ฟส-4002', name: 'รถบรรทุกน้ำ 12 ลบ.ม. · คัน 2', type: 'รถบรรทุกน้ำ 12 ลบ.ม.', status: 'ว่าง' },
];

const seedBookings: Booking[] = [
  { id: 'BK-260829-018', customer: 'บริษัท ไทยรุ่งอุตสาหกรรม', service: 'ดูดบ่อดักไขมัน', site: 'บางปะกง, ฉะเชิงเทรา', date: '2026-08-29', start: '09:00', end: '11:30', vehicle: 'รถดูดสูญญากาศ 10 ลบ.ม.', vehicleId: 'demo-vacuum-1001', vehicleRegistrationNumber: 'ฟส-1001', vehicleType: 'รถดูดสูญญากาศ 10 ลบ.ม.', driver: 'สมชาย ใจดี', status: 'กำลังดำเนินการ', stage: 'กำลังให้บริการ', sla: 'ปกติ' },
  { id: 'BK-260829-024', customer: 'บริษัท สยามฟู้ดส์ จำกัด', service: 'ดูดบ่อดักไขมัน', site: 'เทพารักษ์, สมุทรปราการ', date: '2026-08-29', start: '09:00', end: '11:30', vehicle: 'รถดูดสูญญากาศ 10 ลบ.ม.', vehicleId: 'demo-vacuum-1002', vehicleRegistrationNumber: 'ฟส-1002', vehicleType: 'รถดูดสูญญากาศ 10 ลบ.ม.', driver: 'ทีมภาคสนาม', status: 'ยืนยันแล้ว', stage: 'รอเริ่มงาน', sla: 'ปกติ' },
  { id: 'BK-260829-019', customer: 'โรงงาน เอส.พี.เคมีคอล', service: 'ขนส่งกากอุตสาหกรรม', site: 'มาบตาพุด, ระยอง', date: '2026-08-29', start: '10:30', end: '13:00', vehicle: 'รถขนกากอุตสาหกรรม', driver: 'วิชัย พรหมรักษา', status: 'ยืนยันแล้ว', stage: 'กำลังเดินทาง', sla: 'ต้องติดตาม' },
  { id: 'BK-260829-020', customer: 'บริษัท กรีนแพค จำกัด', service: 'ล้างบ่อบำบัดน้ำเสีย', site: 'ลาดกระบัง, กรุงเทพฯ', date: '2026-08-29', start: '13:00', end: '15:30', vehicle: 'รถดูดตะกอน 6 ลบ.ม.', driver: 'กิตติพงษ์ แสงทอง', status: 'ยืนยันแล้ว', stage: 'รอเริ่มงาน', sla: 'ปกติ' },
  { id: 'BK-260829-017', customer: 'โรงงาน อีโคเทค', service: 'ขนส่งน้ำเสีย', site: 'อมตะซิตี้, ชลบุรี', date: '2026-08-29', start: '08:00', end: '09:30', vehicle: 'รถบรรทุกน้ำ 12 ลบ.ม.', driver: 'ธนากร คำสุข', status: 'เสร็จสิ้น', stage: 'เสร็จสิ้น', sla: 'ปกติ' },
  { id: 'BK-260830-021', customer: 'บริษัท นอร์ทสตาร์ ฟู้ดส์', service: 'ดูดบ่อดักไขมัน', site: 'พระนครศรีอยุธยา', date: '2026-08-30', start: '09:00', end: '11:30', vehicle: 'ยังไม่จัดรถ', driver: 'ยังไม่จัดทีม', status: 'รอยืนยัน', stage: 'รอเริ่มงาน', sla: 'ปกติ' },
  { id: 'BK-260831-022', customer: 'บริษัท ไพรม์เคม จำกัด', service: 'ขนส่งกากอุตสาหกรรม', site: 'มาบตาพุด, ระยอง', date: '2026-08-31', start: '13:00', end: '15:30', vehicle: 'รถขนกากอุตสาหกรรม', driver: 'ยังไม่จัดทีม', status: 'ยืนยันแล้ว', stage: 'รอเริ่มงาน', sla: 'ปกติ' },
  { id: 'BK-260901-023', customer: 'บริษัท บลูวอเตอร์', service: 'ล้างบ่อบำบัดน้ำเสีย', site: 'บางเสาธง, สมุทรปราการ', date: '2026-09-01', start: '09:00', end: '11:30', vehicle: 'รถดูดตะกอน 6 ลบ.ม.', driver: 'สุรชัย ทองดี', status: 'ยืนยันแล้ว', stage: 'รอเริ่มงาน', sla: 'ปกติ' },
];

const companyNav: Array<{ id: CompanyView; label: string; icon: typeof LayoutDashboard; count?: string }> = [
  { id: 'overview', label: 'ภาพรวม', icon: LayoutDashboard },
  { id: 'bookings', label: 'การจอง', icon: FileText, count: '24' },
  { id: 'calendar', label: 'ปฏิทินและจัดคิว', icon: CalendarDays },
  { id: 'fleet', label: 'รถและทีมงาน', icon: Truck },
  { id: 'customers', label: 'ลูกค้า', icon: Users },
  { id: 'reports', label: 'รายงาน', icon: Gauge },
  { id: 'audit', label: 'Audit Center', icon: ShieldCheck },
];

const statusClass: Record<BookingStatus, string> = {
  'รอยืนยัน': 'status-pending',
  'ยืนยันแล้ว': 'status-confirmed',
  'กำลังดำเนินการ': 'status-progress',
  'เสร็จสิ้น': 'status-complete',
  'ยกเลิก': 'status-cancelled',
  'ปฏิเสธ': 'status-cancelled',
};

const stageClass: Record<JobStage, string> = {
  'รอเริ่มงาน': 'stage-muted',
  'กำลังเดินทาง': 'stage-warning',
  'ถึงหน้างาน': 'stage-info',
  'กำลังให้บริการ': 'stage-progress',
  'เสร็จสิ้น': 'stage-complete',
};

function toUiBooking(item: ApiBooking): Booking {
  const start = new Date(item.requestedStartAt);
  const end = new Date(item.requestedEndAt);
  const dateParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(start).reduce<Record<string, string>>((parts, part) => { parts[part.type] = part.value; return parts; }, {});
  const thaiDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const clock = (value: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(value);
  const statuses: Record<string, BookingStatus> = { PENDING_CONFIRMATION: 'รอยืนยัน', CONFIRMED: 'ยืนยันแล้ว', REJECTED: 'ปฏิเสธ', CANCELLED: 'ยกเลิก' };
  const stages: Record<string, JobStage> = { SCHEDULED: 'รอเริ่มงาน', EN_ROUTE: 'กำลังเดินทาง', ARRIVED: 'ถึงหน้างาน', IN_SERVICE: 'กำลังให้บริการ', COMPLETED: 'เสร็จสิ้น' };
  const status = item.jobStage === 'IN_SERVICE' ? 'กำลังดำเนินการ' : item.jobStage === 'COMPLETED' ? 'เสร็จสิ้น' : statuses[item.bookingStatus] ?? 'ยืนยันแล้ว';
  return { id: item.bookingNumber, recordId: item.id, customer: item.customer ?? 'ไม่ระบุลูกค้า', service: item.service ?? 'ไม่ระบุบริการ', site: item.site ?? 'ไม่ระบุสถานที่', date: thaiDate, start: clock(start), end: clock(end), vehicle: item.vehicle ?? 'ยังไม่จัดรถ', vehicleId: item.vehicleId ?? undefined, vehicleRegistrationNumber: item.vehicleRegistrationNumber ?? undefined, vehicleType: item.vehicleType ?? undefined, driver: item.vehicle ? 'ทีมภาคสนาม' : 'ยังไม่จัดทีม', status, stage: stages[item.jobStage] ?? 'รอเริ่มงาน', sla: item.slaHealth === 'OVERDUE' ? 'เกินกำหนด' : item.slaHealth === 'AT_RISK' ? 'ต้องติดตาม' : 'ปกติ', customerNote: item.customerNote ?? undefined, estimatedVolume: item.estimatedVolume ?? null, volumeUnit: item.volumeUnit ?? null, recordVersion: item.version, source: item.source, createdBy: item.createdBy, updatedBy: item.updatedBy, responsibleUser: item.responsibleUser, responsibleUserId: item.responsibleUserId, lastChangeReason: item.lastChangeReason, contactName: item.contactName, contactPhone: item.contactPhone, customerOrganizationId: item.customerOrganizationId, customerSiteId: item.customerSiteId, serviceCode: item.serviceCode };
}

function toUiVehicle(item: ApiVehicle): VehicleResource {
  const statuses: Record<string, VehicleResource['status']> = { AVAILABLE: 'ว่าง', IN_USE: 'กำลังใช้งาน', MAINTENANCE: 'ซ่อมบำรุง', INACTIVE: 'ไม่พร้อมใช้งาน' };
  return { id: item.id, registrationNumber: item.registrationNumber, name: item.displayName, type: item.type, status: statuses[item.status] ?? 'ไม่พร้อมใช้งาน', bookingId: item.bookingId };
}

export default function App() {
  const initialPath = typeof window === 'undefined' ? '/' : window.location.pathname;
  const initialPortal: Portal = initialPath.startsWith('/marketing') ? 'customer' : 'company';
  const initialCustomerView: CustomerView = initialPath.endsWith('/bookings') ? 'bookings' : initialPath.endsWith('/company') ? 'company' : 'new-booking';
  const [portal, setPortal] = useState<Portal>(initialPortal);
  const [companyView, setCompanyView] = useState<CompanyView>('overview');
  const [customerView, setCustomerView] = useState<CustomerView>(initialCustomerView);
  const [bookings, setBookings] = useState(seedBookings);
  const [vehicles, setVehicles] = useState(demoVehicles);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState('');
  const [session, setSession] = useState<ApiSessionUser | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [createOpsOpen, setCreateOpsOpen] = useState(false);
  const [editOpsBooking, setEditOpsBooking] = useState<Booking | null>(null);
  const eventStopRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!isApiEnabled()) return undefined;
    let mounted = true;
    let stop: () => void = () => undefined;
    const refresh = () => Promise.all([fetchOperationsBookings(), fetchOperationsVehicles()]).then(([bookingResult, vehicleResult]) => {
      if (!mounted) return;
      setBookings(bookingResult.items.map(toUiBooking));
      setVehicles(vehicleResult.items.map(toUiVehicle));
      setLiveMode(true);
    }).catch(() => undefined);
    loginDemo('company').then(({ user }) => {
      if (!mounted) return;
      setSession(user);
      return refresh().then(() => { if (mounted) { stop = watchOperationEvents(() => { void refresh(); }); eventStopRef.current = stop; } });
    }).catch(() => { if (mounted) setLiveMode(false); });
    return () => { mounted = false; stop(); eventStopRef.current = () => undefined; };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const switchPortal = async (value: Portal) => {
    setSelectedBooking(null);
    eventStopRef.current();
    eventStopRef.current = () => undefined;
    if (isApiEnabled()) {
      try {
        const { user } = await loginDemo(value);
        setSession(user);
        if (value === 'company') {
          const [bookingResult, vehicleResult] = await Promise.all([fetchOperationsBookings(), fetchOperationsVehicles()]);
          setBookings(bookingResult.items.map(toUiBooking));
          setVehicles(vehicleResult.items.map(toUiVehicle));
          setCompanyView('overview');
          eventStopRef.current = watchOperationEvents(() => {
            void fetchOperationsBookings().then((result) => setBookings(result.items.map(toUiBooking))).catch(() => undefined);
          });
        } else {
          const result = await fetchCustomerBookings();
          setBookings(result.items.map(toUiBooking));
          setCustomerView('new-booking');
          eventStopRef.current = watchOperationEvents(() => {
            void fetchCustomerBookings().then((next) => setBookings(next.items.map(toUiBooking))).catch(() => undefined);
          });
        }
        setLiveMode(true);
    } catch {
      setSession(null);
      notify('เชื่อมต่อข้อมูลจริงไม่ได้ จึงใช้โหมดสาธิต');
      setLiveMode(false);
      if (value === 'customer') setBookings(seedBookings.filter((item) => item.customer.includes('ไทยรุ่ง')));
      else setBookings(seedBookings);
      }
    } else {
      setCustomerView(value === 'customer' ? 'new-booking' : customerView);
      setCompanyView(value === 'company' ? 'overview' : companyView);
      if (value === 'customer') setBookings(seedBookings.filter((item) => item.customer.includes('ไทยรุ่ง')));
      else setBookings(seedBookings);
    }
    setPortal(value);
  };

  const updateBooking = (booking: Booking) => {
    setBookings((current) => current.map((item) => (item.id === booking.id ? booking : item)));
    setSelectedBooking(booking);
    notify(`อัปเดต ${booking.id} แล้ว`);
  };

  const assignBooking = async (booking: Booking, vehicle: VehicleResource) => {
    if (isApiEnabled() && booking.recordId) {
      try {
        const result = await assignOperationBooking(booking.recordId, { vehicleId: vehicle.id });
        const updated = toUiBooking(result);
        setBookings((current) => current.map((item) => item.id === booking.id ? updated : item));
        setSelectedBooking(updated);
        notify(`จัดรถ ${vehicle.registrationNumber} ให้ ${booking.id} แล้ว`);
        return true;
      } catch (error) {
        notify(error instanceof Error ? error.message : 'จัดรถไม่สำเร็จ');
        return false;
      }
    }
    updateBooking({ ...booking, vehicle: vehicle.name, vehicleId: vehicle.id, vehicleRegistrationNumber: vehicle.registrationNumber, vehicleType: vehicle.type });
    return true;
  };

  const advanceBooking = async (booking: Booking) => {
    if (isApiEnabled() && booking.recordId) {
      try {
        const result = await advanceOperationBooking(booking.recordId);
        const updated = toUiBooking(result);
        setBookings((current) => current.map((item) => item.id === booking.id ? updated : item));
        setSelectedBooking(updated);
        notify(`อัปเดตสถานะ ${booking.id} แล้ว`);
        return true;
      } catch (error) {
        notify(error instanceof Error ? error.message : 'อัปเดตสถานะไม่สำเร็จ');
        return false;
      }
    }
    const next: Record<JobStage, JobStage> = { 'รอเริ่มงาน': 'กำลังเดินทาง', 'กำลังเดินทาง': 'ถึงหน้างาน', 'ถึงหน้างาน': 'กำลังให้บริการ', 'กำลังให้บริการ': 'เสร็จสิ้น', 'เสร็จสิ้น': 'เสร็จสิ้น' };
    const nextStage = next[booking.stage];
    updateBooking({ ...booking, stage: nextStage, status: nextStage === 'เสร็จสิ้น' ? 'เสร็จสิ้น' : nextStage === 'รอเริ่มงาน' ? booking.status : 'กำลังดำเนินการ' });
    return true;
  };

  const handleBookingCreated = (booking: Booking) => {
    setBookings((current) => [booking, ...current.filter((item) => item.id !== booking.id)]);
    setSelectedBooking(booking);
    notify(`สร้าง ${booking.id} แล้ว`);
  };

  const confirmBooking = async (booking: Booking) => {
    if (isApiEnabled() && booking.recordId) {
      try {
        const result = await confirmOperationBooking(booking.recordId);
        const confirmed = toUiBooking(result);
        setBookings((current) => current.map((item) => (item.id === booking.id ? confirmed : item)));
        setSelectedBooking(confirmed);
        notify(`ยืนยันข้อมูล ${booking.id} แล้ว`);
        return true;
      } catch {
        notify(`ยืนยัน ${booking.id} ไม่สำเร็จ ลองใหม่อีกครั้ง`);
        return false;
      }
    }
    const confirmed = { ...booking, status: 'ยืนยันแล้ว' as BookingStatus };
    setBookings((current) => current.map((item) => (item.id === booking.id ? confirmed : item)));
    setSelectedBooking(confirmed);
    notify(`ยืนยันข้อมูล ${booking.id} แล้ว`);
    return true;
  };

  const cancelBooking = async (booking: Booking, reason: string) => {
    if (isApiEnabled() && booking.recordId) {
      try {
        const result = await cancelOperationsBooking(booking.recordId, reason);
        const cancelled = toUiBooking(result);
        setBookings((current) => current.map((item) => item.id === booking.id ? cancelled : item));
        setSelectedBooking(cancelled);
        notify(`ยกเลิก ${booking.id} แล้ว`);
        return true;
      } catch (error) {
        notify(error instanceof Error ? error.message : 'ยกเลิก Booking ไม่สำเร็จ');
        return false;
      }
    }
    const cancelled = { ...booking, status: 'ยกเลิก' as BookingStatus };
    setBookings((current) => current.map((item) => item.id === booking.id ? cancelled : item));
    setSelectedBooking(cancelled);
    notify(`ยกเลิก ${booking.id} แล้ว`);
    return true;
  };

  const saveOpsBooking = async (payload: OpsBookingPayload | OpsBookingUpdatePayload, mode: 'create' | 'edit', booking?: Booking) => {
    try {
      const result = isApiEnabled()
        ? mode === 'create'
          ? await createOperationsBooking(payload as OpsBookingPayload)
          : await updateOperationsBooking(booking?.recordId ?? '', payload as OpsBookingUpdatePayload)
        : null;
      if (result) {
        const updated = toUiBooking(result);
        setBookings((current) => mode === 'create' ? [updated, ...current] : current.map((item) => item.id === booking?.id ? updated : item));
        setSelectedBooking(updated);
        notify(mode === 'create' ? `สร้าง ${updated.id} แล้ว` : `บันทึกการแก้ไข ${updated.id} แล้ว`);
      } else if (booking) {
        const draft = payload as OpsBookingUpdatePayload;
        const next: Booking = { ...booking, date: draft.requestedDate ?? booking.date, start: draft.requestedStart ?? booking.start, end: draft.requestedEnd ?? booking.end, customerNote: draft.customerNote ?? booking.customerNote, recordVersion: (booking.recordVersion ?? 1) + 1 };
        setBookings((current) => current.map((item) => item.id === booking.id ? next : item));
        setSelectedBooking(next);
      }
      setCreateOpsOpen(false);
      setEditOpsBooking(null);
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
      return false;
    }
  };

  return (
    <div className="platform-shell">
      {portal === 'company' ? (
        <CompanyPortal
          view={companyView}
          bookings={bookings}
          vehicles={vehicles}
          selectedBooking={selectedBooking}
          session={session}
          liveMode={liveMode}
          onNavigate={setCompanyView}
          onSelectBooking={setSelectedBooking}
          onAssignBooking={assignBooking}
          onAdvanceBooking={advanceBooking}
          onConfirmBooking={confirmBooking}
          onCancelBooking={cancelBooking}
          onCreateBooking={() => setCreateOpsOpen(true)}
          onEditBooking={setEditOpsBooking}
          onSwitchPortal={switchPortal}
          notify={notify}
        />
      ) : (
        <CustomerPortal
          view={customerView}
          bookings={bookings}
          session={session}
          onNavigate={setCustomerView}
          onSwitchPortal={switchPortal}
          onBookingCreated={handleBookingCreated}
          notify={notify}
        />
      )}
      {createOpsOpen && <OpsBookingModal mode="create" onClose={() => setCreateOpsOpen(false)} onSave={(payload) => saveOpsBooking(payload, 'create')} />}
      {editOpsBooking && <OpsBookingModal mode="edit" booking={editOpsBooking} onClose={() => setEditOpsBooking(null)} onSave={(payload) => saveOpsBooking(payload, 'edit', editOpsBooking)} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

function CompanyPortal({
  view,
  bookings,
  vehicles,
  selectedBooking,
  session,
  liveMode,
  onNavigate,
  onSelectBooking,
  onAssignBooking,
  onAdvanceBooking,
  onConfirmBooking,
  onCancelBooking,
  onCreateBooking,
  onEditBooking,
  onSwitchPortal,
  notify,
}: {
  view: CompanyView;
  bookings: Booking[];
  vehicles: VehicleResource[];
  selectedBooking: Booking | null;
  session: ApiSessionUser | null;
  liveMode: boolean;
  onNavigate: (view: CompanyView) => void;
  onSelectBooking: (booking: Booking | null) => void;
  onAssignBooking: (booking: Booking, vehicle: VehicleResource) => Promise<boolean>;
  onAdvanceBooking: (booking: Booking) => Promise<boolean>;
  onConfirmBooking: (booking: Booking) => boolean | Promise<boolean>;
  onCancelBooking: (booking: Booking, reason: string) => Promise<boolean>;
  onCreateBooking: () => void;
  onEditBooking: (booking: Booking) => void;
  onSwitchPortal: (portal: Portal) => void;
  notify: (message: string) => void;
}) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-lockup"><div className="brand-mark">F</div><div><strong>FORESEE</strong><span>CORPORATION</span></div></div>
        <div className="workspace"><div className="workspace-avatar">FC</div><div><b>Foresee Corp.</b><span>ศูนย์ปฏิบัติการ</span></div><ChevronDown size={15} /></div>
        <div className="nav-caption">เมนูหลัก</div>
        <nav className="side-nav" aria-label="เมนูบริษัท">
          {companyNav.filter((item) => item.id !== 'audit' || session?.role === 'OWNER').map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate(item.id)}><Icon size={17} /><span>{item.label}</span>{item.count && <em>{item.count}</em>}</button>; })}
        </nav>
        <div className="nav-caption nav-caption-gap">จัดการระบบ</div>
        <nav className="side-nav"><button className="nav-link" onClick={() => notify('ตั้งค่าระบบจะเปิดในเวอร์ชันถัดไป')}><Settings2 size={17} /><span>ตั้งค่าระบบ</span></button><button className="nav-link" onClick={() => notify('ศูนย์ช่วยเหลือพร้อมให้บริการ')}><ShieldCheck size={17} /><span>ช่วยเหลือ</span></button></nav>
        <div className="sidebar-bottom"><div className="support-box"><span><ShieldCheck size={16} /></span><div><b>ระบบทำงานปกติ</b><small>อัปเดตล่าสุดเมื่อ 10:42 น.</small></div></div><div className="account"><div className="avatar avatar-gold">{session?.displayName?.slice(0, 2) ?? 'อน'}</div><div><b>{session?.displayName ?? 'อนุชา วัฒนกุล'}</b><small>{session?.role ?? 'OWNER'}</small></div><MoreHorizontal size={17} /></div></div>
      </aside>
      <main className="main-pane">
        <header className="topbar"><button className="mobile-menu" aria-label="เปิดเมนู"><Menu size={20} /></button><div className="breadcrumbs"><span>ศูนย์ปฏิบัติการ</span><b>/</b><strong>{companyNav.find((item) => item.id === view)?.label}</strong></div><div className="topbar-actions"><div className="live-indicator"><i />{liveMode ? 'ข้อมูลอัปเดตสด' : 'โหมดสาธิต'}</div><PortalSwitcher portal="company" onChange={onSwitchPortal} /><button className="icon-button" aria-label="ค้นหา" onClick={() => notify('ค้นหาได้จากหน้า Booking Monitor')}><Search size={17} /></button><button className="icon-button has-notification" aria-label="การแจ้งเตือน" onClick={() => notify('มี 2 รายการที่ต้องติดตาม')}><Bell size={17} /></button></div></header>
        <div className="content-area">
          {view === 'overview' && <CompanyOverview bookings={bookings} onSelectBooking={onSelectBooking} onNavigate={onNavigate} onConfirmBooking={onConfirmBooking} onCreateBooking={onCreateBooking} notify={notify} />}
          {view === 'bookings' && <BookingMonitor bookings={bookings} onSelectBooking={onSelectBooking} onNavigate={onNavigate} onConfirmBooking={onConfirmBooking} onCreateBooking={onCreateBooking} />}
          {view === 'calendar' && <OperationsCalendar bookings={bookings} vehicles={vehicles} onSelectBooking={onSelectBooking} onAssignBooking={onAssignBooking} notify={notify} />}
          {view === 'fleet' && <FleetView bookings={bookings} vehicles={vehicles} notify={notify} />}
          {view === 'customers' && <CustomersView bookings={bookings} onSelectBooking={onSelectBooking} />}
          {view === 'reports' && <ReportsView bookings={bookings} />}
          {view === 'audit' && session?.role === 'OWNER' && <OwnerAuditView notify={notify} />}
        </div>
      </main>
      {selectedBooking && <BookingDrawer booking={selectedBooking} onClose={() => onSelectBooking(null)} onConfirmBooking={onConfirmBooking} onAdvanceBooking={onAdvanceBooking} onCancelBooking={onCancelBooking} onEditBooking={onEditBooking} notify={notify} />}
    </div>
  );
}

function PortalSwitcher({ portal, onChange }: { portal: Portal; onChange: (portal: Portal) => void }) {
  return <label className="portal-switcher"><span>มุมมอง</span><select value={portal} onChange={(event) => onChange(event.target.value as Portal)} aria-label="เลือกมุมมอง"><option value="company">ฝั่งบริษัท</option><option value="customer">ฝั่งผู้จอง</option></select><ChevronDown size={13} /></label>;
}

function CompanyOverview({ bookings, onSelectBooking, onNavigate, onConfirmBooking, onCreateBooking, notify }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void; onNavigate: (view: CompanyView) => void; onConfirmBooking: (booking: Booking) => boolean | Promise<boolean>; onCreateBooking: () => void; notify: (message: string) => void }) {
  const today = bookings.filter((item) => item.date === todayIso);
  const unassigned = today.filter((item) => item.vehicle === 'ยังไม่จัดรถ');
  const atRisk = bookings.filter((item) => item.sla !== 'ปกติ');
  return <>
    <PageHeader eyebrow={`${formatThaiDate(todayIso)} · อัปเดตตามข้อมูลล่าสุด`} title="การดำเนินงานวันนี้" copy="ติดตาม Booking และทีมภาคสนามจากจุดเดียว" action={<button className="primary-button" onClick={onCreateBooking}><Plus size={17} /> สร้างการจอง</button>} />
    <div className="toolbar"><div className="toolbar-search"><Search size={16} /><input placeholder="ค้นหาเลข Booking, ลูกค้า หรือสถานที่" /></div><button className="filter-button" onClick={() => onNavigate('bookings')}><Filter size={15} /> ตัวกรอง</button><button className="date-button"><CalendarDays size={15} /> {formatThaiDate(todayIso)} <ChevronDown size={14} /></button></div>
    <div className="metric-strip"><Metric label="งานวันนี้" value={String(today.length).padStart(2, '0')} note="Booking ทั้งหมด" tone="teal" icon={<CalendarDays size={17} />} /><Metric label="กำลังดำเนินการ" value={String(today.filter((item) => item.status === 'กำลังดำเนินการ').length).padStart(2, '0')} note={`จาก ${today.length} งาน`} tone="amber" icon={<Clock3 size={17} />} /><Metric label="ยังไม่จัดรถ" value={String(unassigned.length).padStart(2, '0')} note="ต้องจัดคิว" tone="blue" icon={<Truck size={17} />} /><Metric label="ต้องติดตาม" value={String(atRisk.length).padStart(2, '0')} note="SLA / conflict" tone="rose" icon={<AlertTriangle size={17} />} /></div>
    <div className="section-heading"><div><h2>งานวันนี้</h2><p>คลิก Booking เพื่อดูรายละเอียดและ timeline</p></div><button className="quiet-button" onClick={() => onNavigate('bookings')}>ดูทั้งหมด <ArrowRight size={15} /></button></div>
    <div className="split-layout"><section className="panel table-panel"><div className="panel-head"><div className="head-title"><span className="live-dot" /> Live operations</div><button className="icon-button small" onClick={() => notify('ตั้งค่าการแสดงผลในเวอร์ชันถัดไป')}><MoreHorizontal size={16} /></button></div><BookingBoard bookings={today} onSelectBooking={onSelectBooking} onConfirmBooking={onConfirmBooking} compact /></section><aside className="side-stack"><AttentionPanel bookings={atRisk} onSelectBooking={onSelectBooking} /><CapacityPanel bookings={bookings} /></aside></div>
    <section className="panel activity-panel"><div className="panel-head"><div><h3>กิจกรรมล่าสุด</h3><p>ความเคลื่อนไหวจากทีมและระบบ</p></div><button className="quiet-button" onClick={() => notify('เปิดประวัติกิจกรรมทั้งหมด')}>ดูทั้งหมด <ArrowRight size={15} /></button></div><div className="activity-grid"><Activity name="สมชาย ใจดี" text="เปลี่ยนสถานะเป็น กำลังให้บริการ" time="4 นาทีที่แล้ว" tone="teal" /><Activity name="วิชัย พรหมรักษา" text="เริ่มเดินทางไป มาบตาพุด, ระยอง" time="18 นาทีที่แล้ว" tone="amber" /><Activity name="ระบบ" text="มีคำขอจองใหม่จาก นอร์ทสตาร์ ฟู้ดส์" time="32 นาทีที่แล้ว" tone="violet" /></div></section>
  </>;
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function Metric({ label, value, note, tone, icon }: { label: string; value: string; note: string; tone: string; icon: React.ReactNode }) {
  return <div className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>;
}

function BookingMonitor({ bookings, onSelectBooking, onNavigate, onConfirmBooking, onCreateBooking }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void; onNavigate: (view: CompanyView) => void; onConfirmBooking: (booking: Booking) => boolean | Promise<boolean>; onCreateBooking: () => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ทั้งหมด');
  const filtered = useMemo(() => bookings.filter((item) => {
    const matchQuery = `${item.id} ${item.customer} ${item.site}`.toLowerCase().includes(query.toLowerCase());
    return matchQuery && (status === 'ทั้งหมด' || item.status === status);
  }), [bookings, query, status]);
  return <>
    <PageHeader eyebrow="Company Operations Center · Booking Monitor" title="การจองทั้งหมด" copy="ค้นหา ตรวจสอบ และจัดการทุก Booking ของ Foresee" action={<div className="page-header-actions"><button className="secondary-button" onClick={() => onNavigate('calendar')}><CalendarDays size={17} /> เปิดปฏิทินจัดคิว</button><button className="primary-button" onClick={onCreateBooking}><Plus size={17} /> สร้างการจอง</button></div>} />
    <div className="panel monitor-panel"><div className="monitor-toolbar"><div className="toolbar-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลข Booking, ลูกค้า หรือสถานที่" /></div><select className="select-control" value={status} onChange={(event) => setStatus(event.target.value)}><option>ทั้งหมด</option><option>รอยืนยัน</option><option>ยืนยันแล้ว</option><option>กำลังดำเนินการ</option><option>เสร็จสิ้น</option></select><button className="filter-button"><ListFilter size={15} /> ตัวกรองเพิ่มเติม</button><button className="icon-button small"><MoreHorizontal size={16} /></button></div><div className="table-meta"><span>แสดง {filtered.length} จาก {bookings.length} รายการ</span><span>อัปเดตสด <i className="live-dot" /></span></div><BookingBoard bookings={filtered} onSelectBooking={onSelectBooking} onConfirmBooking={onConfirmBooking} /></div>
  </>;
}

const bookingColumns: Array<{ status: BookingStatus; title: string; description: string; tone: string }> = [
  { status: 'รอยืนยัน', title: 'รอยืนยันข้อมูล', description: 'โทรเช็กข้อมูลกับลูกค้าก่อนยืนยันคิว', tone: 'pending' },
  { status: 'ยืนยันแล้ว', title: 'ยืนยันแล้ว', description: 'วันเวลาและรายละเอียดผ่านการยืนยัน', tone: 'confirmed' },
  { status: 'กำลังดำเนินการ', title: 'กำลังดำเนินการ', description: 'ทีมภาคสนามกำลังทำงานตามคิว', tone: 'progress' },
  { status: 'เสร็จสิ้น', title: 'เสร็จสิ้น', description: 'งานปิดและพร้อมดูประวัติย้อนหลัง', tone: 'complete' },
];

function BookingBoard({ bookings, onSelectBooking, onConfirmBooking, compact = false }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void; onConfirmBooking: (booking: Booking) => boolean | Promise<boolean>; compact?: boolean }) {
  const [confirming, setConfirming] = useState<Booking | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const commitConfirmation = async () => {
    if (!confirming) return;
    setConfirmBusy(true);
    try {
      if (await onConfirmBooking(confirming)) setConfirming(null);
    } finally {
      setConfirmBusy(false);
    }
  };
  return <>
    <div className={compact ? 'booking-board compact' : 'booking-board'}>
      {bookingColumns.map((column) => {
        const columnBookings = bookings.filter((booking) => booking.status === column.status);
        return <section className={`booking-board-column ${column.tone}`} key={column.status}>
          <header className="booking-board-column-header"><div className="booking-board-column-title"><i /><div><b>{column.title}</b><small>{column.description}</small></div></div><em>{columnBookings.length}</em></header>
          <div className="booking-board-list">
            {columnBookings.map((booking) => <article className="booking-board-card" key={booking.id}>
              <button className="board-card-main" onClick={() => onSelectBooking(booking)}><span className="board-card-id">{booking.id}</span><b>{booking.customer}</b><small>{booking.service}</small><span className="board-card-meta"><span><CalendarDays size={12} /> {formatThaiDate(booking.date)}</span><span><Clock3 size={12} /> {booking.start}–{booking.end}</span></span></button>
              <div className="board-card-footer"><span>{booking.vehicle === 'ยังไม่จัดรถ' ? 'รอจัดรถ' : booking.vehicle}</span>{column.status === 'รอยืนยัน' ? <><button className="board-card-link" onClick={() => onSelectBooking(booking)}>โทรยืนยัน</button><button className="board-confirm-button" onClick={() => setConfirming(booking)}>ยืนยันแล้ว</button></> : <button className="board-card-link" onClick={() => onSelectBooking(booking)}>ดูรายละเอียด <ArrowRight size={13} /></button>}</div>
            </article>)}
            {columnBookings.length === 0 && <div className="booking-board-empty">ยังไม่มีรายการ</div>}
          </div>
        </section>;
      })}
    </div>
    {confirming && <FeedbackModal variant="confirm" title="ยืนยันข้อมูลกับลูกค้าแล้วหรือยัง?" copy={`หลังโทรเช็ก ${confirming.customer} แล้ว ย้าย ${confirming.id} ไปสถานะ “ยืนยันแล้ว”`} confirmLabel="ย้ายเป็นยืนยันแล้ว" onConfirm={commitConfirmation} onClose={() => { if (!confirmBusy) setConfirming(null); }} busy={confirmBusy} />}
  </>;
}

function AttentionPanel({ bookings, onSelectBooking }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void }) {
  return <section className="panel attention-panel"><div className="panel-head"><div><h3>ต้องติดตาม</h3><p>งานที่ควรจัดการก่อน</p></div><span className="count-badge">{bookings.length}</span></div>{bookings.length === 0 ? <div className="empty-mini">ไม่มีรายการเร่งด่วน</div> : <div className="attention-list">{bookings.map((booking) => <button key={booking.id} onClick={() => onSelectBooking(booking)}><span className="attention-icon"><AlertTriangle size={14} /></span><span><b>{booking.customer}</b><small>{booking.id} · {booking.sla}</small></span><ArrowRight size={14} /></button>)}</div>}</section>;
}

function CapacityPanel({ bookings }: { bookings: Booking[] }) {
  const dayCounts = [0, 1, 2, 3, 4].map((offset) => { const date = addIsoDays(todayIso, offset); return { day: formatThaiDate(date), count: bookings.filter((booking) => booking.date === date).length }; });
  return <section className="panel capacity-panel"><div className="panel-head"><div><h3>Capacity สัปดาห์นี้</h3><p>จำนวนงานที่วางไว้ในแต่ละวัน</p></div><CalendarDays size={16} className="muted-icon" /></div><div className="capacity-bars">{dayCounts.map((item, index) => <div key={`${item.day}-${index}`}><span>{item.day}</span><div className="bar-track"><i style={{ width: `${Math.min(100, 24 + item.count * 20)}%` }} /></div><b>{item.count}</b></div>)}</div><small className="capacity-note"><i /> มีพื้นที่รองรับในวันพรุ่งนี้</small></section>;
}

function Activity({ name, text, time, tone }: { name: string; text: string; time: string; tone: string }) {
  return <div className="activity-item"><div className={`avatar avatar-${tone}`}>{name.slice(0, 2)}</div><div><p><b>{name}</b> {text}</p><small>{time}</small></div></div>;
}

function OperationsCalendar({ bookings, vehicles, onSelectBooking, onAssignBooking, notify }: { bookings: Booking[]; vehicles: VehicleResource[]; onSelectBooking: (booking: Booking) => void; onAssignBooking: (booking: Booking, vehicle: VehicleResource) => Promise<boolean>; notify: (message: string) => void }) {
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [calendarMode, setCalendarMode] = useState<'month' | 'day'>('month');
  const todayDate = new Date(`${todayIso}T00:00:00`);
  const [calendarMonth, setCalendarMonth] = useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() });
  const selectedBookings = bookings.filter((booking) => booking.date === selectedDate);
  const assignable = selectedBookings.find((booking) => booking.vehicle === 'ยังไม่จัดรถ');
  const monthLabel = useMemo(() => new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(calendarMonth.year, calendarMonth.month, 1)), [calendarMonth]);
  const monthCells = useMemo(() => {
    const firstWeekday = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
    const totalDays = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
    const totalCells = Math.ceil((firstWeekday + totalDays) / 7) * 7;
    return Array.from({ length: totalCells }, (_, index) => {
      if (index < firstWeekday || index >= firstWeekday + totalDays) return { key: `empty-${index}`, date: '', day: '', bookings: [], isCurrentMonth: false };
      const day = index - firstWeekday + 1;
      const date = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { key: date, date, day: String(day), bookings: bookings.filter((booking) => booking.date === date), isCurrentMonth: true };
    });
  }, [bookings, calendarMonth]);
  const changeMonth = (offset: number) => {
    const next = new Date(calendarMonth.year, calendarMonth.month + offset, 1);
    setCalendarMonth({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`);
  };
  return <>
    <PageHeader eyebrow="Company Operations Center · Scheduling" title="ปฏิทินและจัดคิว" copy="รถแต่ละประเภทมีหลายคัน จึงรับงานช่วงเวลาเดียวกันได้ตามจำนวนรถที่ว่าง" action={<button className="primary-button" onClick={() => notify('ช่องสร้าง Booking จะเปิดจาก Booking Monitor')}><Plus size={17} /> สร้างการจอง</button>} />
    <div className="calendar-toolbar"><div className="date-navigation"><button className="icon-button small" aria-label="เดือนก่อนหน้า" onClick={() => changeMonth(-1)}><ArrowLeft size={16} /></button><button className="today-button" onClick={() => { setCalendarMonth({ year: todayDate.getFullYear(), month: todayDate.getMonth() }); setSelectedDate(todayIso); setCalendarMode('month'); }}>วันนี้</button><button className="icon-button small" aria-label="เดือนถัดไป" onClick={() => changeMonth(1)}><ArrowRight size={16} /></button><b>{monthLabel}</b></div><div className="calendar-capacity-summary"><Truck size={15} /> {vehicles.length} คันใน fleet · จองซ้อนเวลาได้ตามรถว่าง</div><div className="view-switch"><button className={calendarMode === 'month' ? 'selected' : ''} onClick={() => setCalendarMode('month')}>Month overview</button><button className={calendarMode === 'day' ? 'selected' : ''} onClick={() => setCalendarMode('day')}>Day dispatch</button></div><button className="filter-button"><Filter size={15} /> กรอง</button></div>
    {calendarMode === 'month' ? <section className="panel company-month-capacity"><div className="company-calendar-weekdays">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="company-month-grid">{monthCells.map((cell) => { const unassignedCount = cell.bookings.filter((booking) => booking.vehicle === 'ยังไม่จัดรถ').length; const activeCount = cell.bookings.length; return <button key={cell.key} disabled={!cell.isCurrentMonth} aria-label={cell.isCurrentMonth ? `${cell.day} ${activeCount} งาน` : undefined} className={`company-month-cell ${cell.isCurrentMonth ? '' : 'outside'} ${selectedDate === cell.date ? 'selected' : ''}`} onClick={() => { setSelectedDate(cell.date); setCalendarMode('day'); }}><span>{cell.day}</span>{cell.isCurrentMonth && <><b>{activeCount} งาน</b><small>{Math.max(vehicles.length - Math.min(activeCount, vehicles.length), 0)} รถว่าง</small><div className="company-day-capacity"><i style={{ width: `${Math.min(100, activeCount ? 18 + activeCount * 18 : 8)}%` }} /></div>{unassignedCount ? <em>{unassignedCount} ยังไม่จัดรถ</em> : <em>รองรับงานซ้อน</em>}</>}</button>; })}</div></section> : <DayDispatch date={selectedDate} bookings={selectedBookings} resources={vehicles} unassigned={assignable} onSelectBooking={onSelectBooking} onAssignBooking={onAssignBooking} notify={notify} />}
    {calendarMode === 'month' && <div className="calendar-hint"><CalendarDays size={16} /><span>เลือกวันที่เพื่อเปิด Day dispatch และจัดรถตามช่วงเวลา</span></div>}
  </>;
}

function DayDispatch({ date, bookings, resources, unassigned, onSelectBooking, onAssignBooking, notify }: { date: string; bookings: Booking[]; resources: VehicleResource[]; unassigned?: Booking; onSelectBooking: (booking: Booking) => void; onAssignBooking: (booking: Booking, vehicle: VehicleResource) => Promise<boolean>; notify: (message: string) => void }) {
  const slots = ['09:00–11:30', '13:00–15:30', '15:30–18:00'];
  const matchesResourceType = (booking: Booking, resource: VehicleResource) => {
    if (booking.vehicle === 'ยังไม่จัดรถ') return false;
    if (booking.vehicleId) return booking.vehicleId === resource.id;
    const bookingType = booking.vehicleType ?? booking.vehicle;
    return bookingType === resource.type || bookingType.includes(resource.type) || resource.type.includes(bookingType);
  };
  const bookingForCell = (resource: VehicleResource, slot: string) => {
    const [start] = slot.split('–');
    const direct = bookings.find((booking) => booking.vehicleId === resource.id && booking.start === start);
    if (direct) return direct;
    const sameTypeResources = resources.filter((item) => item.type === resource.type);
    const resourceIndex = sameTypeResources.findIndex((item) => item.id === resource.id);
    return bookings.filter((booking) => matchesResourceType(booking, resource) && booking.start === start)[resourceIndex];
  };
  const statusClassForVehicle = (status: VehicleResource['status']) => status === 'ว่าง' ? 'fleet-available' : status === 'ซ่อมบำรุง' ? 'fleet-maintenance' : status === 'กำลังใช้งาน' ? 'fleet-busy' : 'fleet-maintenance';
  const firstAvailable = resources.find((resource) => resource.status === 'ว่าง' && resource.type.includes(unassigned?.vehicleType ?? 'รถดูดสูญญากาศ'));
  return <section className="panel dispatch-panel"><div className="panel-head"><div><h3>จัดคิวรายวัน · {formatThaiDate(date)}</h3><p>แยกเป็นรถรายคัน เพื่อเห็นงานซ้อนเวลาและรถที่ยังว่างทันที</p></div><span className="dispatch-summary">{bookings.length} งาน · {resources.length} รถ</span></div>{unassigned && <div className="unassigned-banner"><span><AlertTriangle size={15} /> ยังไม่จัดรถ</span><b>{unassigned.id} · {unassigned.customer}</b>{firstAvailable ? <button onClick={() => { void onAssignBooking(unassigned, firstAvailable); }}>จัดรถให้ {firstAvailable.registrationNumber}</button> : <small>ยังไม่มีรถประเภทที่ตรงกัน</small>}</div>}<div className="dispatch-grid"><div className="resource-head">รถรายคัน / เวลา</div>{slots.map((slot) => <div className="slot-head" key={slot}>{slot}</div>)}{resources.map((resource) => <div className="dispatch-row" key={resource.id}><div className="resource-name"><Truck size={16} /><span><b>{resource.registrationNumber}</b><small>{resource.type}</small></span><em className={`fleet-status ${statusClassForVehicle(resource.status)}`}>{resource.status}</em></div>{slots.map((slot) => { const booking = bookingForCell(resource, slot); return <button className={booking ? 'dispatch-cell filled' : 'dispatch-cell'} key={`${resource.id}-${slot}`} onClick={() => booking ? onSelectBooking(booking) : notify(`รถ ${resource.registrationNumber} ว่างใน ${slot}`)}>{booking ? <><b>{booking.customer}</b><small>{booking.service}</small><em className={`stage-label ${stageClass[booking.stage]}`}>{booking.stage}</em></> : <span>ว่าง</span>}</button>; })}</div>)}</div></section>;
}

function FleetView({ bookings, vehicles, notify }: { bookings: Booking[]; vehicles: VehicleResource[]; notify: (message: string) => void }) {
  const available = vehicles.filter((item) => item.status === 'ว่าง').length;
  const busy = vehicles.filter((item) => item.status === 'กำลังใช้งาน').length;
  const maintenance = vehicles.filter((item) => item.status === 'ซ่อมบำรุง').length;
  const tones = ['teal', 'amber', 'blue', 'violet', 'rose'];
  const statusClassForVehicle = (status: VehicleResource['status']) => status === 'ว่าง' ? 'fleet-available' : status === 'ซ่อมบำรุง' ? 'fleet-maintenance' : status === 'กำลังใช้งาน' ? 'fleet-busy' : 'fleet-maintenance';
  return <><PageHeader eyebrow="Company Operations Center · Fleet" title="รถและทีมงาน" copy="ดูรถเป็นรายคัน และรู้ทันทีว่าคันไหนว่างรับงานซ้อนเวลา" action={<button className="primary-button" onClick={() => notify('ฟอร์มเพิ่มรถจะเปิดในเวอร์ชันถัดไป')}><Plus size={17} /> เพิ่มรถ</button>} /><div className="fleet-summary"><Metric label="รถทั้งหมด" value={String(vehicles.length).padStart(2, '0')} note="คันในระบบ" tone="teal" icon={<Truck size={17} />} /><Metric label="พร้อมใช้งาน" value={String(available).padStart(2, '0')} note="รับงานเพิ่มได้" tone="blue" icon={<Check size={17} />} /><Metric label="กำลังใช้งาน" value={String(busy).padStart(2, '0')} note="มีงานที่กำลังจัด" tone="amber" icon={<Clock3 size={17} />} /><Metric label="ซ่อมบำรุง" value={String(maintenance).padStart(2, '0')} note="ยังจัดงานไม่ได้" tone="rose" icon={<Settings2 size={17} />} /></div><section className="panel fleet-table-panel"><div className="panel-head"><div><h3>สถานะรถรายคัน</h3><p>รถชนิดเดียวกันมีหลายคัน จึงรองรับงานเวลาเดียวกันได้</p></div><button className="filter-button"><Filter size={15} /> ตัวกรอง</button></div><div className="fleet-grid">{vehicles.map((item, index) => <div className="fleet-card" key={item.id}><div className={`fleet-symbol ${tones[index % tones.length]}`}><Truck size={20} /></div><div className="fleet-card-main"><b>{item.registrationNumber} · {item.name}</b><small>{item.type}</small><span>{item.bookingId ? 'มีงานกำลังจัดอยู่' : 'พร้อมรับงานเพิ่ม'}</span></div><div><em className={`fleet-status ${statusClassForVehicle(item.status)}`}>{item.status}</em><button className="icon-button small" onClick={() => notify(`เปิดรายละเอียด ${item.registrationNumber}`)}><MoreHorizontal size={16} /></button></div></div>)}</div></section><section className="panel fleet-note"><AlertTriangle size={16} /><span>การจองช่วงเวลาเดียวกันจะแยกรถเป็นคนละคันโดยอัตโนมัติตาม capacity ที่ว่าง</span><button className="quiet-button" onClick={() => notify('เปิด maintenance schedule')}>ดูรายละเอียด <ArrowRight size={15} /></button></section><span className="sr-only">มีข้อมูล Booking {bookings.length} รายการ</span></>;
}

function CustomersView({ bookings, onSelectBooking }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void }) {
  const customers = Array.from(new Set(bookings.map((item) => item.customer))).map((name) => ({ name, count: bookings.filter((item) => item.customer === name).length, last: bookings.find((item) => item.customer === name)?.date ?? '' }));
  return <><PageHeader eyebrow="Company Operations Center · Customers" title="ลูกค้า" copy="ดูองค์กรลูกค้า สถานที่ และประวัติ Booking" action={<button className="primary-button"><Plus size={17} /> เพิ่มลูกค้า</button>} /><section className="panel monitor-panel"><div className="monitor-toolbar"><div className="toolbar-search"><Search size={16} /><input placeholder="ค้นหาชื่อลูกค้าหรือสถานที่" /></div><button className="filter-button"><Filter size={15} /> ตัวกรอง</button></div><div className="customer-list">{customers.map((customer) => <button key={customer.name} className="customer-row" onClick={() => { const booking = bookings.find((item) => item.customer === customer.name); if (booking) onSelectBooking(booking); }}><div className="avatar avatar-teal">{customer.name.slice(0, 2)}</div><div><b>{customer.name}</b><small>มี {customer.count} Booking · อัปเดต {formatThaiDate(customer.last)}</small></div><ArrowRight size={16} /></button>)}</div></section></>;
}

function ReportsView({ bookings }: { bookings: Booking[] }) {
  return <><PageHeader eyebrow="Company Operations Center · Reports" title="รายงานปฏิบัติการ" copy="สรุปผลจาก Booking และการใช้ fleet" action={<button className="secondary-button"><FileText size={16} /> ส่งออก CSV</button>} /><div className="report-grid"><section className="panel report-panel"><div className="panel-head"><div><h3>Booking ตามสถานะ</h3><p>ข้อมูลจากชุดที่เลือกในระบบ</p></div><span>ส.ค. 2569</span></div><div className="report-bars"><ReportBar label="เสร็จสิ้น" value={bookings.filter((b) => b.status === 'เสร็จสิ้น').length} max={7} tone="green" /><ReportBar label="กำลังดำเนินการ" value={bookings.filter((b) => b.status === 'กำลังดำเนินการ').length} max={7} tone="teal" /><ReportBar label="ยืนยันแล้ว" value={bookings.filter((b) => b.status === 'ยืนยันแล้ว').length} max={7} tone="blue" /><ReportBar label="รอยืนยัน" value={bookings.filter((b) => b.status === 'รอยืนยัน').length} max={7} tone="amber" /></div></section><section className="panel report-panel"><div className="panel-head"><div><h3>SLA health</h3><p>งานที่ต้องติดตาม</p></div><ShieldCheck size={17} className="success-icon" /></div><div className="sla-overview"><strong>{bookings.filter((b) => b.sla === 'ปกติ').length}</strong><span>จาก {bookings.length} งานอยู่ในเกณฑ์ปกติ</span></div><div className="mini-progress"><i style={{ width: `${(bookings.filter((b) => b.sla === 'ปกติ').length / bookings.length) * 100}%` }} /></div></section></div></>;
}

function ReportBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) { return <div className="report-bar"><span>{label}</span><div><i className={tone} style={{ width: `${Math.max(8, (value / max) * 100)}%` }} /></div><b>{value}</b></div>; }

function OwnerAuditView({ notify }: { notify: (message: string) => void }) {
  const [items, setItems] = useState<ApiAuditLog[]>([]);
  const [loading, setLoading] = useState(() => isApiEnabled());
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isApiEnabled()) return undefined;
    fetchOwnerAudit({ pageSize: 50 }).then((result) => setItems(result.items)).catch((reason) => { const message = reason instanceof Error ? reason.message : 'โหลด Audit ไม่สำเร็จ'; setError(message); }).finally(() => setLoading(false));
    return undefined;
  }, []);
  const formatTime = (value: string) => new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  return <><PageHeader eyebrow="Owner Control · Audit" title="Audit Center" copy="ตรวจสอบ privileged actions และการเปลี่ยนแปลงย้อนหลังของทั้งองค์กร" /><section className="panel audit-panel"><div className="panel-head"><div><h3>กิจกรรมล่าสุด</h3><p>ข้อมูล immutable จาก Booking, Task และ workflow</p></div><button className="quiet-button" onClick={() => { setLoading(true); fetchOwnerAudit({ pageSize: 50 }).then((result) => setItems(result.items)).catch(() => notify('โหลด Audit ไม่สำเร็จ')).finally(() => setLoading(false)); }}><ArrowRight size={15} /> รีเฟรช</button></div>{loading ? <div className="empty-table">กำลังโหลด Audit…</div> : error ? <div className="empty-table">{error}</div> : items.length ? <div className="audit-log-list">{items.map((item) => <div className="audit-log-row" key={item.id}><span className="audit-log-icon"><ShieldCheck size={14} /></span><div><b>{item.action}</b><small>{item.entityType} · {item.entityId}</small></div><div><b>{item.actorUser?.displayName ?? 'ระบบ'}</b><small>{formatTime(item.createdAt)}</small></div><span className="audit-log-reason">{String(item.afterJson?.changeReason ?? item.afterJson?.reason ?? '—')}</span></div>)}</div> : <div className="empty-table">ยังไม่มี Audit Log</div>}</section></>;
}

function BookingDrawer({ booking, onClose, onConfirmBooking, onAdvanceBooking, onCancelBooking, onEditBooking, notify }: { booking: Booking; onClose: () => void; onConfirmBooking: (booking: Booking) => boolean | Promise<boolean>; onAdvanceBooking: (booking: Booking) => Promise<boolean>; onCancelBooking: (booking: Booking, reason: string) => Promise<boolean>; onEditBooking: (booking: Booking) => void; notify: (message: string) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [detail, setDetail] = useState<ApiBookingDetail | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  useEffect(() => {
    if (!booking.recordId || !isApiEnabled()) return undefined;
    let active = true;
    Promise.all([fetchOperationBooking(booking.recordId), fetchBookingTasks(booking.recordId)]).then(([bookingResult, taskResult]) => { if (active) { setDetail(bookingResult); setTasks(taskResult.items); } }).catch(() => undefined);
    return () => { active = false; };
  }, [booking.recordId]);
  const addTask = async () => {
    if (!booking.recordId || !newTaskTitle.trim()) return;
    try {
      const task = await createBookingTask(booking.recordId, { title: newTaskTitle.trim(), isRequired: false });
      setTasks((current) => [...current, task]);
      setNewTaskTitle('');
      notify('สร้าง Task แล้ว');
    } catch (error) { notify(error instanceof Error ? error.message : 'สร้าง Task ไม่สำเร็จ'); }
  };
  const changeTaskStatus = async (task: ApiTask, status: string) => {
    try {
      const updated = await updateBookingTaskStatus(task.id, { status, reason: `อัปเดตจาก Booking ${booking.id}` });
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
    } catch (error) { notify(error instanceof Error ? error.message : 'อัปเดต Task ไม่สำเร็จ'); }
  };
  const advanceStage = () => setConfirmOpen(true);
  const commitAdvance = async () => {
    setConfirmBusy(true);
    try {
      const ok = booking.status === 'รอยืนยัน' ? await onConfirmBooking(booking) : await onAdvanceBooking(booking);
      if (ok) { setConfirmOpen(false); setSuccessOpen(true); }
    } finally { setConfirmBusy(false); }
  };
  const submitCancel = async () => {
    const reason = cancelReason.trim();
    if (reason.length < 5) { notify('กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 5 ตัวอักษร'); return; }
    setCancelBusy(true);
    try {
      if (await onCancelBooking(booking, reason)) { setCancelOpen(false); setCancelReason(''); }
    } finally { setCancelBusy(false); }
  };
  const revisionLines = (revision: NonNullable<ApiBookingDetail['revisions']>[number]) => Object.entries(revision.changedFields ?? {}).slice(0, 4).map(([field, value]) => {
    if (value && typeof value === 'object' && 'before' in value && 'after' in value) return `${field}: ${String((value as { before: unknown }).before ?? '—')} → ${String((value as { after: unknown }).after ?? '—')}`;
    return field;
  });
  return <><div className="drawer-layer" role="presentation" onMouseDown={onClose}><aside className="detail-drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-header"><div><span className="eyebrow">Booking detail</span><h2>{booking.id}</h2><p>{booking.updatedBy ? `แก้ไขล่าสุดโดย ${booking.updatedBy.displayName}` : 'รายการจากระบบปฏิบัติการ'}</p></div><div className="drawer-header-actions"><button className="secondary-button small" onClick={() => onEditBooking(booking)}><FileText size={15} /> แก้ไข</button><button className="icon-button" onClick={onClose} aria-label="ปิด"><X size={18} /></button></div></div><div className="drawer-status"><em className={`status-chip ${statusClass[booking.status]}`}>{booking.status}</em><em className={`stage-label ${stageClass[booking.stage]}`}>{booking.stage}</em><span className={booking.sla === 'ปกติ' ? 'sla-ok' : 'sla-alert'}>{booking.sla}</span></div><section className="drawer-section"><h3>รายละเอียดงาน</h3><DetailLine icon={<Users size={15} />} label="ลูกค้า" value={booking.customer} /><DetailLine icon={<FileText size={15} />} label="บริการ" value={booking.service} /><DetailLine icon={<MapPin size={15} />} label="สถานที่" value={booking.site} /><DetailLine icon={<CalendarDays size={15} />} label="วันเวลา" value={`${formatThaiDate(booking.date)} · ${booking.start}–${booking.end}`} />{booking.estimatedVolume !== null && booking.estimatedVolume !== undefined && <DetailLine icon={<Gauge size={15} />} label="ปริมาณ" value={`${booking.estimatedVolume} ${booking.volumeUnit ?? ''}`.trim()} />}{booking.contactName && <DetailLine icon={<UserRound size={15} />} label="ผู้ติดต่อ" value={`${booking.contactName}${booking.contactPhone ? ` · ${booking.contactPhone}` : ''}`} />}</section><section className="drawer-section"><h3>ผู้รับผิดชอบและประวัติการแก้ไข</h3><DetailLine icon={<UserRound size={15} />} label="ผู้รับผิดชอบ" value={booking.responsibleUser?.displayName ?? 'ยังไม่มอบหมาย'} /><DetailLine icon={<Users size={15} />} label="สร้างโดย" value={booking.createdBy ? `${booking.createdBy.displayName}${booking.source ? ` · ${booking.source}` : ''}` : 'ไม่ระบุ'} />{booking.updatedBy && <DetailLine icon={<Check size={15} />} label="แก้ไขล่าสุดโดย" value={booking.updatedBy.displayName} />}{booking.lastChangeReason && <DetailLine icon={<FileText size={15} />} label="เหตุผลล่าสุด" value={booking.lastChangeReason} />}</section><section className="drawer-section"><div className="drawer-section-heading"><h3>Task</h3><span>{tasks.length} รายการ</span></div>{booking.recordId && isApiEnabled() && <div className="task-create-row"><input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addTask(); }} placeholder="เพิ่มงานที่ต้องทำ…" aria-label="ชื่องานใหม่" /><button className="primary-button small" onClick={() => void addTask()} disabled={!newTaskTitle.trim()}><Plus size={15} /> เพิ่ม</button></div>}{tasks.length ? <div className="drawer-task-list">{tasks.map((task) => <div className="drawer-task-item" key={task.id}><span className={`task-status-dot ${task.status.toLowerCase()}`} /><div><b>{task.title}</b><small>{task.assignee?.displayName ?? 'ยังไม่มอบหมาย'} · {task.priority}</small></div><select value={task.status} onChange={(event) => void changeTaskStatus(task, event.target.value)} aria-label={`สถานะ ${task.title}`}><option value="TODO">รอทำ</option><option value="IN_PROGRESS">กำลังทำ</option><option value="WAITING">รอข้อมูล</option><option value="BLOCKED">ติดปัญหา</option><option value="DONE">เสร็จแล้ว</option><option value="CANCELLED">ยกเลิก</option></select></div>)}</div> : <div className="empty-mini">ยังไม่มี Task สำหรับ Booking นี้</div>}</section><section className="drawer-section"><div className="drawer-section-heading"><h3>Audit timeline</h3><span>{detail?.revisions?.length ?? 0} revisions</span></div>{detail?.revisions?.length ? <div className="drawer-history-list">{detail.revisions.slice().reverse().map((revision) => <div className="drawer-history-item" key={revision.id}><span className="task-status-dot in_progress" /><div><b>{revision.action}</b><small>{revision.reason ?? 'ไม่มีเหตุผลระบุ'} · version {revision.version}</small>{revisionLines(revision).map((line) => <em key={line}>{line}</em>)}</div></div>)}</div> : <><TimelineItem label="สร้างคำขอจอง" time={booking.createdBy ? `โดย ${booking.createdBy.displayName}` : 'บันทึกในระบบ'} done /><TimelineItem label="ยืนยันคิว" time={booking.status === 'รอยืนยัน' ? 'รอดำเนินการ' : 'ยืนยันแล้ว'} done={booking.status !== 'รอยืนยัน'} /><TimelineItem label="เริ่มปฏิบัติงาน" time={booking.stage === 'รอเริ่มงาน' ? 'รอดำเนินการ' : 'สถานะอัปเดตแล้ว'} done={['กำลังเดินทาง', 'ถึงหน้างาน', 'กำลังให้บริการ', 'เสร็จสิ้น'].includes(booking.stage)} /><TimelineItem label="เสร็จสิ้นและส่งหลักฐาน" time={booking.stage === 'เสร็จสิ้น' ? 'เสร็จสิ้นแล้ว' : 'รอดำเนินการ'} done={booking.stage === 'เสร็จสิ้น'} /></>}</section><div className="drawer-actions">{booking.status === 'รอยืนยัน' ? <button className="primary-button" onClick={advanceStage}><Check size={16} /> ยืนยันข้อมูลแล้ว</button> : booking.stage !== 'เสร็จสิ้น' && <button className="primary-button" onClick={advanceStage}><Check size={16} /> อัปเดตขั้นตอนถัดไป</button>}{!['เสร็จสิ้น', 'ยกเลิก', 'ปฏิเสธ'].includes(booking.status) && <button className="secondary-button" onClick={() => setCancelOpen(true)}>ยกเลิก Booking</button>}<button className="secondary-button" onClick={onClose}>ปิดรายละเอียด</button></div></aside></div>{confirmOpen && <FeedbackModal variant="confirm" title={booking.status === 'รอยืนยัน' ? 'ยืนยันข้อมูลกับลูกค้าแล้วหรือยัง?' : 'ยืนยันการอัปเดตสถานะ?'} copy={booking.status === 'รอยืนยัน' ? `หลังโทรเช็ก ${booking.customer} แล้ว ย้าย ${booking.id} ไปสถานะ “ยืนยันแล้ว”` : `อัปเดต ${booking.id} จาก “${booking.stage}” ไปขั้นตอนถัดไป`} confirmLabel={booking.status === 'รอยืนยัน' ? 'ย้ายเป็นยืนยันแล้ว' : 'ยืนยันการอัปเดต'} onConfirm={commitAdvance} onClose={() => { if (!confirmBusy) setConfirmOpen(false); }} busy={confirmBusy} />}{successOpen && <FeedbackModal variant="success" title={booking.status === 'รอยืนยัน' ? 'ยืนยัน Booking สำเร็จ' : 'อัปเดตสถานะสำเร็จ'} copy={booking.status === 'รอยืนยัน' ? `${booking.id} ถูกย้ายไปคอลัมน์ “ยืนยันแล้ว”` : `${booking.id} ถูกเลื่อนไปขั้นตอนถัดไปแล้ว`} confirmLabel="กลับไปดูรายการ" onConfirm={() => setSuccessOpen(false)} onClose={() => setSuccessOpen(false)} />}{cancelOpen && <div className="feedback-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !cancelBusy) setCancelOpen(false); }}><section className="feedback-modal confirm" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="feedback-modal-close" aria-label="ปิด" onClick={() => setCancelOpen(false)} disabled={cancelBusy}><X size={18} /></button><div className="feedback-modal-icon"><AlertTriangle size={27} /></div><span className="feedback-modal-kicker">ต้องระบุเหตุผล</span><h2>ยกเลิก {booking.id}?</h2><p>เหตุผลจะถูกบันทึกในประวัติและ Audit Log ของระบบ</p><textarea className="cancel-reason-field" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} placeholder="เช่น ลูกค้าขอยกเลิกทางโทรศัพท์" autoFocus /><div className="feedback-modal-actions"><button className="secondary-button" onClick={() => setCancelOpen(false)} disabled={cancelBusy}>กลับไป</button><button className="primary-button" onClick={() => void submitCancel()} disabled={cancelBusy}>{cancelBusy ? 'กำลังยกเลิก…' : 'ยืนยันการยกเลิก'}</button></div></section></div>}</>;
}

function OpsBookingModal({ mode, booking, onClose, onSave }: { mode: 'create' | 'edit'; booking?: Booking; onClose: () => void; onSave: (payload: OpsBookingPayload | OpsBookingUpdatePayload) => Promise<boolean> }) {
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [sites, setSites] = useState<Array<{ id: string; name: string; district?: string | null; province?: string | null; contactName?: string | null; contactPhone?: string | null }>>([]);
  const [services, setServices] = useState<Array<{ code: string; name: string; durationMinutes: number }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; displayName: string; role?: string }>>([]);
  const [customerId, setCustomerId] = useState(booking?.customerOrganizationId ?? '');
  const [siteId, setSiteId] = useState(booking?.customerSiteId ?? '');
  const [serviceCode, setServiceCode] = useState(booking?.serviceCode ?? 'GREASE_TRAP');
  const [date, setDate] = useState(booking?.date ?? tomorrowIso);
  const [start, setStart] = useState(booking?.start ?? '09:00');
  const [end, setEnd] = useState(booking?.end ?? '11:30');
  const [volume, setVolume] = useState(booking?.estimatedVolume?.toString() ?? '');
  const [unit, setUnit] = useState(booking?.volumeUnit ?? 'ลบ.ม.');
  const [customerNote, setCustomerNote] = useState(booking?.customerNote ?? '');
  const [internalNote, setInternalNote] = useState('');
  const [contactName, setContactName] = useState(booking?.contactName ?? '');
  const [contactPhone, setContactPhone] = useState(booking?.contactPhone ?? '');
  const [responsibleId, setResponsibleId] = useState(booking?.responsibleUserId ?? '');
  const [reason, setReason] = useState('');
  const [confirmImmediately, setConfirmImmediately] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isApiEnabled()) return undefined;
    Promise.all([fetchOperationsCustomers(), fetchOperationsUsers(), fetchServices()]).then(([customerResult, userResult, serviceResult]) => {
      setCustomers(customerResult.items.map((item) => ({ id: item.id, name: item.name })));
      setUsers(userResult.items);
      setServices(serviceResult.map((item) => ({ code: item.code, name: item.name, durationMinutes: item.durationMinutes })));
      if (!customerId && customerResult.items[0]) setCustomerId(customerResult.items[0].id);
    }).catch(() => setError('โหลดข้อมูลสำหรับสร้าง Booking ไม่สำเร็จ'));
    return undefined;
  }, [customerId]);

  useEffect(() => {
    if (!isApiEnabled() || !customerId) return undefined;
    fetchOperationsCustomerSites(customerId).then((result) => { setSites(result.items); if (!siteId && result.items[0]) { setSiteId(result.items[0].id); setContactName(result.items[0].contactName ?? ''); setContactPhone(result.items[0].contactPhone ?? ''); } }).catch(() => setError('โหลดสถานที่ลูกค้าไม่สำเร็จ'));
    return undefined;
  }, [customerId, siteId]);

  const submit = async () => {
    setError('');
    if (!customerId || !siteId || !serviceCode || !date || !start || !end) { setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบ'); return; }
    if (mode === 'edit' && (!reason.trim() || reason.trim().length < 5)) { setError('การแก้ไขต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร'); return; }
    setBusy(true);
    const ok = await onSave(mode === 'create' ? { customerOrganizationId: customerId, customerSiteId: siteId, serviceCode, requestedDate: date, requestedStart: start, requestedEnd: end, estimatedVolume: volume ? Number(volume) : undefined, volumeUnit: unit, customerNote: customerNote || undefined, internalNote: internalNote || undefined, responsibleUserId: responsibleId || undefined, contactName: contactName || undefined, contactPhone: contactPhone || undefined, source: 'ADMIN_PHONE', confirmImmediately } : { version: booking?.recordVersion ?? 1, customerSiteId: siteId, serviceCode, requestedDate: date, requestedStart: start, requestedEnd: end, estimatedVolume: volume ? Number(volume) : undefined, volumeUnit: unit, customerNote: customerNote || undefined, internalNote: internalNote || undefined, responsibleUserId: responsibleId || undefined, changeReason: reason.trim(), assignmentResolution: 'UNASSIGN_IF_INVALID' });
    setBusy(false);
    if (!ok) setError('บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่');
  };

  return <div className="feedback-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section className="ops-booking-modal" role="dialog" aria-modal="true" aria-labelledby="ops-booking-title" onMouseDown={(event) => event.stopPropagation()}><div className="ops-modal-header"><div><span className="eyebrow">{mode === 'create' ? 'Admin booking intake' : 'Booking correction'}</span><h2 id="ops-booking-title">{mode === 'create' ? 'สร้างการจองแทนลูกค้า' : `แก้ไข ${booking?.id}`}</h2><p>{mode === 'create' ? 'บันทึกข้อมูลจากการรับเรื่องทางโทรศัพท์ พร้อมผู้รับผิดชอบ' : 'ตรวจผลกระทบก่อนบันทึก และเก็บเหตุผลไว้ในประวัติ'}</p></div><button className="icon-button" onClick={onClose} disabled={busy} aria-label="ปิด"><X size={18} /></button></div><div className="ops-form-grid"><label className="field-label">ลูกค้า<select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setSiteId(''); }} disabled={mode === 'edit'}><option value="">เลือกบริษัทลูกค้า</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field-label">สถานที่<select value={siteId} onChange={(event) => { const site = sites.find((item) => item.id === event.target.value); setSiteId(event.target.value); if (site) { setContactName(site.contactName ?? ''); setContactPhone(site.contactPhone ?? ''); } }}><option value="">เลือกสถานที่</option>{sites.map((item) => <option key={item.id} value={item.id}>{item.name} · {[item.district, item.province].filter(Boolean).join(', ')}</option>)}</select></label><label className="field-label">บริการ<select value={serviceCode} onChange={(event) => setServiceCode(event.target.value)}>{services.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label className="field-label">ผู้รับผิดชอบ<select value={responsibleId} onChange={(event) => setResponsibleId(event.target.value)}><option value="">ยังไม่มอบหมาย</option>{users.map((item) => <option key={item.id} value={item.id}>{item.displayName}{item.role ? ` · ${item.role}` : ''}</option>)}</select></label><label className="field-label">วันที่<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field-label">เวลาเริ่ม<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="field-label">เวลาสิ้นสุด<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label><label className="field-label">ปริมาณ<input value={volume} onChange={(event) => setVolume(event.target.value.replace(/[^0-9.]/g, ''))} placeholder="เช่น 8" inputMode="decimal" /></label><label className="field-label">หน่วย<select value={unit} onChange={(event) => setUnit(event.target.value)}><option>ลบ.ม.</option><option>ตัน</option><option>เที่ยว</option></select></label><label className="field-label">ผู้ติดต่อ<input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="ชื่อผู้ติดต่อ" /></label><label className="field-label">เบอร์โทร<input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="เบอร์โทร" /></label><label className="field-label ops-form-wide">หมายเหตุลูกค้า<textarea value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} rows={2} placeholder="ข้อมูลที่ลูกค้าแจ้ง" /></label><label className="field-label ops-form-wide">หมายเหตุภายใน<textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} rows={2} placeholder="ข้อมูลสำหรับทีม Foresee" /></label>{mode === 'edit' && <label className="field-label ops-form-wide required-field">เหตุผลการแก้ไข<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="เช่น ลูกค้าขอเลื่อนเวลาทางโทรศัพท์" /></label>}</div>{mode === 'create' && <label className="ops-confirm-toggle"><input type="checkbox" checked={confirmImmediately} onChange={(event) => setConfirmImmediately(event.target.checked)} /><span><b>ยืนยัน Booking ทันที</b><small>ใช้เมื่อโทรยืนยันข้อมูลกับลูกค้าเรียบร้อยแล้ว</small></span></label>}{error && <p className="form-error">{error}</p>}<div className="ops-modal-actions"><button className="secondary-button" onClick={onClose} disabled={busy}>ยกเลิก</button><button className="primary-button" onClick={() => void submit()} disabled={busy}>{busy ? 'กำลังบันทึก…' : mode === 'create' ? 'สร้าง Booking' : 'บันทึกการแก้ไข'}<ArrowRight size={16} /></button></div></section></div>;
}

function DetailLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="detail-line"><span>{icon}{label}</span><b>{value}</b></div>; }
function TimelineItem({ label, time, done }: { label: string; time: string; done: boolean }) { return <div className={done ? 'timeline-item done' : 'timeline-item'}><i>{done && <Check size={10} />}</i><span><b>{label}</b><small>{time}</small></span></div>; }

function FeedbackModal({ variant, title, copy, confirmLabel, onConfirm, onClose, busy = false }: { variant: 'confirm' | 'success'; title: string; copy: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; busy?: boolean }) {
  return <div className="feedback-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section className={`feedback-modal ${variant}`} role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="feedback-modal-close" aria-label="ปิด" onClick={onClose} disabled={busy}><X size={18} /></button><div className="feedback-modal-icon"><Check size={27} /></div><span className="feedback-modal-kicker">{variant === 'confirm' ? 'ตรวจสอบรายละเอียด' : 'ดำเนินการเรียบร้อย'}</span><h2 id="feedback-modal-title">{title}</h2><p>{copy}</p>{variant === 'confirm' ? <div className="feedback-modal-actions"><button className="secondary-button" onClick={onClose} disabled={busy}>กลับไปแก้ไข</button><button className="primary-button" onClick={onConfirm} disabled={busy}>{confirmLabel}<ArrowRight size={16} /></button></div> : <button className="primary-button feedback-modal-success-button" onClick={onConfirm}>{confirmLabel}<ArrowRight size={16} /></button>}</section></div>;
}

function CustomerPortal({ view, bookings, session, onNavigate, onSwitchPortal, onBookingCreated, notify }: { view: CustomerView; bookings: Booking[]; session: ApiSessionUser | null; onNavigate: (view: CustomerView) => void; onSwitchPortal: (portal: Portal) => void; onBookingCreated: (booking: Booking) => void; notify: (message: string) => void }) {
  const title = view === 'new-booking' ? 'จองบริการ' : view === 'bookings' ? 'การจองของฉัน' : 'ข้อมูลบริษัท';
  return <div className="customer-storefront">
    <header className="customer-header">
      <button className="customer-brand" onClick={() => onNavigate('new-booking')} aria-label="กลับหน้าจองบริการ"><span className="customer-brand-mark">F</span><span><strong>FORESEE</strong><small>บริการจัดการสิ่งแวดล้อม</small></span></button>
      <nav className="customer-nav" aria-label="เมนูลูกค้า">
        <button className={view === 'new-booking' ? 'customer-nav-link active' : 'customer-nav-link'} onClick={() => onNavigate('new-booking')}><Plus size={17} /> จองบริการ</button>
        <button className={view === 'bookings' ? 'customer-nav-link active' : 'customer-nav-link'} onClick={() => onNavigate('bookings')}><FileText size={17} /> การจองของฉัน <em>{bookings.length}</em></button>
        <button className={view === 'company' ? 'customer-nav-link active' : 'customer-nav-link'} onClick={() => onNavigate('company')}><Users size={17} /> ข้อมูลบริษัท</button>
      </nav>
      <div className="customer-header-actions"><button className="customer-help" onClick={() => notify('ทีม Foresee จะติดต่อกลับในไม่ช้า')}><ShieldCheck size={16} /> ช่วยเหลือ</button><PortalSwitcher portal="customer" onChange={onSwitchPortal} /><button className="customer-account" onClick={() => onNavigate('company')}><span className="customer-account-avatar">{session?.displayName?.slice(0, 2) ?? 'ทร'}</span><span><b>{session?.displayName ?? 'ธนกร รุ่งเรือง'}</b><small>ไทยรุ่งอุตสาหกรรม</small></span><ChevronDown size={15} /></button><button className="customer-notification" aria-label="การแจ้งเตือน" onClick={() => notify('มีการอัปเดต Booking 1 รายการ')}><Bell size={18} /></button></div>
    </header>
    <main className="customer-main"><div className="customer-page-label"><span>พอร์ทัลลูกค้า</span><b>/</b><strong>{title}</strong></div>{view === 'new-booking' && <CustomerNewBooking notify={notify} onNavigate={onNavigate} onBookingCreated={onBookingCreated} />}{view === 'bookings' && <CustomerBookings bookings={bookings} onNavigate={onNavigate} />}{view === 'company' && <CustomerCompany notify={notify} />}</main>
  </div>;
}

function CustomerNewBooking({ notify, onNavigate, onBookingCreated }: { notify: (message: string) => void; onNavigate: (view: CustomerView) => void; onBookingCreated: (booking: Booking) => void }) {
  const [service, setService] = useState('ดูดบ่อดักไขมัน');
  const [selectedDate, setSelectedDate] = useState(tomorrowIso);
  const [selectedSlot, setSelectedSlot] = useState('09:00–11:30');
  const tomorrowDate = new Date(`${tomorrowIso}T00:00:00`);
  const [calendarMonth, setCalendarMonth] = useState({ year: tomorrowDate.getFullYear(), month: tomorrowDate.getMonth() });
  const [availability, setAvailability] = useState<ApiAvailabilityResponse | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [siteId, setSiteId] = useState('00000000-0000-4000-8000-000000000010');
  const [siteName, setSiteName] = useState('โรงงาน ไทยรุ่ง — บางปะกง, ฉะเชิงเทรา');
  const [sites, setSites] = useState<Array<{ id: string; name: string; district?: string | null; province?: string | null }>>([]);
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('ลบ.ม.');
  const [customerNote, setCustomerNote] = useState('');
  const [createdNumber, setCreatedNumber] = useState('');
  const services = [{ name: 'ดูดบ่อดักไขมัน', detail: 'รถดูดสูญญากาศ', icon: '≋', tone: 'teal' }, { name: 'ขนส่งกากอุตสาหกรรม', detail: 'รถขนกากมาตรฐาน', icon: '▱', tone: 'amber' }, { name: 'ล้างบ่อบำบัดน้ำเสีย', detail: 'รถดูดตะกอน', icon: '✧', tone: 'violet' }];
  const monthLabel = useMemo(() => new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(calendarMonth.year, calendarMonth.month, 1)), [calendarMonth]);
  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
    const totalDays = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
    return Array.from({ length: firstWeekday + totalDays }, (_, index) => {
      if (index < firstWeekday) return { key: `empty-${index}`, date: '', day: '', tone: 'empty', state: '', isCurrentMonth: false };
      const day = index - firstWeekday + 1;
      const date = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekday = new Date(calendarMonth.year, calendarMonth.month, day).getDay();
      const isPast = date < todayIso;
      const selectedAvailability = date === selectedDate ? availability : null;
      const availableSlots = selectedAvailability?.slots.filter((slot) => slot.available).length;
      const tone = isPast || weekday === 0 ? 'closed' : selectedAvailability && availableSlots === 0 ? 'closed' : selectedAvailability && availableSlots === 1 ? 'limited' : 'open';
      const state = isPast ? 'ผ่านไปแล้ว' : weekday === 0 ? 'ปิดบริการ' : selectedAvailability ? availableSlots ? `ว่าง ${availableSlots} ช่วง` : 'เต็ม' : 'ตรวจสอบคิว';
      return { key: date, date, day: String(day), tone, state, isCurrentMonth: true };
    });
  }, [calendarMonth, selectedDate, availability]);
  const changeMonth = (offset: number) => {
    const next = new Date(calendarMonth.year, calendarMonth.month + offset, 1);
    const date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
    setCalendarMonth({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDate(date);
    setAvailability(null);
    setSelectedSlot('09:00–11:30');
  };
  const serviceCode = service === 'ดูดบ่อดักไขมัน' ? 'GREASE_TRAP' : service === 'ขนส่งกากอุตสาหกรรม' ? 'INDUSTRIAL_WASTE' : 'WASTEWATER_POND';
  const fallbackSlots = useMemo(() => selectedDate === '2026-08-31' ? ['13:00–15:30'] : selectedDate === '2026-09-03' ? [] : ['09:00–11:30', '13:00–15:30', '15:30–18:00'], [selectedDate]);
  const formatSlotClock = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  const liveSlots = availability?.slots.map((slot) => ({ label: `${formatSlotClock(slot.start)}–${formatSlotClock(slot.end)}`, available: slot.available, remaining: slot.remaining })) ?? [];
  const slots = availability ? liveSlots : isApiEnabled() ? [] : fallbackSlots.map((label) => ({ label, available: true, remaining: selectedDate === '2026-08-31' ? 1 : 3 }));

  useEffect(() => {
    if (!isApiEnabled()) return undefined;
    fetchCustomerSites().then((result) => {
      setSites(result.items);
      const first = result.items[0];
      if (first) {
        setSiteId(first.id);
        setSiteName(`${first.name} — ${[first.district, first.province].filter(Boolean).join(', ')}`);
      }
    }).catch(() => undefined);
    return undefined;
  }, []);

  useEffect(() => {
    if (!isApiEnabled()) return undefined;
    let active = true;
    fetchCustomerAvailability(serviceCode, selectedDate, siteId).then((result) => {
      if (!active) return;
      setAvailability(result);
      const firstAvailable = result.slots.find((slot) => slot.available);
      setSelectedSlot(firstAvailable ? `${formatSlotClock(firstAvailable.start)}–${formatSlotClock(firstAvailable.end)}` : '');
    }).catch(() => { if (active) setAvailability(null); });
    return () => { active = false; };
  }, [fallbackSlots, selectedDate, serviceCode, siteId]);

  const requestSubmit = () => {
    if (!selectedSlot || (isApiEnabled() && !availability)) {
      notify('กรุณาเลือกวันและเวลาที่ว่างก่อนส่งคำขอ');
      return;
    }
    setConfirmOpen(true);
  };
  const submit = async () => {
    setSubmitting(true);
    const [requestedStart, requestedEnd] = selectedSlot.split('–').map((part) => part.trim());
    let created: Booking | null = null;
    if (isApiEnabled()) {
      try {
        const result = await submitCustomerBooking({ serviceCode, customerSiteId: siteId, requestedDate: selectedDate, requestedStart, requestedEnd, estimatedVolume: volume ? Number(volume) : undefined, volumeUnit, customerNote: customerNote || undefined });
        created = toUiBooking(result);
        setCreatedNumber(result.bookingNumber);
      } catch (error) {
        setSubmitting(false);
        notify(error instanceof Error ? error.message : 'ยังส่งคำขอไม่ได้ กรุณาลองใหม่');
        return;
      }
    } else {
      const number = `BK-${selectedDate.replaceAll('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      created = { id: number, customer: 'บริษัท ไทยรุ่งอุตสาหกรรม', service, site: siteName, date: selectedDate, start: requestedStart, end: requestedEnd, vehicle: 'ยังไม่จัดรถ', driver: 'ยังไม่จัดทีม', status: 'รอยืนยัน', stage: 'รอเริ่มงาน', sla: 'ปกติ', customerNote };
      setCreatedNumber(number);
    }
    if (created) onBookingCreated(created);
    setSubmitting(false);
    setConfirmOpen(false);
    setSubmitted(true);
    setSuccessOpen(true);
  };
  if (submitted) return <><section className="customer-confirmation"><div className="submitted-icon"><Check size={30} /></div><span className="customer-eyebrow">คำขอของคุณถูกส่งแล้ว</span><h1>ขอบคุณที่ไว้วางใจ Foresee</h1><p>หมายเลขคำขอ <b>{createdNumber}</b><br />ทีมงานกำลังตรวจสอบรถและจะติดต่อกลับเพื่อยืนยันภายใน 15 นาที</p><div><button className="primary-button" onClick={() => onNavigate('bookings')}>ดูการจองของฉัน <ArrowRight size={16} /></button><button className="secondary-button" onClick={() => { setSubmitted(false); setCreatedNumber(''); }}>สร้างการจองอีกครั้ง</button></div></section>{successOpen && <FeedbackModal variant="success" title="ส่งคำขอจองสำเร็จ" copy="เราได้รับคำขอแล้ว ทีม Foresee จะตรวจสอบรถและติดต่อกลับภายใน 15 นาที" confirmLabel="ดูรายละเอียดการจอง" onConfirm={() => { setSuccessOpen(false); onNavigate('bookings'); }} onClose={() => setSuccessOpen(false)} />}</>;

  return <>
    <section className="customer-hero"><div className="customer-hero-copy"><span className="customer-eyebrow">บริการสำหรับธุรกิจของคุณ</span><h1>จองรถบริการให้ตรงกับวันที่คุณสะดวก</h1><p>เลือกบริการ วัน และเวลาที่ว่างได้ด้วยตัวเอง ทีม Foresee พร้อมดูแลตั้งแต่ต้นจนจบ</p><div className="customer-trust-list"><span><Check size={15} /> เห็นคิวว่างแบบเรียลไทม์</span><span><Check size={15} /> ยืนยันคิวภายใน 15 นาที</span><span><Check size={15} /> มีทีมงานคอยดูแล</span></div></div><div className="customer-hero-art"><span className="hero-art-circle circle-one" /><span className="hero-art-circle circle-two" /><Truck size={92} strokeWidth={1.2} /><small>FORESEE ON THE WAY</small></div></section>
    <div className="customer-booking-layout">
      <section className="booking-form-panel customer-booking-main">
        <div className="customer-stepper"><span className="active"><b>1</b> บริการ</span><i /><span className="active"><b>2</b> วันและเวลา</span><i /><span><b>3</b> ยืนยัน</span></div>
        <section className="customer-section"><div className="customer-section-heading"><div><span className="customer-eyebrow">ขั้นตอนที่ 1</span><h2>เลือกบริการที่ต้องการ</h2><p>บริการที่เหมาะกับสถานประกอบการของคุณ</p></div><span className="required-note">* จำเป็น</span></div><div className="service-cards customer-service-cards">{services.map((item) => <button key={item.name} className={service === item.name ? `service-card customer-service-card selected ${item.tone}` : 'service-card customer-service-card'} onClick={() => { setService(item.name); setAvailability(null); }}><span className={`service-icon ${item.tone}`}>{item.icon}</span><span><b>{item.name}</b><small>{item.detail}</small><em>ดูรายละเอียดบริการ <ArrowRight size={12} /></em></span>{service === item.name && <Check size={18} />}</button>)}</div></section>
        <section className="customer-section customer-calendar-card"><div className="customer-section-heading"><div><span className="customer-eyebrow">ขั้นตอนที่ 2</span><h2>เลือกวันและเวลาที่สะดวก</h2><p>ดูภาพรวมทั้งเดือน แล้วเลือกวันที่มีคิวว่างได้ทันที</p></div><span className="required-note">* จำเป็น</span></div><div className="booking-month customer-calendar-toolbar"><button className="calendar-arrow" aria-label="เดือนก่อนหน้า" onClick={() => changeMonth(-1)}><ArrowLeft size={17} /></button><div><b>{monthLabel}</b><small>เลือกวันที่มีป้าย “ว่าง”</small></div><button className="calendar-arrow" aria-label="เดือนถัดไป" onClick={() => changeMonth(1)}><ArrowRight size={17} /></button></div><div className="availability-legend"><span><i className="legend-dot open" /> ว่าง</span><span><i className="legend-dot limited" /> เหลือคิวน้อย</span><span><i className="legend-dot closed" /> เต็ม / ปิด</span></div><div className="customer-month-calendar"><div className="customer-calendar-weekdays">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="customer-month-grid">{calendarCells.map((day) => <button key={day.key} disabled={!day.isCurrentMonth || day.tone === 'closed'} aria-label={day.isCurrentMonth ? `${day.day} ${day.state}` : undefined} className={`customer-month-cell ${day.tone} ${selectedDate === day.date ? 'selected' : ''}`} onClick={() => { setSelectedDate(day.date); setAvailability(null); setSelectedSlot(day.tone === 'limited' ? '13:00–15:30' : '09:00–11:30'); }}><span>{day.day}</span>{day.isCurrentMonth && <small>{day.state}</small>}</button>)}</div></div><div className="slot-area customer-slot-area"><div className="slot-heading"><div><span>ช่วงเวลาที่ว่าง · {formatThaiDate(selectedDate)}</span><small>{availability ? `รถพร้อมให้เลือก ${availability.capacity} คัน` : 'เลือกช่วงเวลาที่เหมาะกับคุณ'}</small></div><Clock3 size={21} /></div>{slots.length ? <label className="customer-time-select-wrap"><Clock3 size={21} aria-hidden="true" /><select className="customer-time-select" aria-label="เลือกช่วงเวลา" value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)}>{slots.map((slot) => <option key={slot.label} value={slot.label} disabled={!slot.available}>{slot.label} · {slot.available ? `เหลือ ${slot.remaining} คัน` : 'เต็มแล้ว'}</option>)}</select><ChevronDown size={17} aria-hidden="true" /></label> : <div className="empty-slot">วันนี้เต็มแล้ว ลองเลือกวันที่ใกล้เคียง</div>}</div></section>
        <section className="customer-section"><div className="customer-section-heading"><div><span className="customer-eyebrow">ขั้นตอนที่ 3</span><h2>บอกเราเกี่ยวกับสถานที่</h2><p>ข้อมูลนี้ช่วยให้ทีมเตรียมเส้นทางได้แม่นยำขึ้น</p></div><span className="required-note">* จำเป็น</span></div><label className="field-label customer-field-label">สถานที่ / ชื่อโรงงาน<div className="field-control"><MapPin size={17} />{sites.length ? <select value={siteId} onChange={(event) => { const next = sites.find((item) => item.id === event.target.value); setSiteId(event.target.value); if (next) setSiteName(`${next.name} — ${[next.district, next.province].filter(Boolean).join(', ')}`); }} aria-label="สถานที่ / ชื่อโรงงาน">{sites.map((item) => <option key={item.id} value={item.id}>{item.name} · {[item.district, item.province].filter(Boolean).join(', ')}</option>)}</select> : <input value={siteName} onChange={(event) => setSiteName(event.target.value)} readOnly={isApiEnabled()} />}</div></label><label className="field-label customer-field-label">ปริมาณโดยประมาณ <span>(ถ้ามี)</span><div className="inline-fields"><input value={volume} onChange={(event) => setVolume(event.target.value.replace(/[^0-9.]/g, ''))} placeholder="เช่น 8" inputMode="decimal" /><select value={volumeUnit} onChange={(event) => setVolumeUnit(event.target.value)}><option>ลบ.ม.</option><option>ตัน</option><option>เที่ยว</option></select></div></label><label className="field-label customer-field-label">หมายเหตุเพิ่มเติม <span>(ถ้ามี)</span><textarea value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} rows={3} placeholder="เช่น ต้องเข้าทางประตู 2, ติดต่อคุณ..." /></label></section>
      </section>
      <aside className="customer-summary"><section className="summary-card customer-summary-card"><span className="summary-kicker">สรุปการจอง</span><h2>พร้อมให้เราเข้าดูแล</h2><div className="summary-service"><span className="service-icon teal">≋</span><div><small>บริการที่เลือก</small><b>{service}</b></div></div><div className="summary-details"><div><span>วันเวลา</span><b>{formatThaiDate(selectedDate)}<br />{selectedSlot || 'ยังไม่ได้เลือก'}</b></div><div><span>สถานที่</span><b>{siteName || 'ยังไม่ได้เลือก'}</b></div></div><div className="summary-note"><ShieldCheck size={17} /><p>เราจะยืนยันรถและเวลาที่เหมาะสมให้ภายใน 15 นาที</p></div><button className="primary-button full-button customer-submit-button" onClick={requestSubmit}><span>ส่งคำขอจอง</span><ArrowRight size={18} /></button><small className="summary-footnote">ไม่มีค่าใช้จ่ายจนกว่าจะยืนยันงาน</small></section><section className="recent-card customer-recent-card"><div className="panel-head"><div><h3>การจองล่าสุด</h3><p>รายการที่กำลังดำเนินการ</p></div><em className="status-chip status-pending">{createdNumber ? 'รอยืนยัน' : 'พร้อมจอง'}</em></div><div className="recent-booking"><b>{createdNumber ? 'ใหม่' : '—'}</b><span>{createdNumber ? 'วันนี้' : ''}</span><div><strong>{createdNumber ? 'สร้างรายการล่าสุดแล้ว' : 'ยังไม่มีการจองใหม่'}</strong><small>{createdNumber || 'เลือกวันเวลาเพื่อเริ่มต้น'}</small></div></div><button className="quiet-button" onClick={() => onNavigate('bookings')}>ดูการจองของฉัน <ArrowRight size={15} /></button></section></aside>
    </div>
    {confirmOpen && <FeedbackModal variant="confirm" title="ยืนยันการจองนี้ไหม?" copy={`ขอจอง${service} วันที่ ${formatThaiDate(selectedDate)} เวลา ${selectedSlot}`} confirmLabel={submitting ? 'กำลังส่งคำขอ…' : 'ยืนยันและส่งคำขอ'} onConfirm={submit} onClose={() => { if (!submitting) setConfirmOpen(false); }} busy={submitting} />}
  </>;
}

function CustomerBookings({ bookings, onNavigate }: { bookings: Booking[]; onNavigate: (view: CustomerView) => void }) {
  const [tab, setTab] = useState<'active' | 'complete'>('active');
  const customerBookings = bookings.filter((item) => item.customer.includes('ไทยรุ่ง'));
  const activeBookings = customerBookings.filter((item) => item.stage !== 'เสร็จสิ้น');
  const completeBookings = customerBookings.filter((item) => item.stage === 'เสร็จสิ้น');
  const visibleBookings = tab === 'active' ? activeBookings : completeBookings;
  return <><PageHeader eyebrow="พอร์ทัลลูกค้า · ไทยรุ่งอุตสาหกรรม" title="การจองของฉัน" copy="ติดตาม Booking ปัจจุบันและประวัติการให้บริการ" action={<button className="primary-button" onClick={() => onNavigate('new-booking')}><Plus size={17} /> จองบริการใหม่</button>} /><div className="customer-status-tabs"><button className={tab === 'active' ? 'selected' : ''} onClick={() => setTab('active')}>กำลังดำเนินการ <em>{activeBookings.length}</em></button><button className={tab === 'complete' ? 'selected' : ''} onClick={() => setTab('complete')}>เสร็จสิ้น <em>{completeBookings.length}</em></button></div><section className="customer-booking-list">{visibleBookings.length ? visibleBookings.map((booking) => <article className="panel customer-booking-card" key={booking.id}><div className="customer-booking-top"><div><span>{booking.id}</span><h2>{booking.service}</h2><p><MapPin size={13} /> {booking.site}</p></div><em className={`status-chip ${statusClass[booking.status]}`}>{booking.status}</em></div><div className="customer-booking-meta"><span><CalendarDays size={14} /> {formatThaiDate(booking.date)}</span><span><Clock3 size={14} /> {booking.start}–{booking.end}</span><span><Truck size={14} /> {booking.vehicle}</span></div><div className="customer-progress"><div className="progress-label"><span>สถานะงาน</span><b>{booking.stage}</b></div><div className="progress-line"><i className={booking.stage === 'เสร็จสิ้น' ? 'complete' : 'active'} style={{ width: booking.stage === 'เสร็จสิ้น' ? '100%' : booking.stage === 'กำลังให้บริการ' ? '75%' : '38%' }} /></div></div><button className="quiet-button" onClick={() => onNavigate('new-booking')}>จองบริการอีกครั้ง <ArrowRight size={15} /></button></article>) : <div className="panel empty-state">ยังไม่มีรายการในหมวดนี้</div>}</section></>;
}

function CustomerCompany({ notify }: { notify: (message: string) => void }) { return <><PageHeader eyebrow="พอร์ทัลลูกค้า · การตั้งค่า" title="ข้อมูลบริษัท" copy="ข้อมูลนี้ใช้สำหรับการจองและเตรียมเส้นทางเข้าบริการ" /><section className="panel company-profile"><div className="profile-heading"><div className="company-badge">TR</div><div><h2>บริษัท ไทยรุ่งอุตสาหกรรม</h2><p>Customer organization · สมาชิก 3 คน</p></div><button className="secondary-button" onClick={() => notify('เปิดโหมดแก้ไขข้อมูลบริษัท')}>แก้ไขข้อมูล</button></div><div className="profile-fields"><div><span>เลขประจำตัวผู้เสียภาษี</span><b>0105560123456</b></div><div><span>ผู้ประสานงานหลัก</span><b>ธนกร รุ่งเรือง · 08x-xxx-xxxx</b></div><div><span>สถานที่เข้าบริการหลัก</span><b>โรงงาน ไทยรุ่ง — บางปะกง, ฉะเชิงเทรา</b></div><div><span>อีเมลแจ้งเตือน</span><b>contact@thairung.example</b></div></div></section></>; }
