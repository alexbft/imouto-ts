import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TextMatch } from "core/bot_api/text_match";
import { Injectable } from "core/di/injector";
import { TgApi } from "core/tg/tg_api";

@Injectable
export class CatPlugin implements BotPlugin {
  readonly name = 'Cats';
  
  constructor(private api: TgApi) {}

  init(input: Input): void {
    input.onText(/^!\s?(кот|киса|cat)/, this.handle);
  }

  handle = async ({message}: TextMatch): Promise<void> => {
    await this.api.replyWithImageFromUrl(message, 'http://thecatapi.com/api/images/get');
  }
}