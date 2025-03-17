import { Logger } from "winston";

declare module "wickrio-bot-api" {
  declare class WickrIOConfigure {
    constructor(tokens: string[], name: string);
    configureYourBot(name: string): Promise<void>;
  }

  // the logger exported from wickrio-bot-api is just a wrapped Winston logger, so use the
  // Winston typing
  export const logger: Logger;

  declare class WickrIOAPI {
    cmdSendRoomMessage(groupId: string, message: string): void;
  }

  declare interface RawMessage {
    message: string;
    message_id: string;
    msg_ts: string;
    msgtype: number;
    receiver: string;
    respond_api: string;
    sender: string;
    sender_type: string;
    time: string;
    time_iso: string;
    ttl: string;
    users: {
      name: string;
    }[];
    vgroupid: string;
  }

  declare interface WickrIOMessage {
    command: string;
    argument: string;
    vgroupid: string;
    userEmail: string;
    convotype: string;
    message?: string;
  }

  declare class WickrIOBot {
    apiService(): { WickrIOAPI: WickrIOAPI };
    processesJsonToProcessEnv(): void;
    start(name: string): boolean;
    startListening(listenHandler: (message: RawMessage) => void): Promise<void>;
    parseMessage(message: RawMessage): WickrIOMessage | undefined;
    close(): Promise<void>;
  }
}
