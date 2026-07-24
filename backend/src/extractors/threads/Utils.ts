export class ThreadsUtils {
  public static normalizeUrl(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      parsed.search = '';
      return parsed.toString();
    } catch (_) {
      return urlStr;
    }
  }
}
