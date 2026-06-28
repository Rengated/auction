import { Logger } from '@nestjs/common';
import { loadavg } from 'os';
import { monitorEventLoopDelay } from 'perf_hooks';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');
const slowMs = Number(process.env.SLOW_HTTP_MS ?? 500);
const eventLoop = monitorEventLoopDelay({ resolution: 20 });

eventLoop.enable();

function msSince(start: bigint): number {
  return Number(process.hrtime.bigint() - start) / 1_000_000;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function pathOf(req: Request): string {
  return req.originalUrl || req.url;
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = round(msSince(start));
    if (durationMs < slowMs && res.statusCode < 500) return;

    const rssMb = round(process.memoryUsage().rss / 1024 / 1024);
    const load = loadavg().map(round).join(',');
    const eventLoopP95Ms = round(eventLoop.percentile(95) / 1_000_000);
    const len = res.getHeader('content-length') ?? '-';
    const line = `${req.method} ${pathOf(req)} ${res.statusCode} ${durationMs}ms bytes=${len} rss=${rssMb}MB load=${load} evloop_p95=${eventLoopP95Ms}ms`;

    if (res.statusCode >= 500) logger.error(line);
    else logger.warn(line);
  });
  next();
}
