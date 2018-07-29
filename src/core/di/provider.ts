import 'reflect-metadata';
import { injectMetadata, Injector } from 'core/di/injector';
import { Constructor } from 'core/util/misc';

interface ProviderOptions<T> {
  useValue?: T;
}

export class Provider {
  constructor(readonly key: any, private readonly options?: ProviderOptions<any>) { }

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

export function provide(key: Symbol, options: ProviderOptions<any>): Provider;
export function provide<T>(key: Constructor<T>, options?: ProviderOptions<T>): Provider;
export function provide<T>(key: Symbol | Constructor<T>, options?: ProviderOptions<any>): Provider {
  return new Provider(key, options);
}
