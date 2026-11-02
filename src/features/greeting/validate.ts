/** 1 to 64 letters or digits. Stricter than the BFF, which also takes . _ and -, on purpose: the page offers the simple names only. */
export function validateName(name: string): string | undefined {
  if (name.length === 0) return "Enter a name";
  if (name.length > 64 || !/^[A-Za-z0-9]+$/.test(name)) return "Use letters and digits only";
  return undefined;
}
