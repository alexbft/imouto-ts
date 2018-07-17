import { PromiseOr } from 'core/util/promises';
import { Input } from 'core/bot_api/input';

export interface BotPlugin {
  name: string;
  init(input: Input): PromiseOr<void>;
  dispose?(): PromiseOr<void>;
}
