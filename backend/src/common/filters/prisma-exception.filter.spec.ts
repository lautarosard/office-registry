import { ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: 'test',
  });

describe('PrismaExceptionFilter', () => {
  const host = {} as ArgumentsHost;
  let forwarded: jest.SpyInstance;

  beforeEach(() => {
    forwarded = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => undefined);
  });

  afterEach(() => forwarded.mockRestore());

  it.each([
    ['P2025', 404],
    ['P2002', 409],
  ])('maps %s to %i', (code, status) => {
    new PrismaExceptionFilter().catch(prismaError(code), host);

    const [[error]] = forwarded.mock.calls as [[HttpException]];
    expect(error.getStatus()).toBe(status);
  });

  it('leaves other Prisma errors untouched', () => {
    const original = prismaError('P2003');

    new PrismaExceptionFilter().catch(original, host);

    expect(forwarded).toHaveBeenCalledWith(original, host);
  });
});
