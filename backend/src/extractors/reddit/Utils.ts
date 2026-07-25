export class RedditUtils {
  public static normalizeUrl(urlStr: string): { normalizedUrl: string; hostname: string; postId?: string } {
    let clean = urlStr.trim();
    let parsed: URL;
    try {
      parsed = new URL(clean);
    } catch (e) {
      throw new Error(`Invalid URL provided: ${urlStr}`);
    }

    let hostname = parsed.hostname.toLowerCase();

    // Support redd.it/<id>
    if (hostname === 'redd.it' || hostname.endsWith('.redd.it')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        const postId = parts[0];
        const normalizedUrl = `https://www.reddit.com/comments/${postId}/`;
        return { normalizedUrl, hostname, postId };
      }
    }

    // Normalize subdomain (old.reddit.com, np.reddit.com, etc.) to www.reddit.com
    if (hostname.endsWith('reddit.com')) {
      parsed.hostname = 'www.reddit.com';
      hostname = 'www.reddit.com';
    }

    // Remove tracking query parameters
    const paramsToClean = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_name', 'utm_term', 'ref', 'share_id'];
    for (const p of paramsToClean) {
      parsed.searchParams.delete(p);
    }

    let pathname = parsed.pathname;
    if (!pathname.endsWith('/') && !pathname.endsWith('.json')) {
      pathname += '/';
    }
    parsed.pathname = pathname;

    return { normalizedUrl: parsed.toString(), hostname };
  }

  public static getJsonUrl(urlStr: string): string {
    const { normalizedUrl } = this.normalizeUrl(urlStr);
    const parsed = new URL(normalizedUrl);
    
    let pathname = parsed.pathname;
    if (pathname.endsWith('.json')) {
      return parsed.toString();
    }
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname + '.json';
    return parsed.toString();
  }

  public static printRoutingTrace(inputUrl: string, normalizedUrl: string, hostname: string): void {
    console.log('\nREDDIT ROUTING TRACE\n');
    console.log(`Input URL: ${inputUrl}`);
    console.log(`Normalized URL: ${normalizedUrl}`);
    console.log(`Hostname: ${hostname}`);
    console.log(`Platform: Reddit`);
    console.log(`Selected Extractor: RedditExtractor\n`);
  }
}
