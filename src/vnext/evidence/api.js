import {createContext} from 'react';
export const EvidenceRequestContext=createContext(async()=>{throw new Error('Evidence service unavailable');});
export function valueText(value, format = 'value') {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  if (value === false) return 'False';
  if (value === true) return 'True';
  if (Array.isArray(value)) return value.length ? value.join(' · ') : 'Not recorded';
  if (typeof value === 'number') {
    if (value === 0) return '0';
    if ((Math.abs(value) < 0.001 || Math.abs(value) >= 1e6) && !Number.isInteger(value)) return value.toExponential(3);
    return Number.isInteger(value) ? value.toLocaleString('en-US') : Number(value.toPrecision(5)).toString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
