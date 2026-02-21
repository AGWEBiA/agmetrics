/**
 * Opens a Facebook Ad Library link for the given ad ID.
 * Uses the public Ad Library instead of preview_shareable_link which leads to Ads Manager.
 */
export function openAdPreview(adId: string) {
  const url = `https://www.facebook.com/ads/library/?id=${adId}`;
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
