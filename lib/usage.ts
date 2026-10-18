// How many successful AI runs one person can make in 24 hours.
// Change it with the AI_DAILY_LIMIT setting; the default keeps costs small.
export function dailyLimit(): number {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

export function windowStartIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}
