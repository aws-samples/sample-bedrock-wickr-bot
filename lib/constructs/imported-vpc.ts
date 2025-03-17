import { ISubnet, IVpc, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct, IConstruct } from "constructs";

interface ImportedVpcProps {
  /**
   * ID of the existing VPC
   */
  readonly vpcId: string;
}

// Import an existing VPC
export class ImportedVpc extends Construct {
  readonly vpc: IVpc;

  constructor(scope: IConstruct, id: string, props: ImportedVpcProps) {
    super(scope, id);

    this.vpc = Vpc.fromLookup(this, "ImportedVpc", {
      vpcId: props.vpcId,
    });

    // Validate subnet configuration
    this.validateSubnets();
  }

  private validateSubnets(): void {
    // Check if there are at least 2 AZs
    if (this.vpc.availabilityZones.length < 2) {
      throw new Error("VPC must span at least 2 availability zones");
    }

    // Get subnet groups
    const privateSubnets = this.vpc.privateSubnets;
    const publicSubnets = this.vpc.publicSubnets;

    // Check for private subnets (needed for ECS)
    if (
      privateSubnets.length < 2 ||
      !this.subnetsInDifferentAZs(privateSubnets)
    ) {
      throw new Error(
        "VPC must have at least 2 private subnets in different AZs"
      );
    }

    // Check for public subnets (at least 1 needed for the NAT Gateway)
    if (publicSubnets.length < 1) {
      throw new Error("VPC must have at least one public subnet");
    }

    // Validate subnet CIDR sizes
    for (const subnet of [...privateSubnets, ...publicSubnets]) {
      const cidrMatch = subnet.ipv4CidrBlock.match(/\/(\d+)$/);
      if (cidrMatch && parseInt(cidrMatch[1]) > 27) {
        throw new Error(
          `Subnet ${subnet.subnetId} CIDR block is too small. Recommend at least /27.`
        );
      }
    }
  }

  // Helper function to check if subnets are in different AZs
  private subnetsInDifferentAZs(subnets: ISubnet[]): boolean {
    const azs = new Set(subnets.map((subnet) => subnet.availabilityZone));
    return azs.size >= 2;
  }
}
