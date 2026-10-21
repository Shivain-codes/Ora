import type { ChartSpec, JsonDoc } from '../shared/types';
export function adviseChart(rows: JsonDoc[]): ChartSpec | undefined {
  if (rows.length < 2) return;
  const keys = Object.keys(rows[0]);
  const yKey = keys.find(k => !/^(_id|year|month|date|decade)$/i.test(k) && rows.every(r => typeof r[k] === 'number' && Number.isFinite(r[k])));
  if (!yKey) return;
  const xKey = keys.find(k => k !== yKey && rows.every(r => typeof r[k] === 'string' || (typeof r[k] === 'number' && Number.isFinite(r[k]))));
  if (!xKey || new Set(rows.map(r => String(r[xKey]))).size !== rows.length) return;
  const time = /year|date|month|decade/i.test(xKey) || rows.every(r => typeof r[xKey] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(String(r[xKey])));
  return { type: time ? 'line' : 'bar', xKey, yKey, title:`${yKey} by ${xKey}` };
}
