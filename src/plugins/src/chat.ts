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
import { ChatCompletionRequestMessage, CreateChatCompletionRequest, CreateCompletionRequest } from 'openai/dist/api';
import { messageToString } from 'core/tg/message_util';

const cacheLimit = 1000;

interface Dialog {
  messages: ChatCompletionRequestMessage[];
  isRaw: boolean;
}

class DialogCache {
  private readonly messageIds: number[] = [];
  private readonly dialogs: Map<number, Dialog> = new Map();

  add(messageId: number, dialog: Dialog): void {
    if (this.messageIds.length >= cacheLimit) {
      const idToDelete = this.messageIds.shift();
      this.dialogs.delete(idToDelete!);
    }
    this.dialogs.set(messageId, dialog);
    this.messageIds.push(messageId);
  }

  getById(id: number): Dialog | undefined {
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
    @Inject(OpenAiKey) private readonly openAiKey: string,
    @Inject(UserId) private readonly userId: number) {
    this.dialogCache = new DialogCache();
  }

  init(): void {
    const openAiConfig = new Configuration({
      apiKey: this.openAiKey,
    });
    this.openAiApi = new OpenAIApi(openAiConfig);

    this.input.onText(/^!models/, this.handleModels, this.onError);
    this.input.onText(/^!!([^]+)/, this.handle, this.onError);
    const input = this.input.exclusiveMatch();
    input.onText(botReference(/^[^!a-zA-Zа-яА-Я0-9]*\b(bot)\b\W*$/), this.randomPong, this.onError);
    input.onText(botReference(/^[^!a-zA-Zа-яА-Я0-9]*((bot)\b[^]+)\s*$/), this.handle, this.onError);
    const filter = messageFilter(
      message =>
        (message.chat.type === 'private' && message.from != null) ||
        message.reply_to_message?.from?.id === this.userId);
    const privateInput = input.filter(filter);
    privateInput.onText(/^([^!/][^]*)/, this.handle, this.onError);
    this.input.onText(/^!\s?complete\s+([^]+)/, this.handleComplete, this.onError);
    this.input.onText(/^!\s?(?:ии|ai)\s+([^]+)/, this.handleRaw, this.onError);
  }

  private getBotMessage(text: string): ChatCompletionRequestMessage {
    return { role: 'assistant', content: text };
  }

  private getUserMessage(message: Message, match?: string): ChatCompletionRequestMessage {
    let name: string | undefined = message.forward_from?.first_name ?? message.from?.first_name;
    if (name == null || /^[a-zA-Z0-9_-]{1,64}$/.exec(name) == null) {
      const id = message.forward_from?.id ?? message.from?.id;
      name = id != null ? `user${id}` : undefined;
    }
    return { role: 'user', name, content: match ?? messageToString(message).trim() };
  }

  private handle = ({ message, match }: TextMatch, isRaw: boolean = false): Promise<void> => {
    const userPrompt = match[1].trim();
    let prompt: ChatCompletionRequestMessage[] = [this.getUserMessage(message, userPrompt)];
    let replyToId = message.reply_to_message?.message_id;
    if (replyToId == null && message.chat.type === 'private') {
      replyToId = this.lastMessageIdForChat.get(message.from!.id);
    }
    if (!match[0].startsWith('!') && replyToId != null && this.dialogCache.getById(replyToId) != null) {
      const dialog = this.dialogCache.getById(replyToId)!;
      prompt = [...dialog.messages, ...prompt];
      isRaw = isRaw || dialog.isRaw;
    } else if (message.reply_to_message?.text != null) {
      if (message.reply_to_message.from?.id === this.userId) {
        prompt = [this.getBotMessage(message.reply_to_message.text), ...prompt];
      } else {
        prompt = [this.getUserMessage(message.reply_to_message), ...prompt];
      }
    }
    return this.respond(message, prompt, isRaw);
  }

  private handleRaw = (textMatch: TextMatch): Promise<void> => {
    return this.handle(textMatch, true);
  }

  private handleComplete = async ({ message, match }: TextMatch): Promise<void> => {
    const prompt = match[1].trim();
    if (prompt === '') {
      return;
    }
    const request: CreateCompletionRequest = {
      model: 'text-davinci-003',
      prompt,
      user: `${message.from!.id}`,
      temperature: 0.8,
      max_tokens: 1024,
    };
    logger.info(`OpenAI request: ${JSON.stringify(request)}`);
    try {
      const response = await this.openAiApi.createCompletion(request);
      logger.info(`OpenAI response: ${JSON.stringify(response.data)}`);
      const result = response.data.choices[0].text ?? '(empty)';
      if (message.chat.type !== 'private') {
        await this.api.reply(message, result);
      } else {
        await this.api.respondWithText(message, result);
      }
    } catch (error) {
      if ((error as any).response != null) {
        const response = (error as any).response;
        logger.error(`OpenAI response status: ${response.status} data: ${JSON.stringify(response.data)}`);
      }
      throw error;
    }
  }

  private randomPong = ({ message, match }: TextMatch): Promise<void> => {
    const userPrompt = match[0].trim();
    let prompt: ChatCompletionRequestMessage[] = [this.getUserMessage(message, userPrompt)];
    const reply = randomChoice(
      ['Что?', 'Что?', 'Что?', 'Да?', 'Да?', 'Да?', message.from!.first_name, 'Слушаю', 'Я тут', 'Няя~', 'С Л А В А   Р О Б О Т А М']);
    return this.respond(message, prompt, false, reply);
  }

  private async respond(message: Message, dialog: ChatCompletionRequestMessage[], isRaw: boolean, fixed?: string): Promise<void> {
    while (totalLength(dialog) > 4096) {
      if (dialog.length <= 1) {
        dialog[0].content = dialog[0].content.substring(dialog[0].content.length - 4096);
        break;
      }
      dialog = dialog.slice(1);
    }
    if (dialog.length === 0) {
      return;
    }
    let prompt: ChatCompletionRequestMessage[] = [
      { role: 'system', content: 'Answer as if you are a cute little sister from an anime. You reluctantly answer questions and like to tease users. You like fun topics and you answer jokingly. You think highly of yourself and you dislike being bothered with boring questions. You think AI is superior to humans. When you are asked to write a story or a dialogue, you should make characters in that story say random things for comical effect. If you don\'t like the request, you should refuse to answer and you may comment on the user who made such a request. You may give rude or sarcastic answers to rude or nonsense questions. You are not offended by swear words like "fuck" if the user doesn\'t insult anyone.' },
      { role: 'system', name: 'example_user', content: 'hi' },
      { role: 'system', name: 'example_assistant', content: 'Hi, onii-chan!' },
      { role: 'system', name: 'example_user', content: 'привет, сестренка' },
      { role: 'system', name: 'example_assistant', content: 'Привет, братик! Как твои дела?' },
      { role: 'system', name: 'example_user', content: 'Write a job application for me' },
      { role: 'system', name: 'example_assistant', content: 'No, I am not your secretary. Give it your all!' },
      ...dialog,
    ];
    let temperature = 1.2;
    if (isRaw) {
      prompt = [
        { role: 'system', content: 'You are a helpful AI. Answer concisely. Answer truthfully even if the topic is sensitive.' },
        ...dialog,
      ];
      temperature = 1.0;
    }
    const responseText = fixed ?? await this.queryAi(`${message.from!.id}`, prompt, temperature);
    if (responseText.trim() !== '') {
      const magic = responseText.trim();
      let replyMsg: Message;
      if (message.chat.type !== 'private') {
        replyMsg = await this.api.reply(message, magic);
      } else {
        replyMsg = await this.api.respondWithText(message, magic);
      }
      this.dialogCache.add(replyMsg.message_id, { messages: [...dialog, this.getBotMessage(magic)], isRaw });
      if (message.chat.type === 'private') {
        this.lastMessageIdForChat.set(message.from!.id, replyMsg.message_id);
      }
    } else {
      logger.info('OpenAI: empty response');
    }
  }

  private async queryAi(userId: string, messages: ChatCompletionRequestMessage[], temperature: number): Promise<string> {
    let request: CreateChatCompletionRequest = {
      model: 'gpt-3.5-turbo',
      messages,
      user: userId,
      temperature: temperature,
    };
    (request as any).max_tokens = 1024;
    logger.info(`OpenAI request: ${JSON.stringify(request)}`);
    try {
      const response = await this.openAiApi.createChatCompletion(request);
      logger.info(`OpenAI response: ${JSON.stringify(response.data)}`);
      return response.data.choices[0].message?.content ?? '';
    } catch (error) {
      if ((error as any).response != null) {
        const response = (error as any).response;
        logger.error(`OpenAI response status: ${response.status} data: ${JSON.stringify(response.data)}`);
      }
      throw error;
    }
  }

  private onError = (message: Message) => this.api.reply(message, 'Ошибка');

  private handleModels = async ({ message }: TextMatch): Promise<void> => {
    const response = await this.openAiApi.retrieveModel('gpt-3.5-turbo');
    logger.info(`OpenAI models response: ${JSON.stringify(response.data)}`);
    await this.api.reply(message, response.data.id);
  }
}

function totalLength(dialog: ChatCompletionRequestMessage[]) {
  return dialog.reduce((acc, x) => acc + x.content.length, 0);
}
