import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** Multer's "File too large", in Spanish. */
@Catch(PayloadTooLargeException)
export class UploadTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(413).json({
      statusCode: 413,
      error: 'Payload Too Large',
      message: 'El archivo supera el máximo de 5 MB.',
    });
  }
}
