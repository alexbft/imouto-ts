import { Provider } from './provider';

export class Injector {
  private bindingMap = new Map<any, Provider>();
  private cachedInstances = new Map<any, any>();

  constructor(providers: Provider[]) {
    for (let provider of providers) {
      this.bindingMap.set(provider.key, provider);
    }
  }

  get(key: any): any {
    return this.bindingMap.get(key)!.get(this);
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

export const Inject = (_: any) => {}
