import { RemovalPolicy } from "aws-cdk-lib";
import {
  FlowLogDestination,
  GatewayVpcEndpointAwsService,
  IpAddresses,
  SubnetType,
  Vpc,
  VpcProps,
} from "aws-cdk-lib/aws-ec2";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Construct, IConstruct } from "constructs";
import { NagSuppressions } from "cdk-nag";

export interface NewVpcProps {
  /**
   * If set to true, all logging data will be deleted when the resource is destroyed
   *
   * @default false
   */
  isDevelopmentEnv?: boolean;

  /**
   * By default, the VPC is created with a flow log.
   *
   * The creation of the flow log can be suppressed by setting `noFlowLog` to `true`.
   *
   * @see https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html
   *
   * @default false
   */
  noFlowLog?: boolean;

  /**
   * Additional options to set in the VPC
   */
  vpcOptions?: VpcProps;
}

// Creates a new VPC with default configuration.
export class NewVpc extends Construct {
  readonly vpc: Vpc;

  constructor(scope: IConstruct, id: string, props: NewVpcProps) {
    super(scope, id);

    const removalPolicy = props.isDevelopmentEnv
      ? RemovalPolicy.DESTROY
      : RemovalPolicy.RETAIN;

    this.vpc = new Vpc(this, "WickrBedrockBotVPC", {
      ...props.vpcOptions,
      vpcName: "WickrBedrockBotVPC",
      ipAddresses: IpAddresses.cidr("10.13.0.0/16"),
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 21,
          name: "Private",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: "Public",
          subnetType: SubnetType.PUBLIC,
        },
      ],
      gatewayEndpoints: {
        S3: {
          service: GatewayVpcEndpointAwsService.S3,
        },
      },
      flowLogs: {},
    });

    if (!props.noFlowLog) {
      const logGroup = new LogGroup(this, "VpcFlowLogGroup", {
        removalPolicy,
      });

      const flowLogRole = new Role(this, "VpcFlowLogRole", {
        assumedBy: new ServicePrincipal("vpc-flow-logs.amazonaws.com"),
      });

      this.vpc.addFlowLog("VpcFlowLog", {
        destination: FlowLogDestination.toCloudWatchLogs(logGroup, flowLogRole),
      });
    }

    if (props.isDevelopmentEnv) {
      NagSuppressions.addResourceSuppressions(
        this.vpc,
        [
          {
            id: "AwsSolutions-VPC7",
            reason: "Flow logs are not desired for development VPC",
          },
        ],
        true
      );
    }
  }
}
