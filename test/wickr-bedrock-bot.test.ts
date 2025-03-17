import { Match, Template } from "aws-cdk-lib/assertions";
import { App } from "aws-cdk-lib";
import { WickrBedrockBotStack } from "../lib/wickr-bedrock-bot-stack";

describe("WickrBedrockBotStack", () => {
  const testEnv = {
    account: "123456789012",
    region: "us-east-1",
  };

  const defaultProps = {
    isDevelopmentEnv: true,
    credentialsArn:
      "arn:aws:secretsmanager:region:123456789012:secret:test-secret",
    env: testEnv,
  };

  test("creates new VPC when no vpcId is provided", () => {
    const app = new App();
    const stack = new WickrBedrockBotStack(app, "TestStack", defaultProps);
    const template = Template.fromStack(stack);

    template.resourceCountIs("AWS::EC2::VPC", 1);
    template.hasResourceProperties("AWS::EC2::VPC", {
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });
  });

  test("uses imported VPC when vpcId is provided", () => {
    const app = new App();
    const stack = new WickrBedrockBotStack(app, "TestStack", {
      ...defaultProps,
      vpcId: "vpc-12345",
    });
    const template = Template.fromStack(stack);

    template.resourceCountIs("AWS::EC2::VPC", 0);
  });

  test("creates ECS cluster with correct configuration", () => {
    const app = new App();
    const stack = new WickrBedrockBotStack(app, "TestStack", defaultProps);
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::ECS::Cluster", {
      CapacityProviders: Match.absent(),
    });
  });

  test("creates WickrBot with required resources", () => {
    const app = new App();
    const stack = new WickrBedrockBotStack(app, "TestStack", defaultProps);
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::ECS::Service", {
      LaunchType: "FARGATE",
    });

    template.hasResourceProperties("AWS::ECS::TaskDefinition", {
      RequiresCompatibilities: ["FARGATE"],
      NetworkMode: "awsvpc",
    });
  });

  test("development environment has no flow logs", () => {
    const app = new App();
    const stack = new WickrBedrockBotStack(app, "TestStack", defaultProps);
    const template = Template.fromStack(stack);

    template.resourceCountIs("AWS::EC2::FlowLog", 0);
  });

  test("production environment has flow logs", () => {
    const app = new App();
    const stack = new WickrBedrockBotStack(app, "TestStack", {
      ...defaultProps,
      isDevelopmentEnv: false,
    });
    const template = Template.fromStack(stack);

    template.resourceCountIs("AWS::EC2::FlowLog", 1);
  });
});
