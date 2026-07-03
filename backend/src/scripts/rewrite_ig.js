const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../services/extractors/InstagramExtractor.ts');
let content = fs.readFileSync(file, 'utf8');

const replace1_start = content.indexOf('    private static getBestImage(');
const replace1_end = content.indexOf('    private static async attemptExtract(');

const newMethods = `    private static getAllCandidates(node: any): any[] {
        let candidates: any[] = [];
        
        if (node.image_versions2 && node.image_versions2.candidates) {
            candidates = candidates.concat(node.image_versions2.candidates);
        }
        if (node.display_resources) {
            candidates = candidates.concat(node.display_resources.map((r: any) => ({ url: r.src, width: r.config_width, height: r.config_height })));
        }
        if (node.candidates) {
            candidates = candidates.concat(node.candidates);
        }
        if (node.thumbnail_resources) {
            candidates = candidates.concat(node.thumbnail_resources.map((r: any) => ({ url: r.src, width: r.config_width, height: r.config_height })));
        }
        if (node.display_url) {
            candidates.push({ url: node.display_url, width: node.dimensions?.width || 0, height: node.dimensions?.height || 0 });
        }
        if (node.original_width && node.original_height && node.original_url) {
             candidates.push({ url: node.original_url, width: node.original_width, height: node.original_height });
        }
        
        const valid = candidates.filter(c => c && c.url && typeof c.url === 'string' && !c.url.includes('logging_page_id'));
        
        const unique = [];
        const seen = new Set();
        for (const c of valid) {
            if (!seen.has(c.url)) {
                seen.add(c.url);
                unique.push({
                    url: c.url,
                    width: c.width || 0,
                    height: c.height || 0,
                    area: (c.width || 0) * (c.height || 0)
                });
            }
        }
        
        unique.sort((a, b) => b.area - a.area);
        return unique;
    }

    private static parseImageNode(node: any, index: number, metadataSource: string): any {
        const candidates = this.getAllCandidates(node);
        if (candidates.length === 0) return null;

        const best = candidates[0];
        const smallest = candidates[candidates.length - 1];
        
        const downloadUrl = best.url;
        const thumbnail = smallest.url;

        console.log(\`Image Index: \${index}\`);
        console.log(\`Thumbnail URL: \${thumbnail.substring(0, 50)}...\`);
        console.log(\`Download URL: \${downloadUrl.substring(0, 50)}...\`);
        console.log(\`Width: \${best.width}\`);
        console.log(\`Height: \${best.height}\`);
        console.log(\`Source: \${metadataSource}\`);
        console.log(\`Chosen Resolution: \${best.width}x\${best.height}\`);
        console.log(\`Thumbnail Resolution: \${smallest.width}x\${smallest.height}\`);
        console.log(\`Download Resolution: \${best.width}x\${best.height}\`);
        console.log(\`Selected Resolution: \${best.width}x\${best.height}\\n\`);

        return {
            id: node.id || \`ig-\${index}\`,
            url: thumbnail,
            downloadUrl: downloadUrl,
            filename: \`instagram_\${node.id || index}.jpg\`,
            format: 'jpg',
            width: best.width,
            height: best.height,
            source: metadataSource
        };
    }

    private static extractImagesFromNode(node: any, images: any[], metadataSource: string) {
        if (!node || typeof node !== 'object') return;

        if (Array.isArray(node)) {
            for (const item of node) {
                this.extractImagesFromNode(item, images, metadataSource);
            }
            return;
        }

        let foundChildren = false;
        const childKeys = ['edge_sidecar_to_children', 'carousel_media', 'GraphSidecar', 'children', 'edges', 'items', 'media'];
        for (const key of childKeys) {
            if (node[key]) {
                this.extractImagesFromNode(node[key], images, metadataSource);
                foundChildren = true;
            }
        }
        
        if (node.node) {
            this.extractImagesFromNode(node.node, images, metadataSource);
            return;
        }

        if (node.image_versions2 || node.display_resources || node.display_url || node.candidates) {
            const img = this.parseImageNode(node, images.length, metadataSource);
            if (img && !images.some(existing => existing.downloadUrl === img.downloadUrl)) {
                images.push(img);
            }
        }
    }

`;
content = content.substring(0, replace1_start) + newMethods + content.substring(replace1_end);

content = content.replace(
`                                for (let i = 0; i < edges.length; i++) {
                                    const node = edges[i]?.node;
                                    if (node?.is_video || node?.video_url) isVideo = true;
                                    const img = this.parseImageNode(node, i, 'Embedded JSON');
                                    if (img) images.push(img);
                                }
                                if (images.length > 0) metadataSource = 'Embedded JSON';`,
`                                this.extractImagesFromNode(edges, images, 'Embedded JSON');
                                if (images.length > 0) metadataSource = 'Embedded JSON';`
);

content = content.replace(
`                                    const dr = JSON.parse(drMatch[1]);
                                    const best = this.getBestImage(dr.map((r: any) => ({ url: r.src, width: r.config_width, height: r.config_height })));
                                    if (best) {
                                        images.push({ id: 'ig-1', url: best.url, downloadUrl: best.url, format: 'jpg', width: best.width, height: best.height, filename: 'instagram_1.jpg' });
                                        metadataSource = 'Embedded JSON';
                                    }`,
`                                    const dr = JSON.parse(drMatch[1]);
                                    this.extractImagesFromNode({ display_resources: dr }, images, 'Embedded JSON');
                                    if (images.length > 0) metadataSource = 'Embedded JSON';`
);

content = content.replace(
`                            if (item.carousel_media) {
                                for (let i = 0; i < item.carousel_media.length; i++) {
                                    const media = item.carousel_media[i];
                                    if (media.video_versions) isVideo = true;
                                    const img = this.parseImageNode(media, i, '__NEXT_DATA__');
                                    if (img) images.push(img);
                                }
                                if (images.length > 0) metadataSource = '__NEXT_DATA__';
                            } else {
                                const img = this.parseImageNode(item, 0, '__NEXT_DATA__');
                                if (img) { images.push(img); metadataSource = '__NEXT_DATA__'; }
                            }`,
`                            this.extractImagesFromNode(item, images, '__NEXT_DATA__');
                            if (images.length > 0) metadataSource = '__NEXT_DATA__';`
);

content = content.replace(
`                            for (let i = 0; i < edges.length; i++) {
                                const node = edges[i]?.node;
                                if (node?.is_video) isVideo = true;
                                const img = this.parseImageNode(node, i, 'window._sharedData');
                                if (img) images.push(img);
                            }
                            if (images.length > 0) metadataSource = 'window._sharedData';
                        } else {
                            const media = sd?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                            if (media) {
                                if (media.is_video) isVideo = true;
                                const img = this.parseImageNode(media, 0, 'window._sharedData');
                                if (img) { images.push(img); metadataSource = 'window._sharedData'; }
                            }
                        }`,
`                            this.extractImagesFromNode(edges, images, 'window._sharedData');
                            if (images.length > 0) metadataSource = 'window._sharedData';
                        } else {
                            const media = sd?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                            if (media) {
                                if (media.is_video) isVideo = true;
                                this.extractImagesFromNode(media, images, 'window._sharedData');
                                if (images.length > 0) metadataSource = 'window._sharedData';
                            }
                        }`
);

content = content.replace(
`                                for (let i = 0; i < edges.length; i++) {
                                    const img = this.parseImageNode(edges[i].node, i, 'additionalDataLoaded');
                                    if (img) images.push(img);
                                }
                                if (images.length > 0) metadataSource = 'additionalDataLoaded';
                            } else {
                                const img = this.parseImageNode(media, 0, 'additionalDataLoaded');
                                if (img) { images.push(img); metadataSource = 'additionalDataLoaded'; }
                            }`,
`                                this.extractImagesFromNode(edges, images, 'additionalDataLoaded');
                                if (images.length > 0) metadataSource = 'additionalDataLoaded';
                            } else {
                                this.extractImagesFromNode(media, images, 'additionalDataLoaded');
                                if (images.length > 0) metadataSource = 'additionalDataLoaded';
                            }`
);

fs.writeFileSync(file, content);
console.log("Rewrote InstagramExtractor.ts successfully");
