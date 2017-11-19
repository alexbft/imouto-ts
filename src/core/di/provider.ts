import { Injector } from './injector';

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
    return injector.getCached(this.key, () => new this.key(injector));
  }

  toString(): string {
    return `Provider[${this.key}]`;
  }
}

export function provide<T>(key: T, options?: ProviderOptions): Provider {
  return new Provider(key, options);
}
