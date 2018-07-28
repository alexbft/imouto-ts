import { PromiseOr } from 'core/util/promises';

export interface BotPlugin {
  name: string;
  init(): PromiseOr<void>;
  dispose?(): PromiseOr<void>;
}
