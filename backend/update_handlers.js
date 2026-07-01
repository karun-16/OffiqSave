const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'services', 'handlers', 'PlatformHandlers.ts');
const newContent = `import { BaseHandler } from './BaseHandler';
import { MediaInfo } from '../downloaderService';
import { extractInstagramNative, extractFacebookNative, extractPinterestNative, extractRedditNative, extractGenericNative } from '../extractors/NativeExtractors';

export class InstagramHandler extends BaseHandler {
    protected platformName = 'Instagram';
    protected getExtraOptions() { 
        return {
            addHeader: [
                'User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language:en-US,en;q=0.5',
                'Sec-Fetch-Mode:navigate'
            ]
        }; 
    }

    protected async tryNativeExtraction(url: string): Promise<MediaInfo | null> {
        return extractInstagramNative(url);
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

    protected async tryNativeExtraction(url: string): Promise<MediaInfo | null> {
        return extractFacebookNative(url);
    }
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
    // Note: Twitter images can be tricky via OpenGraph natively, leaving yt-dlp to handle twitter photos for now unless we add TwitterNative
}

export class PinterestHandler extends BaseHandler {
    protected platformName = 'Pinterest';
    protected getExtraOptions() { return {}; }

    protected async tryNativeExtraction(url: string): Promise<MediaInfo | null> {
        return extractPinterestNative(url);
    }
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

    protected async tryNativeExtraction(url: string): Promise<MediaInfo | null> {
        return extractRedditNative(url);
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

    protected async tryNativeExtraction(url: string): Promise<MediaInfo | null> {
        return extractGenericNative(url);
    }
}
`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Updated PlatformHandlers.ts');
