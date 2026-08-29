import { useEffect, useMemo, useState } from 'react';
import { fetchOperationsBookings, isApiEnabled, submitCustomerBooking, watchOperationEvents, type ApiBooking } from './lib/api';
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
type CompanyView = 'overview' | 'bookings' | 'calendar' | 'fleet' | 'customers' | 'reports';
type CustomerView = 'new-booking' | 'bookings' | 'company';
type BookingStatus = 'รอยืนยัน' | 'ยืนยันแล้ว' | 'กำลังดำเนินการ' | 'เสร็จสิ้น';
type JobStage = 'รอเริ่มงาน' | 'กำลังเดินทาง' | 'ถึงหน้างาน' | 'กำลังให้บริการ' | 'เสร็จสิ้น';

type Booking = {
  id: string;
  customer: string;
  service: string;
  site: string;
  date: string;
  start: string;
  end: string;
  vehicle: string;
  driver: string;
  status: BookingStatus;
  stage: JobStage;
  sla: 'ปกติ' | 'ต้องติดตาม' | 'เกินกำหนด';
};

const seedBookings: Booking[] = [
  { id: 'BK-260829-018', customer: 'บริษัท ไทยรุ่งอุตสาหกรรม', service: 'ดูดบ่อดักไขมัน', site: 'บางปะกง, ฉะเชิงเทรา', date: '2026-08-29', start: '09:00', end: '11:30', vehicle: 'รถดูดสูญญากาศ 10 ลบ.ม.', driver: 'สมชาย ใจดี', status: 'กำลังดำเนินการ', stage: 'กำลังให้บริการ', sla: 'ปกติ' },
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
];

const statusClass: Record<BookingStatus, string> = {
  'รอยืนยัน': 'status-pending',
  'ยืนยันแล้ว': 'status-confirmed',
  'กำลังดำเนินการ': 'status-progress',
  'เสร็จสิ้น': 'status-complete',
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
  const statuses: Record<string, BookingStatus> = { PENDING_CONFIRMATION: 'รอยืนยัน', CONFIRMED: 'ยืนยันแล้ว', REJECTED: 'รอยืนยัน', CANCELLED: 'เสร็จสิ้น' };
  const stages: Record<string, JobStage> = { SCHEDULED: 'รอเริ่มงาน', EN_ROUTE: 'กำลังเดินทาง', ARRIVED: 'ถึงหน้างาน', IN_SERVICE: 'กำลังให้บริการ', COMPLETED: 'เสร็จสิ้น' };
  const status = item.jobStage === 'IN_SERVICE' ? 'กำลังดำเนินการ' : item.jobStage === 'COMPLETED' ? 'เสร็จสิ้น' : statuses[item.bookingStatus] ?? 'ยืนยันแล้ว';
  return { id: item.bookingNumber, customer: item.customer ?? 'ไม่ระบุลูกค้า', service: item.service ?? 'ไม่ระบุบริการ', site: item.site ?? 'ไม่ระบุสถานที่', date: thaiDate, start: clock(start), end: clock(end), vehicle: item.vehicle ?? 'ยังไม่จัดรถ', driver: item.vehicle ? 'ทีมภาคสนาม' : 'ยังไม่จัดทีม', status, stage: stages[item.jobStage] ?? 'รอเริ่มงาน', sla: item.slaHealth === 'OVERDUE' ? 'เกินกำหนด' : item.slaHealth === 'AT_RISK' ? 'ต้องติดตาม' : 'ปกติ' };
}

export default function App() {
  const [portal, setPortal] = useState<Portal>('company');
  const [companyView, setCompanyView] = useState<CompanyView>('overview');
  const [customerView, setCustomerView] = useState<CustomerView>('new-booking');
  const [bookings, setBookings] = useState(seedBookings);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isApiEnabled()) return undefined;
    let mounted = true;
    const refresh = () => fetchOperationsBookings().then((result) => { if (mounted && result.items.length) setBookings(result.items.map(toUiBooking)); }).catch(() => undefined);
    refresh();
    const stop = watchOperationEvents(refresh);
    return () => { mounted = false; stop(); };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const switchPortal = (value: Portal) => {
    setPortal(value);
    setSelectedBooking(null);
    if (value === 'company') setCompanyView('overview');
    if (value === 'customer') setCustomerView('new-booking');
  };

  const updateBooking = (booking: Booking) => {
    setBookings((current) => current.map((item) => (item.id === booking.id ? booking : item)));
    setSelectedBooking(booking);
    notify(`อัปเดต ${booking.id} แล้ว`);
  };

  return (
    <div className="platform-shell">
      {portal === 'company' ? (
        <CompanyPortal
          view={companyView}
          bookings={bookings}
          selectedBooking={selectedBooking}
          onNavigate={setCompanyView}
          onSelectBooking={setSelectedBooking}
          onUpdateBooking={updateBooking}
          onSwitchPortal={switchPortal}
          notify={notify}
        />
      ) : (
        <CustomerPortal
          view={customerView}
          bookings={bookings}
          onNavigate={setCustomerView}
          onSwitchPortal={switchPortal}
          notify={notify}
        />
      )}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

function CompanyPortal({
  view,
  bookings,
  selectedBooking,
  onNavigate,
  onSelectBooking,
  onUpdateBooking,
  onSwitchPortal,
  notify,
}: {
  view: CompanyView;
  bookings: Booking[];
  selectedBooking: Booking | null;
  onNavigate: (view: CompanyView) => void;
  onSelectBooking: (booking: Booking | null) => void;
  onUpdateBooking: (booking: Booking) => void;
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
          {companyNav.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate(item.id)}><Icon size={17} /><span>{item.label}</span>{item.count && <em>{item.count}</em>}</button>; })}
        </nav>
        <div className="nav-caption nav-caption-gap">จัดการระบบ</div>
        <nav className="side-nav"><button className="nav-link" onClick={() => notify('ตั้งค่าระบบจะเปิดในเวอร์ชันถัดไป')}><Settings2 size={17} /><span>ตั้งค่าระบบ</span></button><button className="nav-link" onClick={() => notify('ศูนย์ช่วยเหลือพร้อมให้บริการ')}><ShieldCheck size={17} /><span>ช่วยเหลือ</span></button></nav>
        <div className="sidebar-bottom"><div className="support-box"><span><ShieldCheck size={16} /></span><div><b>ระบบทำงานปกติ</b><small>อัปเดตล่าสุดเมื่อ 10:42 น.</small></div></div><div className="account"><div className="avatar avatar-gold">อน</div><div><b>อนุชา วัฒนกุล</b><small>Owner</small></div><MoreHorizontal size={17} /></div></div>
      </aside>
      <main className="main-pane">
        <header className="topbar"><button className="mobile-menu" aria-label="เปิดเมนู"><Menu size={20} /></button><div className="breadcrumbs"><span>ศูนย์ปฏิบัติการ</span><b>/</b><strong>{companyNav.find((item) => item.id === view)?.label}</strong></div><div className="topbar-actions"><div className="live-indicator"><i />ข้อมูลอัปเดตสด</div><PortalSwitcher portal="company" onChange={onSwitchPortal} /><button className="icon-button" aria-label="ค้นหา" onClick={() => notify('ค้นหาได้จากหน้า Booking Monitor')}><Search size={17} /></button><button className="icon-button has-notification" aria-label="การแจ้งเตือน" onClick={() => notify('มี 2 รายการที่ต้องติดตาม')}><Bell size={17} /></button></div></header>
        <div className="content-area">
          {view === 'overview' && <CompanyOverview bookings={bookings} onSelectBooking={onSelectBooking} onNavigate={onNavigate} notify={notify} />}
          {view === 'bookings' && <BookingMonitor bookings={bookings} onSelectBooking={onSelectBooking} onNavigate={onNavigate} />}
          {view === 'calendar' && <OperationsCalendar bookings={bookings} onSelectBooking={onSelectBooking} onUpdateBooking={onUpdateBooking} notify={notify} />}
          {view === 'fleet' && <FleetView bookings={bookings} notify={notify} />}
          {view === 'customers' && <CustomersView bookings={bookings} onSelectBooking={onSelectBooking} />}
          {view === 'reports' && <ReportsView bookings={bookings} />}
        </div>
      </main>
      {selectedBooking && <BookingDrawer booking={selectedBooking} onClose={() => onSelectBooking(null)} onUpdate={onUpdateBooking} />}
    </div>
  );
}

function PortalSwitcher({ portal, onChange }: { portal: Portal; onChange: (portal: Portal) => void }) {
  return <label className="portal-switcher"><span>มุมมอง</span><select value={portal} onChange={(event) => onChange(event.target.value as Portal)} aria-label="เลือกมุมมอง"><option value="company">ฝั่งบริษัท</option><option value="customer">ฝั่งผู้จอง</option></select><ChevronDown size={13} /></label>;
}

function CompanyOverview({ bookings, onSelectBooking, onNavigate, notify }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void; onNavigate: (view: CompanyView) => void; notify: (message: string) => void }) {
  const today = bookings.filter((item) => item.date === '2026-08-29');
  const unassigned = bookings.filter((item) => item.vehicle === 'ยังไม่จัดรถ');
  const atRisk = bookings.filter((item) => item.sla !== 'ปกติ');
  return <>
    <PageHeader eyebrow="วันเสาร์ที่ 29 สิงหาคม 2569 · อัปเดตล่าสุด 10:42 น." title="การดำเนินงานวันนี้" copy="ติดตาม Booking และทีมภาคสนามจากจุดเดียว" action={<button className="primary-button" onClick={() => onNavigate('bookings')}><Plus size={17} /> สร้างการจอง</button>} />
    <div className="toolbar"><div className="toolbar-search"><Search size={16} /><input placeholder="ค้นหาเลข Booking, ลูกค้า หรือสถานที่" /></div><button className="filter-button" onClick={() => notify('ตัวกรองพร้อมใช้งานในหน้า Booking Monitor')}><Filter size={15} /> ตัวกรอง</button><button className="date-button"><CalendarDays size={15} /> 29 ส.ค. 2569 <ChevronDown size={14} /></button></div>
    <div className="metric-strip"><Metric label="งานวันนี้" value={String(today.length).padStart(2, '0')} note="Booking ทั้งหมด" tone="teal" icon={<CalendarDays size={17} />} /><Metric label="กำลังดำเนินการ" value="08" note="จาก 24 งาน" tone="amber" icon={<Clock3 size={17} />} /><Metric label="ยังไม่จัดรถ" value={String(unassigned.length).padStart(2, '0')} note="ต้องจัดคิว" tone="blue" icon={<Truck size={17} />} /><Metric label="ต้องติดตาม" value={String(atRisk.length).padStart(2, '0')} note="SLA / conflict" tone="rose" icon={<AlertTriangle size={17} />} /></div>
    <div className="section-heading"><div><h2>งานวันนี้</h2><p>คลิก Booking เพื่อดูรายละเอียดและ timeline</p></div><button className="quiet-button" onClick={() => onNavigate('bookings')}>ดูทั้งหมด <ArrowRight size={15} /></button></div>
    <div className="split-layout"><section className="panel table-panel"><div className="panel-head"><div className="head-title"><span className="live-dot" /> Live operations</div><button className="icon-button small" onClick={() => notify('ตั้งค่าการแสดงผลในเวอร์ชันถัดไป')}><MoreHorizontal size={16} /></button></div><BookingTable bookings={today} onSelectBooking={onSelectBooking} compact /></section><aside className="side-stack"><AttentionPanel bookings={atRisk} onSelectBooking={onSelectBooking} /><CapacityPanel bookings={bookings} /></aside></div>
    <section className="panel activity-panel"><div className="panel-head"><div><h3>กิจกรรมล่าสุด</h3><p>ความเคลื่อนไหวจากทีมและระบบ</p></div><button className="quiet-button" onClick={() => notify('เปิดประวัติกิจกรรมทั้งหมด')}>ดูทั้งหมด <ArrowRight size={15} /></button></div><div className="activity-grid"><Activity name="สมชาย ใจดี" text="เปลี่ยนสถานะเป็น กำลังให้บริการ" time="4 นาทีที่แล้ว" tone="teal" /><Activity name="วิชัย พรหมรักษา" text="เริ่มเดินทางไป มาบตาพุด, ระยอง" time="18 นาทีที่แล้ว" tone="amber" /><Activity name="ระบบ" text="มีคำขอจองใหม่จาก นอร์ทสตาร์ ฟู้ดส์" time="32 นาทีที่แล้ว" tone="violet" /></div></section>
  </>;
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function Metric({ label, value, note, tone, icon }: { label: string; value: string; note: string; tone: string; icon: React.ReactNode }) {
  return <div className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>;
}

function BookingMonitor({ bookings, onSelectBooking, onNavigate }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void; onNavigate: (view: CompanyView) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ทั้งหมด');
  const filtered = useMemo(() => bookings.filter((item) => {
    const matchQuery = `${item.id} ${item.customer} ${item.site}`.toLowerCase().includes(query.toLowerCase());
    return matchQuery && (status === 'ทั้งหมด' || item.status === status);
  }), [bookings, query, status]);
  return <>
    <PageHeader eyebrow="Company Operations Center · Booking Monitor" title="การจองทั้งหมด" copy="ค้นหา ตรวจสอบ และจัดการทุก Booking ของ Foresee" action={<button className="primary-button" onClick={() => onNavigate('calendar')}><CalendarDays size={17} /> เปิดปฏิทินจัดคิว</button>} />
    <div className="panel monitor-panel"><div className="monitor-toolbar"><div className="toolbar-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลข Booking, ลูกค้า หรือสถานที่" /></div><select className="select-control" value={status} onChange={(event) => setStatus(event.target.value)}><option>ทั้งหมด</option><option>รอยืนยัน</option><option>ยืนยันแล้ว</option><option>กำลังดำเนินการ</option><option>เสร็จสิ้น</option></select><button className="filter-button"><ListFilter size={15} /> ตัวกรองเพิ่มเติม</button><button className="icon-button small"><MoreHorizontal size={16} /></button></div><div className="table-meta"><span>แสดง {filtered.length} จาก {bookings.length} รายการ</span><span>อัปเดตสด <i className="live-dot" /></span></div><BookingTable bookings={filtered} onSelectBooking={onSelectBooking} /></div>
  </>;
}

function BookingTable({ bookings, onSelectBooking, compact = false }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void; compact?: boolean }) {
  return <div className={compact ? 'data-table compact' : 'data-table'}><div className="table-row table-header"><span>Booking / ลูกค้า</span><span>บริการและสถานที่</span><span>วันเวลา</span><span>สถานะ</span><span>SLA</span><span /></div>{bookings.map((booking) => <button className="table-row table-data" key={booking.id} onClick={() => onSelectBooking(booking)}><span><b>{booking.id}</b><small>{booking.customer}</small></span><span><b>{booking.service}</b><small><MapPin size={12} /> {booking.site}</small></span><span><b>{formatThaiDate(booking.date)}</b><small><Clock3 size={12} /> {booking.start}–{booking.end}</small></span><span><em className={`status-chip ${statusClass[booking.status]}`}>{booking.status}</em><small className={`stage-label ${stageClass[booking.stage]}`}>{booking.stage}</small></span><span><em className={booking.sla === 'ปกติ' ? 'sla-ok' : 'sla-alert'}>{booking.sla}</em></span><ArrowRight className="row-arrow" size={16} /></button>)}{bookings.length === 0 && <div className="empty-table">ไม่พบ Booking ที่ตรงกับตัวกรอง</div>}</div>;
}

function AttentionPanel({ bookings, onSelectBooking }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void }) {
  return <section className="panel attention-panel"><div className="panel-head"><div><h3>ต้องติดตาม</h3><p>งานที่ควรจัดการก่อน</p></div><span className="count-badge">{bookings.length}</span></div>{bookings.length === 0 ? <div className="empty-mini">ไม่มีรายการเร่งด่วน</div> : <div className="attention-list">{bookings.map((booking) => <button key={booking.id} onClick={() => onSelectBooking(booking)}><span className="attention-icon"><AlertTriangle size={14} /></span><span><b>{booking.customer}</b><small>{booking.id} · {booking.sla}</small></span><ArrowRight size={14} /></button>)}</div>}</section>;
}

function CapacityPanel({ bookings }: { bookings: Booking[] }) {
  const dayCounts = ['29', '30', '31', '1', '2'].map((day, index) => ({ day, count: bookings.filter((booking) => booking.date === ['2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02'][index]).length }));
  return <section className="panel capacity-panel"><div className="panel-head"><div><h3>Capacity สัปดาห์นี้</h3><p>จำนวนงานที่วางไว้ในแต่ละวัน</p></div><CalendarDays size={16} className="muted-icon" /></div><div className="capacity-bars">{dayCounts.map((item, index) => <div key={`${item.day}-${index}`}><span>{item.day}</span><div className="bar-track"><i style={{ width: `${Math.min(100, 24 + item.count * 20)}%` }} /></div><b>{item.count}</b></div>)}</div><small className="capacity-note"><i /> มีพื้นที่รองรับในวันพรุ่งนี้</small></section>;
}

function Activity({ name, text, time, tone }: { name: string; text: string; time: string; tone: string }) {
  return <div className="activity-item"><div className={`avatar avatar-${tone}`}>{name.slice(0, 2)}</div><div><p><b>{name}</b> {text}</p><small>{time}</small></div></div>;
}

function OperationsCalendar({ bookings, onSelectBooking, onUpdateBooking, notify }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void; onUpdateBooking: (booking: Booking) => void; notify: (message: string) => void }) {
  const [selectedDate, setSelectedDate] = useState('2026-08-29');
  const [calendarMode, setCalendarMode] = useState<'week' | 'day'>('week');
  const week = ['2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02'];
  const resources = ['รถดูดสูญญากาศ 10 ลบ.ม.', 'รถขนกากอุตสาหกรรม', 'รถดูดตะกอน 6 ลบ.ม.', 'รถบรรทุกน้ำ 12 ลบ.ม.'];
  const selectedBookings = bookings.filter((booking) => booking.date === selectedDate);
  const assignable = bookings.find((booking) => booking.vehicle === 'ยังไม่จัดรถ');
  return <>
    <PageHeader eyebrow="Company Operations Center · Scheduling" title="ปฏิทินและจัดคิว" copy="ดู capacity ทั้งสัปดาห์ แล้วจัดรถจากมุมมองรายวัน" action={<button className="primary-button" onClick={() => notify('ช่องสร้าง Booking จะเปิดจาก Booking Monitor')}><Plus size={17} /> สร้างการจอง</button>} />
    <div className="calendar-toolbar"><div className="date-navigation"><button className="icon-button small"><ArrowLeft size={16} /></button><button className="today-button" onClick={() => setSelectedDate('2026-08-29')}>วันนี้</button><button className="icon-button small"><ArrowRight size={16} /></button><b>29 ส.ค. – 2 ก.ย. 2569</b></div><div className="view-switch"><button className={calendarMode === 'week' ? 'selected' : ''} onClick={() => setCalendarMode('week')}>Week capacity</button><button className={calendarMode === 'day' ? 'selected' : ''} onClick={() => setCalendarMode('day')}>Day dispatch</button></div><button className="filter-button"><Filter size={15} /> กรอง</button></div>
    {calendarMode === 'week' ? <section className="panel week-capacity"><div className="week-grid">{week.map((date) => { const dateBookings = bookings.filter((booking) => booking.date === date); const isSelected = selectedDate === date; return <button key={date} className={isSelected ? 'week-day selected' : 'week-day'} onClick={() => { setSelectedDate(date); setCalendarMode('day'); }}><span>{new Intl.DateTimeFormat('th-TH', { weekday: 'short' }).format(new Date(`${date}T00:00:00`))}</span><b>{new Intl.DateTimeFormat('th-TH', { day: 'numeric' }).format(new Date(`${date}T00:00:00`))}</b><small>{dateBookings.length} งาน</small><div className="day-capacity"><i style={{ width: `${Math.min(100, 18 + dateBookings.length * 23)}%` }} /></div><em>{dateBookings.filter((booking) => booking.vehicle === 'ยังไม่จัดรถ').length ? `${dateBookings.filter((booking) => booking.vehicle === 'ยังไม่จัดรถ').length} ยังไม่จัดรถ` : 'มีพื้นที่ว่าง'}</em></button>; })}</div></section> : <DayDispatch date={selectedDate} bookings={selectedBookings} resources={resources} unassigned={assignable} onSelectBooking={onSelectBooking} onUpdateBooking={onUpdateBooking} notify={notify} />}
    {calendarMode === 'week' && <div className="calendar-hint"><CalendarDays size={16} /><span>เลือกวันที่เพื่อเปิด Day dispatch และจัดรถตามช่วงเวลา</span></div>}
  </>;
}

function DayDispatch({ date, bookings, resources, unassigned, onSelectBooking, onUpdateBooking, notify }: { date: string; bookings: Booking[]; resources: string[]; unassigned?: Booking; onSelectBooking: (booking: Booking) => void; onUpdateBooking: (booking: Booking) => void; notify: (message: string) => void }) {
  const slots = ['09:00–11:30', '13:00–15:30', '15:30–18:00'];
  return <section className="panel dispatch-panel"><div className="panel-head"><div><h3>จัดคิวรายวัน · {formatThaiDate(date)}</h3><p>เลือก Booking เพื่อดูรายละเอียด · ยังไม่ใช้ drag-and-drop เป็น action หลัก</p></div><span className="dispatch-summary">{bookings.length} งานในวันนี้</span></div>{unassigned && <div className="unassigned-banner"><span><AlertTriangle size={15} /> ยังไม่จัดรถ</span><b>{unassigned.id} · {unassigned.customer}</b><button onClick={() => onUpdateBooking({ ...unassigned, vehicle: 'รถดูดสูญญากาศ 10 ลบ.ม.', driver: 'สมชาย ใจดี', status: 'ยืนยันแล้ว' })}>จัดรถให้รายการนี้</button></div>}<div className="dispatch-grid"><div className="resource-head">ทรัพยากร / เวลา</div>{slots.map((slot) => <div className="slot-head" key={slot}>{slot}</div>)}{resources.map((resource) => <div className="dispatch-row" key={resource}><div className="resource-name"><Truck size={15} /><span>{resource}</span></div>{slots.map((slot) => { const [start] = slot.split('–'); const booking = bookings.find((item) => item.vehicle === resource && item.start === start); return <button className={booking ? 'dispatch-cell filled' : 'dispatch-cell'} key={`${resource}-${slot}`} onClick={() => booking ? onSelectBooking(booking) : notify(`ยังไม่มีงานใน ${slot}`)}>{booking ? <><b>{booking.customer}</b><small>{booking.service}</small><em className={`stage-label ${stageClass[booking.stage]}`}>{booking.stage}</em></> : <span>ว่าง</span>}</button>; })}</div>)}</div></section>;
}

function FleetView({ bookings, notify }: { bookings: Booking[]; notify: (message: string) => void }) {
  const fleet = [{ name: 'รถดูดสูญญากาศ 10 ลบ.ม.', type: 'รถดูดสูญญากาศ', status: 'กำลังใช้งาน', next: 'BK-260829-018', tone: 'teal' }, { name: 'รถขนกากอุตสาหกรรม', type: 'รถขนส่งกาก', status: 'ว่าง', next: 'BK-260829-019', tone: 'amber' }, { name: 'รถดูดตะกอน 6 ลบ.ม.', type: 'รถดูดตะกอน', status: 'กำลังใช้งาน', next: 'BK-260829-020', tone: 'blue' }, { name: 'รถบรรทุกน้ำ 12 ลบ.ม.', type: 'รถบรรทุกน้ำ', status: 'ว่าง', next: 'พรุ่งนี้ 09:00', tone: 'violet' }, { name: 'รถดูดสูญญากาศ 6 ลบ.ม.', type: 'รถดูดสูญญากาศ', status: 'ซ่อมบำรุง', next: 'กลับมา 2 ก.ย.', tone: 'rose' }];
  return <><PageHeader eyebrow="Company Operations Center · Fleet" title="รถและทีมงาน" copy="ตรวจความพร้อมและตารางงานของทุกทรัพยากร" action={<button className="primary-button" onClick={() => notify('ฟอร์มเพิ่มรถจะเปิดในเวอร์ชันถัดไป')}><Plus size={17} /> เพิ่มรถ</button>} /><div className="fleet-summary"><Metric label="รถทั้งหมด" value="18" note="คันในระบบ" tone="teal" icon={<Truck size={17} />} /><Metric label="พร้อมใช้งาน" value="12" note="66% ของ fleet" tone="blue" icon={<Check size={17} />} /><Metric label="กำลังใช้งาน" value="04" note="ในงานวันนี้" tone="amber" icon={<Clock3 size={17} />} /><Metric label="ซ่อมบำรุง" value="02" note="มีตารางซ่อม" tone="rose" icon={<Settings2 size={17} />} /></div><section className="panel fleet-table-panel"><div className="panel-head"><div><h3>สถานะรถ</h3><p>อัปเดตตาม Booking และ maintenance schedule</p></div><button className="filter-button"><Filter size={15} /> ตัวกรอง</button></div><div className="fleet-grid">{fleet.map((item) => <div className="fleet-card" key={item.name}><div className={`fleet-symbol ${item.tone}`}><Truck size={20} /></div><div className="fleet-card-main"><b>{item.name}</b><small>{item.type}</small><span>งานถัดไป: {item.next}</span></div><div><em className={`fleet-status ${item.status === 'ว่าง' ? 'fleet-available' : item.status === 'ซ่อมบำรุง' ? 'fleet-maintenance' : 'fleet-busy'}`}>{item.status}</em><button className="icon-button small" onClick={() => notify(`เปิดรายละเอียด ${item.name}`)}><MoreHorizontal size={16} /></button></div></div>)}</div></section><section className="panel fleet-note"><AlertTriangle size={16} /><span>มีรถ 1 คันที่ต้องตรวจสอบ maintenance schedule ก่อนจัดคิววันที่ 2 ก.ย.</span><button className="quiet-button" onClick={() => notify('เปิด maintenance schedule')}>ดูรายละเอียด <ArrowRight size={15} /></button></section><span className="sr-only">มีข้อมูล Booking {bookings.length} รายการ</span></>;
}

function CustomersView({ bookings, onSelectBooking }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void }) {
  const customers = Array.from(new Set(bookings.map((item) => item.customer))).map((name) => ({ name, count: bookings.filter((item) => item.customer === name).length, last: bookings.find((item) => item.customer === name)?.date ?? '' }));
  return <><PageHeader eyebrow="Company Operations Center · Customers" title="ลูกค้า" copy="ดูองค์กรลูกค้า สถานที่ และประวัติ Booking" action={<button className="primary-button"><Plus size={17} /> เพิ่มลูกค้า</button>} /><section className="panel monitor-panel"><div className="monitor-toolbar"><div className="toolbar-search"><Search size={16} /><input placeholder="ค้นหาชื่อลูกค้าหรือสถานที่" /></div><button className="filter-button"><Filter size={15} /> ตัวกรอง</button></div><div className="customer-list">{customers.map((customer) => <button key={customer.name} className="customer-row" onClick={() => { const booking = bookings.find((item) => item.customer === customer.name); if (booking) onSelectBooking(booking); }}><div className="avatar avatar-teal">{customer.name.slice(0, 2)}</div><div><b>{customer.name}</b><small>มี {customer.count} Booking · อัปเดต {formatThaiDate(customer.last)}</small></div><ArrowRight size={16} /></button>)}</div></section></>;
}

function ReportsView({ bookings }: { bookings: Booking[] }) {
  return <><PageHeader eyebrow="Company Operations Center · Reports" title="รายงานปฏิบัติการ" copy="สรุปผลจาก Booking และการใช้ fleet" action={<button className="secondary-button"><FileText size={16} /> ส่งออก CSV</button>} /><div className="report-grid"><section className="panel report-panel"><div className="panel-head"><div><h3>Booking ตามสถานะ</h3><p>ข้อมูลจากชุดที่เลือกในระบบ</p></div><span>ส.ค. 2569</span></div><div className="report-bars"><ReportBar label="เสร็จสิ้น" value={bookings.filter((b) => b.status === 'เสร็จสิ้น').length} max={7} tone="green" /><ReportBar label="กำลังดำเนินการ" value={bookings.filter((b) => b.status === 'กำลังดำเนินการ').length} max={7} tone="teal" /><ReportBar label="ยืนยันแล้ว" value={bookings.filter((b) => b.status === 'ยืนยันแล้ว').length} max={7} tone="blue" /><ReportBar label="รอยืนยัน" value={bookings.filter((b) => b.status === 'รอยืนยัน').length} max={7} tone="amber" /></div></section><section className="panel report-panel"><div className="panel-head"><div><h3>SLA health</h3><p>งานที่ต้องติดตาม</p></div><ShieldCheck size={17} className="success-icon" /></div><div className="sla-overview"><strong>{bookings.filter((b) => b.sla === 'ปกติ').length}</strong><span>จาก {bookings.length} งานอยู่ในเกณฑ์ปกติ</span></div><div className="mini-progress"><i style={{ width: `${(bookings.filter((b) => b.sla === 'ปกติ').length / bookings.length) * 100}%` }} /></div></section></div></>;
}

function ReportBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) { return <div className="report-bar"><span>{label}</span><div><i className={tone} style={{ width: `${Math.max(8, (value / max) * 100)}%` }} /></div><b>{value}</b></div>; }

function BookingDrawer({ booking, onClose, onUpdate }: { booking: Booking; onClose: () => void; onUpdate: (booking: Booking) => void }) {
  const advanceStage = () => {
    const next: Record<JobStage, JobStage> = { 'รอเริ่มงาน': 'กำลังเดินทาง', 'กำลังเดินทาง': 'ถึงหน้างาน', 'ถึงหน้างาน': 'กำลังให้บริการ', 'กำลังให้บริการ': 'เสร็จสิ้น', 'เสร็จสิ้น': 'เสร็จสิ้น' };
    const nextStage = next[booking.stage];
    onUpdate({ ...booking, stage: nextStage, status: nextStage === 'เสร็จสิ้น' ? 'เสร็จสิ้น' : nextStage === 'รอเริ่มงาน' ? booking.status : 'กำลังดำเนินการ' });
  };
  return <div className="drawer-layer" role="presentation" onMouseDown={onClose}><aside className="detail-drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-header"><div><span className="eyebrow">Booking detail</span><h2>{booking.id}</h2><p>อัปเดตล่าสุดเมื่อ 4 นาทีที่แล้ว</p></div><button className="icon-button" onClick={onClose} aria-label="ปิด"><X size={18} /></button></div><div className="drawer-status"><em className={`status-chip ${statusClass[booking.status]}`}>{booking.status}</em><em className={`stage-label ${stageClass[booking.stage]}`}>{booking.stage}</em><span className={booking.sla === 'ปกติ' ? 'sla-ok' : 'sla-alert'}>{booking.sla}</span></div><section className="drawer-section"><h3>รายละเอียดงาน</h3><DetailLine icon={<Users size={15} />} label="ลูกค้า" value={booking.customer} /><DetailLine icon={<FileText size={15} />} label="บริการ" value={booking.service} /><DetailLine icon={<MapPin size={15} />} label="สถานที่" value={booking.site} /><DetailLine icon={<CalendarDays size={15} />} label="วันเวลา" value={`${formatThaiDate(booking.date)} · ${booking.start}–${booking.end}`} /></section><section className="drawer-section"><h3>รถและทีม</h3><DetailLine icon={<Truck size={15} />} label="รถ" value={booking.vehicle} /><DetailLine icon={<UserRound size={15} />} label="ผู้รับผิดชอบ" value={booking.driver} /></section><section className="drawer-section"><h3>Workflow timeline</h3><TimelineItem label="สร้างคำขอจอง" time="28 ส.ค. · 16:12" done /><TimelineItem label="ยืนยันคิว" time="28 ส.ค. · 16:27" done={booking.status !== 'รอยืนยัน'} /><TimelineItem label="เริ่มปฏิบัติงาน" time={booking.stage === 'รอเริ่มงาน' ? 'รอดำเนินการ' : 'วันนี้ · 09:04'} done={['กำลังเดินทาง', 'ถึงหน้างาน', 'กำลังให้บริการ', 'เสร็จสิ้น'].includes(booking.stage)} /><TimelineItem label="เสร็จสิ้นและส่งหลักฐาน" time={booking.stage === 'เสร็จสิ้น' ? 'วันนี้ · 11:18' : 'รอดำเนินการ'} done={booking.stage === 'เสร็จสิ้น'} /></section><div className="drawer-actions">{booking.stage !== 'เสร็จสิ้น' && <button className="primary-button" onClick={advanceStage}><Check size={16} /> อัปเดตขั้นตอนถัดไป</button>}<button className="secondary-button" onClick={onClose}>ปิดรายละเอียด</button></div></aside></div>;
}

function DetailLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="detail-line"><span>{icon}{label}</span><b>{value}</b></div>; }
function TimelineItem({ label, time, done }: { label: string; time: string; done: boolean }) { return <div className={done ? 'timeline-item done' : 'timeline-item'}><i>{done && <Check size={10} />}</i><span><b>{label}</b><small>{time}</small></span></div>; }

function CustomerPortal({ view, bookings, onNavigate, onSwitchPortal, notify }: { view: CustomerView; bookings: Booking[]; onNavigate: (view: CustomerView) => void; onSwitchPortal: (portal: Portal) => void; notify: (message: string) => void }) {
  return <div className="app-frame customer-frame"><aside className="sidebar customer-sidebar"><div className="brand-lockup"><div className="brand-mark">F</div><div><strong>FORESEE</strong><span>CORPORATION</span></div></div><div className="workspace"><div className="workspace-avatar customer-avatar">TR</div><div><b>ไทยรุ่งอุตสาหกรรม</b><span>พอร์ทัลลูกค้า</span></div><ChevronDown size={15} /></div><div className="nav-caption">เมนูลูกค้า</div><nav className="side-nav"><button className={view === 'new-booking' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('new-booking')}><Plus size={17} /><span>จองบริการ</span></button><button className={view === 'bookings' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('bookings')}><FileText size={17} /><span>การจองของฉัน</span><em>3</em></button><button className={view === 'company' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('company')}><Users size={17} /><span>ข้อมูลบริษัท</span></button></nav><div className="sidebar-bottom"><div className="support-box"><span><ShieldCheck size={16} /></span><div><b>ต้องการความช่วยเหลือ?</b><small>ทีม Foresee พร้อมดูแล</small></div></div><div className="account"><div className="avatar avatar-gold">ทร</div><div><b>ธนกร รุ่งเรือง</b><small>ผู้ประสานงาน</small></div><MoreHorizontal size={17} /></div></div></aside><main className="main-pane"><header className="topbar"><button className="mobile-menu" aria-label="เปิดเมนู"><Menu size={20} /></button><div className="breadcrumbs"><span>พอร์ทัลลูกค้า</span><b>/</b><strong>{view === 'new-booking' ? 'จองบริการ' : view === 'bookings' ? 'การจองของฉัน' : 'ข้อมูลบริษัท'}</strong></div><div className="topbar-actions"><span className="help-text">ต้องการความช่วยเหลือ? <button onClick={() => notify('ทีม Foresee จะติดต่อกลับในไม่ช้า')}>ติดต่อเรา</button></span><PortalSwitcher portal="customer" onChange={onSwitchPortal} /><button className="icon-button has-notification" aria-label="การแจ้งเตือน" onClick={() => notify('มีการอัปเดต Booking 1 รายการ')}><Bell size={17} /></button></div></header><div className="content-area customer-content">{view === 'new-booking' && <CustomerNewBooking notify={notify} onNavigate={onNavigate} />}{view === 'bookings' && <CustomerBookings bookings={bookings} onNavigate={onNavigate} />}{view === 'company' && <CustomerCompany notify={notify} />}</div></main></div>;
}

function CustomerNewBooking({ notify, onNavigate }: { notify: (message: string) => void; onNavigate: (view: CustomerView) => void }) {
  const [service, setService] = useState('ดูดบ่อดักไขมัน');
  const [selectedDate, setSelectedDate] = useState('2026-09-01');
  const [selectedSlot, setSelectedSlot] = useState('09:00–11:30');
  const [submitted, setSubmitted] = useState(false);
  const services = [{ name: 'ดูดบ่อดักไขมัน', detail: 'รถดูดสูญญากาศ', icon: '≋', tone: 'teal' }, { name: 'ขนส่งกากอุตสาหกรรม', detail: 'รถขนกากมาตรฐาน', icon: '▱', tone: 'amber' }, { name: 'ล้างบ่อบำบัดน้ำเสีย', detail: 'รถดูดตะกอน', icon: '✧', tone: 'violet' }];
  const days = [{ date: '2026-08-31', label: 'จ. 31', state: 'เหลือ 1 ช่วง', tone: 'limited' }, { date: '2026-09-01', label: 'อ. 1', state: 'ว่าง 3 ช่วง', tone: 'open' }, { date: '2026-09-02', label: 'พ. 2', state: 'ว่าง 2 ช่วง', tone: 'open' }, { date: '2026-09-03', label: 'พฤ. 3', state: 'เต็ม', tone: 'closed' }, { date: '2026-09-04', label: 'ศ. 4', state: 'ว่าง 3 ช่วง', tone: 'open' }];
  const slots = selectedDate === '2026-08-31' ? ['13:00–15:30'] : selectedDate === '2026-09-03' ? [] : ['09:00–11:30', '13:00–15:30', '15:30–18:00'];
  const submit = async () => {
    if (isApiEnabled()) {
      const serviceCode = service === 'ดูดบ่อดักไขมัน' ? 'GREASE_TRAP' : service === 'ขนส่งกากอุตสาหกรรม' ? 'INDUSTRIAL_WASTE' : 'WASTEWATER_POND';
      try {
        await submitCustomerBooking({ serviceCode, customerSiteId: '00000000-0000-4000-8000-000000000010', requestedDate: selectedDate, requestedStart: selectedSlot.slice(0, 5), requestedEnd: selectedSlot.slice(6), estimatedVolume: undefined });
      } catch {
        notify('ยังส่งคำขอไม่ได้ กรุณาลองใหม่หรือติดต่อทีม Foresee');
        return;
      }
    }
    setSubmitted(true);
    notify('ส่งคำขอจองแล้ว ทีมงานจะยืนยันภายใน 15 นาที');
  };
  return <><PageHeader eyebrow="พอร์ทัลลูกค้า · ไทยรุ่งอุตสาหกรรม" title={submitted ? 'ส่งคำขอจองแล้ว' : 'จองรถบริการ'} copy={submitted ? 'ทีม Foresee กำลังตรวจสอบคิวรถและจะติดต่อกลับ' : 'เลือกบริการ วันเวลา และสถานที่ที่ต้องการให้ทีม Foresee เข้าดูแล'} action={!submitted ? <span className="trust-line"><ShieldCheck size={16} /> ยืนยันคิวภายใน 15 นาที</span> : undefined} />{submitted ? <section className="panel submitted-card"><div className="submitted-icon"><Check size={27} /></div><h2>คำขอของคุณถูกส่งเรียบร้อย</h2><p>หมายเลขคำขอ <b>BK-260901-024</b><br />ทีมงานจะติดต่อกลับเพื่อยืนยันรถและเวลา</p><div><button className="primary-button" onClick={() => onNavigate('bookings')}>ดูการจองของฉัน <ArrowRight size={16} /></button><button className="secondary-button" onClick={() => setSubmitted(false)}>สร้างการจองอีกครั้ง</button></div></section> : <div className="customer-booking-layout"><section className="panel booking-form-panel"><div className="stepper"><div className="step active"><b>01</b><span>บริการและสถานที่</span></div><i /><div className="step active"><b>02</b><span>วันและเวลา</span></div><i /><div className="step"><b>03</b><span>ยืนยันรายละเอียด</span></div></div><section className="form-section"><div className="form-title"><div><h2>เลือกประเภทบริการ</h2><p>เลือกบริการที่ตรงกับงานของคุณ</p></div><b>* จำเป็น</b></div><div className="service-cards">{services.map((item) => <button key={item.name} className={service === item.name ? `service-card selected ${item.tone}` : 'service-card'} onClick={() => setService(item.name)}><span className={`service-icon ${item.tone}`}>{item.icon}</span><span><b>{item.name}</b><small>{item.detail}</small></span>{service === item.name && <Check size={15} />}</button>)}</div></section><section className="form-section"><div className="form-title"><div><h2>เลือกวันและเวลาที่สะดวก</h2><p>แสดงเฉพาะช่วงเวลาที่เปิดรับบริการ</p></div><b>* จำเป็น</b></div><div className="booking-month"><button className="icon-button small"><ArrowLeft size={15} /></button><b>กันยายน 2569</b><button className="icon-button small"><ArrowRight size={15} /></button></div><div className="availability-days">{days.map((day) => <button key={day.date} disabled={day.tone === 'closed'} className={selectedDate === day.date ? 'availability-day selected' : 'availability-day'} onClick={() => { setSelectedDate(day.date); setSelectedSlot(day.tone === 'limited' ? '13:00–15:30' : '09:00–11:30'); }}><span>{day.label}</span><b>{day.state}</b></button>)}</div><div className="slot-area"><span>ช่วงเวลาของวันที่ {formatThaiDate(selectedDate)}</span><div>{slots.length ? slots.map((slot) => <button key={slot} className={selectedSlot === slot ? 'slot selected' : 'slot'} onClick={() => setSelectedSlot(slot)}><Clock3 size={14} />{slot}<small>คิวว่าง</small></button>) : <div className="empty-slot">วันนี้เต็มแล้ว ลองเลือกวันที่ใกล้เคียง</div>}</div></div></section><section className="form-section"><div className="form-title"><div><h2>ยืนยันสถานที่เข้าบริการ</h2><p>ทีมงานจะใช้ข้อมูลนี้สำหรับเตรียมเส้นทาง</p></div><b>* จำเป็น</b></div><label className="field-label">สถานที่ / ชื่อโรงงาน<div className="field-control"><MapPin size={15} /><input defaultValue="โรงงาน ไทยรุ่ง — บางปะกง, ฉะเชิงเทรา" /></div></label><label className="field-label">ปริมาณโดยประมาณ <span>(ถ้ามี)</span><div className="inline-fields"><input placeholder="เช่น 8" /><select defaultValue="ลบ.ม."><option>ลบ.ม.</option><option>ตัน</option><option>เที่ยว</option></select></div></label><label className="field-label">หมายเหตุเพิ่มเติม <span>(ถ้ามี)</span><textarea rows={3} placeholder="เช่น ต้องเข้าทางประตู 2, ติดต่อคุณ..." /></label></section></section><aside className="customer-summary"><section className="panel summary-card"><span className="summary-kicker">สรุปการจอง</span><h2>พร้อมให้เราเข้าดูแล</h2><div className="summary-service"><span className="service-icon teal">≋</span><div><small>บริการที่เลือก</small><b>{service}</b></div></div><div className="summary-details"><div><span>วันเวลา</span><b>{formatThaiDate(selectedDate)}<br />{selectedSlot}</b></div><div><span>สถานที่</span><b>โรงงาน ไทยรุ่ง<br />บางปะกง, ฉะเชิงเทรา</b></div></div><div className="summary-note"><ShieldCheck size={15} /><p>เราจะยืนยันรถและเวลาที่เหมาะสมให้ภายใน 15 นาที</p></div><button className="primary-button full-button" onClick={submit}>ส่งคำขอจอง <ArrowRight size={16} /></button></section><section className="panel recent-card"><div className="panel-head"><div><h3>การจองล่าสุด</h3><p>รายการที่กำลังดำเนินการ</p></div><em className="status-chip status-pending">รอยืนยัน</em></div><div className="recent-booking"><b>27</b><span>ส.ค.</span><div><strong>ขนส่งกากอุตสาหกรรม</strong><small>13:00–15:30 · BK-260827-016</small></div></div><button className="quiet-button" onClick={() => onNavigate('bookings')}>ดูการจองของฉัน <ArrowRight size={15} /></button></section></aside></div>}</>;
}

function CustomerBookings({ bookings, onNavigate }: { bookings: Booking[]; onNavigate: (view: CustomerView) => void }) {
  const customerBookings = bookings.slice(0, 3);
  return <><PageHeader eyebrow="พอร์ทัลลูกค้า · ไทยรุ่งอุตสาหกรรม" title="การจองของฉัน" copy="ติดตาม Booking ปัจจุบันและประวัติการให้บริการ" action={<button className="primary-button" onClick={() => onNavigate('new-booking')}><Plus size={17} /> จองบริการใหม่</button>} /><div className="customer-status-tabs"><button className="selected">กำลังดำเนินการ <em>2</em></button><button>เสร็จสิ้น <em>1</em></button></div><section className="customer-booking-list">{customerBookings.map((booking) => <article className="panel customer-booking-card" key={booking.id}><div className="customer-booking-top"><div><span>{booking.id}</span><h2>{booking.service}</h2><p><MapPin size={13} /> {booking.site}</p></div><em className={`status-chip ${statusClass[booking.status]}`}>{booking.status}</em></div><div className="customer-booking-meta"><span><CalendarDays size={14} /> {formatThaiDate(booking.date)}</span><span><Clock3 size={14} /> {booking.start}–{booking.end}</span><span><Truck size={14} /> {booking.vehicle}</span></div><div className="customer-progress"><div className="progress-label"><span>สถานะงาน</span><b>{booking.stage}</b></div><div className="progress-line"><i className={booking.stage === 'เสร็จสิ้น' ? 'complete' : 'active'} style={{ width: booking.stage === 'เสร็จสิ้น' ? '100%' : booking.stage === 'กำลังให้บริการ' ? '75%' : '38%' }} /></div></div><button className="quiet-button">ดูรายละเอียด <ArrowRight size={15} /></button></article>)}</section></>;
}

function CustomerCompany({ notify }: { notify: (message: string) => void }) { return <><PageHeader eyebrow="พอร์ทัลลูกค้า · การตั้งค่า" title="ข้อมูลบริษัท" copy="ข้อมูลนี้ใช้สำหรับการจองและเตรียมเส้นทางเข้าบริการ" /><section className="panel company-profile"><div className="profile-heading"><div className="company-badge">TR</div><div><h2>บริษัท ไทยรุ่งอุตสาหกรรม</h2><p>Customer organization · สมาชิก 3 คน</p></div><button className="secondary-button" onClick={() => notify('เปิดโหมดแก้ไขข้อมูลบริษัท')}>แก้ไขข้อมูล</button></div><div className="profile-fields"><div><span>เลขประจำตัวผู้เสียภาษี</span><b>0105560123456</b></div><div><span>ผู้ประสานงานหลัก</span><b>ธนกร รุ่งเรือง · 08x-xxx-xxxx</b></div><div><span>สถานที่เข้าบริการหลัก</span><b>โรงงาน ไทยรุ่ง — บางปะกง, ฉะเชิงเทรา</b></div><div><span>อีเมลแจ้งเตือน</span><b>contact@thairung.example</b></div></div></section></>; }
