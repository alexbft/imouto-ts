import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { Message } from 'node-telegram-bot-api';
import { Inject } from 'core/di/injector';
import { UserId } from 'core/config/keys';

export class IntroPlugin implements BotPlugin {
  readonly name = 'Intro';

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    @Inject(UserId) private readonly userId: number) { }

  init(): void {
    this.input.onMessage(this.maybeIntroduceMyself);
    this.input.onText(/^!\s?intro\b/, ({ message }) => this.intro(message));
  }

  private intro(message: Message): Promise<any> {
    return this.api.respondWithText(message, 'Всем привет! Я - Сестрёнка 2.0. Введите /help чтобы увидеть список команд.');
  }

  private maybeIntroduceMyself = async (message: Message) => {
    if (message.new_chat_members != null && message.new_chat_members.some(u => u.id === this.userId)) {
      await this.intro(message);
    }
  }
}
