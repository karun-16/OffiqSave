export class LinkedInUtils {
  public static cleanUrl(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      parsed.search = '';
      return parsed.toString();
    } catch (_) {
      return urlStr;
    }
  }
}
