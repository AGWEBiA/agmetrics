/**
 * Opens a Facebook ad preview link safely, bypassing iframe/referrer restrictions.
 * Facebook's fb.me links block requests from iframes and certain referrers.
 * Using window.open with noopener,noreferrer clears the opener context.
 */
export function openAdPreview(url: string) {
  // Use window.open to avoid iframe context and referrer leaking
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    // Fallback: create a temporary link element
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
