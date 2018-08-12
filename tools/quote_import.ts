import '../src/path_hack';

import { Database } from 'core/db/database';
import { dataDir } from 'core/module/data_dir';
import { createTables, insertVote } from 'plugins/src/quotes/quote_sql';
import { exists, readJson, Props } from 'core/util/misc';
import { Quote, QuoteMessage } from 'plugins/src/quotes/quote';
import * as moment from 'moment';
import { logger } from 'core/logging/logger';

const toImport = dataDir + 'quotes3.txt';
const toImportVotes = dataDir + 'quote_votes.json';

function getDate(date?: number): moment.Moment | undefined {
  if (date == null) {
    return undefined;
  }
  if (date < 9999999999) {
    return moment.unix(date);
  }
  return moment(date);
}

async function doWork(db: Database) {
  if (!await exists(toImport)) {
    console.log('quotes3.txt not found');
    return;
  }
  await createTables(db);
  const quotesJson: any[] = await readJson(toImport);
  const mapQuote = (it: any): Quote => ({
    num: it.num,
    posterId: it.posterId,
    posterName: it.posterName,
    date: getDate(it.date),
    tag: '',
    rating: 0,
    votes: [],
    messages: (it.messages as any[]).map((msg: any): QuoteMessage => ({
      authorId: msg.sender,
      authorName: msg.sender_name || msg.saved_name || '???',
      id: msg.id,
      chatId: msg.chat_id,
      date: getDate(msg.date),
      hasText: msg.text != null && msg.text != '',
      text: msg.text || '[media]'
    })),
  });
  const mapQuoteOld = (it: any): Quote => ({
    num: it.num,
    tag: '',
    rating: 0,
    votes: [],
    messages: [{
      authorId: it.sender,
      authorName: it.sender_name || it.saved_name || '???',
      id: it.id,
      chatId: it.chat_id,
      hasText: it.text != null && it.text != '',
      text: it.text || '[media]'
    }]
  });
  const quotes = quotesJson.map(it => it.version >= 3 ? mapQuote(it) : mapQuoteOld(it));
  const skipped = new Set<number>();
  for (const quote of quotes) {
    const existing: number = (await db.get(`select count(*) c from quotes where num = ?`, [quote.num]))['c'];
    if (existing > 0) {
      if (process.argv.indexOf('--force') !== -1) {
        await db.run(`delete from quotes where num = ?`, [quote.num]);
      } else {
        console.log(`WARNING: skipping quote ${quote}`);
        skipped.add(quote.num);
        continue;
      }
    }
    await db.run(`
        insert into quotes(num, poster_id, poster_name, date, tag) values($num, $poster_id, $poster_name, $date, $tag);
      `, {
        $num: quote.num,
        $poster_id: quote.posterId,
        $poster_name: quote.posterName,
        $date: quote.date == null ? null : quote.date.valueOf(),
        $tag: quote.tag
      });
    await db.run(`delete from quote_messages where quote_num = ?`, [quote.num]);
    for (const msg of quote.messages) {
      await db.run(`
        insert into quote_messages(quote_num, message_id, chat_id, quote_text, has_text, author_id, author_name, date)
        values ($quote_num, $message_id, $chat_id, $quote_text, $has_text, $author_id, $author_name, $date);
      `, {
          $quote_num: quote.num,
          $message_id: msg.id,
          $chat_id: msg.chatId,
          $quote_text: msg.text,
          $has_text: msg.hasText ? 1 : 0,
          $author_id: msg.authorId,
          $author_name: msg.authorName,
          $date: msg.date == null ? null : msg.date.valueOf()
        });
    }
  }
  if (!await exists(toImportVotes)) {
    console.log('quote_votes.json not found');
    return;
  }
  const votesJson: Props = await readJson(toImportVotes);
  for (const key in votesJson) {
    const quoteNum = Number(key);
    if (skipped.has(quoteNum)) {
      continue;
    }
    await db.run(`delete from quote_votes where quote_num = ?`, [quoteNum]);
    const votes: Props = votesJson[key];
    for (const userKey in votes) {
      const userId = Number(userKey);
      const value = votes[userKey];
      await insertVote(db, quoteNum, { userId, value });
    }
  }
  console.log('Done!');
}

async function main() {
  const db = new Database(dataDir + 'db.sqlite3');
  logger.level = 'debug';
  db.debugLogging = true;
  await db.open();

  try {
    await doWork(db);
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

main();

