export function isUint32(i) {
  if (!Number.isInteger(i)) return false;
  if (i < 0) return false;
  if (i > 4294967295) return false;
  return true;
}

export function isHash256(hash) {
  return /^[A-F0-9]{64}$/.test(hash);
}
