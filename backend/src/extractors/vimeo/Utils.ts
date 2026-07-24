export class VimeoUtils {
  public static extractVideoId(urlStr: string): string {
    const match = urlStr.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
    return (match && match[3]) ? match[3] : '';
  }
}
