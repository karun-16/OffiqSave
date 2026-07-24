export class DailymotionUtils {
  public static extractVideoId(urlStr: string): string {
    const match = urlStr.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/);
    return (match && match[1]) ? match[1] : '';
  }
}
