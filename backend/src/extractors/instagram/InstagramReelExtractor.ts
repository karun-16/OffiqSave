import * as fs from 'fs';
import * as path from 'path';

export interface InstagramReelResult {
  platform: 'instagram';
  mediaType: 'video';
  title?: string;
  author?: string;
  thumbnail?: string;
  videoUrl: string;
  duration?: number;
  shortcode: string;
}

export interface VideoCandidate {
  url: string;
  width?: number;
  height?: number;
  type?: string;
}

export class InstagramReelExtractor {
  /**
   * STEP 1: Normalize URL & Extract Shortcode
   */
  public normalizeUrl(inputUrl: string): { canonicalUrl: string; shortcode: string } {
    const trimmed = inputUrl.trim();
    const match = trimmed.match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/i);
    if (!match || !match[1]) {
      throw new Error(`[InstagramReelExtractor - Stage 1] Invalid Instagram Reel URL format: ${inputUrl}`);
    }
    const shortcode = match[1];
    const canonicalUrl = `https://www.instagram.com/reel/${shortcode}/`;
    return { canonicalUrl, shortcode };
  }

  /**
   * STEP 2: Fetch Public Reel Page HTML
   */
  public async fetchHtml(targetUrl: string): Promise<string> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    };

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      return html;
    } catch (err: any) {
      throw new Error(`[InstagramReelExtractor - Stage 2] HTTP Fetch failed for ${targetUrl}: ${err.message}`);
    }
  }

  /**
   * STEP 3: Save raw HTML when DEBUG=true
   */
  public saveDebugHtml(html: string): void {
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      try {
        const debugDir = path.resolve(process.cwd(), 'debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        const filePath = path.join(debugDir, 'reel.html');
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`[InstagramReelExtractor - Stage 3] Saved raw HTML (${html.length} bytes) to ${filePath}`);
      } catch (err: any) {
        console.warn(`[InstagramReelExtractor - Stage 3] Failed to save debug HTML: ${err.message}`);
      }
    }
  }

  /**
   * STEP 4: Search HTML for embedded JSON candidates
   */
  public discoverJsonBlocks(html: string): { jsonObjects: any[]; rawBlocksCount: number } {
    const jsonObjects: any[] = [];
    let rawBlocksCount = 0;

    // 1. Script tag matches (ld+json, sjs, json, etc.)
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptContent = match[1] ? match[1].trim() : '';
      if (!scriptContent) continue;

      // Check if script contains JSON structures
      if (
        scriptContent.startsWith('{') ||
        scriptContent.startsWith('[') ||
        scriptContent.includes('video_versions') ||
        scriptContent.includes('xdt_shortcode_media') ||
        scriptContent.includes('ScheduledServerJS') ||
        scriptContent.includes('__bbox') ||
        scriptContent.includes('Relay') ||
        scriptContent.includes('application/ld+json')
      ) {
        rawBlocksCount++;

        // Try direct parse if full content is valid JSON
        try {
          const parsed = JSON.parse(scriptContent);
          jsonObjects.push(parsed);
          continue;
        } catch (_) {}

        // Extract JSON assignments or embedded objects inside script JS
        const jsonSubmatches = scriptContent.match(/(\{[\s\S]*?\})/g);
        if (jsonSubmatches) {
          for (const sub of jsonSubmatches) {
            if (sub.includes('video_versions') || sub.includes('display_resources') || sub.includes('xdt_shortcode_media')) {
              try {
                const parsedSub = JSON.parse(sub);
                jsonObjects.push(parsedSub);
              } catch (_) {}
            }
          }
        }
      }
    }

    // 2. OpenGraph Fallback Meta Tags
    const ogVideoMatches = html.match(/<meta\s+(?:property|name)=["']og:video(?::secure_url)?["']\s+content=["']([^"']+)["']/gi);
    if (ogVideoMatches) {
      for (const m of ogVideoMatches) {
        const urlMatch = m.match(/content=["']([^"']+)["']/i);
        if (urlMatch && urlMatch[1]) {
          jsonObjects.push({
            og_fallback_video: urlMatch[1].replace(/&amp;/g, '&')
          });
        }
      }
    }

    const ogImageMatches = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/gi);
    if (ogImageMatches) {
      for (const m of ogImageMatches) {
        const urlMatch = m.match(/content=["']([^"']+)["']/i);
        if (urlMatch && urlMatch[1]) {
          jsonObjects.push({
            og_fallback_image: urlMatch[1].replace(/&amp;/g, '&')
          });
        }
      }
    }

    const ogTitleMatches = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/gi);
    if (ogTitleMatches) {
      for (const m of ogTitleMatches) {
        const titleMatch = m.match(/content=["']([^"']+)["']/i);
        if (titleMatch && titleMatch[1]) {
          jsonObjects.push({
            og_fallback_title: titleMatch[1].replace(/&amp;/g, '&')
          });
        }
      }
    }

    return { jsonObjects, rawBlocksCount };
  }

  /**
   * STEP 5: Recursive JSON Traversal for video_versions & metadata
   */
  public traverseJson(jsonObjects: any[]): {
    videoCandidates: VideoCandidate[];
    visitedCount: number;
    metadata: {
      author?: string;
      title?: string;
      thumbnail?: string;
      duration?: number;
      shortcode?: string;
    };
  } {
    const videoCandidates: VideoCandidate[] = [];
    let visitedCount = 0;
    const metadata: {
      author?: string;
      title?: string;
      thumbnail?: string;
      duration?: number;
      shortcode?: string;
    } = {};

    const seenUrls = new Set<string>();

    function addVideoCandidate(cand: VideoCandidate) {
      if (!cand.url || typeof cand.url !== 'string') return;
      const cleanUrl = cand.url.replace(/\\/g, '').replace(/&amp;/g, '&');
      if (cleanUrl.startsWith('http') && !seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        videoCandidates.push({
          ...cand,
          url: cleanUrl
        });
      }
    }

    function search(node: any) {
      if (!node || typeof node !== 'object') return;
      visitedCount++;

      // Handle arrays
      if (Array.isArray(node)) {
        for (const item of node) {
          search(item);
        }
        return;
      }

      // Check for video_versions array
      if (Array.isArray(node.video_versions)) {
        for (const v of node.video_versions) {
          if (v && typeof v.url === 'string') {
            addVideoCandidate({
              url: v.url,
              width: typeof v.width === 'number' ? v.width : undefined,
              height: typeof v.height === 'number' ? v.height : undefined,
              type: v.type || 'mp4'
            });
          }
        }
      }

      // Check direct video_url or video_src fields
      if (typeof node.video_url === 'string') {
        addVideoCandidate({ url: node.video_url, width: node.dimensions?.width, height: node.dimensions?.height });
      }
      if (typeof node.video_src === 'string') {
        addVideoCandidate({ url: node.video_src });
      }

      // Check fallback meta properties
      if (typeof node.og_fallback_video === 'string') {
        addVideoCandidate({ url: node.og_fallback_video });
      }

      // Extract metadata fields if found
      if (!metadata.author) {
        if (typeof node.username === 'string') metadata.author = node.username;
        else if (node.owner && typeof node.owner.username === 'string') metadata.author = node.owner.username;
        else if (node.author && typeof node.author.name === 'string') metadata.author = node.author.name;
      }

      if (!metadata.title) {
        if (typeof node.caption === 'string') metadata.title = node.caption;
        else if (node.edge_media_to_caption?.edges?.[0]?.node?.text) {
          metadata.title = node.edge_media_to_caption.edges[0].node.text;
        } else if (typeof node.og_fallback_title === 'string') {
          metadata.title = node.og_fallback_title;
        } else if (typeof node.text === 'string' && node.text.length > 5) {
          metadata.title = node.text;
        }
      }

      if (!metadata.thumbnail) {
        if (typeof node.display_url === 'string') metadata.thumbnail = node.display_url;
        else if (typeof node.thumbnail_src === 'string') metadata.thumbnail = node.thumbnail_src;
        else if (Array.isArray(node.display_resources) && node.display_resources.length > 0) {
          const topRes = node.display_resources[node.display_resources.length - 1];
          if (topRes && typeof topRes.src === 'string') metadata.thumbnail = topRes.src;
        } else if (typeof node.og_fallback_image === 'string') {
          metadata.thumbnail = node.og_fallback_image;
        }
      }

      if (!metadata.duration && typeof node.video_duration === 'number') {
        metadata.duration = node.video_duration;
      }

      if (!metadata.shortcode && typeof node.shortcode === 'string') {
        metadata.shortcode = node.shortcode;
      }

      // Recurse object keys
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (val && typeof val === 'object') {
          search(val);
        } else if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try {
            const parsedString = JSON.parse(val);
            search(parsedString);
          } catch (_) {}
        }
      }
    }

    for (const obj of jsonObjects) {
      search(obj);
    }

    return { videoCandidates, visitedCount, metadata };
  }

  /**
   * STEP 6: Choose highest-resolution MP4
   */
  public selectBestMp4(candidates: VideoCandidate[]): VideoCandidate {
    if (candidates.length === 0) {
      throw new Error('[InstagramReelExtractor - Stage 6] No video_versions or MP4 candidates found in JSON or HTML.');
    }

    // Sort by resolution (width * height) descending
    const sorted = [...candidates].sort((a, b) => {
      const resA = (a.width || 0) * (a.height || 0);
      const resB = (b.width || 0) * (b.height || 0);
      if (resA !== resB) return resB - resA;
      return (b.width || 0) - (a.width || 0);
    });

    return sorted[0];
  }

  /**
   * STEP 9 & 11: Main extract() entry point with full logging & error handling
   */
  public async extract(url: string): Promise<InstagramReelResult> {
    console.log(`[InstagramReelExtractor] Starting extraction for: ${url}`);

    // STEP 1: Normalize URL
    const { canonicalUrl, shortcode } = this.normalizeUrl(url);
    console.log(`[InstagramReelExtractor] Stage 1 OK: Shortcode=${shortcode}, Canonical=${canonicalUrl}`);

    // STEP 2: Fetch HTML
    const html = await this.fetchHtml(canonicalUrl);
    console.log(`[InstagramReelExtractor] Stage 2 OK: Fetched HTML length=${html.length} chars`);

    // STEP 3: Save Debug HTML
    this.saveDebugHtml(html);

    // STEP 4: Discover JSON Blocks
    const { jsonObjects, rawBlocksCount } = this.discoverJsonBlocks(html);
    console.log(`[InstagramReelExtractor] Stage 4 OK: Found ${jsonObjects.length} parsed JSON objects (from ${rawBlocksCount} candidate blocks)`);

    // STEP 5: Traverse JSON recursively
    const { videoCandidates, visitedCount, metadata } = this.traverseJson(jsonObjects);
    console.log(`[InstagramReelExtractor] Stage 5 OK: Visited ${visitedCount} recursive objects. Found ${videoCandidates.length} video candidate(s)`);

    // STEP 6: Select highest quality video
    const bestVideo = this.selectBestMp4(videoCandidates);
    const chosenRes = bestVideo.width && bestVideo.height ? `${bestVideo.width}x${bestVideo.height}` : 'unknown';
    console.log(`[InstagramReelExtractor] Stage 6 OK: Chosen MP4 Resolution=${chosenRes}`);
    console.log(`[InstagramReelExtractor] Stage 6 OK: Chosen MP4 URL=${bestVideo.url.substring(0, 100)}...`);

    // STEP 7 & 8: Build result object
    const result: InstagramReelResult = {
      platform: 'instagram',
      mediaType: 'video',
      shortcode: metadata.shortcode || shortcode,
      title: metadata.title,
      author: metadata.author,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      videoUrl: bestVideo.url
    };

    console.log(`[InstagramReelExtractor] Extraction complete for Reel [${result.shortcode}]`);
    return result;
  }
}

// STEP 12: Export default instance and convenience function
export const instagramReelExtractor = new InstagramReelExtractor();
export async function extractInstagramReel(url: string): Promise<InstagramReelResult> {
  return instagramReelExtractor.extract(url);
}
