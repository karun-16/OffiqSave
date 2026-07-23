import { BaseHandler } from './BaseHandler';

export class InstagramHandler extends BaseHandler {
    protected platformName = 'Instagram';
    protected getExtraOptions() { 
        return {}; 
    }

    async download(rawUrl: string, formatId: string): Promise<string> {
        if (rawUrl.includes('/reel/') || rawUrl.includes('/reels/') || rawUrl.includes('/tv/') || formatId.startsWith('http')) {
            console.log(`[Native Reel Download] Using direct CDN URL`);
            let directUrl = formatId.startsWith('http') ? formatId : '';
            if (!directUrl) {
                const { instagramReelExtractor } = require('../../extractors/instagram/InstagramReelExtractor');
                const reelRes = await instagramReelExtractor.extract(rawUrl);
                directUrl = reelRes.videoUrl;
            }
            if (directUrl) {
                return this.downloadImageDirect(directUrl);
            }
        }
        return super.download(rawUrl, formatId);
    }
}

export class YouTubeHandler extends BaseHandler {
    protected platformName = 'YouTube';
    protected getExtraOptions() { return {}; }
}

export class TikTokHandler extends BaseHandler {
    protected platformName = 'TikTok';
    protected getExtraOptions() { 
        return {
            legacyServerConnect: true,
            addHeader: [
                'User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
            ]
        }; 
    }
}

export class FacebookHandler extends BaseHandler {
    protected platformName = 'Facebook';
    protected getExtraOptions() { return {}; }
}

export class TelegramHandler extends BaseHandler {
    protected platformName = 'Telegram';
    protected getExtraOptions() { return {}; }
}

export class TeraboxHandler extends BaseHandler {
    protected platformName = 'Terabox';
    protected getExtraOptions() { return {}; }
}

export class TwitterHandler extends BaseHandler {
    protected platformName = 'X (Twitter)';
    protected getExtraOptions() { 
        return {
            addHeader: [
                'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        }; 
    }
}

export class PinterestHandler extends BaseHandler {
    protected platformName = 'Pinterest';
    protected getExtraOptions() { return {}; }
}

export class RedditHandler extends BaseHandler {
    protected platformName = 'Reddit';
    protected getExtraOptions() { 
        return {
            addHeader: [
                'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        }; 
    }
}

export class VimeoHandler extends BaseHandler {
    protected platformName = 'Vimeo';
    protected getExtraOptions() { return {}; }
}

export class DailymotionHandler extends BaseHandler {
    protected platformName = 'Dailymotion';
    protected getExtraOptions() { return {}; }
}

export class GenericMediaHandler extends BaseHandler {
    protected platformName = 'Generic';
    protected getExtraOptions() { return {}; }
}
