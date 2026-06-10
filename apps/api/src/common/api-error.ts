import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@hermes/shared';

/** Доменная ошибка с кодом из shared — клиент матчит по code. */
export class ApiError extends HttpException {
  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}
