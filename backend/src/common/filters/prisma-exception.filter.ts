import {
  ArgumentsHost,
  Catch,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/**
 * Translates known Prisma errors into HTTP errors without leaking query
 * details. Any other Prisma code falls through to the default 500 handling.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (exception.code) {
      case 'P2025': // record required by the operation was not found
        return super.catch(
          new NotFoundException('El recurso solicitado no existe.'),
          host,
        );
      case 'P2002': // unique constraint violation
        return super.catch(
          new ConflictException('Ya existe un registro con esos datos.'),
          host,
        );
      default:
        return super.catch(exception, host);
    }
  }
}
