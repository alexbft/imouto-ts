import { Database } from 'core/db/database';
import { UnsavedQuote, Quote, Vote } from 'plugins/src/quotes/quote';
import * as moment from 'moment';

interface QuoteRow {
  num: number;
  poster_id?: number;
  poster_name?: string;
  date?: number;
  tag: string;
}

interface QuoteMessageRow {
  id: number;
  quote_num: number;
  message_id?: number;
  chat_id?: number;
  quote_text: string;
  has_text: number;
  author_id?: number;
  author_name: string;
  date?: number;
}

interface QuoteVoteRow {
  quote_num: number;
  user_id: number;
  value: number;
}

export async function createTables(db: Database): Promise<void> {
  await db.run(`
    create table if not exists quotes (
      num integer not null,
      poster_id integer,
      poster_name text,
      date integer,
      tag text not null,
      primary key (num)
    );
  `);
  await db.run(`
    create table if not exists quote_messages (
      id integer not null,
      quote_num integer not null,
      message_id integer,
      chat_id integer,
      quote_text text not null,
      has_text integer not null,
      author_id integer,
      author_name text not null,
      date integer,
      primary key (id)
    );
  `);
  await db.run(`
    create table if not exists quote_votes (
      quote_num integer not null,
      user_id integer not null,
      value integer not null,
      primary key (quote_num, user_id)
    );
  `);
}

export async function saveQuote(db: Database, quote: UnsavedQuote): Promise<Quote> {
  const result = await db.run(`
      insert into quotes(poster_id, poster_name, date, tag) values($poster_id, $poster_name, $date, $tag);
    `, {
      $poster_id: quote.posterId,
      $poster_name: quote.posterName,
      $date: quote.date == null ? null : quote.date.valueOf(),
      $tag: quote.tag
    });
  const quoteNum = result.lastID;
  const savedQuote: Quote = { ...quote, num: quoteNum, rating: 0, votes: [] };
  for (const msg of quote.messages) {
    await db.run(`
        insert into quote_messages(quote_num, message_id, chat_id, quote_text, has_text, author_id, author_name, date)
        values ($quote_num, $message_id, $chat_id, $quote_text, $has_text, $author_id, $author_name, $date);
      `, {
        $quote_num: savedQuote.num,
        $message_id: msg.id,
        $chat_id: msg.chatId,
        $quote_text: msg.text,
        $has_text: msg.hasText ? 1 : 0,
        $author_id: msg.authorId,
        $author_name: msg.authorName,
        $date: msg.date == null ? null : msg.date.valueOf()
      });
  }
  return savedQuote;
}

export async function deleteQuote(db: Database, quoteNum: number): Promise<void> {
  await db.run(`delete from quotes where num = ?`, [quoteNum]);
  await db.run(`delete from quote_messages where quote_num = ?`, [quoteNum]);
  await db.run(`delete from quote_votes where quote_num = ?`, [quoteNum]);
}

export async function getAllQuotes(db: Database): Promise<Map<number, Quote>> {
  let quotes: QuoteRow[];
  let messages: QuoteMessageRow[];
  let votes: QuoteVoteRow[];
  [quotes, messages, votes] = await Promise.all([
    db.all('select * from quotes'),
    db.all('select * from quote_messages'),
    db.all('select * from quote_votes')
  ]);
  const all: Quote[] = quotes.map(row => ({
    num: row.num,
    posterId: row.poster_id,
    posterName: row.poster_name,
    date: moment(row.date),
    messages: [],
    rating: 0,
    votes: [],
    tag: row.tag,
  }));
  const byNum = new Map<number, Quote>();
  for (const q of all) {
    byNum.set(q.num, q);
  }
  for (const msg of messages) {
    const q = byNum.get(msg.quote_num);
    if (q != null) {
      q.messages.push({
        authorId: msg.author_id,
        authorName: msg.author_name,
        id: msg.message_id,
        chatId: msg.chat_id,
        date: moment(msg.date),
        text: msg.quote_text,
        hasText: msg.has_text == 1
      });
    }
  }
  for (const v of votes) {
    const q = byNum.get(v.quote_num);
    if (q != null) {
      q.votes.push({
        userId: v.user_id,
        value: v.value
      });
      q.rating += v.value;
    }
  }
  return byNum;
}

export async function updateVote(db: Database, quoteNum: number, vote: Vote): Promise<void> {
  await db.run(`update quote_votes set value = $value where quote_num = $quote_num and user_id = $user_id`, {
    $value: vote.value,
    $quote_num: quoteNum,
    $user_id: vote.userId
  });
}

export async function insertVote(db: Database, quoteNum: number, vote: Vote): Promise<void> {
  await db.run(`insert into quote_votes (quote_num, user_id, value) values ($quote_num, $user_id, $value)`, {
    $value: vote.value,
    $quote_num: quoteNum,
    $user_id: vote.userId
  });
}

export async function updateQuoteTag(db: Database, quoteNum: number, tag: string): Promise<void> {
  await db.run(`update quotes set tag = ? where num = ?`, [tag, quoteNum]);
}
