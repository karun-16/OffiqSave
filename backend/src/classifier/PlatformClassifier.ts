export class PlatformClassifier {
  /**
   * Classifies a media URL to its specific platform name.
   * Never classifies supported platform URLs as Generic.
   */
  public static classify(rawUrl: string): string {
    let hostname = '';
    const urlStr = rawUrl.toLowerCase().trim();
    try {
      hostname = new URL(urlStr).hostname.toLowerCase();
    } catch (_) {
      hostname = urlStr;
    }

    // Instagram
    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
      return 'Instagram';
    }

    // Twitter / X (check hostname strictly for x.com, twitter.com, t.co)
    if (
      hostname === 'x.com' || hostname.endsWith('.x.com') ||
      hostname === 'twitter.com' || hostname.endsWith('.twitter.com') ||
      hostname === 't.co' || hostname.endsWith('.t.co')
    ) {
      return 'Twitter';
    }

    // Facebook
    if (hostname.includes('facebook.com') || hostname.includes('fb.watch') || hostname.includes('fb.com') || hostname.includes('fb.gg')) {
      return 'Facebook';
    }

    // Pinterest
    if (hostname.includes('pinterest.') || hostname.includes('pin.it')) {
      return 'Pinterest';
    }

    // TikTok
    if (hostname.includes('tiktok.com')) {
      return 'TikTok';
    }

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be') || hostname.includes('youtube-nocookie.com')) {
      return 'YouTube';
    }

    // Threads
    if (hostname.includes('threads.net')) {
      return 'Threads';
    }

    // Reddit
    if (
      hostname === 'reddit.com' || hostname.endsWith('.reddit.com') ||
      hostname === 'redd.it' || hostname.endsWith('.redd.it')
    ) {
      return 'Reddit';
    }

    // Snapchat
    if (hostname.includes('snapchat.com')) {
      return 'Snapchat';
    }

    // LinkedIn
    if (hostname.includes('linkedin.com')) {
      return 'LinkedIn';
    }

    // Vimeo
    if (hostname.includes('vimeo.com')) {
      return 'Vimeo';
    }

    // Dailymotion
    if (hostname.includes('dailymotion.com') || hostname.includes('dai.ly')) {
      return 'Dailymotion';
    }

    // SoundCloud
    if (hostname.includes('soundcloud.com')) {
      return 'SoundCloud';
    }

    // Bilibili
    if (hostname.includes('bilibili.com') || hostname.includes('b23.tv')) {
      return 'Bilibili';
    }

    // Tumblr
    if (hostname.includes('tumblr.com')) {
      return 'Tumblr';
    }

    // Imgur
    if (hostname.includes('imgur.com')) {
      return 'Imgur';
    }

    // 9GAG
    if (hostname.includes('9gag.com')) {
      return '9GAG';
    }

    // Streamable
    if (hostname.includes('streamable.com')) {
      return 'Streamable';
    }

    // Loom
    if (hostname.includes('loom.com')) {
      return 'Loom';
    }

    // VK
    if (hostname.includes('vk.com')) {
      return 'VK';
    }

    // OK.ru
    if (hostname.includes('ok.ru')) {
      return 'OK.ru';
    }

    // Telegram
    if (hostname.includes('t.me') || hostname.includes('telegram.org') || hostname.includes('telegram.me')) {
      return 'Telegram';
    }

    return 'Generic';
  }
}
