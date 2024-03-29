import { logger } from "core/logging/logger";
import { AsyncHandler } from "core/util/promises";
import * as fs from 'fs';
import { Duration } from "moment";
import { User } from 'node-telegram-bot-api';
import { promisify } from 'util';

export const maxDelayNodeJs = 2147483647;

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
  } catch (e: any) {
    logger.error('', e.stack || e);
  }
}

export async function pause(delay: Duration): Promise<void> {
  const _pause = (delay: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  const delayMs = delay.asMilliseconds();
  const fullWait = Math.floor(delayMs / maxDelayNodeJs);
  const restWait = delayMs % maxDelayNodeJs;
  for (let i = 0; i < fullWait; ++i) {
    await _pause(maxDelayNodeJs);
  }
  await _pause(restWait);
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

export function replaceInPattern(r: RegExp, searchString: string, replaceValue: string): RegExp {
  return new RegExp(r.source.replace(searchString, replaceValue), r.flags);
}

export function botReference(r: RegExp): RegExp {
  return replaceInPattern(r, '(bot)', '(сестричка|сестрёнка|сестренка|сестра|бот|сис)');
}

export function repeatString(s: string, n: number): string {
  let buf = '';
  for (let i = 0; i < n; ++i) {
    buf += s;
  }
  return buf;
}

const translitRulesStr = 'а-a,б-b,в-v,г-g,д-d,е-e,ё-yo,ж-zh,з-z,и-i,й-y,к-k,л-l,м-m,н-n,о-o,п-p,р-r,с-s,т-t,у-u,ф-f,х-kh,ц-c,ч-ch,ш-sh,щ-shch,ъ-,ы-yi,ь-,э-e,ю-yu,я-ya';
const translitRulesRuEn = new Map<string, string>();
translitRulesStr.split(',').forEach(pair => {
  const [ru, en] = pair.split('-');
  translitRulesRuEn.set(ru, en);
  const upRu = ru.toUpperCase();
  const upEn = en.length === 0 ? en : en[0].toUpperCase() + en.substring(1);
  translitRulesRuEn.set(upRu, upEn);
});

export function translitRuEn(s: string): string {
  return s.split('').map(ch => translitRulesRuEn.get(ch) ?? ch).join('');
}

export function translitName(user: User): string {
  function normalize(name: string): string {
    const transliterated = translitRuEn(name);
    let result = transliterated.split('').map(ch => {
      if (/\s/.test(ch)) {
        return '_';
      }
      if (/[a-zA-Z0-9_-]/.test(ch)) {
        return ch;
      }
      return '';
    }).join('');
    if (result.length > 64) {
      result = result.substring(0, 64);
    }
    return result;
  }

  let origName = user.first_name.trim();
  if (user.last_name != null) {
    origName = (origName + ' ' + user.last_name).trim();
  }
  const result = normalize(origName);
  return result !== '' ? result : normalize(user.username ?? '');
}
