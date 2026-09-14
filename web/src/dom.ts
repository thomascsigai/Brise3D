/** The element with this id; the viewer's markup is static, so a missing one is a bug. */
export function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}
