import { InstagramHandler, YouTubeHandler, TikTokHandler, FacebookHandler, TelegramHandler, TeraboxHandler, GenericMediaHandler } from './PlatformHandlers';
import { BaseHandler } from './BaseHandler';

export class HandlerFactory {
    static getHandler(url: string): BaseHandler {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('instagram.com')) return new InstagramHandler();
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return new YouTubeHandler();
        if (lowerUrl.includes('tiktok.com')) return new TikTokHandler();
        if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) return new FacebookHandler();
        if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram.me')) return new TelegramHandler();
        if (lowerUrl.includes('terabox.com') || lowerUrl.includes('teraboxapp.com')) return new TeraboxHandler();
        return new GenericMediaHandler();
    }
}
