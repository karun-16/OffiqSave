export const cleanUrl = (urlStr: string): string => {
    try {
        const parsed = new URL(urlStr);
        // Common tracking parameters to remove
        const paramsToRemove = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'igsh', 'fbclid', 'gclid', 'si', 'ref', 'source'
        ];
        
        paramsToRemove.forEach(p => parsed.searchParams.delete(p));
        
        return parsed.toString();
    } catch {
        return urlStr; // Return original if parsing fails
    }
};
