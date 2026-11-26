/**
 * Copies text, returning whether it worked. `navigator.clipboard` only exists
 * on HTTPS or localhost, and the office reaches the app over plain HTTP, so the
 * legacy copy command is the fallback.
 *
 * `container` hosts the temporary field. Inside a modal it must be an element
 * of the dialog: everything outside is inert and can't be selected.
 */
export async function copyText(
  text: string,
  container: HTMLElement = document.body,
): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or window not focused: try the fallback.
    }
  }

  const previousFocus = document.activeElement as HTMLElement | null;
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  container.appendChild(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    previousFocus?.focus();
  }
}
