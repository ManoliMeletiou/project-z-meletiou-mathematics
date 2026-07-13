export function safeProjectZNextPath(value: string | null | undefined, fallback = '/home') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const parsed = new URL(value, 'https://project-z.local');
    if (parsed.origin !== 'https://project-z.local') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
