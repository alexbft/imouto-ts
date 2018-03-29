import 'reflect-metadata';
import { injectMetadata, Injector } from './injector';

interface ProviderOptions {
  useValue?: any;
}

export class Provider {
  constructor(readonly key: any, private readonly options?: ProviderOptions) {}

  get(injector: Injector): any {
    if (this.options != null) {
      if (this.options.useValue != null) {
        const value = this.options.useValue;
        return injector.getCached(this.key, () => value);
      }
    }
    return injector.getCached(this.key, () => {
      const dependencyTypes: any[] = Reflect.getMetadata('design:paramtypes', this.key);
      if (dependencyTypes != null) {
        const overrides: Map<number, any> = Reflect.getOwnMetadata(injectMetadata, this.key);
        const dependencyKeys = dependencyTypes.map((type, index) => {
          if (overrides != null && overrides.has(index)) {
            return overrides.get(index);
          } else {
            return type;
          }
        });
        const dependencies = dependencyKeys.map(key => injector.get(key));
        return new this.key(...dependencies);
      } else {
        return new this.key(injector);
      }
    });
  }

  toString(): string {
    const keyName = this.key != null && this.key.name != null ? this.key.name : this.key;
    return `Provider[${keyName}]`;
  }
}

export function provide<T>(key: T, options?: ProviderOptions): Provider {
  return new Provider(key, options);
}
