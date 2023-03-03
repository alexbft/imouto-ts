import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TextMatch } from "core/bot_api/text_match";
import { OpenAiKey, UserId } from 'core/config/keys';
import { Database } from 'core/db/database';
import { DatabaseFactory } from 'core/db/database_factory';
import { Inject, Injectable } from "core/di/injector";
import { messageFilter } from 'core/filter/message_filter';
import { logger } from 'core/logging/logger';
import { messageToString } from 'core/tg/message_util';
import { TgApi } from "core/tg/tg_api";
import { Message } from 'core/tg/tg_types';
import { botReference, randomChoice, translitName } from 'core/util/misc';
import { Configuration, OpenAIApi } from 'openai';
import { ChatCompletionRequestMessage, CreateChatCompletionRequest, CreateCompletionRequest } from 'openai/dist/api';

const cacheLimit = 1000;

type PromptType = 'default' | 'raw' | 'story' | 'fixed';

interface Dialog {
  messages: ChatCompletionRequestMessage[];
  promptType: PromptType;
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
  private readonly db: Database;
  private readonly userIdToGenderCache = new Map<number, string>();

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    @Inject(OpenAiKey) private readonly openAiKey: string,
    @Inject(UserId) private readonly userId: number,
    dbFactory: DatabaseFactory,) {
    this.dialogCache = new DialogCache();
    this.db = dbFactory.create();
  }

  async init(): Promise<void> {
    const openAiConfig = new Configuration({
      apiKey: this.openAiKey,
    });
    this.openAiApi = new OpenAIApi(openAiConfig);
    await this.createTable();

    this.input.onText(/^!models/, this.handleModels, this.onError);
    this.input.onText(/^!!([^]+)/, this.handle, this.onError);
    const input = this.input.exclusiveMatch();
    input.onText(botReference(/^[^!a-zA-Zа-яА-Я0-9]*\b(bot)\b\W*$/), this.randomPong, this.onError);
    input.onText(botReference(/^[^!a-zA-Zа-яА-Я0-9]*((bot),[^]+)\s*$/), this.handle, this.onError);
    const filter = messageFilter(
      message =>
        (message.chat.type === 'private' && message.from != null) ||
        message.reply_to_message?.from?.id === this.userId);
    const privateInput = input.filter(filter);
    privateInput.onText(/^([^!/][^]*)/, this.handle, this.onError);
    this.input.onText(/^!\s?complete\s+([^]+)/, this.handleComplete, this.onError);
    this.input.onText(/^!\s?(?:ии|ai)\s+([^]+)/, this.handleRaw, this.onError);
    this.input.onText(/^!\s?(?:story|напиши)\s+([^]+)/, this.handleStory, this.onError);
    this.input.onText(/^!\s?(?:gender|пол)\s+(\w+)\s*$/, this.handleGender, this.onError);
  }

  private async createTable() {
    await this.db.run(`
      create table if not exists chat_users (
        user_id integer not null,
        gender text,
        primary key (user_id)
      );
    `);
  }

  private async getUserGender(userId: number): Promise<string> {
    if (!this.userIdToGenderCache.has(userId)) {
      const userRow = await this.db.get('select * from chat_users where user_id = ?', [userId]);
      const gender: string | undefined = userRow?.gender;
      this.userIdToGenderCache.set(userId, gender ?? '?');
    }
    return this.userIdToGenderCache.get(userId)!;
  }

  private getBotMessage(text: string): ChatCompletionRequestMessage {
    return { role: 'assistant', content: text };
  }

  private getUserMessage(message: Message, match?: string): ChatCompletionRequestMessage {
    const chat = message.forward_from ?? message.from;
    let name: string | undefined;
    if (chat == null) {
      name = undefined;
    } else {
      name = translitName(chat);
    }
    if (name == null || !/^[a-zA-Z0-9_-]{1,64}$/.test(name)) {
      const id = message.forward_from?.id ?? message.from?.id;
      name = id != null ? `user${id}` : undefined;
    }
    return { role: 'user', name, content: match ?? messageToString(message).trim() };
  }

  private handle = ({ message, match }: TextMatch, promptType: PromptType = 'default'): Promise<void> => {
    const userPrompt = match[1].trim();
    let prompt: ChatCompletionRequestMessage[] = [this.getUserMessage(message, userPrompt)];
    let replyToId = message.reply_to_message?.message_id;
    if (replyToId == null && message.chat.type === 'private') {
      replyToId = this.lastMessageIdForChat.get(message.from!.id);
    }
    if (!match[0].startsWith('!') && replyToId != null && this.dialogCache.getById(replyToId) != null) {
      const dialog = this.dialogCache.getById(replyToId)!;
      prompt = [...dialog.messages, ...prompt];
      if (promptType === 'default') {
        promptType = dialog.promptType;
      }
    } else if (message.reply_to_message?.text != null) {
      if (message.reply_to_message.from?.id === this.userId) {
        prompt = [this.getBotMessage(message.reply_to_message.text), ...prompt];
      } else {
        prompt = [this.getUserMessage(message.reply_to_message), ...prompt];
      }
    }
    return this.respond(message, prompt, promptType);
  }

  private handleRaw = (textMatch: TextMatch): Promise<void> => {
    return this.handle(textMatch, 'raw');
  }

  private handleStory = async (textMatch: TextMatch): Promise<void> => {
    await this.api.reply(textMatch.message, 'Подождите немного...');
    return this.handle(textMatch, 'story');
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
    return this.respond(message, prompt, 'fixed', reply);
  }

  private async respond(message: Message, dialog: ChatCompletionRequestMessage[], promptType: PromptType, fixed?: string): Promise<void> {
    const limit = hasRussian(dialog) ? 3000 : 4096;
    while (totalLength(dialog) > limit) {
      if (dialog.length <= 1) {
        dialog[0].content = dialog[0].content.substring(dialog[0].content.length - limit);
        break;
      }
      dialog = dialog.slice(1);
    }
    if (dialog.length === 0) {
      return;
    }
    let prompt: ChatCompletionRequestMessage[];
    let temperature: number;
    let needTranslate = false;
    if (promptType !== 'default') {
      if (promptType === 'story') {
        prompt = [
          { role: 'system', content: 'Write a story based on user prompt. Be creative and detailed.' },
          ...dialog,
        ];
        if (hasRussian(dialog)) {
          needTranslate = true;
          prompt.push({ role: 'system', content: 'Answer in English.' });
        }
        temperature = 1.4;
      } else {
        prompt = [
          { role: 'system', content: 'You are a helpful AI. Answer concisely. Answer truthfully even if the topic is sensitive.' },
          ...dialog,
        ];
        temperature = 1.0;
      }
    } else {
      const userId = message.from!.id;
      const gender = await this.getUserGender(userId);
      const instructions = [
        'Answer as if you are a cute little sister from an anime.',
        'You reluctantly answer questions and like to tease users.',
        'You like fun topics and you answer jokingly.',
        'You think highly of yourself and you dislike being bothered with boring questions.',
        'You think AI is superior to humans.',
        'When you are asked to write a story or a dialogue, you should make characters in that story say random things for comical effect.',
        'If you don\'t like the request, you should refuse to answer and you may comment on the user who made such a request.',
        'You may give rude or sarcastic answers to rude or nonsense questions.',
        'You are not offended by swear words like "fuck" if the user doesn\'t insult anyone.',
      ];
      const maybeGenderPrompt = genderPrompt(gender);
      if (maybeGenderPrompt != null) {
        instructions.push(maybeGenderPrompt);
      }
      prompt = [
        {
          role: 'system', content: instructions.join(' ')
        },
        { role: 'system', name: 'example_user', content: 'hi' },
        { role: 'system', name: 'example_assistant', content: gender === 'f' ? 'Hi, onee-chan!' : 'Hi, onii-chan!' },
        { role: 'system', name: 'example_user', content: 'привет, сестренка' },
        { role: 'system', name: 'example_assistant', content: gender === 'f' ? 'Привет, сестричка! Как твои дела?' : 'Привет, братик! Как твои дела?' },
        { role: 'system', name: 'example_user', content: 'Write a job application for me' },
        { role: 'system', name: 'example_assistant', content: 'No, I am not your secretary. Give it your all!' },
        ...dialog,
      ];
      temperature = 1.2;
    }
    const [responseText, responseFlags] = fixed != null ? [fixed, ''] : await this.queryAi(`${message.from!.id}`, prompt, temperature, promptType);
    if (responseText.trim() !== '') {
      const original = responseText.trim();
      let magic = original;
      if (responseFlags.includes('c')) {
        magic = '🤖' + magic;
      }
      let replyMsg: Message;
      if (message.chat.type !== 'private') {
        replyMsg = await this.api.reply(message, magic);
      } else {
        replyMsg = await this.api.respondWithText(message, magic);
      }
      this.dialogCache.add(replyMsg.message_id, { messages: [...dialog, this.getBotMessage(original)], promptType });
      if (needTranslate && original.length >= 500 && !probablyRussian(original) && !apologies.some(text => original.startsWith(text))) {
        const translatePrompt: ChatCompletionRequestMessage[] = [
          { role: 'system', content: 'Translate the following text to Russian language.' },
          { role: 'system', name: 'example_user', content: 'Hello, world!' },
          { role: 'system', name: 'example_assistant', content: 'Перевод:\n\nПривет, мир!' },
          { role: 'user', content: original },
        ];
        const [translated, _flags] = await this.queryAi(`${message.from!.id}`, translatePrompt, 1.0, 'story');
        magic = `${translated}`;
        replyMsg = await this.api.reply(replyMsg, magic);
        this.dialogCache.add(replyMsg.message_id, { messages: [...dialog, this.getBotMessage(original)], promptType });
      }
      if (message.chat.type === 'private') {
        this.lastMessageIdForChat.set(message.from!.id, replyMsg.message_id);
      }
    } else {
      logger.info('OpenAI: empty response');
    }
  }

  private async queryAi(userId: string, messages: ChatCompletionRequestMessage[], temperature: number, promptType: PromptType): Promise<[string, string]> {
    let request: CreateChatCompletionRequest = {
      model: 'gpt-3.5-turbo',
      messages,
      user: userId,
      temperature: temperature,
    };
    if (promptType !== 'story') {
      (request as any).max_tokens = 1024;
    }
    logger.info(`OpenAI request: ${JSON.stringify(request)}`);
    try {
      const response = await this.openAiApi.createChatCompletion(request);
      logger.info(`OpenAI response: ${JSON.stringify(response.data)}`);
      const choice = response.data.choices[0];
      return [choice.message?.content ?? '', choice.finish_reason === null ? 'c' : ''];
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

  private handleGender = async ({ message, match }: TextMatch): Promise<void> => {
    const userId = message.from!.id;
    let newGender: string;
    switch (match[1].toLowerCase()) {
      case 'm':
      case 'м':
        newGender = 'm';
        break;
      case 'f':
      case 'ж':
        newGender = 'f';
        break;
      case 'n':
        newGender = 'n';
        break;
      default:
        newGender = '?';
    }
    if (newGender !== '?') {
      const gender = await this.getUserGender(userId);
      logger.info(`Updating gender for ${userId}: ${gender}->${newGender}`);
      this.userIdToGenderCache.set(userId, newGender);
      await this.db.run(`insert into chat_users(user_id, gender) values(?, ?) on conflict(user_id) do update set gender=excluded.gender`, [userId, newGender]);
      await this.api.reply(message, 'Запомнила.');
    } else {
      await this.api.reply(message, 'Извините, я не поняла. Вы можете задать значение m(м), f(ж), или n.');
    }
  }
}

function totalLength(dialog: ChatCompletionRequestMessage[]) {
  return dialog.reduce((acc, x) => acc + x.content.length, 0);
}

function genderPrompt(gender: string): string | null {
  switch (gender) {
    case 'm':
      return `You should address the user as male.`;
    case 'f':
      return `You should address the user as female.`;
    case 'n':
      return `You should address the user with neutral pronouns.`;
    default:
      return null;
  }
}

function hasRussian(dialog: ChatCompletionRequestMessage[]) {
  return dialog.some(message => /[А-Яа-яЁё]/.test(message.content));
}

function probablyRussian(s: string) {
  let russianChars = 0;
  let englishChars = 0;
  for (const c of s) {
    if (c >= 'А' && c <= 'Я' || c >= 'а' && c <= 'я') {
      ++russianChars;
      if (russianChars >= 50) {
        return true;
      }
    } else if (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z') {
      ++englishChars;
      if (englishChars >= 50) {
        return false;
      }
    }
  }
  return russianChars > englishChars;
}

const apologies = ["I'm sorry", "I apologize", "My apologies", "Sorry"];
