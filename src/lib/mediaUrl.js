export function getRenderableMediaUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  if (url.startsWith("data:image/")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;

  if (url.startsWith("blob:")) {
    if (typeof window === "undefined") return "";
    const currentOrigin = String(window.location?.origin || "");
    return currentOrigin && url.startsWith(`blob:${currentOrigin}`) ? url : "";
  }

  return "";
}

export function hasRenderableMediaUrl(value) {
  return Boolean(getRenderableMediaUrl(value));
}
