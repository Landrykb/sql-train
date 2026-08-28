export type SAAExamDomain = 'secure' | 'resilient' | 'high-performing' | 'cost-optimized';

export interface SAAQuestion {
  id: string;
  domain: SAAExamDomain;
  scenario: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export const SAA_QUESTIONS: SAAQuestion[] = [
  // Domain 1: Secure Architectures
  {
    id: 'q1',
    domain: 'secure',
    scenario: 'A media company stores archived video files in S3. Compliance requires that objects cannot be overwritten or deleted for 7 years.',
    question: 'Which combination meets the compliance requirement with least operational overhead?',
    choices: [
      'Enable S3 versioning and S3 Object Lock in Compliance mode',
      'Use an IAM policy that denies s3:DeleteObject for the bucket',
      'Enable server-side encryption with KMS customer-managed keys',
      'Create a daily Lambda function to copy objects to a second bucket',
    ],
    correctIndex: 0,
    explanation: 'S3 Object Lock in Compliance mode makes objects immutable for a defined retention period. Versioning + IAM alone does not protect against object deletion by the bucket owner.',
  },
  {
    id: 'q2',
    domain: 'secure',
    scenario: 'A three-tier application runs in a VPC. The web tier is in public subnets and the database tier is in private subnets.',
    question: 'Which security design is most appropriate for the database tier?',
    choices: [
      'Attach an internet gateway to the private subnet',
      'Allow inbound database traffic only from the web tier security group',
      'Place the database in a public subnet but use a strong password',
      'Use network ACLs to allow all traffic from the public subnet',
    ],
    correctIndex: 1,
    explanation: 'Security groups are stateful and should allow database inbound only from the web tier security group. Private subnets should not have IGW routes, and open NACLs are too permissive.',
  },
  {
    id: 'q3',
    domain: 'secure',
    scenario: 'Developers need temporary read-only access to production S3 buckets for debugging. Access must be auditable and revocable.',
    question: 'What is the best way to grant access?',
    choices: [
      'Create long-term IAM access keys for each developer',
      'Use an IAM role with a time-bound STS assume-role condition',
      'Share the root account credentials and require MFA',
      'Put all developers in a group with S3 full access',
    ],
    correctIndex: 1,
    explanation: 'Short-lived STS credentials with scoped permissions and an audit trail are the AWS best practice for temporary access. Long-term keys and root sharing are anti-patterns.',
  },
  // Domain 2: Resilient Architectures
  {
    id: 'q4',
    domain: 'resilient',
    scenario: 'An e-commerce application uses RDS MySQL. The business requires automated failover and read scaling without application changes.',
    question: 'Which architecture meets both requirements?',
    choices: [
      'Enable Multi-AZ and create read replicas',
      'Use a single RDS instance with hourly manual snapshots',
      'Migrate the database to DynamoDB with on-demand capacity',
      'Enable automated backups and enable cross-region read replicas only',
    ],
    correctIndex: 0,
    explanation: 'Multi-AZ handles automatic failover. Read replicas scale reads without changing the application connection string for writes.',
  },
  {
    id: 'q5',
    domain: 'resilient',
    scenario: 'A static website is hosted in an S3 bucket in us-east-1. The company wants to survive a regional outage with minimal RTO.',
    question: 'Which design is most cost-effective while meeting the RTO?',
    choices: [
      'Replicate the bucket to another region and use Route 53 failover routing',
      'Provision EC2 instances in two regions running the same website',
      'Use EFS to store the website files and mount it on multiple EC2 instances',
      'Enable S3 versioning and daily RDS snapshots',
    ],
    correctIndex: 0,
    explanation: 'S3 cross-region replication with Route 53 failover provides a passive DR pattern for static content, which is far cheaper than running EC2 in multiple regions.',
  },
  {
    id: 'q6',
    domain: 'resilient',
    scenario: 'An application requires 99.999% availability for its key-value data store. Writes are low, but reads are extremely high.',
    question: 'Which service and feature best fit?',
    choices: [
      'DynamoDB with global tables and DAX',
      'RDS MySQL Multi-AZ with 10 read replicas',
      'S3 with Transfer Acceleration',
      'ElastiCache Memcached in a single-node cluster',
    ],
    correctIndex: 0,
    explanation: 'DynamoDB global tables provide active-active multi-region availability. DAX accelerates reads. Memcached has no persistence or replication, so it is a poor fit for availability.',
  },
  // Domain 3: High-Performing Architectures
  {
    id: 'q7',
    domain: 'high-performing',
    scenario: 'A global news site serves images and static assets. Users in Europe and Asia complain about slow load times.',
    question: 'Which single service will most improve global latency?',
    choices: [
      'CloudFront with the S3 bucket as the origin',
      'ELB Application Load Balancer in every region',
      'EC2 Auto Scaling in each Availability Zone',
      'DynamoDB global tables for image metadata',
    ],
    correctIndex: 0,
    explanation: 'CloudFront caches static content at edge locations close to users, reducing global latency. ALB and ASG do not cache at the edge.',
  },
  {
    id: 'q8',
    domain: 'high-performing',
    scenario: 'An API receives traffic that varies by time of day. The current EC2 Auto Scaling group uses a schedule-based policy but misses traffic spikes.',
    question: 'Which scaling policy should be added?',
    choices: [
      'Target tracking on Average CPU Utilization',
      'Scheduled scaling for known holidays',
      'Manual step scaling with fixed thresholds',
      'Predictive scaling based on past usage',
    ],
    correctIndex: 0,
    explanation: 'Target tracking dynamically adjusts capacity to keep a metric near a target, which handles unexpected spikes better than schedule or manual step scaling.',
  },
  {
    id: 'q9',
    domain: 'high-performing',
    scenario: 'A data-processing Lambda function is invoked by S3 object uploads. The function sometimes times out while processing large files.',
    question: 'What is the most appropriate first optimization?',
    choices: [
      'Increase the Lambda memory and timeout settings',
      'Move the processing to an EC2 Reserved instance',
      'Replace S3 with EFS for object uploads',
      'Disable S3 versioning on the source bucket',
    ],
    correctIndex: 0,
    explanation: 'Lambda memory and timeout are the first levers for a function that is too slow. More memory also increases CPU proportionally.',
  },
  // Domain 4: Cost-Optimized Architectures
  {
    id: 'q10',
    domain: 'cost-optimized',
    scenario: 'A batch job runs for 4 hours each night and is not time-sensitive. It currently uses On-Demand EC2 instances.',
    question: 'Which purchasing option will reduce cost with minimal risk?',
    choices: [
      'Use Spot Instances for the batch workload',
      'Purchase 3-year All Upfront Reserved Instances',
      'Use Dedicated Hosts for the batch instances',
      'Enable EC2 Auto Scaling with target tracking',
    ],
    correctIndex: 0,
    explanation: 'Spot Instances are ideal for fault-tolerant, non-time-sensitive batch work because they offer deep discounts and can be interrupted.',
  },
  {
    id: 'q11',
    domain: 'cost-optimized',
    scenario: 'Application logs are stored in S3 and must be retained for 5 years. Access after 90 days is rare.',
    question: 'Which lifecycle policy best reduces cost?',
    choices: [
      'Transition to S3 Glacier Deep Archive after 90 days',
      'Keep all logs in S3 Standard for the full 5 years',
      'Move logs to S3 Intelligent-Tiering after 1 day',
      'Replicate logs to another account daily',
    ],
    correctIndex: 0,
    explanation: 'Glacier Deep Archive is the cheapest long-term storage. Intelligent-Tiering is not the cheapest for rarely accessed data, and Standard is expensive.',
  },
  {
    id: 'q12',
    domain: 'cost-optimized',
    scenario: 'A startup runs a DynamoDB table with unpredictable, spiky traffic. They are currently on provisioned capacity and seeing throttling.',
    question: 'What is the most cost-effective fix?',
    choices: [
      'Switch to on-demand capacity mode',
      'Provision 10,000 WCU and RCU at all times',
      'Move the data to RDS MySQL',
      'Add ElastiCache and delete the DynamoDB table',
    ],
    correctIndex: 0,
    explanation: 'On-demand capacity handles unpredictable traffic and charges only for actual reads and writes, which is more cost-effective than over-provisioning.',
  },
];

export function scoreByDomain(answers: Record<string, number>) {
  const result: Record<SAAExamDomain, { total: number; correct: number }> = {
    secure: { total: 0, correct: 0 },
    resilient: { total: 0, correct: 0 },
    'high-performing': { total: 0, correct: 0 },
    'cost-optimized': { total: 0, correct: 0 },
  };
  for (const q of SAA_QUESTIONS) {
    result[q.domain].total++;
    if (answers[q.id] === q.correctIndex) {
      result[q.domain].correct++;
    }
  }
  return result;
}
