/**
 * JsonWalker
 * Shared recursive JSON traversal utility for extracting media, metadata,
 * key-value matching, and object structures from arbitrary JSON.
 */
export class JsonWalker {
  /**
   * Recursively walks any object/array and applies a visitor callback to each node.
   */
  public static walk(obj: any, visitor: (node: any, path: string[]) => void | boolean, path: string[] = []): void {
    if (!obj || typeof obj !== 'object') return;

    const shouldStop = visitor(obj, path);
    if (shouldStop === true) return;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        this.walk(obj[i], visitor, [...path, i.toString()]);
      }
    } else {
      for (const key of Object.keys(obj)) {
        try {
          this.walk(obj[key], visitor, [...path, key]);
        } catch (_) {
          // Ignore getter errors or unparseable circular refs
        }
      }
    }
  }

  /**
   * Finds all property values matching a given key name.
   */
  public static findValuesByKey<T = any>(obj: any, targetKey: string): T[] {
    const results: T[] = [];
    this.walk(obj, (node) => {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        if (Object.prototype.hasOwnProperty.call(node, targetKey)) {
          results.push(node[targetKey]);
        }
      }
    });
    return results;
  }

  /**
   * Finds the first object in a nested JSON structure that contains a specific key.
   */
  public static findFirstObjectWithKey(obj: any, targetKey: string): any | null {
    let result: any = null;
    this.walk(obj, (node) => {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        if (Object.prototype.hasOwnProperty.call(node, targetKey)) {
          result = node;
          return true; // Stop walking
        }
      }
    });
    return result;
  }

  /**
   * Finds all objects matching a predicate function.
   */
  public static findObjects(obj: any, predicate: (node: any) => boolean): any[] {
    const results: any[] = [];
    this.walk(obj, (node) => {
      if (node && typeof node === 'object' && predicate(node)) {
        results.push(node);
      }
    });
    return results;
  }

  /**
   * Searches for URLs matching a regex pattern inside the JSON tree.
   */
  public static findUrlsMatching(obj: any, regexPattern: RegExp): string[] {
    const urls = new Set<string>();
    this.walk(obj, (node) => {
      if (typeof node === 'string' && regexPattern.test(node)) {
        urls.add(node);
      }
    });
    return Array.from(urls);
  }

  /**
   * Safely unwraps nested stringified JSON blobs within an object.
   */
  public static parseEmbeddedJsonStrings(htmlOrScript: string): any[] {
    const parsedObjects: any[] = [];
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = scriptRegex.exec(htmlOrScript)) !== null) {
      const content = match[1]?.trim();
      if (!content) continue;

      if (content.startsWith('{') || content.startsWith('[')) {
        try {
          parsedObjects.push(JSON.parse(content));
          continue;
        } catch (_) {}
      }

      // Look for embedded JSON blocks inside script assignments
      const jsonSubmatches = content.match(/(\{[\s\S]*?\})/g);
      if (jsonSubmatches) {
        for (const sub of jsonSubmatches) {
          if (sub.length > 20) {
            try {
              parsedObjects.push(JSON.parse(sub));
            } catch (_) {}
          }
        }
      }
    }
    return parsedObjects;
  }
}
