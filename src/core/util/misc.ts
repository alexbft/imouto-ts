import { AsyncHandler } from "core/util/promises";
import { logger } from "core/logging/logger";
import { Duration } from "moment";
import { promisify } from 'util';
import * as fs from 'fs';

export interface Props {
  [key: string]: any;
}

export interface PropsOf<T> {
  [key: string]: T | undefined;
}

export type Constructor<T> = Function & { prototype: T }

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
    logger.error('', e.stack || e);
  }
}

export function pause(delay: Duration): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay.asMilliseconds());
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
  const flags = pat.flags + 'i';
  return new RegExp(src, flags);
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

export function reverseMultiMap<K, V>(map: Map<K, V[]>): Map<V, K[]> {
  const result: Map<V, K[]> = new Map();
  for (const [k, vs] of map) {
    for (const v of vs) {
      let list: K[] | undefined = result.get(v);
      if (list == null) {
        list = [];
        result.set(v, list);
      }
      list.push(k);
    }
  }
  return result;
}

export function removeItem<T>(list: T[], item: T): T | undefined {
  const index = list.indexOf(item);
  if (index !== -1) {
    return list.splice(index, 1)[0];
  } else {
    return;
  }
}

export function capitalize(s: string): string {
  if (s == null || s.trim() === '') {
    return s;
  }
  s = s.trim();
  return s.charAt(0).toUpperCase() + s.substr(1);
}

export const exists = promisify(fs.exists);

export const readFile = promisify(fs.readFile);

export async function readJson(filename: string): Promise<any> {
  const raw = await readFile(filename);
  return JSON.parse(raw.toString());
}

export function last<T>(list: T[]): T | undefined {
  if (list.length === 0) {
    return undefined;
  }
  return list[list.length - 1];
}

export function putIfAbsent<K, V>(map: Map<K, V>, key: K, valueFunc: () => V): V {
  if (map.has(key)) {
    return map.get(key)!;
  } else {
    const value = valueFunc();
    map.set(key, value);
    return value;
  }
}

export function botReference(r: RegExp): RegExp {
  return new RegExp(r.source.replace('(bot)',
    '(сестричка|сестрёнка|сестренка|сестра|бот|сис)'));
}
