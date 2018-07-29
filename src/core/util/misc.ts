import { AsyncHandler } from "core/util/promises";
import { logger } from "core/logging/logger";
import { Duration } from "moment";

export interface Props {
  [key: string]: any;
}

export interface PropsOf<T> {
  [key: string]: T | undefined;
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

export function formatDate(date: Date) {
  const d = date.getDate();
  const ds = d < 10 ? `0${d}` : `${d}`;
  const m = date.getMonth() + 1;
  const ms = m < 10 ? `0${m}` : `${m}`;
  const y = date.getFullYear();
  return `${ds}.${ms}.${y} ${date.toLocaleTimeString()}`;
}

export function fixPattern(pat: RegExp): RegExp {
  const src = pat.source
    .replace(/\\b/g, '(?:^|$|\\W)')
    .replace(/\\w/g, '[a-zA-Zа-яА-Я0-9]')
    .replace(/\\W/g, '[^a-zA-Zа-яА-Я0-9]');
  return new RegExp(src, 'i');
}

export function findAll(s: string, regex: RegExp): RegExpExecArray[] {
  if (!regex.flags.includes('g')) {
    throw new Error('RegExp is not global');
  }
  if (regex.lastIndex !== 0) {
    regex.lastIndex = 0;
  }
  let match: RegExpExecArray | null;
  let result: RegExpExecArray[] = [];
  while ((match = regex.exec(s)) != null) {
    result.push(match);
  }
  return result;
}

export function tryParseInt(s?: string): number | null {
  if (s == null) {
    return null;
  }
  const x = parseInt(s, 10);
  if (!isNaN(x) && x.toString() === s) {
    return x;
  }
  return null;
}
