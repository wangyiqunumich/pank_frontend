import { downloadText } from './assets.mjs';
export default { downloadImg(id, name) {
  const root = document.getElementById(id);
  const svg = root?.tagName?.toLowerCase() === 'svg' ? root : root?.querySelector('svg');
  if (!svg) return;
  const copy = svg.cloneNode(true); copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  downloadText(new XMLSerializer().serializeToString(copy), name + '.svg', 'image/svg+xml');
} };
