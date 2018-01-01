import { Injector } from './injector';
import 'reflect-metadata';

interface ProviderOptions {
  useValue?: any;
}

export class Provider {
  constructor(public readonly key: any, private readonly options?: ProviderOptions) {}

  get(injector: Injector): any {
    if (this.options != null) {
      if (this.options.useValue != null) {
        const value = this.options.useValue;
        return injector.getCached(this.key, () => value);
      }
    }
    const deps = Reflect.getMetadata('design:paramtypes', this.key)
    const params = deps ? deps.map((a: any) => injector.get(a)) : [injector]
    return injector.getCached(this.key, () => new this.key(...params));
  }

  toString(): string {
    return `Provider[${this.key}]`;
  }
}

export function provide<T>(key: T, options?: ProviderOptions): Provider {
  return new Provider(key, options);
}
