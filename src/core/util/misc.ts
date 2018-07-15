export interface Props {
  [key: string]: any;
}

export function random(x: number): number {
  return Math.floor(Math.random() * x);
}

export function randomChoice<T>(a: T[]): T {
  return a[random(a.length)];
}
