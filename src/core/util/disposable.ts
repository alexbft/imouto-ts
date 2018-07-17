import { PromiseOr } from 'core/util/promises';

export interface Disposable {
  dispose(): PromiseOr<void>;
}
