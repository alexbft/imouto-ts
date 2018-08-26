import { worker } from 'workerpool';
import { Parser } from 'mathjs';
import * as mathjs from 'mathjs';

(mathjs as any).import({
  'import': function () { throw new Error('Function import is disabled') },
  'createUnit': function () { throw new Error('Function createUnit is disabled') },
  'eval': function () { throw new Error('Function eval is disabled') },
  'parse': function () { throw new Error('Function parse is disabled') },
  'simplify': function () { throw new Error('Function simplify is disabled') },
  'derivative': function () { throw new Error('Function derivative is disabled') }
}, { override: true });

const userMap: Map<number, Parser> = new Map();

function evalForUser(user: number, source: string): any {
  if (!userMap.has(user)) {
    userMap.set(user, mathjs.parser());
  }
  const p = userMap.get(user);
  return p!.eval(source);
}

worker({ evalForUser });
