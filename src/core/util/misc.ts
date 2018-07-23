import { AsyncHandler } from "core/util/promises";
import { logger } from "core/logging/logger";
import { Duration } from "moment";

export interface Props {
  [key: string]: any;
}

export function random(x: number): number {
  return Math.floor(Math.random() * x);
}

export function randomChoice<T>(a: T[]): T {
  return a[random(a.length)];
}

export function fixMultiline(s: string): string {
  return s.trim().split('\n').map(line => line.trim()).join('\n');
}

export async function safeExecute(action: AsyncHandler<any>): Promise<void> {
  try {
    await action();
  } catch (e) {
    logger.error(e);
  }
}

export function pause(delay: Duration): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay.milliseconds());
  });
}
