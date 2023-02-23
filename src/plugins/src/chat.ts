import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TextMatch } from "core/bot_api/text_match";
import { OpenAiKey, UserId } from 'core/config/keys';
import { Inject, Injectable } from "core/di/injector";
import { logger } from 'core/logging/logger';
import { TgApi } from "core/tg/tg_api";
import { Message } from 'core/tg/tg_types';
import { Configuration, OpenAIApi } from 'openai';
import { CreateCompletionRequest } from 'openai/dist/api';
import { messageFilter } from 'core/filter/message_filter';

@Injectable
export class ChatPlugin implements BotPlugin {
  readonly name = 'Chat';
  private openAiApi!: OpenAIApi;
  private readonly answers = new Map<number, string>();

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    @Inject(OpenAiKey) private openAiKey: string,
    @Inject(UserId) private readonly userId: number) { }

  init(): void {
    const openAiConfig = new Configuration({
      apiKey: this.openAiKey,
    });
    this.openAiApi = new OpenAIApi(openAiConfig);

    this.input.onText(/^!!([^]+)/, this.handle, this.onError);
    const filter = messageFilter(
      message => message.reply_to_message != null &&
        message.reply_to_message.from != null &&
        message.reply_to_message.from.id === this.userId &&
        this.answers.has(message.reply_to_message.message_id));
    const privateInput = this.input.filter(filter);
    privateInput.onText(/([^]+)/, this.handleReply, this.onError);
  }

  private handle = ({ message, match }: TextMatch): Promise<void> => {
    let userPrompt = match[1].trim();
    if (userPrompt.endsWith('?')) {
      userPrompt = `Answer as a shy introverted little sister character. ${userPrompt}`
    }
    return this.respond(message, userPrompt);
  }

  private handleReply = ({ message, match }: TextMatch): Promise<void> => {
    const answerId = message.reply_to_message!.message_id;
    const prev = this.answers.get(answerId) ?? '';
    let userPrompt = prev.trim() + '\n\n' + match[1].trim();
    return this.respond(message, userPrompt);
  }

  private async respond(message: Message, prompt: string): Promise<void> {
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
    prompt = prompt + '\n\n';
    const responseText = await this.queryAi(`${message.from!.id}`, prompt);
    const replyMsg = await this.api.reply(message, responseText.trim());
    this.answers.set(replyMsg.message_id, prompt + responseText);
  }

  private async queryAi(userId: string, query: string): Promise<string> {
    const maxTokens = /[А-Яа-я]/.test(query) ? 1024 : 256;
    const request: CreateCompletionRequest = {
      model: 'text-davinci-003',
      prompt: query,
      user: userId,
      max_tokens: maxTokens,
      temperature: 1.2,
    };
    logger.info(`OpenAI request: ${JSON.stringify(request)}`);
    const response = await this.openAiApi.createCompletion(request);
    return (response.data.choices[0].text ?? '[empty]');
  }

  private onError = (message: Message) => this.api.reply(message, 'Ошибка');
}
