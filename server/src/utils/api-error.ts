/**
 * Application-level error carrying an HTTP status code. The global error handler
 * turns any thrown `ApiError` into a consistent JSON envelope.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message: string, details?: unknown) {
    return new ApiError(409, message, details);
  }

  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, message, details);
  }

  static badGateway(message: string, details?: unknown) {
    return new ApiError(502, message, details);
  }

  static internal(message = 'Internal server error', details?: unknown) {
    return new ApiError(500, message, details);
  }
}
