import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { toUrl } from 'core/util/web';
import { TextMatch } from 'core/bot_api/text_match';
import { Injectable } from 'core/di/injector';

@Injectable
export class QrPlugin implements BotPlugin {
  readonly name = 'QR';

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
  ) { }

  init(): void {
    this.input.onText(/^!\s*qr\s+([^]+)/, this.handle);
  }

  private handle = ({ message, match }: TextMatch) =>
    this.api.respondWithImageFromUrl(message, toUrl('https://api.qrserver.com/v1/create-qr-code/', {
      size: '500x500',
      format: 'png',
      data: match[1]
    }).toString());
}
