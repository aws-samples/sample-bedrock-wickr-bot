import { WickrIOConfigure } from 'wickrio-bot-api';
import { WickrLogger as logger } from './bot/logger';

require('dotenv').config({
  path: `.env.configure`,
});

let wickrIOConfigure: WickrIOConfigure;

interface ConfigTokens {
  supportAdministrators: boolean;
  supportVerification: boolean;
  integration: string;
  tokens: string[];
}

process.stdin.resume(); //so the program will not close instantly

function exitHandler(options: any, err: any) {
  try {
    if (err) {
      process.kill(process.pid);
      process.exit();
    }
    if (options.exit) {
      process.exit();
    } else if (options.pid) {
      process.kill(process.pid);
    }
  } catch (err) {
    logger.error(err);
  }
}

//catches ctrl+c and stop.sh events
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

//catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { pid: true }));
process.on('SIGUSR2', exitHandler.bind(null, { pid: true }));

//catches uncaught exceptions
process.on(
  'uncaughtException',
  exitHandler.bind(null, {
    exit: true,
    reason: 'uncaughtException',
  }),
);

main();

async function main() {
  const tokens: ConfigTokens = require('./configTokens.json');
  const fullName = `${process.cwd()}/processes.json`;
  wickrIOConfigure = new WickrIOConfigure(tokens.tokens, fullName);

  await wickrIOConfigure.configureYourBot(tokens.integration);
  process.exit();
}
