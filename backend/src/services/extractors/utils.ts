import * as path from 'path';
import * as fs from 'fs';

export const BROWSER_HEADERS: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cache-Control': 'no-cache',
};

const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt');
let _allCookies: Array<{ domain: string; name: string; value: string }> = [];
let _lastCookieRead = 0;

export function getHeadersForUrl(urlStr: string): Record<string, string> {
    const headers = { ...BROWSER_HEADERS };
    let hostname = '';
    try {
        hostname = new URL(urlStr).hostname;
    } catch (e) {
        return headers;
    }

    if (fs.existsSync(COOKIES_FILE)) {
        try {
            const stat = fs.statSync(COOKIES_FILE);
            if (stat.mtimeMs > _lastCookieRead) {
                _lastCookieRead = stat.mtimeMs;
                const content = fs.readFileSync(COOKIES_FILE, 'utf8');
                const lines = content.split('\n');
                _allCookies = [];
                for (const line of lines) {
                    if (line.startsWith('#') || !line.trim()) continue;
                    const parts = line.split('\t');
                    if (parts.length >= 7) {
                        _allCookies.push({
                            domain: parts[0],
                            name: parts[5],
                            value: parts[6].trim()
                        });
                    }
                }
            }

            const matchingCookies = _allCookies.filter(c => {
                let d = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
                return hostname === d || hostname.endsWith('.' + d);
            });

            if (matchingCookies.length > 0) {
                headers['Cookie'] = matchingCookies.map(c => `${c.name}=${c.value}`).join('; ');
            }
        } catch (e) {}
    }
    return headers;
}

export function extFromUrl(url: string): string {
    const m = url.match(/\.([a-zA-Z0-9]{2,5})(?:\?.*)?$/);
    return m ? m[1].toLowerCase() : 'jpg';
}
