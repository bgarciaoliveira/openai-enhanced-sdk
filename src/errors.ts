// src/errors.ts

export class OpenAIError extends Error {
  statusCode?: number;
  data?: any;

  constructor(message: string, statusCode?: number, data?: any) {
    super(message);
    this.name = 'OpenAIError';
    this.statusCode = statusCode;
    this.data = data;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends OpenAIError {
  constructor(message: string, statusCode?: number, data?: any) {
    super(message, statusCode, data);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends OpenAIError {
  constructor(message: string, statusCode?: number, data?: any) {
    super(message, statusCode, data);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends OpenAIError {
  constructor(message: string, statusCode?: number, data?: any) {
    super(message, statusCode, data);
    this.name = 'RateLimitError';
  }
}

export class APIError extends OpenAIError {
  constructor(message: string, statusCode?: number, data?: any) {
    super(message, statusCode, data);
    this.name = 'APIError';
  }
}
