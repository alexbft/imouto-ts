import { QuotePlugin } from './quote_plugin';
import { Message, InlineKeyboardMarkup } from 'node-telegram-bot-api';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { wrapHandler } from 'core/bot_api/input';

const reactionDelay = moment.duration(1, 'second').asMilliseconds();
const bufferDelay = moment.duration(30, 'seconds').asMilliseconds();

const saveKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [[{
    text: 'Сохранить',
    callback_data: 'y',
  }, {
    text: 'Не сохранять',
    callback_data: 'n',
  }]]
};

export class QuotePrivateListener {
  private lastMessageMoment = moment(0);
  private buffer: Message[] = [];
  private readonly subject = new Subject<Message>();

  constructor(private readonly plugin: QuotePlugin) {
    this.subject.debounceTime(reactionDelay).subscribe(wrapHandler(this.handleBatch));
  }

  handle(message: Message): void {
    const now = moment();
    const sinceLastMessage = now.diff(this.lastMessageMoment);
    this.lastMessageMoment = now;
    if (sinceLastMessage > bufferDelay) {
      this.buffer = [];
    }
    this.buffer.push(message);
    this.subject.next(message);
  }

  handleBatch = async (message: Message) => {
    const quote = this.plugin.createQuote(message.from!, this.buffer);
    const quoteText = this.plugin.formatQuote(quote);
    const res = await this.plugin.api.respondWithText(message, quoteText, {
      disable_web_page_preview: true,
      parse_mode: 'HTML',
      reply_markup: saveKeyboard
    });
    const question = this.plugin.input.onCallback(res, async ({ id, data }) => {
      if (data === 'y') {
        const saved = await this.plugin.saveQuote(quote);
        await this.plugin.api.answerCallback(id, `Сохранила под номером ${saved.num}`);
        await this.plugin.changeMessageToQuote(message.from!.id, res, saved);
      } else {
        await this.plugin.api.editText(res, 'Цитата не сохранена.');
        await this.plugin.api.answerCallback(id, '');
      }
      question.unsubscribe();
    });
  }
}
