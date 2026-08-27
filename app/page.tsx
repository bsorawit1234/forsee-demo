'use client';

import { useMemo, useState } from 'react';

type JobStatus = 'กำลังเก็บ' | 'กำลังเดินทาง' | 'รอเริ่มงาน' | 'เสร็จสิ้น';

type Job = {
  id: string;
  customer: string;
  service: string;
  location: string;
  truck: string;
  driver: string;
  time: string;
  status: JobStatus;
  accent: string;
};

const jobs: Job[] = [
  {
    id: 'BK-240825-018',
    customer: 'บริษัท ไทยรุ่งอุตสาหกรรม',
    service: 'ดูดบ่อดักไขมัน',
    location: 'บางปะกง, ฉะเชิงเทรา',
    truck: 'รถดูดสูญญากาศ 10 ลบ.ม.',
    driver: 'สมชาย ใจดี',
    time: '09:00 — 11:30',
    status: 'กำลังเก็บ',
    accent: 'teal',
  },
  {
    id: 'BK-240825-019',
    customer: 'โรงงาน เอส.พี.เคมีคอล',
    service: 'ขนส่งกากอุตสาหกรรม',
    location: 'มาบตาพุด, ระยอง',
    truck: 'รถขนกากอุตสาหกรรม',
    driver: 'วิชัย พรหมรักษา',
    time: '10:30 — 13:00',
    status: 'กำลังเดินทาง',
    accent: 'amber',
  },
  {
    id: 'BK-240825-020',
    customer: 'บริษัท กรีนแพค จำกัด',
    service: 'ล้างบ่อบำบัดน้ำเสีย',
    location: 'ลาดกระบัง, กรุงเทพฯ',
    truck: 'รถดูดตะกอน 6 ลบ.ม.',
    driver: 'กิตติพงษ์ แสงทอง',
    time: '13:00 — 15:30',
    status: 'รอเริ่มงาน',
    accent: 'violet',
  },
  {
    id: 'BK-240825-017',
    customer: 'โรงงาน อีโคเทค',
    service: 'ขนส่งน้ำเสีย',
    location: 'นิคมฯ อมตะซิตี้',
    truck: 'รถบรรทุกน้ำ 12 ลบ.ม.',
    driver: 'ธนากร คำสุข',
    time: '08:00 — 09:30',
    status: 'เสร็จสิ้น',
    accent: 'blue',
  },
];

const navItems = [
  { label: 'ภาพรวม', icon: '⌂' },
  { label: 'การจอง', icon: '▣', count: '24' },
  { label: 'ตารางงาน', icon: '◫' },
  { label: 'รถและพนักงาน', icon: '▱' },
  { label: 'รายงาน', icon: '▤' },
];

const fleet = [
  { label: 'รถดูดสูญญากาศ', total: 8, available: 6, color: 'teal' },
  { label: 'รถขนกากอุตสาหกรรม', total: 6, available: 4, color: 'amber' },
  { label: 'รถบรรทุกน้ำ', total: 4, available: 2, color: 'blue' },
];

const statusTone: Record<JobStatus, string> = {
  'กำลังเก็บ': 'status-teal',
  'กำลังเดินทาง': 'status-amber',
  'รอเริ่มงาน': 'status-violet',
  'เสร็จสิ้น': 'status-blue',
};

export default function Home() {
  const [activeNav, setActiveNav] = useState('ภาพรวม');
  const [activeFilter, setActiveFilter] = useState('ทั้งหมด');
  const [showBooking, setShowBooking] = useState(false);
  const [toast, setToast] = useState('');

  const visibleJobs = useMemo(
    () => activeFilter === 'ทั้งหมด' ? jobs : jobs.filter((job) => job.status === activeFilter),
    [activeFilter],
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <div className="brand-name">FORESEE</div>
            <div className="brand-sub">CORPORATION</div>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-icon">FC</div>
          <div className="workspace-copy"><span>Foresee Corp.</span><small>ศูนย์ปฏิบัติการ</small></div>
          <span className="chevron">⌄</span>
        </div>

        <p className="nav-label">เมนูหลัก</p>
        <nav className="nav-list" aria-label="เมนูหลัก">
          {navItems.map((item) => (
            <button
              className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
              key={item.label}
              onClick={() => setActiveNav(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.count && <span className="nav-count">{item.count}</span>}
            </button>
          ))}
        </nav>

        <p className="nav-label nav-label-spaced">จัดการระบบ</p>
        <nav className="nav-list" aria-label="จัดการระบบ">
          <button className="nav-item" onClick={() => notify('เมนูตั้งค่าจะพร้อมใช้งานในเวอร์ชันถัดไป')}><span className="nav-icon">⚙</span><span>ตั้งค่าระบบ</span></button>
          <button className="nav-item" onClick={() => notify('เปิดศูนย์ช่วยเหลือแล้ว')}><span className="nav-icon">?</span><span>ช่วยเหลือ</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="support-card">
            <div className="support-orb">✦</div>
            <div><strong>ต้องการความช่วยเหลือ?</strong><span>ทีมซัพพอร์ตพร้อมดูแลคุณ</span></div>
            <button aria-label="เปิดความช่วยเหลือ" onClick={() => notify('ทีมซัพพอร์ตจะติดต่อกลับในไม่ช้า')}>↗</button>
          </div>
          <div className="profile-row">
            <div className="avatar avatar-gold">อน</div>
            <div className="profile-copy"><strong>อนุชา วัฒนกุล</strong><span>เจ้าของกิจการ</span></div>
            <button className="more-button" aria-label="เมนูผู้ใช้งาน">•••</button>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">F</div><span>FORESEE</span></div>
          <div className="breadcrumb"><span>ศูนย์ปฏิบัติการ</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <div className="system-live"><span className="live-dot" />ระบบทำงานปกติ</div>
            <button className="icon-button" aria-label="ค้นหา" onClick={() => notify('ค้นหาการจอง, ลูกค้า หรือรถได้จากเมนูนี้')}><span>⌕</span></button>
            <button className="icon-button notification" aria-label="การแจ้งเตือน" onClick={() => notify('คุณมีการแจ้งเตือนใหม่ 3 รายการ')}><span>♢</span><i /></button>
          </div>
        </header>

        <div className="content-wrap">
          <div className="page-heading">
            <div>
              <p className="eyebrow">วันจันทร์ที่ 25 สิงหาคม 2568 <span className="heading-dot" /> อัปเดตล่าสุด 10:42 น.</p>
              <h1>สวัสดีครับ, คุณอนุชา <span className="wave">✦</span></h1>
              <p className="heading-copy">ภาพรวมการดำเนินงานของ Foresee Corp. วันนี้</p>
            </div>
            <button className="primary-button" onClick={() => setShowBooking(true)}><span>＋</span> สร้างการจองใหม่</button>
          </div>

          <div className="metric-grid">
            <MetricCard label="การจองวันนี้" value="24" note="เพิ่มขึ้น 12%" noteTone="positive" icon="▣" iconTone="teal" spark={[25, 30, 28, 38, 34, 42, 48, 46, 58, 55, 64]} />
            <MetricCard label="งานกำลังดำเนินการ" value="08" note="จากทั้งหมด 24 งาน" noteTone="neutral" icon="◷" iconTone="amber" spark={[42, 45, 40, 50, 48, 44, 52, 58, 54, 60, 57]} />
            <MetricCard label="รถพร้อมใช้งาน" value="12" suffix="/ 18 คัน" note="พร้อมออกงาน" noteTone="positive" icon="▱" iconTone="blue" spark={[36, 38, 35, 40, 44, 42, 48, 46, 52, 50, 54]} />
            <MetricCard label="เกินกำหนด SLA" value="02" note="ต้องติดตามทันที" noteTone="negative" icon="!" iconTone="rose" spark={[26, 20, 23, 18, 25, 22, 32, 28, 35, 31, 42]} />
          </div>

          <div className="section-row">
            <div><h2>การดำเนินงานวันนี้</h2><p>ติดตามสถานะงานและทีมภาคสนามแบบเรียลไทม์</p></div>
            <button className="text-button" onClick={() => { setActiveNav('ตารางงาน'); notify('แสดงตารางงานทั้งหมดแล้ว'); }}>ดูตารางงานทั้งหมด <span>→</span></button>
          </div>

          <div className="dashboard-grid">
            <section className="panel operations-panel">
              <div className="panel-head">
                <div className="filter-tabs" role="tablist" aria-label="กรองสถานะงาน">
                  {['ทั้งหมด', 'กำลังเก็บ', 'กำลังเดินทาง', 'รอเริ่มงาน'].map((filter) => (
                    <button key={filter} className={activeFilter === filter ? 'selected' : ''} onClick={() => setActiveFilter(filter)}>{filter}{filter === 'ทั้งหมด' && <span>24</span>}</button>
                  ))}
                </div>
                <button className="small-icon-button" aria-label="ตัวเลือกการแสดงผล" onClick={() => notify('ตัวเลือกการแสดงผลพร้อมใช้งานในเวอร์ชันถัดไป')}>•••</button>
              </div>
              <div className="job-list">
                {visibleJobs.map((job) => <JobRow job={job} key={job.id} onClick={() => notify(`เปิดรายละเอียดงาน ${job.id}`)} />)}
                {visibleJobs.length === 0 && <div className="empty-state">ยังไม่มีงานในสถานะนี้</div>}
              </div>
              <div className="panel-foot"><span><i className="pulse-dot" /> อัปเดตแบบเรียลไทม์</span><span>{visibleJobs.length} รายการที่แสดง</span></div>
            </section>

            <aside className="right-column">
              <section className="panel calendar-panel">
                <div className="panel-title-row"><div><h3>ปฏิทินการจอง</h3><p>สิงหาคม 2568</p></div><button className="small-icon-button" aria-label="เดือนถัดไป">→</button></div>
                <div className="calendar-week">{['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="calendar-grid">
                  {['28', '29', '30', '31', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'].map((day, index) => (
                    <button key={`${day}-${index}`} className={`${day === '25' ? 'today' : ''} ${index < 4 ? 'muted-day' : ''} ${['5', '12', '18', '25', '27'].includes(day) ? 'has-event' : ''}`} onClick={() => notify(`เลือกวันที่ ${day} สิงหาคม 2568`)}>{day}</button>
                  ))}
                </div>
                <div className="calendar-summary"><span><i className="legend-dot teal-dot" />วันนี้</span><span><i className="legend-dot amber-dot" />มีการจอง</span></div>
              </section>

              <section className="panel fleet-panel">
                <div className="panel-title-row"><div><h3>สถานะรถวันนี้</h3><p>อัปเดตเมื่อ 10:40 น.</p></div><button className="text-button tiny" onClick={() => { setActiveNav('รถและพนักงาน'); notify('แสดงรถและพนักงานทั้งหมดแล้ว'); }}>ดูทั้งหมด</button></div>
                <div className="fleet-list">{fleet.map((item) => <FleetRow key={item.label} {...item} />)}</div>
              </section>
            </aside>
          </div>

          <section className="panel activity-panel">
            <div className="panel-title-row"><div><h3>กิจกรรมล่าสุด</h3><p>ความเคลื่อนไหวจากทีมของคุณ</p></div><button className="small-icon-button" aria-label="ดูเพิ่มเติม" onClick={() => notify('แสดงกิจกรรมทั้งหมดแล้ว')}>•••</button></div>
            <div className="activity-list">
              <Activity avatar="สจ" tone="teal" text="สมชาย ใจดี" detail="อัปเดตสถานะงานเป็น กำลังเก็บ" time="เมื่อ 4 นาทีที่แล้ว" />
              <Activity avatar="วพ" tone="amber" text="วิชัย พรหมรักษา" detail="เริ่มเดินทางไปยัง มาบตาพุด, ระยอง" time="เมื่อ 18 นาทีที่แล้ว" />
              <Activity avatar="น" tone="violet" text="ระบบ" detail="มีการจองใหม่จาก บริษัท กรีนแพค จำกัด" time="เมื่อ 32 นาทีที่แล้ว" />
            </div>
          </section>
        </div>
      </section>

      {showBooking && <BookingModal onClose={() => setShowBooking(false)} onSave={() => { setShowBooking(false); notify('สร้างการจองใหม่เรียบร้อยแล้ว'); }} />}
      {toast && <div className="toast" role="status"><span className="toast-check">✓</span>{toast}</div>}
    </main>
  );
}

function MetricCard({ label, value, suffix, note, noteTone, icon, iconTone, spark }: { label: string; value: string; suffix?: string; note: string; noteTone: string; icon: string; iconTone: string; spark: number[] }) {
  return <div className="metric-card"><div className="metric-top"><div><p>{label}</p><div className="metric-value">{value}{suffix && <small>{suffix}</small>}</div></div><span className={`metric-icon ${iconTone}`}>{icon}</span></div><div className="metric-bottom"><span className={`metric-note ${noteTone}`}>{noteTone === 'positive' && '↗ '}{noteTone === 'negative' && '↘ '}{note}</span><MiniSpark values={spark} tone={iconTone} /></div></div>;
}

function MiniSpark({ values, tone }: { values: number[]; tone: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${30 - ((value - min) / ((max - min) || 1)) * 23}`).join(' ');
  return <svg className={`sparkline ${tone}`} viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function JobRow({ job, onClick }: { job: Job; onClick: () => void }) {
  return <button className="job-row" onClick={onClick}><div className={`job-type-icon ${job.accent}`}>{job.service.startsWith('ดูด') ? '≋' : job.service.startsWith('ล้าง') ? '✧' : '▱'}</div><div className="job-main"><div className="job-line"><strong>{job.customer}</strong><span className="job-id">{job.id}</span></div><div className="job-service">{job.service}<span className="line-dot" />{job.location}</div><div className="job-meta"><span>◷ {job.time}</span><span>▱ {job.truck}</span><span>◉ {job.driver}</span></div></div><div className={`status-pill ${statusTone[job.status]}`}><i />{job.status}</div><span className="row-arrow">→</span></button>;
}

function FleetRow({ label, total, available, color }: { label: string; total: number; available: number; color: string }) {
  return <div className="fleet-row"><div className={`fleet-icon ${color}`}>▱</div><div className="fleet-copy"><strong>{label}</strong><div className="fleet-bar"><span className={color} style={{ width: `${(available / total) * 100}%` }} /></div></div><div className="fleet-count"><b>{available}</b><span>/ {total}</span></div></div>;
}

function Activity({ avatar, tone, text, detail, time }: { avatar: string; tone: string; text: string; detail: string; time: string }) {
  return <div className="activity-item"><div className={`avatar avatar-${tone}`}>{avatar}</div><div><p><strong>{text}</strong> <span>{detail}</span></p><small>{time}</small></div></div>;
}

function BookingModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="modal-eyebrow">สร้างรายการใหม่</span><h2 id="booking-title">สร้างการจองใหม่</h2><p>กรอกข้อมูลเบื้องต้นเพื่อจัดคิวงานให้ลูกค้า</p></div><button className="close-button" onClick={onClose} aria-label="ปิด">×</button></div><div className="modal-form"><label>ชื่อลูกค้า<input placeholder="เช่น บริษัท ไทยรุ่งอุตสาหกรรม" /></label><label>ประเภทบริการ<select defaultValue=""><option value="" disabled>เลือกบริการ</option><option>ดูดบ่อดักไขมัน</option><option>ขนส่งกากอุตสาหกรรม</option><option>ล้างบ่อบำบัดน้ำเสีย</option></select></label><div className="form-row"><label>วันที่เข้าบริการ<input type="date" defaultValue="2025-08-25" /></label><label>ช่วงเวลา<select defaultValue="09:00"><option>09:00 — 11:30</option><option>13:00 — 15:30</option><option>15:30 — 18:00</option></select></label></div><label>สถานที่ให้บริการ<input placeholder="ค้นหาที่อยู่หรือชื่อโรงงาน" /></label></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>ยกเลิก</button><button className="primary-button" onClick={onSave}>บันทึกการจอง <span>→</span></button></div></div></div>;
}
