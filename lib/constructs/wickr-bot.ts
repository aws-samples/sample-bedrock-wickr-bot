import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import {
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  LogDriver,
} from "aws-cdk-lib/aws-ecs";
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { NagSuppressions } from "cdk-nag";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { join } from "path";

export interface WickrBotProps {
  readonly vpc: IVpc;
  readonly cluster: Cluster;
  readonly credentialsArn: string;
  readonly isDevelopmentEnv: boolean;
}

const solutionRootDir = `${__dirname}/../..`;

export class WickrBot extends Construct {
  constructor(scope: Construct, id: string, props: WickrBotProps) {
    super(scope, id);

    const stack = Stack.of(this);

    const image = new DockerImageAsset(this, "WickrBotImage", {
      directory: join(solutionRootDir, "bot"),
    });

    const taskRole = new Role(this, "WickrBotTaskRole", {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      inlinePolicies: {
        AccessSecretsManager: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret",
              ],
              resources: [props.credentialsArn],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["bedrock:InvokeModel"],
              resources: [
                `arn:${stack.partition}:bedrock:${stack.region}::foundation-model/*`,
              ],
            }),
          ],
        }),
      },
    });

    const task = new FargateTaskDefinition(this, "WickrBotTask", {
      cpu: 1024,
      memoryLimitMiB: 2048,
      taskRole: taskRole,
    });

    task.addContainer("WickrBot", {
      image: ContainerImage.fromDockerImageAsset(image),
      logging: LogDriver.awsLogs({
        streamPrefix: `wickrBot-container`,
        logRetention: RetentionDays.ONE_DAY,
      }),
      environment: {
        CREDENTIALS_ARN: props.credentialsArn,
      },
      healthCheck: {
        command: ["CMD-SHELL", "pgrep -l wickrio_bot || exit 1"],
      },
    });

    new FargateService(this, "WickrBotService", {
      serviceName: `WickrBotService`,
      cluster: props.cluster,
      taskDefinition: task,
      assignPublicIp: false,
      desiredCount: 1,
      enableExecuteCommand: props.isDevelopmentEnv,
    });

    if (task.executionRole) {
      NagSuppressions.addResourceSuppressions(
        task.executionRole,
        [
          {
            id: "AwsSolutions-IAM5",
            reason:
              "Wildcard permissions are required on the base execution role for ECS to setup CloudWatch logging",
          },
        ],
        true
      );
    }

    if (props.isDevelopmentEnv) {
      NagSuppressions.addResourceSuppressions(
        taskRole.node.findChild("DefaultPolicy"),
        [
          {
            id: "AwsSolutions-IAM5",
            reason:
              "Wildcard permissions for default policy are required for remote access to container in development environment",
          },
        ],
        true
      );
    }

    NagSuppressions.addResourceSuppressions(
      task,
      [
        {
          id: "AwsSolutions-ECS2",
          reason: "Adding env variables which are not secrets is ok",
        },
      ],
      true
    );

    NagSuppressions.addResourceSuppressions(
      taskRole,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Wildcard is used to allow access to any Bedrock Foundation Model that user has access to.",
        },
      ],
      true
    );
  }
}
