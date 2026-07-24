export class InstagramUtils {
  public static normalizeUrl(urlStr: string): { canonicalUrl: string; shortcode: string } {
    try {
      const parsed = new URL(urlStr);
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'igsh', 'fbclid', 'ref'];
      for (const p of paramsToRemove) parsed.searchParams.delete(p);
      const match = parsed.pathname.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
      const shortcode = match && match[1] ? match[1] : '';
      return { canonicalUrl: parsed.toString(), shortcode };
    } catch (e) {
      return { canonicalUrl: urlStr, shortcode: '' };
    }
  }
}
