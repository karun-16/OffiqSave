export class TwitterUtils {
  public static normalizeUrl(urlStr: string): { tweetId: string; canonicalUrl: string } {
    try {
      const parsed = new URL(urlStr);
      const match = parsed.pathname.match(/\/status(?:es)?\/(\d+)/i);
      const tweetId = match && match[1] ? match[1] : '';
      return { tweetId, canonicalUrl: `https://x.com/i/status/${tweetId}` };
    } catch (e) {
      return { tweetId: '', canonicalUrl: urlStr };
    }
  }

  public static formatOriginalImageUrl(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      if (parsed.searchParams.has('format')) {
        parsed.searchParams.set('name', 'orig');
      } else {
        const ext = parsed.pathname.substring(parsed.pathname.lastIndexOf('.'));
        if (ext) {
          return `${urlStr.split('?')[0]}?name=orig`;
        }
      }
      return parsed.toString();
    } catch (_) {
      return urlStr;
    }
  }
}
