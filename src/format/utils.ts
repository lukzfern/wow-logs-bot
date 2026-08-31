const NUM = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return NUM.format(n);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// API timestamps end with Z but are NOT UTC — they're in the uploader's local time.
// Using timeZone:'UTC' preserves the raw values without applying any offset.
export function spanishDateTime(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC', weekday: 'long', day: '2-digit',
    month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === t)?.value ?? '';
  const weekday = get('weekday');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${get('day')}/${get('month')}/${get('year')}, ${get('hour')}:${get('minute')}hs`;
}

export function spanishDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === t)?.value ?? '';
  const weekday = get('weekday');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${get('day')}/${get('month')}/${get('year')}`;
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`;
  return `${m}:${pad(s)}`;
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

export const DIFF_LABEL: Record<string, string> = {
  TWENTY_FIVE_HC: '25 HC',
  TWENTY_FIVE_NM: '25 NM',
  TEN_HC: '10 HC',
  TEN_NM: '10 NM',
  OVERALL: '',
};

export function primaryDifficulty(fights: { boss: boolean; difficulty: string }[]): string {
  const counts = new Map<string, number>();
  for (const f of fights) {
    if (!f.boss) continue;
    counts.set(f.difficulty, (counts.get(f.difficulty) ?? 0) + 1);
  }
  let best = '';
  let max = 0;
  for (const [diff, n] of counts) {
    if (n > max) { best = diff; max = n; }
  }
  return DIFF_LABEL[best] ?? best;
}
