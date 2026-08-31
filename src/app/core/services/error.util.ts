import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody, AppError } from '../models/api.model';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

const STATUS_MESSAGES: Record<number, string> = {
  0: 'Cannot reach the server. Check your connection and try again.',
  400: 'The request could not be processed. Please review the details.',
  401: 'Your session is no longer valid. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested record could not be found.',
  409: 'This action conflicts with the current state of the record.',
  422: 'The request could not be processed. Please review the details.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'The server encountered an unexpected error.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'string'
  );
}

/** Collapses any HTTP failure into the single shape the UI renders. */
export function toAppError(error: unknown): AppError {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;

    if (isApiErrorBody(body)) {
      return {
        status: error.status,
        code: body.code,
        message: body.message?.trim() || STATUS_MESSAGES[error.status] || GENERIC_MESSAGE,
        fieldErrors: body.fieldErrors ?? [],
        correlationId: body.correlationId ?? null,
      };
    }

    return {
      status: error.status,
      code: error.status === 0 ? 'NETWORK_ERROR' : `HTTP_${error.status}`,
      message: STATUS_MESSAGES[error.status] ?? GENERIC_MESSAGE,
      fieldErrors: [],
      correlationId: null,
    };
  }

  return {
    status: 0,
    code: 'UNEXPECTED_ERROR',
    message: error instanceof Error ? error.message : GENERIC_MESSAGE,
    fieldErrors: [],
    correlationId: null,
  };
}

/** True when the failure is one the user can fix by signing in again. */
export function isAuthError(error: AppError): boolean {
  return error.status === 401;
}
