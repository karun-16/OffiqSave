export interface FetcherOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  followRedirects?: boolean;
}

export class HtmlFetcher {
  public static readonly DEFAULT_USER_AGENT = 
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  public static async fetch(url: string, options: FetcherOptions = {}): Promise<string> {
    const {
      headers = {},
      timeoutMs = 12000,
      retries = 2,
      followRedirects = true,
    } = options;

    const requestHeaders = {
      'User-Agent': this.DEFAULT_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      ...headers
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: 'GET',
          headers: requestHeaders,
          redirect: followRedirects ? 'follow' : 'manual',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        return await response.text();
      } catch (err: any) {
        lastError = err;
        if (attempt < retries) {
          // exponential backoff wait
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Failed to fetch HTML from ${url} after ${retries + 1} attempts: ${lastError?.message}`);
  }
}
