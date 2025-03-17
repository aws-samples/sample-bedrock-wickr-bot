import { BedrockBot } from "./bot/BedrockBot";
import { WickrLogger as logger } from "./bot/logger";

async function main() {
  const bot = new BedrockBot();

  process.on("SIGINT", () => exitHandler(bot, { exit: true }));
  process.on("SIGUSR1", () => exitHandler(bot, { pid: true }));
  process.on("SIGUSR2", () => exitHandler(bot, { pid: true }));
  process.on("uncaughtException", (err) =>
    exitHandler(bot, { exit: true }, err)
  );

  await bot.start();
}

async function exitHandler(bot: BedrockBot, options: any, err?: any) {
  try {
    if (err) {
      logger.error(`Exit error: ${err}`);
      process.exit();
    }
    await bot.close();
    if (options.exit) {
      process.exit();
    } else if (options.pid) {
      process.kill(process.pid);
    }
  } catch (err) {
    logger.error(err as string);
  }
}

main();
