import { Message } from 'core/tg/tg_types';
import { QuoteFilter, Quote, Vote } from 'plugins/src/quotes/quote';
import { QuotePlugin } from 'plugins/src/quotes/quote_plugin';
import { random, fixMultiline } from 'core/util/misc';
import { InlineKeyboardButton, InlineKeyboardMarkup, CallbackQuery, User } from 'node-telegram-bot-api';
import { updateVote, insertVote } from 'plugins/src/quotes/quote_sql';
import { HasSubscription } from 'core/util/subscription_manager';

const thumbsUp = String.fromCodePoint(0x1f44d) + String.fromCodePoint(0x1f3fb);
const thumbsDown = String.fromCodePoint(0x1f44e) + String.fromCodePoint(0x1f3fb);

const voteRow: InlineKeyboardButton[] = [
  {
    text: `${thumbsUp} Ору`,
    callback_data: '+1',
  },
  {
    text: `${thumbsDown} Не ори`,
    callback_data: '-1',
  },
  {
    text: `💬`,
    callback_data: 'menu',
  }
];

const menuRow: InlineKeyboardButton[] = [
  {
    text: '🖼',
    callback_data: 'media',
  },
  {
    text: '⬅️',
    callback_data: 'prev',
  },
  {
    text: '🎲',
    callback_data: 'random',
  },
  {
    text: '➡️',
    callback_data: 'next',
  },
  {
    text: '↪️',
    callback_data: 'end',
  },
  {
    text: '❌',
    callback_data: 'close',
  },
]

const defaultKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [voteRow]
};

const closedKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [voteRow.filter(b => b.callback_data !== 'menu')]
};

export interface QuoteShowOptions {
  userId: number,
  message: Message,
  filters: QuoteFilter[],
  filterInfo: string[],
  queryNum?: number,
  shouldEdit: boolean
}

export interface QuoteShowContext extends HasSubscription {
  message: Message;
  quote(): Quote;
}

export class QuoteShow {
  private readonly userId: number;
  private readonly message: Message;
  private readonly quoteSet: Quote[];
  private readonly prefix: string;
  private readonly shouldEdit: boolean;
  private readonly hasFilter: boolean;

  private sentMessage?: Message;
  private index: number;
  private keyboard: InlineKeyboardMarkup;
  private showMenu: boolean;
  private isMediaShown = new Set<number>();

  constructor(
    private readonly plugin: QuotePlugin,
    options: QuoteShowOptions
  ) {
    const { userId, message, filters, filterInfo, queryNum, shouldEdit } = options;
    this.message = message;
    this.userId = userId;
    this.shouldEdit = shouldEdit;
    this.hasFilter = filters.length > 0;
    const quoteSet = Array.from(this.plugin.quotes.values()).filter(q => filters.every(f => f(q)));
    this.quoteSet = quoteSet;
    if (quoteSet.length === 0) {
      this.index = -1;
    } else {
      this.index = queryNum != null ? quoteSet.findIndex(q => q.num === queryNum) : random(quoteSet.length);
    }
    this.keyboard = defaultKeyboard;
    this.showMenu = false;
    const total = filters.length > 0 ? `Найдено цитат: ${quoteSet.length}` : `Всего цитат: ${this.plugin.lastQuoteNum}`;
    const info = filterInfo.length > 0 ? `\n${filterInfo.join('\n')}` : '';
    this.prefix = `<code>${total}${info}</code>`;
  }

  private getSendOptions() {
    return {
      disable_web_page_preview: true,
      parse_mode: 'HTML',
      reply_markup: this.keyboard
    };
  }

  private quote(): Quote {
    return this.quoteSet[this.index];
  }

  private format(): string {
    return fixMultiline(`
      ${this.prefix}

      ${this.plugin.formatQuote(this.quote())}
    `);
  }

  async handle(): Promise<QuoteShowContext | null> {
    if (this.index === -1) {
      await this.plugin.api.reply(this.message, 'Цитата не найдена :(');
      return null;
    }
    if (this.shouldEdit) {
      this.sentMessage = await this.plugin.api.editText(this.message, this.format(), this.getSendOptions());
    } else {
      this.sentMessage = await this.plugin.api.respondWithText(this.message, this.format(), this.getSendOptions());
    }
    return {
      subscription: this.plugin.input.onCallback(this.sentMessage, this.answerCallback),
      quote: () => this.quote(),
      message: this.sentMessage
    };
  }

  private answerCallback = async (cb: CallbackQuery) => {
    switch (cb.data) {
      case '+1':
        await this.handleVote(cb, 1);
        break;
      case '-1':
        await this.handleVote(cb, -1);
        break;
      case 'menu':
        await this.handleMenu(cb);
        break;
      case 'prev':
        await this.showPrev(cb);
        break;
      case 'next':
        await this.showNext(cb);
        break;
      case 'random':
        await this.showRandom(cb);
        break;
      case 'end':
        await this.showLast(cb);
        break;
      case 'media':
        await this.handleMedia(cb);
        break;
      case 'close':
        await this.handleClose(cb);
        break;
      default:
        throw new Error(`Unhandled callback data: ${cb.data}`);
    }
  }

  private async handleVote({ id, from }: CallbackQuery, value: number): Promise<void> {
    const quote = this.quote();
    if (!this.plugin.quotes.has(quote.num)) {
      // Quote was deleted.
      await this.answer(id, 'Цитата удалена.');
      return;
    }
    const existingVote = quote.votes.find(v => v.userId === from.id);
    const icon = value > 0 ? thumbsUp : thumbsDown;
    if (existingVote != null) {
      if (existingVote.value === value) {
        await this.answer(id, `Вы уже проголосовали ${icon} за эту цитату.`);
        return;
      } else {
        existingVote.value = value;
        this.plugin.scheduler.scheduleLowPriority(() => updateVote(this.plugin.db, quote.num, existingVote));
      }
    } else {
      const vote: Vote = { userId: from.id, value };
      quote.votes.push(vote);
      this.plugin.scheduler.scheduleLowPriority(() => insertVote(this.plugin.db, quote.num, vote));
    }
    quote.rating = quote.votes.map(v => v.value).reduce((a, b) => a + b, 0);
    await this.updateAndAnswer(id, `Ваш голос ${icon} учтён.`);
  }

  private async handleMenu({ id, from }: CallbackQuery): Promise<void> {
    if (!this.checkSender(from)) {
      return this.wrongSender(id);
    }
    if (this.showMenu) {
      this.showMenu = false;
      this.keyboard = defaultKeyboard;
    } else {
      this.showMenu = true;
      this.keyboard = this.menuKeyboard();
    }
    await Promise.all([
      this.answer(id, ''),
      this.plugin.api.editReplyMarkup(this.sentMessage!, this.keyboard),
    ]);
  }

  private showPrev({ id, from }: CallbackQuery): Promise<any> {
    if (!this.checkSender(from)) {
      return this.wrongSender(id);
    }
    if (this.quoteSet.length <= 1) {
      return this.answer(id, '');
    }
    if (this.index === 0) {
      if (this.hasFilter) {
        this.index = this.quoteSet.length - 1;
      } else {
        return this.answer(id, '');
      }
    } else {
      this.index -= 1;
    }
    return this.updateAndAnswer(id, '');
  }

  private showNext({ id, from }: CallbackQuery): Promise<any> {
    if (!this.checkSender(from)) {
      return this.wrongSender(id);
    }
    if (this.quoteSet.length <= 1) {
      return this.answer(id, '');
    }
    if (this.index === this.quoteSet.length - 1) {
      if (this.hasFilter) {
        this.index = 0;
      } else {
        return this.answer(id, '');
      }
    } else {
      this.index += 1;
    }
    return this.updateAndAnswer(id, '');
  }

  private showRandom({ id, from }: CallbackQuery): Promise<any> {
    if (!this.checkSender(from)) {
      return this.wrongSender(id);
    }
    if (this.quoteSet.length <= 1) {
      return this.answer(id, '');
    }
    let oldIndex = this.index;
    while (this.index === oldIndex) {
      this.index = random(this.quoteSet.length);
    }
    return this.updateAndAnswer(id, '');
  }

  private showLast({ id, from }: CallbackQuery): Promise<any> {
    if (!this.checkSender(from)) {
      return this.wrongSender(id);
    }
    const newIndex = this.quoteSet.length - 1;
    if (newIndex === this.index) {
      return this.answer(id, '');
    }
    this.index = newIndex;
    return this.updateAndAnswer(id, '');
  }

  private async handleMedia({ id, from }: CallbackQuery): Promise<void> {
    if (!this.checkSender(from)) {
      return this.wrongSender(id);
    }
    const quote = this.quote();
    if (!this.plugin.quotes.has(quote.num)) {
      // Quote was deleted.
      return this.answer(id, 'Цитата удалена.');
    }
    if (this.isMediaShown.has(quote.num)) {
      return this.answer(id, 'Уже показано');
    }
    if (quote.messages.every(msg => msg.id == null || msg.hasText)) {
      return this.answer(id, 'В цитате нет изображений');
    }
    this.isMediaShown.add(quote.num);
    await this.answer(id, '');
    for (const msg of quote.messages) {
      if (msg.id != null && msg.chatId != null && !msg.hasText) {
        await this.plugin.api.forwardMessage({
          chat_id: this.sentMessage!.chat.id,
          from_chat_id: msg.chatId,
          message_id: msg.id
        });
      }
    }
  }

  private async handleClose({ id, from }: CallbackQuery): Promise<void> {
    if (!this.checkSender(from)) {
      return this.wrongSender(id);
    }
    this.keyboard = closedKeyboard;
    await Promise.all([
      this.answer(id, ''),
      this.plugin.api.editReplyMarkup(this.sentMessage!, this.keyboard),
    ]);
  }

  private menuKeyboard(): InlineKeyboardMarkup {
    const menu = this.hasFilter ? menuRow.filter(b => b.callback_data !== 'end') : menuRow;
    return { inline_keyboard: [voteRow, menu] };
  }

  private checkSender(from: User): boolean {
    return from.id === this.userId || this.plugin.userService.hasRole(from, 'admin');
  }

  private async wrongSender(cbId: string): Promise<void> {
    await this.answer(cbId, 'Это доступно только тому, кто запросил цитату!');
  }

  private async update(): Promise<void> {
    await this.plugin.api.editText(this.sentMessage!, this.format(), this.getSendOptions());
  }

  private async answer(cbId: string, text: string = ''): Promise<void> {
    await this.plugin.api.answerCallback(cbId, text);
  }

  private async updateAndAnswer(cbId: string, text: string = ''): Promise<void> {
    await Promise.all([
      this.answer(cbId, text),
      this.update()
    ]);
  }
}
