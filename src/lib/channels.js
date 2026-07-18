// Parses a YouTube channel handle from a pathname string.
// Supports /@handle, /channel/UCid, /c/name, /user/name formats.
export function parseChannelFromPath(pathname) {
  const m = pathname.match(/^\/@([^/?]+)/)
    || pathname.match(/^\/channel\/([^/?]+)/)
    || pathname.match(/^\/c\/([^/?]+)/)
    || pathname.match(/^\/user\/([^/?]+)/);
  return m ? m[1].toLowerCase() : null;
}

export function parseChannelFromUrl(urlStr) {
  try {
    return parseChannelFromPath(new URL(urlStr).pathname);
  } catch {
    return null;
  }
}

export function isChannelAllowlisted(channel, allowlistedChannels) {
  if (!channel || !allowlistedChannels?.length) return false;
  return allowlistedChannels.some((a) => a.toLowerCase() === channel.toLowerCase());
}
