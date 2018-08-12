import { Moment } from 'moment';

export interface QuoteMessage {
  id?: number;
  chatId?: number;
  text: string;
  hasText: boolean;
  authorId?: number;
  authorName: string;
  date?: Moment;
}

export interface UnsavedQuote {
  posterId?: number;
  posterName?: string;
  date?: Moment;
  messages: QuoteMessage[];
  tag: string;
}

export interface Vote {
  userId: number;
  value: number;
}

export interface Quote extends UnsavedQuote {
  num: number;
  rating: number;
  votes: Vote[];
}

export function isSavedQuote(quote: UnsavedQuote): quote is Quote {
  return 'num' in quote;
}

export type QuoteFilter = (q: Quote) => boolean;

export function filterByAuthorId(authorId: number): QuoteFilter {
  return q => q.messages.map(msg => msg.authorId || null).indexOf(authorId) !== -1;
}

export function filterByText(text: string): QuoteFilter {
  const key = text.toLowerCase();
  return q => q.tag.toLowerCase().includes(key) ||
    q.messages.some(
      msg => msg.authorName.toLowerCase() === key ||
        msg.text.toLowerCase().includes(key));
}

export function filterByQuoteNum(num: number): QuoteFilter {
  return q => q.num >= num;
}
