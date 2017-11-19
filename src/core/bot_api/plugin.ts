import { PromiseOr } from 'core/util/promises';
import { Input } from './input';

export interface Plugin {
  name: string;
  init(input: Input): PromiseOr<void>;
  dispose?(): PromiseOr<void>;
}
