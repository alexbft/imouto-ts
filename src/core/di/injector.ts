import { Provider } from 'core/di/provider';
import { InjectionToken } from 'core/di/injection_token';

export class Injector {
  private bindingMap = new Map<any, Provider>();
  private cachedInstances = new Map<any, any>();

  constructor(providers: Provider[]) {
    for (const provider of providers) {
      this.bindingMap.set(provider.key, provider);
    }
  }

  get(key: any): any {
    const provider = this.bindingMap.get(key);
    if (provider == null) {
      // Allow to inject the injector.
      if (key === Injector) {
        return this;
      }
      const keyName = key != null && key.name != null ? key.name : key;
      throw new Error(`Injection failed: key '${String(keyName)}' not found`);
    } else {
      return provider.get(this);
    }
  }

  getCached<T>(key: any, create: () => T): T {
    if (!this.cachedInstances.has(key)) {
      this.cachedInstances.set(key, create());
    }
    return this.cachedInstances.get(key);
  }

  subContext(providers: Provider[]): Injector {
    return new Injector(Array.from(this.bindingMap.values()).concat(providers));
  }
}

export const injectMetadata = Symbol('injectMetadata');

export const Injectable = (_classFn: any) => { }

export function Inject(key: InjectionToken<any>) {
  return function (classFn: Object, _propertyKey: any, paramIndex: number) {
    const existing: Map<number, any> = Reflect.getOwnMetadata(injectMetadata, classFn) || new Map<number, any>();
    existing.set(paramIndex, key);
    Reflect.defineMetadata(injectMetadata, existing, classFn);
  }
}
