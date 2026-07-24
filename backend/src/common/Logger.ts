export interface LogDetails {
  platform: string;
  parser: string;
  mediaType: string;
  source: string;
  nativeSuccess: boolean;
  fallbackUsed: boolean;
  executionTimeMs: number;
  message?: string;
}

export class ExtractorLogger {
  public static logExtraction(details: LogDetails): void {
    console.log(`\n========================================`);
    console.log(`[EXTRACTOR LOG] Platform       : ${details.platform}`);
    console.log(`[EXTRACTOR LOG] Parser         : ${details.parser}`);
    console.log(`[EXTRACTOR LOG] Media Type     : ${details.mediaType}`);
    console.log(`[EXTRACTOR LOG] Source         : ${details.source}`);
    console.log(`[EXTRACTOR LOG] Native Success : ${details.nativeSuccess ? 'YES' : 'NO'}`);
    console.log(`[EXTRACTOR LOG] Fallback Used  : ${details.fallbackUsed ? 'YES' : 'NO'}`);
    console.log(`[EXTRACTOR LOG] Execution Time : ${details.executionTimeMs.toFixed(2)} ms`);
    if (details.message) {
      console.log(`[EXTRACTOR LOG] Details        : ${details.message}`);
    }
    console.log(`========================================\n`);
  }

  public static info(message: string, ...meta: any[]): void {
    console.log(`[INFO] ${message}`, ...meta);
  }

  public static warn(message: string, ...meta: any[]): void {
    console.warn(`[WARN] ${message}`, ...meta);
  }

  public static error(message: string, ...meta: any[]): void {
    console.error(`[ERROR] ${message}`, ...meta);
  }
}
