const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../services/extractors/InstagramExtractor.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    "fs.writeFileSync(path.join(DEBUG_DIR, 'instagram.html'), html);",
    "fs.writeFileSync(path.join(DEBUG_DIR, 'runtime-instagram.html'), html);"
);

// We need to inject the verbose logging.
// I will write a completely new `attemptExtract` body to replace the current one.
// Let's find the start and end of `attemptExtract`
const attemptStart = content.indexOf('    private static async attemptExtract(');
const attemptEnd = content.indexOf('    }\n}', attemptStart);

const newAttemptExtract = `    private static async attemptExtract(url: string, useCookies: boolean, overallStart: number): Promise<ExtractionResult> {
        let html = '';
        
        try {
            const headers = useCookies ? getHeadersForUrl(url) : {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            };
            
            const response = await fetch(url, { headers, redirect: 'follow' });
            html = await response.text();
            
            if (html.length > 50) fs.writeFileSync(path.join(DEBUG_DIR, 'runtime-instagram.html'), html);

            if (!response.ok) {
                console.log(\`Fetch failed with status: \${response.status}\`);
                return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Instagram' };
            }

            const $ = cheerio.load(html);

            let isVideo = false;
            let images: Array<any> = [];
            let metadataSource = '';

            let title = $('meta[property="og:title"]').attr('content') || 'Instagram Post';
            let ogImage = $('meta[property="og:image"]').attr('content') || '';
            let ogVideo = $('meta[property="og:video"]').attr('content') || '';

            // 1. Embedded JSON (Regex match for anything that looks like xdt_shortcode_media)
            console.log("Trying embedded JSON...");
            if (images.length === 0 && !isVideo) {
                const embeddedMatch = html.match(/"(?:xdt_)?shortcode_media"\\s*:\\s*(\\{.*)/s);
                if (embeddedMatch) {
                    try {
                        let partial = embeddedMatch[1];
                        if (partial.includes('"is_video":true') || partial.includes('"video_url"')) {
                            isVideo = true;
                            metadataSource = 'Embedded JSON';
                        }
                        
                        let edgesStr = '';
                        const edgesIndex = partial.indexOf('"edges":');
                        if (edgesIndex > -1) {
                            const arrayStart = partial.indexOf('[', edgesIndex);
                            if (arrayStart > -1) {
                                let depth = 0;
                                for (let j = arrayStart; j < partial.length; j++) {
                                    if (partial[j] === '[') depth++;
                                    else if (partial[j] === ']') {
                                        depth--;
                                        if (depth === 0) {
                                            edgesStr = partial.substring(arrayStart, j + 1);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        
                        if (edgesStr) {
                            try {
                                const edges = JSON.parse(edgesStr);
                                this.extractImagesFromNode(edges, images, 'Embedded JSON');
                                if (images.length > 0) {
                                    metadataSource = 'Embedded JSON';
                                    console.log("Found: YES (Parsed edges)");
                                } else {
                                    console.log("Found: NO (Edges array parsed but no images found)");
                                }
                            } catch(e) { console.log("Found: NO (Failed to parse edges JSON)"); }
                        } else {
                            try {
                                const drMatch = partial.match(/"display_resources"\\s*:\\s*(\\[.*?\\])/s);
                                if (drMatch) {
                                    const dr = JSON.parse(drMatch[1]);
                                    this.extractImagesFromNode({ display_resources: dr }, images, 'Embedded JSON');
                                    if (images.length > 0) {
                                        metadataSource = 'Embedded JSON';
                                        console.log("Found: YES (Parsed display_resources)");
                                    } else {
                                        console.log("Found: NO (Parsed display_resources but no images found)");
                                    }
                                } else {
                                    console.log("Found: NO (Could not find display_resources)");
                                }
                            } catch (e) { console.log("Found: NO (Error parsing display_resources)"); }
                        }
                    } catch (e) { console.log("Found: NO (Regex matched but failed to process)"); }
                } else {
                    console.log("Found: NO (Regex match failed for embedded JSON)");
                }
            } else {
                console.log("Found: NO (Skipped, already found data)");
            }

            // 2. __NEXT_DATA__
            console.log("Trying __NEXT_DATA__...");
            if (images.length === 0 && !isVideo) {
                const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\\/json">(.*?)<\\/script>/s);
                if (nextDataMatch) {
                    try {
                        const nextData = JSON.parse(nextDataMatch[1]);
                        const items = nextData?.props?.pageProps?.routeProps?.items || [];
                        if (items.length > 0) {
                            const item = items[0];
                            if (item.video_versions || item.is_video) {
                                isVideo = true;
                                metadataSource = '__NEXT_DATA__';
                            }
                            this.extractImagesFromNode(item, images, '__NEXT_DATA__');
                            if (images.length > 0) {
                                metadataSource = '__NEXT_DATA__';
                                console.log("Found: YES");
                            } else {
                                console.log("Found: NO (Parsed items but no images found)");
                            }
                        } else {
                            console.log("Found: NO (No items found in routeProps)");
                        }
                    } catch (e) {
                        console.log("Found: NO (Error parsing __NEXT_DATA__ JSON)");
                    }
                } else {
                    console.log("Found: NO (Regex match failed for __NEXT_DATA__)");
                }
            } else {
                console.log("Found: NO (Skipped, already found data)");
            }

            // 3. application/ld+json
            console.log("Trying application/ld+json...");
            if (images.length === 0 && !isVideo) {
                let foundLd = false;
                $('script[type="application/ld+json"]').each((_, el) => {
                    try {
                        const data = JSON.parse($(el).html() || '{}');
                        const items = Array.isArray(data) ? data : [data];
                        for (let i = 0; i < items.length; i++) {
                            const item = items[i];
                            if (item['@type'] === 'VideoObject') {
                                isVideo = true;
                                metadataSource = 'application/ld+json';
                                foundLd = true;
                            } else if (item['@type'] === 'ImageObject' || item['@type'] === 'ImageGallery') {
                                if (item.image) {
                                    let imgList = Array.isArray(item.image) ? item.image : [item.image];
                                    for (let j = 0; j < imgList.length; j++) {
                                        images.push({
                                            id: \`ig-ld-\${j}\`, url: imgList[j], downloadUrl: imgList[j],
                                            format: 'jpg', filename: \`instagram_ld_\${j}.jpg\`, width: 0, height: 0, source: 'application/ld+json'
                                        });
                                    }
                                    metadataSource = 'application/ld+json';
                                    foundLd = true;
                                }
                            }
                        }
                    } catch (e) {}
                });
                if (foundLd) console.log("Found: YES");
                else console.log("Found: NO (Did not find relevant schema objects)");
            } else {
                console.log("Found: NO (Skipped, already found data)");
            }

            // 4. window._sharedData
            console.log("Trying window._sharedData...");
            if (images.length === 0 && !isVideo) {
                const sharedDataMatch = html.match(/window\\._sharedData\\s*=\\s*({.*?});<\\/script>/s);
                if (sharedDataMatch) {
                    try {
                        const sd = JSON.parse(sharedDataMatch[1]);
                        const edges = sd?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media?.edge_sidecar_to_children?.edges;
                        if (edges) {
                            this.extractImagesFromNode(edges, images, 'window._sharedData');
                            if (images.length > 0) {
                                metadataSource = 'window._sharedData';
                                console.log("Found: YES (Parsed edges)");
                            } else {
                                console.log("Found: NO (Parsed edges but no images found)");
                            }
                        } else {
                            const media = sd?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                            if (media) {
                                if (media.is_video) isVideo = true;
                                this.extractImagesFromNode(media, images, 'window._sharedData');
                                if (images.length > 0) {
                                    metadataSource = 'window._sharedData';
                                    console.log("Found: YES (Parsed media)");
                                } else {
                                    console.log("Found: NO (Parsed media but no images found)");
                                }
                            } else {
                                console.log("Found: NO (No media found in shortcode_media)");
                            }
                        }
                    } catch (e) {
                        console.log("Found: NO (Failed to parse JSON for _sharedData)");
                    }
                } else {
                    console.log("Found: NO (Regex match failed for _sharedData)");
                }
            } else {
                console.log("Found: NO (Skipped, already found data)");
            }

            // 5. additionalDataLoaded
            console.log("Trying additionalDataLoaded...");
            if (images.length === 0 && !isVideo) {
                const addDataMatch = html.match(/window\\.__additionalDataLoaded\\([^,]+,\\s*({.*?})\\);/s);
                if (addDataMatch) {
                    try {
                        const data = JSON.parse(addDataMatch[1]);
                        const media = data?.graphql?.shortcode_media || data?.require?.[0]?.[3]?.[0]?.[__d_args_path] ; 
                        // Note: I will just use the standard parse for now
                        if (media) {
                            if (media.is_video) isVideo = true;
                            if (media.edge_sidecar_to_children?.edges) {
                                const edges = media.edge_sidecar_to_children.edges;
                                this.extractImagesFromNode(edges, images, 'additionalDataLoaded');
                                if (images.length > 0) {
                                    metadataSource = 'additionalDataLoaded';
                                    console.log("Found: YES (Parsed edges)");
                                } else {
                                    console.log("Found: NO (Parsed edges but no images found)");
                                }
                            } else {
                                this.extractImagesFromNode(media, images, 'additionalDataLoaded');
                                if (images.length > 0) {
                                    metadataSource = 'additionalDataLoaded';
                                    console.log("Found: YES (Parsed media)");
                                } else {
                                    console.log("Found: NO (Parsed media but no images found)");
                                }
                            }
                        } else {
                            console.log("Found: NO (No shortcode_media in additionalDataLoaded)");
                        }
                    } catch (e) {
                        console.log("Found: NO (Failed to parse JSON for additionalDataLoaded)");
                    }
                } else {
                    console.log("Found: NO (Regex match failed for additionalDataLoaded)");
                }
            } else {
                console.log("Found: NO (Skipped, already found data)");
            }
            
            // NEW STRATEGY for modern Instagram: polaris embedded JSON or require array
            console.log("Trying Polaris/Relay/GraphQL embedded state...");
            if (images.length === 0 && !isVideo) {
                 // Try searching for PolarisPost or similar graphql responses
                 try {
                     let foundPolaris = false;
                     // Instagram often puts GraphQL data inside window.__initialData.data
                     const scripts = $('script').map((_, el) => $(el).html()).get();
                     for (const script of scripts) {
                         if (script.includes('"edge_sidecar_to_children"') || script.includes('"carousel_media"') || script.includes('"image_versions2"')) {
                             // Attempt to extract raw JSON
                             const matches = script.match(/({.*})/g);
                             if (matches) {
                                 for (const m of matches) {
                                     if (m.includes('"image_versions2"') || m.includes('"display_resources"')) {
                                         try {
                                             const obj = JSON.parse(m);
                                             this.extractImagesFromNode(obj, images, 'GraphQL State');
                                             if (images.length > 0) {
                                                 metadataSource = 'GraphQL State';
                                                 foundPolaris = true;
                                             }
                                         } catch(e) {}
                                     }
                                 }
                             }
                         }
                     }
                     if (foundPolaris) console.log("Found: YES");
                     else console.log("Found: NO (Could not find image_versions2 in raw script tags)");
                 } catch (e) {
                     console.log("Found: NO (Error parsing script tags)");
                 }
            } else {
                console.log("Found: NO (Skipped, already found data)");
            }

            // 6. OpenGraph
            console.log("Trying OpenGraph...");
            if (images.length === 0 && !isVideo) {
                console.log("Reached fallback because all previous extraction strategies failed.");
                const ogType = $('meta[property="og:type"]').attr('content') || '';
                if (ogType === 'video' || ogVideo) {
                    isVideo = true;
                    metadataSource = 'OpenGraph';
                    console.log("Found: YES (Video)");
                } else if (ogImage) {
                    images.push({
                        id: 'ig-og', url: ogImage, downloadUrl: ogImage,
                        format: 'jpg', filename: 'instagram_og.jpg', width: 0, height: 0, source: 'OpenGraph'
                    });
                    metadataSource = 'OpenGraph';
                    console.log("Found: YES (Image)");
                } else {
                    console.log("Found: NO (No OpenGraph tags found)");
                }
            } else {
                console.log("Found: NO (Skipped, already found data)");
            }

            // Final logging format exactly as requested by user
            let resultType: 'IMAGE' | 'VIDEO' | 'GALLERY' | 'UNKNOWN' = 'UNKNOWN';
            
            if (isVideo) {
                resultType = 'VIDEO';
            } else if (images.length > 1) {
                resultType = 'GALLERY';
            } else if (images.length === 1) {
                resultType = 'IMAGE';
            }

            if (resultType !== 'UNKNOWN') {
                const highestRes = images.length > 0 
                    ? images.reduce((max, img) => ((img.width * img.height) > (max.width * max.height) ? img : max), images[0])
                    : null;
                const resStr = highestRes && highestRes.width && highestRes.height ? \`\${highestRes.width}x\${highestRes.height}\` : 'Unknown';

                console.log(\`\\nPlatform: Instagram\`);
                console.log(\`Media Type: \${resultType.charAt(0).toUpperCase() + resultType.slice(1).toLowerCase()}\`);
                console.log(\`Source Used: \${metadataSource}\`);
                console.log(\`Number of Images: \${images.length}\`);
                console.log(\`Highest Resolution: \${resStr}\`);
                console.log(\`Download URLs Generated: \${images.length}\`);
                console.log(\`Execution Time: \${Math.round(performance.now() - overallStart)}ms\`);
                console.log(\`Result: SUCCESS\\n\`);

                return {
                    mediaType: resultType,
                    title,
                    author: '',
                    thumbnail: images.length > 0 ? images[0].url : ogImage,
                    images: images.length > 0 ? images : undefined,
                    duration: 0,
                    source: 'Instagram'
                };
            }

            return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Instagram' };

        } catch (err: any) {
            console.error("Attempt Extract error: ", err);
            return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Instagram' };
        }`;

content = content.substring(0, attemptStart) + newAttemptExtract + content.substring(attemptEnd);

fs.writeFileSync(file, content);
console.log("Updated attemptExtract successfully!");
