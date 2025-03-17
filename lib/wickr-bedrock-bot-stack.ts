import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NewVpc } from "./constructs/new-vpc";
import { ImportedVpc } from "./constructs/imported-vpc";
import { EcsCluster } from "./constructs/ecs-cluster";
import { WickrBot } from "./constructs/wickr-bot";
import { IVpc } from "aws-cdk-lib/aws-ec2";

export interface WickrBedrockBotStackProps extends StackProps {
  readonly isDevelopmentEnv: boolean;
  readonly credentialsArn: string;
  readonly vpcId?: string;
}

export class WickrBedrockBotStack extends Stack {
  public readonly vpc: IVpc;

  constructor(scope: Construct, id: string, props: WickrBedrockBotStackProps) {
    super(scope, id, props);

    if (props?.vpcId !== undefined) {
      // import vpc using vpcId
      this.vpc = new ImportedVpc(this, "Vpc", {
        vpcId: props.vpcId,
      }).vpc;
    } else {
      // create new vpc
      this.vpc = new NewVpc(this, "Vpc", {
        noFlowLog: props.isDevelopmentEnv,
        isDevelopmentEnv: props.isDevelopmentEnv,
      }).vpc;
    }

    const cluster = new EcsCluster(this, "EcsCluster", {
      vpc: this.vpc,
    }).cluster;

    new WickrBot(this, "WickrBot", {
      vpc: this.vpc,
      cluster: cluster,
      credentialsArn: props.credentialsArn,
      isDevelopmentEnv: props.isDevelopmentEnv,
    });
  }
}
