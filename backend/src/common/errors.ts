export type ErrorCode = 
  | 'PRIVATE_POST'
  | 'LOGIN_REQUIRED'
  | 'NOT_FOUND'
  | 'REGIONAL_BLOCK'
  | 'RATE_LIMIT'
  | 'UNSUPPORTED_MEDIA'
  | 'EXTRACTION_FAILED';

export class ExtractorError extends Error {
  public readonly code: ErrorCode;
  public readonly platform: string;
  public readonly originalError?: Error;

  constructor(message: string, code: ErrorCode = 'EXTRACTION_FAILED', platform: string = 'Generic', originalError?: Error) {
    super(message);
    this.name = 'ExtractorError';
    this.code = code;
    this.platform = platform;
    this.originalError = originalError;
    Object.setPrototypeOf(this, ExtractorError.prototype);
  }
}
