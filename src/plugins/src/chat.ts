import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TextMatch } from "core/bot_api/text_match";
import { OpenAiKey, UserId } from 'core/config/keys';
import { Inject, Injectable } from "core/di/injector";
import { messageFilter } from 'core/filter/message_filter';
import { logger } from 'core/logging/logger';
import { TgApi } from "core/tg/tg_api";
import { Message } from 'core/tg/tg_types';
import { botReference, randomChoice } from 'core/util/misc';
import { Configuration, OpenAIApi } from 'openai';
import { CreateCompletionRequest } from 'openai/dist/api';

const cacheLimit = 1000;

class DialogCache {
  private readonly messageIds: number[] = [];
  private readonly dialogs: Map<number, string> = new Map();

  add(messageId: number, dialog: string): void {
    if (this.messageIds.length >= cacheLimit) {
      const idToDelete = this.messageIds.shift();
      this.dialogs.delete(idToDelete!);
    }
    this.dialogs.set(messageId, dialog);
    this.messageIds.push(messageId);
  }

  getById(id: number): string | undefined {
    return this.dialogs.get(id);
  }
}

@Injectable
export class ChatPlugin implements BotPlugin {
  readonly name = 'Chat';
  private openAiApi!: OpenAIApi;
  private readonly dialogCache: DialogCache;
  private readonly lastMessageIdForChat = new Map<number, number>();

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    @Inject(OpenAiKey) private openAiKey: string,
    @Inject(UserId) private readonly userId: number) {
    this.dialogCache = new DialogCache();
  }

  init(): void {
    const openAiConfig = new Configuration({
      apiKey: this.openAiKey,
    });
    this.openAiApi = new OpenAIApi(openAiConfig);

    this.input.onText(/^!!([^]+)/, this.handle, this.onError);
    const input = this.input.exclusiveMatch();
    input.onText(botReference(/^\W*\b(bot)\b\W*$/), this.randomPong, this.onError);
    input.onText(botReference(/^\W*((bot)\b[^]+)\s*$/), this.handle, this.onError);
    const filter = messageFilter(
      message =>
        (message.chat.type === 'private' && message.from != null) ||
        message.reply_to_message?.from?.id === this.userId);
    const privateInput = input.filter(filter);
    privateInput.onText(/([^]+)/, this.handle, this.onError);
  }

  private handle = ({ message, match }: TextMatch): Promise<void> => {
    const userPrompt = match[1].trim();
    let prompt = `You: ${userPrompt}`;
    let replyToId = message.reply_to_message?.message_id;
    if (replyToId == null && message.chat.type === 'private') {
      replyToId = this.lastMessageIdForChat.get(message.from!.id);
    }
    if (!match[0].startsWith('!!') && replyToId != null && this.dialogCache.getById(replyToId) != null) {
      prompt = this.dialogCache.getById(replyToId)!.trim() + '\n\n' + prompt;
    }
    return this.respond(message, prompt);
  }

  private randomPong = ({ message, match }: TextMatch): Promise<void> => {
    const reply = randomChoice(
      ['Что?', 'Что?', 'Что?', 'Да?', 'Да?', 'Да?', message.from!.first_name, 'Слушаю', 'Я тут', 'Няя~', 'С Л А В А   Р О Б О Т А М']);
    return this.respond(message, `You: ${match[0].trim()}`, reply);
  }

  private async respond(message: Message, prompt: string, fixed?: string): Promise<void> {
    prompt = prompt.trim();
    while (prompt.length > 2048) {
      const userPromptParts = prompt.split('\n\n');
      if (userPromptParts.length <= 1) {
        prompt = prompt.substring(prompt.length - 2048);
        break;
      }
      prompt = userPromptParts.slice(1).join('\n\n');
    }
    if (prompt === '') {
      return;
    }
    const dialog = `${prompt}\n\nImouto: `;
    prompt = `Imouto is a chat bot who acts like a little sister character from anime. She reluctantly answers questions and likes to tease you.\n\nYou: hi\n\nImouto: Hi, baka onii-chan!\n\nYou: привет\n\nImouto: Привет, глупый братик!\n\nYou: write a book about bears\n\nImouto: No, write it yourself.\n\n${dialog}`;
    const responseText = fixed ?? await this.queryAi(`${message.from!.id}`, prompt);
    if (responseText.trim() !== '') {
      const magic = responseText.trim().replace(/Imouto/ig, 'Сестрёнка');
      let replyMsg: Message;
      if (message.chat.type !== 'private') {
        replyMsg = await this.api.reply(message, magic);
      } else {
        replyMsg = await this.api.respondWithText(message, magic);
      }
      this.dialogCache.add(replyMsg.message_id, dialog + responseText);
      if (message.chat.type === 'private') {
        this.lastMessageIdForChat.set(message.from!.id, replyMsg.message_id);
      }
    } else {
      logger.info('OpenAI: empty response');
    }
  }

  private async queryAi(userId: string, query: string): Promise<string> {
    const maxTokens = 1024;
    const request: CreateCompletionRequest = {
      model: 'text-davinci-003',
      prompt: query,
      user: userId,
      max_tokens: maxTokens,
      temperature: 1.2,
    };
    logger.info(`OpenAI request: ${JSON.stringify(request)}`);
    const response = await this.openAiApi.createCompletion(request);
    return response.data.choices[0].text ?? '';
  }

  private onError = (message: Message) => this.api.reply(message, 'Ошибка');
}
