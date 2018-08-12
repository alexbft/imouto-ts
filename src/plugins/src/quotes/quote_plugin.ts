import { BotPlugin } from 'core/bot_api/bot_plugin';
import { DatabaseFactory } from 'core/db/database_factory';
import { Injectable } from 'core/di/injector';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { Database } from 'core/db/database';
import { TextMatch } from 'core/bot_api/text_match';
import { FilterFactory } from 'core/filter/filter_factory';
import { UserService } from 'core/tg/user_service';
import { MessageCache } from 'plugins/src/message_cache/message_cache';
import { UnsavedQuote, QuoteMessage, Quote, isSavedQuote, QuoteFilter, filterByAuthorId, filterByText, filterByQuoteNum } from 'plugins/src/quotes/quote';
import { User } from 'node-telegram-bot-api';
import { last, putIfAbsent, fixMultiline, tryParseInt, safeExecute } from 'core/util/misc';
import * as moment from 'moment';
import { fullName, chatName, isForwarded, isPrivate, messageToString } from 'core/tg/message_util';
import { Environment } from 'core/environment/environment';
import { saveQuote, createTables, getAllQuotes, deleteQuote, updateQuoteTag } from 'plugins/src/quotes/quote_sql';
import { QuotePrivateListener } from 'plugins/src/quotes/quote_private_listener';
import { Message } from 'core/tg/tg_types';
import { SubscriptionManager } from 'core/util/subscription_manager';
import { QuoteShowOptions, QuoteShow, QuoteShowContext } from 'plugins/src/quotes/quote_show';
import { Scheduler } from 'core/util/scheduler';

// TODO: Import

@Injectable
export class QuotePlugin implements BotPlugin {
  readonly name = 'Quotes';

  readonly db: Database;
  private readonly listeners: Map<number, QuotePrivateListener> = new Map();
  private readonly callbackSubscriptions = new SubscriptionManager<QuoteShowContext>();

  quotes: Map<number, Quote> = new Map();
  lastQuoteNum: number = 0;

  constructor(
    dbFactory: DatabaseFactory,
    readonly input: Input,
    readonly api: TgApi,
    private readonly filters: FilterFactory,
    readonly userService: UserService,
    private readonly messageCache: MessageCache,
    private readonly environment: Environment,
    readonly scheduler: Scheduler,
  ) {
    this.db = dbFactory.create();
  }

  async init(): Promise<void> {
    await this.db.open();
    await createTables(this.db);
    this.quotes = await getAllQuotes(this.db);
    for (const num of this.quotes.keys()) {
      if (this.lastQuoteNum < num) {
        this.lastQuoteNum = num;
      }
    }

    const modOnly = this.input.filter(this.filters.hasRole('mod'));
    modOnly.onText(/^!?\s?save(?:\s+(.+))?$/, this.handleSave, this.onSaveError);
    modOnly.onText(/^(!)?\s?(del|delete|удали)(?:\s+(.+))?$/, this.handleDelete, this.onDeleteError);
    modOnly.onText(/^(!)?\s?(tags?|т[эе]ги?)\s+(.+)$/, this.handleTag, (message) => this.api.reply(message, 'Произошла ошибка.'));
    modOnly.onMessage(message => {
      if (isForwarded(message) && isPrivate(message)) {
        this.handleForward(message);
      }
    });
    this.input.onText(/^!\s?(q|ц|цитата|quote)(?:\s+(.+))?$/, this.handleGet, this.onGetError);
    this.input.onText(/^!\s?qstats(?:\s+(.+))?$/, this.handleStats, (message) => this.api.reply(message, 'Произошла ошибка.'));
  }

  dispose(): Promise<void> {
    return this.db.close();
  }

  handleSave = async ({ message, match }: TextMatch): Promise<any> => {
    if (message.reply_to_message == null) {
      return;
    }
    const quoteMessages = [this.messageCache.tryResolve(message.reply_to_message)];
    if (quoteMessages[0].reply_to_message != null) {
      quoteMessages.unshift(quoteMessages[0].reply_to_message!);
    }
    const quote = this.createQuote(message.from!, quoteMessages, match[1] || '');
    if (quote.posterId === last(quote.messages)!.authorId && !this.userService.hasRole(message.from!, 'admin')) {
      return this.api.reply(message, 'Сам себя не похвалишь - никто не похвалит, да?');
    }
    const saved = await this.saveQuote(quote);
    return this.showQuote({
      userId: message.from!.id,
      message,
      filters: [],
      filterInfo: [],
      queryNum: saved.num,
      shouldEdit: false
    });
  }

  onSaveError = (message: Message) => this.api.reply(message, 'Ошибка при сохранении цитаты.');

  handleForward = (message: Message) => {
    const userId = message.from!.id;
    const listener = putIfAbsent(this.listeners, userId, () => new QuotePrivateListener(this));
    listener.handle(message);
  }

  handleGet = async ({ message, match }: TextMatch): Promise<void> => {
    const query = match[2];
    const filters: QuoteFilter[] = [];
    const filterInfo: string[] = [];
    let queryNum: number | undefined;
    if (message.reply_to_message != null) {
      const queryAuthor = message.forward_from || message.from;
      if (queryAuthor != null) {
        filters.push(filterByAuthorId(queryAuthor.id));
        filterInfo.push(`Автор: ${fullName(queryAuthor)}`);
      }
    }
    if (query != null) {
      let matchPlus: boolean = false;
      if (query.endsWith('+')) {
        const maybeNum = tryParseInt(query.substr(0, query.length - 1));
        if (maybeNum != null) {
          matchPlus = true;
          filters.push(filterByQuoteNum(maybeNum));
          filterInfo.push(`Начиная с номера ${maybeNum}`);
        }
      }
      if (!matchPlus) {
        const maybeNum = tryParseInt(query);
        if (maybeNum != null) {
          queryNum = maybeNum;
        } else {
          filters.push(filterByText(query));
          filterInfo.push(`Содержит: ${query}`);
        }
      }
    }
    return this.showQuote({
      userId: message.from!.id,
      message,
      filters,
      filterInfo,
      queryNum,
      shouldEdit: false
    });
  }

  onGetError = (message: Message) => this.api.reply(message, 'Цитата не цитируется...');

  handleDelete = async ({ message, match }: TextMatch): Promise<any> => {
    let num: number | undefined | null;
    let context: QuoteShowContext | undefined;
    if (match[1] != null && match[3] != null) {
      num = tryParseInt(match[3]);
    } else if (message.reply_to_message != null) {
      const reply = message.reply_to_message;
      context = this.callbackSubscriptions.subscriptions.find(sub => sub.message.message_id === reply.message_id && sub.message.chat.id === reply.chat.id);
      if (context != null) {
        num = context.quote().num;
      }
    }
    if (num == null) {
      if (match[1] != null) {
        return this.api.reply(message, 'Что удалить?');
      } else {
        return;
      }
    }
    if (!this.quotes.has(num)) {
      return this.api.reply(message, `Цитата №${num} не найдена.`);
    }
    const quote = this.quotes.get(num)!;
    if (quote.posterId != message.from!.id && !this.userService.hasRole(message.from!, 'admin')) {
      return this.api.reply(message, `Нельзя удалить чужую цитату.`);
    }
    await this.deleteQuote(num);
    if (context != null) {
      this.callbackSubscriptions.delete(context);
      await safeExecute(() => this.api.delete(context!.message));
    }
    await this.api.reply(message, `Цитата №${num} удалена.`);
  }

  onDeleteError = (message: Message) => this.api.reply(message, 'Цитата не удаляется...');

  handleTag = async ({ message, match }: TextMatch): Promise<any> => {
    let context: QuoteShowContext | undefined;
    if (message.reply_to_message != null) {
      const reply = message.reply_to_message;
      context = this.callbackSubscriptions.subscriptions.find(sub => sub.message.message_id === reply.message_id && sub.message.chat.id === reply.chat.id);
    }
    if (context == null) {
      return;
    }
    const quote = context.quote();
    if (!this.quotes.has(quote.num)) {
      return;
    }
    quote.tag = match[3];
    await this.environment.markCritical(updateQuoteTag(this.db, quote.num, quote.tag));
    await context.update();
    return this.api.reply(message, 'Тэг изменён.');
  }

  handleStats = ({ message, match }: TextMatch): Promise<any> => {
    if (match[1] != null) {
      const query = match[1];
      const count = Array.from(this.quotes.values()).filter(filterByText(query)).length;
      return this.api.reply(message, `Цитат с упоминанием '${query}': ${count}`);
    }
    if (message.reply_to_message != null && message.reply_to_message.from != null) {
      const user = message.reply_to_message.from;
      const count = Array.from(this.quotes.values()).filter(filterByAuthorId(user.id)).length;
      return this.api.reply(message, `Цитат авторства ${fullName(user)}: ${count}`);
    }
    const authors = new Map<string, number>();
    for (const q of this.quotes.values()) {
      for (const m of q.messages) {
        let count = authors.get(m.authorName);
        if (count == null) {
          count = 0;
        }
        count += 1;
        authors.set(m.authorName, count);
      }
    }
    const authorTuples = Array.from(authors.entries());
    const top = authorTuples.sort(([_a, aCount], [_b, bCount]) => bCount - aCount).slice(0, 10);
    const num = Math.min(top.length, 10);
    const MOON = '🌚';
    return this.api.reply(message, fixMultiline(`
      Всего цитат: ${this.quotes.size}
      Топ ${num} авторов:

      ${top.map(([a, v]) => `${a} ${MOON} ${v} ${MOON}`).join('\n')}
    `));
  }

  createQuote(poster: User, quoteMessages: Message[], tag: string): UnsavedQuote {
    const createQuoteMessage = (message: Message): QuoteMessage => {
      let authorId: number | undefined;
      let authorName: string;
      if (message.forward_from != null) {
        authorId = message.forward_from.id;
        authorName = fullName(message.forward_from);
      } else if (message.forward_from_chat != null) {
        authorName = message.forward_signature || chatName(message.forward_from_chat);
      } else if (message.from != null) {
        authorId = message.from.id;
        authorName = fullName(message.from);
      } else {
        authorName = chatName(message.chat);
      }
      return {
        id: message.message_id,
        chatId: message.chat.id,
        authorId: authorId,
        authorName: authorName,
        date: moment.unix(message.forward_date || message.date),
        text: this.getQuoteText(message),
        hasText: message.text != null,
      };
    }
    return {
      date: moment(),
      posterId: poster.id,
      posterName: fullName(poster),
      messages: quoteMessages.map(createQuoteMessage),
      tag: tag,
    };
  }

  async saveQuote(quote: UnsavedQuote): Promise<Quote> {
    const saved = await this.environment.markCritical(saveQuote(this.db, quote));
    this.quotes.set(saved.num, saved);
    if (this.lastQuoteNum < saved.num) {
      this.lastQuoteNum = saved.num;
    }
    return saved;
  }

  async deleteQuote(quoteNum: number): Promise<void> {
    await this.environment.markCritical(deleteQuote(this.db, quoteNum));
    this.quotes.delete(quoteNum);
  }

  getQuoteText(message: Message): string {
    return messageToString(message);
  }

  formatQuote(quote: UnsavedQuote): string {
    const formatMessage = (msg: QuoteMessage): string => fixMultiline(`
      <i>${msg.authorName}</i>
      ${msg.text}
    `);

    const quoteNum = isSavedQuote(quote) ? `Цитата №${quote.num}` : `Новая цитата`;
    const maybeSavedDate = quote.date != null ? `, сохранена ${quote.date.format('LL')}` : '';
    const maybePoster = quote.posterName != null ? ` от <i>${quote.posterName}</i>` : '';
    const maybeTag = quote.tag != '' ? `\nТэг: <i>${quote.tag}</i>` : '';
    let maybeRating: string = '';
    if (isSavedQuote(quote)) {
      const ratingStr = quote.rating > 0 ? `+${quote.rating}` : `${quote.rating}`;
      maybeRating = `\nРейтинг цитаты: <b>[ ${ratingStr} ]</b>`;
    }
    return fixMultiline(`
      <b>${quoteNum}</b>${maybeSavedDate}${maybePoster}${maybeTag}${maybeRating}

      ${quote.messages.map(formatMessage).join('\n\n')}
    `);
  }

  changeMessageToQuote(userId: number, message: Message, quote: Quote): Promise<void> {
    return this.showQuote({
      userId,
      filters: [],
      filterInfo: [],
      queryNum: quote.num,
      message,
      shouldEdit: true
    });
  }

  async showQuote(options: QuoteShowOptions): Promise<void> {
    const sub = await new QuoteShow(this, options).handle();
    if (sub != null) {
      this.callbackSubscriptions.add(sub);
    }
  }
}
