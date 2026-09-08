/** Small non-cryptographic hash (djb2) → base36. Used to cache-bust private-file proxy URLs. */
export function shortHash(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) hash = ((hash * 33) ^ s.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}
