import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelResponse,
} from "@aws-sdk/client-bedrock-runtime";
import { WickrIOBot, WickrIOMessage } from "wickrio-bot-api";
import { WickrLogger as logger } from "./logger";

interface ModelParams {
  temperature: number;
  top_p: number;
  max_gen_len: number;
}

export class MessageProcessor {
  protected bedrockClient: BedrockRuntimeClient;
  protected modelId: string;
  protected modelParams: ModelParams;

  constructor(private bot: WickrIOBot) {
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION,
    });
    this.modelId = "meta.llama3-8b-instruct-v1:0";
    this.modelParams = {
      temperature: 0.5,
      top_p: 0.9,
      max_gen_len: 512,
    };
  }

  static canHandle(message: WickrIOMessage): Promise<boolean> {
    // only respond to direct messages that are not empty
    return Promise.resolve(
      message.convotype === "personal" && !!message.message
    );
  }

  async createResponse(msg: string): Promise<string> {
    const prompt = `
    <|begin_of_text|><|start_header_id|>user<|end_header_id|>
    ${msg}
    <|eot_id|>
    <|start_header_id|>assistant<|end_header_id|>
    `;

    const request = { prompt, ...this.modelParams };
    const command = new InvokeModelCommand({
      body: JSON.stringify(request),
      modelId: this.modelId,
      contentType: "application/json",
    });

    const response = await this.bedrockClient.send(command);
    return this.processResponse(response);
  }

  async process(message: WickrIOMessage): Promise<void> {
    const response = await this.createResponse(message.message!);

    return this.bot
      .apiService()
      .WickrIOAPI.cmdSendRoomMessage(message.vgroupid, response);
  }

  private processResponse(response: InvokeModelResponse): string {
    if (response.body === undefined) {
      logger.debug("Raw Bedrock Response:");
      logger.debug(response);
      throw new Error("Failed to get response from Bedrock");
    }

    const body = JSON.parse(new TextDecoder().decode(response.body));
    const generatedText = body.generation;

    return generatedText.trim();
  }
}
