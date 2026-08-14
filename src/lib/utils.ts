export function formatNumber(value: number): string {
  if (value === undefined || value === null) return '';
  const str = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  const parts = str.split('.');
  
  let intPart = parts[0];
  let res = '';
  for (let i = intPart.length - 1, j = 0; i >= 0; i--, j++) {
    if (j > 0 && j % 3 === 0) res = ' ' + res;
    res = intPart[i] + res;
  }
  parts[0] = res;
  
  return parts.join('.');
}
