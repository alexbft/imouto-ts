import '../src/path_hack';

import { promisify } from 'util';
import * as fs from 'fs';
import * as readline from 'readline';
import { Props, pause } from '../src/core/util/misc';
import { Web } from '../src/core/util/web';
import { duration } from 'moment';

const dumpFile = __dirname + '/../../data/xkcd_full.json';
const titleFile = __dirname + '/../../data/xkcd_titles.json';
const web = new Web();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const exists = promisify(fs.exists);
    const readFile = promisify(fs.readFile);
    const writeFile = promisify(fs.writeFile);
    const question = (query: string) => new Promise((resolve) => {
      rl.question(query, resolve);
    });
    let dump: { [issue: number]: Props } = {};
    if (!await exists(dumpFile)) {
      console.log('Dump file does not exist, starting anew...');
    } else {
      console.log('Reading existing dump file...');
      dump = JSON.parse((await readFile(dumpFile)).toString());
    }
    console.log(`Found ${Object.keys(dump).length} issues.`);
    console.log('Rewriting dump to see if there is any write protection...');
    await writeFile(dumpFile, JSON.stringify(dump));
    console.log('Done.');
    await question('Press ENTER to continue...');
    const current: number = (await web.getJson('https://xkcd.com/info.0.json')).num;
    console.log(`Current issue is ${current}`);
    for (let i = 1; i <= current; ++i) {
      if (dump[i] == null && i != 404) {
        console.log(`Fetching issue ${i}`);
        try {
          dump[i] = await web.getJson(`https://xkcd.com/${i}/info.0.json`);
          console.log(`Issue ${i} fetched.`);
          await pause(duration(100, 'milliseconds'));
        } catch (e) {
          console.error(e);
          break;
        }
      }
    }
    console.log('Saving dump...');
    await writeFile(dumpFile, JSON.stringify(dump));
    console.log('Done.');
    let titleMap: Props = {};
    for (const k of Object.keys(dump)) {
      const issue = dump[+k];
      titleMap[k] = {
        num: issue.num,
        title: issue.title
      };
    }
    console.log('Saving title map...');
    await writeFile(titleFile, JSON.stringify(titleMap));
    console.log('Done.');
  } catch (e) {
    console.error(e);
  } finally {
    rl.close();
  }
}

main();

