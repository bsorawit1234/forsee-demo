export function formatThaiDate(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(value);
}
