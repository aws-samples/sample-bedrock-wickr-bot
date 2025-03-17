#!/usr/bin/env node
import { App, Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { load as loadYaml } from "js-yaml";
import { readFileSync } from "fs";
import { WickrBedrockBotStack } from "../lib/wickr-bedrock-bot-stack";

interface Config {
  readonly account: string;
  readonly region: string;
  readonly isDevelopmentEnv: boolean;
  readonly credentialsArn: string;
  readonly vpcId?: string;
}

const config: Config = loadYaml(readFileSync("config.yaml", "utf8")) as Config;

const env = {
  account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region || process.env.CDK_DEFAULT_REGION,
};

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks());

new WickrBedrockBotStack(app, "WickrBedrockBotStack", {
  env,
  isDevelopmentEnv: config.isDevelopmentEnv,
  credentialsArn: config.credentialsArn,
  vpcId: config.vpcId,
});
