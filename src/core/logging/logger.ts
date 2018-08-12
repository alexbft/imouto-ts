import * as winston from 'winston';
import * as moment from 'moment';
import { logDir } from 'core/module/data_dir';
import { existsSync, mkdirSync } from 'fs';

interface LoggerExtensions {
  wipeMap: Map<string, string>;
}

type Logger = winston.LoggerInstance & LoggerExtensions;

function serializeMeta(meta: any): string {
  if (meta == null || (typeof meta === 'object' && Object.keys(meta).length === 0)) {
    return '';
  } else if (typeof meta === 'string') {
    return ' ' + meta;
  } else {
    return ' ' + JSON.stringify(meta);
  }
}

function initLogging(): Logger {
  if (!existsSync(logDir)) {
    mkdirSync(logDir);
  }
  const result: Logger = new winston.Logger({
    levels: {
      debug: 4,
      verbose: 3,
      info: 2,
      outMsg: 2,
      inMsg: 2,
      warn: 1,
      error: 0,
    },
    colors: {
      debug: 'gray',
      verbose: 'gray',
      info: 'white',
      outMsg: 'green bold',
      inMsg: 'green',
      warn: 'yellow bold',
      error: 'red bold',
    },
    transports: [
      new winston.transports.Console({
        formatter: ({ level, message, meta }: any) => {
          const date = moment().format('Y-MM-DD HH:mm:ss.SSS');
          let text = `[${date}] ${message}` + serializeMeta(meta);
          for (const [k, v] of result.wipeMap.entries()) {
            text = text.replace(v, `[${k}]`);
          }
          return winston.config.colorize(level, text);
        },
      }),
      new winston.transports.File({
        json: false,
        filename: `${logDir}${moment().format('Y-MM-DD-HH-mm-ss')}.log`,
        formatter: ({ level, message, meta }: any) => {
          const date = moment().format('Y-MM-DD HH:mm:ss.SSS');
          const levelStr = String(level).toUpperCase();
          let text = `[${date}] [${levelStr}] ${message}` + serializeMeta(meta);
          for (const [k, v] of result.wipeMap.entries()) {
            text = text.replace(v, `[${k}]`);
          }
          return text;
        },
      }),
    ],
    level: 'info',
  }) as Logger;
  result.wipeMap = new Map();
  result.on('error', (e) => {
    console.log(`Error in logger: ${e.stack || e}`);
  });
  return result;
}

export const logger = initLogging();
