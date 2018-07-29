import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { TextMatch } from 'core/bot_api/text_match';

@Injectable
export class DogifyPlugin implements BotPlugin {
  readonly name = 'Dogify';

  constructor(private input: Input, private tgApi: TgApi) { }

  init(): void {
    this.input.onText(/^!\s?dogify\s+(.+)/, this.handle);
  }

  private handle = async ({ message, match }: TextMatch): Promise<void> => {
    const parts = match[1].trim().split(/\s+/).map(encodeURIComponent);
    await this.tgApi.respondWithImageFromUrl(message, 'http://dogr.io/' + parts.join('/') + '.png?split=false&.png');
  }
}
