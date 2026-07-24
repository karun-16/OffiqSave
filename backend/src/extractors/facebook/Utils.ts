export class FacebookUtils {
  public static normalizeUrl(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      const paramsToRemove = ['fbclid', 'ref', 'hss_channel', '__tn__'];
      for (const p of paramsToRemove) parsed.searchParams.delete(p);
      return parsed.toString();
    } catch (_) {
      return urlStr;
    }
  }

  public static decodeEscapedUrl(str: string): string {
    return str.replace(/\\/g, '').replace(/&amp;/g, '&');
  }
}
