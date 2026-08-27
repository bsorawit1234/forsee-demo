import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Foresee Corp. | ศูนย์ปฏิบัติการ',
  description: 'ระบบจองบริการและติดตามการดำเนินงานของ Foresee Corporation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
