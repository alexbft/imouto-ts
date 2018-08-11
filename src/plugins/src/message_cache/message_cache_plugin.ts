import { BotPlugin } from 'core/bot_api/bot_plugin';
import { InputSource, wrapHandler } from 'core/bot_api/input';
import { MessageCache } from 'plugins/src/message_cache/message_cache';
import { Injectable, Inject } from 'core/di/injector';
import { Unfiltered } from 'core/module/keys';
import { Message } from 'node-telegram-bot-api';

@Injectable
export class MessageCachePlugin implements BotPlugin {
  readonly name = 'Message cache';

  constructor(
    @Inject(Unfiltered) private readonly unfilteredInput: InputSource,
    private readonly messageCache: MessageCache
  ) { }

  init(): void {
    this.unfilteredInput.messages.subscribe(wrapHandler((message: Message) => {
      this.messageCache.add(message);
    }));
  }
}
