export class YouTubeUtils {
  public static extractVideoId(urlStr: string): string {
    const match = urlStr.match(/(?:v=|\/embed\/|\/1080p\/|\/shorts\/|youtu\.be\/|\/v\/|\/e\/|watch\?v=)([^#&?]*)/);
    return (match && match[1]) ? match[1] : '';
  }
}
