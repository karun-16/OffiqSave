import { InstagramHandler, YouTubeHandler, TikTokHandler, FacebookHandler, TelegramHandler, TeraboxHandler, TwitterHandler, PinterestHandler, RedditHandler, VimeoHandler, DailymotionHandler, GenericMediaHandler } from './PlatformHandlers';
import { BaseHandler } from './BaseHandler';
// Removed ImageHandler import

export class HandlerFactory {
    static getHandler(url: string): BaseHandler {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('instagram.com')) return new InstagramHandler();
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return new YouTubeHandler();
        if (lowerUrl.includes('tiktok.com')) return new TikTokHandler();
        if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) return new FacebookHandler();
        if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram.me')) return new TelegramHandler();
        if (lowerUrl.includes('terabox.com') || lowerUrl.includes('teraboxapp.com')) return new TeraboxHandler();
        if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return new TwitterHandler();
        if (lowerUrl.includes('pinterest.com') || lowerUrl.includes('pin.it')) return new PinterestHandler();
        if (lowerUrl.includes('reddit.com')) return new RedditHandler();
        if (lowerUrl.includes('vimeo.com')) return new VimeoHandler();
        if (lowerUrl.includes('dailymotion.com') || lowerUrl.includes('dai.ly')) return new DailymotionHandler();
        
        return new GenericMediaHandler();
    }
}
