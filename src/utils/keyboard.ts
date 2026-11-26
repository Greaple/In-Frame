/** True when the key event target handles arrow keys itself (inputs, sliders, selects, editable text). */
export function isEditableTarget(
  target: { tagName?: string; isContentEditable?: boolean } | null
): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}
