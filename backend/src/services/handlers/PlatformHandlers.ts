import { BaseHandler } from './BaseHandler';

export class InstagramHandler extends BaseHandler {
    protected platformName = 'Instagram';
    protected getExtraOptions() { return {}; }
}

export class YouTubeHandler extends BaseHandler {
    protected platformName = 'YouTube';
    protected getExtraOptions() { return {}; }
}

export class TikTokHandler extends BaseHandler {
    protected platformName = 'TikTok';
    protected getExtraOptions() { return {}; }
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

export class GenericMediaHandler extends BaseHandler {
    protected platformName = 'Generic';
    protected getExtraOptions() { return {}; }
}
