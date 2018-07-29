export class InjectionToken<_> {
  constructor(private readonly name: string) { }

  toString() {
    return `InjectionToken(${this.name})`;
  }
}
