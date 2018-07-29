import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable, Inject } from 'core/di/injector';
import { wrapHandler, InputSource } from 'core/bot_api/input';
import { Message } from 'node-telegram-bot-api';
import { Unfiltered } from 'core/module/keys';

@Injectable
export class UserCache implements BotPlugin {
  readonly name = 'User cache';

  constructor(
    @Inject(Unfiltered)
    private readonly unfilteredInput: InputSource) { }

  init(): void {
    this.unfilteredInput.messages.subscribe(wrapHandler(this.handle));
  }

  handle = (_message: Message): void => {

  }
}
