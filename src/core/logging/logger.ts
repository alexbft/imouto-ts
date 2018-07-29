import * as winston from 'winston';

function serializeMeta(meta: any): string {
  if (meta == null || (typeof meta === 'object' && Object.keys(meta).length === 0)) {
    return '';
  } else if (typeof meta === 'string') {
    return ' ' + meta;
  } else {
    return ' ' + JSON.stringify(meta);
  }
}

function initLogging(): winston.LoggerInstance {
  const result = new winston.Logger({
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
          const date = (new Date()).toLocaleString();
          const text = `[${date}] ${message}` + serializeMeta(meta);
          return winston.config.colorize(level, text);
        },
      }),
    ],
    level: 'debug',
  });
  result.on('error', (e) => {
    console.log(`Error in logger: ${e.stack || e}`);
  });
  return result;
}

export const logger = initLogging();
