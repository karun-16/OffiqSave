export class PinterestUtils {
  public static getOriginalImageUrl(urlStr: string): string {
    // Converts e.g. i.pinimg.com/236x/.. or 736x/.. to originals/..
    return urlStr.replace(/\/(?:236x|474x|736x|564x)\//, '/originals/');
  }
}
