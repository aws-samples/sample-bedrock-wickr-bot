import { RawMessage, WickrIOBot } from "wickrio-bot-api";
import { MessageProcessor } from "./MessageProcessor";
import { WickrLogger as logger } from "./logger";

export class BedrockBot {
  private bot: WickrIOBot;
  private messageProcessor: MessageProcessor;

  constructor() {
    this.bot = new WickrIOBot();
    this.messageProcessor = new MessageProcessor(this.bot);
  }

  async start(): Promise<void> {
    this.bot.processesJsonToProcessEnv();

    try {
      const tokens = JSON.parse(process.env.tokens!);
      logger.info(`Starting bot ${tokens.WICKRIO_BOT_NAME.value}`);
      const status = await this.bot.start(tokens.WICKRIO_BOT_NAME.value);
      if (!status) {
        throw new Error("Client not able to start");
      }

      logger.info("Bot started. Listening for messages.");
      await this.bot.startListening(this.handleMessage.bind(this));
    } catch (err) {
      logger.error(err as string);
      throw err;
    }
  }

  private async handleMessage(message: RawMessage): Promise<void> {
    const parsedMessage = this.bot.parseMessage(message);
    if (!parsedMessage) {
      logger.error(`Failed to parse message: ${message}`);
      return;
    }

    if (await MessageProcessor.canHandle(parsedMessage)) {
      try {
        await this.messageProcessor.process(parsedMessage);
      } catch (err) {
        logger.error(err as string);
      }
    }
  }

  async close(): Promise<void> {
    return this.bot.close();
  }
}
