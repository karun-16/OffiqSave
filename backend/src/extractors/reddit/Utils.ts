export class RedditUtils {
  public static getJsonUrl(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      if (!parsed.pathname.endsWith('.json')) {
        parsed.pathname = parsed.pathname.replace(/\/$/, '') + '.json';
      }
      return parsed.toString();
    } catch (_) {
      return urlStr + '.json';
    }
  }
}
