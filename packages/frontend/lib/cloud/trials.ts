import type { CloudProvider } from './types';

export type TrialDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ExamLevel = 'Practitioner' | 'Associate' | 'Professional' | 'Specialty' | 'None';

export interface CloudTrialQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string | string[]; // Can be single answer (string) or multiple answers (string[])
  explanation: string;
  provider: CloudProvider | 'multi';
  difficulty: TrialDifficulty;
  topic: string;
  examLevel: ExamLevel;
  hint?: string; // Hint for struggling users
}

export const cloudTrials: CloudTrialQuestion[] = [
  // ── AWS ──────────────────────────────────────────────────────────
  {
    id: 'ct-001',
    question: 'A company runs a public-facing three-tier web application in a VPC across multiple Availability Zones. Amazon EC2 instances for the application tier running in private subnets need to download software patches from the internet. However, the EC2 instances cannot be directly accessible from the internet. Which actions should be taken to allow the EC2 instances to download the needed patches? (Select TWO.)',
    options: [
      'Configure a NAT gateway in a public subnet.',
      'Define a custom route table with a route to the NAT gateway for internet traffic and associate it with the private subnets for the application tier.',
      'Assign Elastic IP addresses to the EC2 instances.',
      'Define a custom route table with a route to the internet gateway for internet traffic and associate it with the private subnets for the application tier.',
      'Configure a NAT instance in a private subnet.'
    ],
    answer: ['Configure a NAT gateway in a public subnet.', 'Define a custom route table with a route to the NAT gateway for internet traffic and associate it with the private subnets for the application tier.'],
    explanation: 'A NAT gateway forwards traffic from the EC2 instances in the private subnet to the internet or other AWS services, and then sends the response back to the instances. After a NAT gateway is created, the route tables for private subnets must be updated to point internet traffic to the NAT gateway.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'Networking',
    examLevel: 'Associate',
    hint: 'Think about how private instances can reach the internet while staying private. What AWS service enables this?',
  },
  {
    id: 'ct-002',
    question: 'A solutions architect wants to design a solution to save costs for Amazon EC2 instances that do not need to run during a 2-week company shutdown. The applications running on the EC2 instances store data in instance memory that must be present when the instances resume operation. Which approach should the solutions architect recommend to shut down and resume the EC2 instances?',
    options: [
      'Modify the application to store the data on instance store volumes. Reattach the volumes while restarting them.',
      'Snapshot the EC2 instances before stopping them. Restore the snapshot after restarting the instances.',
      'Run the applications on EC2 instances enabled for hibernation. Hibernate the instances before the 2-week company shutdown.',
      'Note the Availability Zone for each EC2 instance before stopping it. Restart the instances in the same Availability Zones after the 2-week company shutdown.'
    ],
    answer: 'Run the applications on EC2 instances enabled for hibernation. Hibernate the instances before the 2-week company shutdown.',
    explanation: 'Hibernating EC2 instances save the contents of instance memory to an Amazon Elastic Block Store (Amazon EBS) root volume. When the instances restart, the instance memory contents are reloaded.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'Compute',
    examLevel: 'Associate',
    hint: 'What EC2 feature preserves in-memory data when stopping and starting instances?',
  },
  {
    id: 'ct-003',
    question: 'A company plans to run a monitoring application on an Amazon EC2 instance in a VPC. Connections are made to the EC2 instance using the instance\'s private IPv4 address. A solutions architect needs to design a solution that will allow traffic to be quickly directed to a standby EC2 instance if the application fails and becomes unreachable. Which approach will meet these requirements?',
    options: [
      'Deploy an Application Load Balancer configured with a listener for the private IP address and register the primary EC2 instance with the load balancer. Upon failure, de-register the instance and register the standby EC2 instance.',
      'Configure a custom DHCP option set. Configure DHCP to assign the same private IP address to the standby EC2 instance when the primary EC2 instance fails.',
      'Attach a secondary elastic network interface to the EC2 instance configured with the private IP address. Move the network interface to the standby EC2 instance if the primary EC2 instance becomes unreachable.',
      'Associate an Elastic IP address with the network interface of the primary EC2 instance. Disassociate the Elastic IP from the primary instance upon failure and associate it with a standby EC2 instance.'
    ],
    answer: 'Attach a secondary elastic network interface to the EC2 instance configured with the private IP address. Move the network interface to the standby EC2 instance if the primary EC2 instance becomes unreachable.',
    explanation: 'A secondary elastic network interface can be added to an EC2 instance. While primary network interfaces cannot be detached from an instance, secondary network interfaces can be detached and attached to a different EC2 instance.',
    provider: 'aws',
    difficulty: 'hard',
    topic: 'Networking',
    examLevel: 'Associate',
    hint: 'What network component can be detached and reattached between instances to preserve an IP address?',
  },
  {
    id: 'ct-004',
    question: 'An analytics company is planning to offer a web analytics service to its users. The service will require that the users\' webpages include a JavaScript script that makes authenticated GET requests to the company\'s Amazon S3 bucket. What must a solutions architect do to ensure that the script will successfully execute?',
    options: [
      'Enable cross-origin resource sharing (CORS) on the S3 bucket.',
      'Enable S3 Versioning on the S3 bucket.',
      'Provide the users with a signed URL for the script.',
      'Configure an S3 bucket policy to allow public execute privileges.'
    ],
    answer: 'Enable cross-origin resource sharing (CORS) on the S3 bucket.',
    explanation: 'Web browsers will block running a script that originates from a server with a domain name that is different from the webpage. Amazon S3 can be configured with CORS to send HTTP headers that allow the script to run.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'Storage',
    examLevel: 'Associate',
    hint: 'Browsers block cross-origin requests by default. What mechanism allows controlled cross-origin access?',
  },
  {
    id: 'ct-005',
    question: 'A company\'s security team requires that all data stored in the cloud be encrypted at rest at all times using encryption keys stored on premises. Which encryption options meet these requirements? (Select TWO.)',
    options: [
      'Use server-side encryption with Amazon S3 managed encryption keys (SSE-S3).',
      'Use server-side encryption with AWS KMS managed encryption keys (SSE-KMS).',
      'Use server-side encryption with customer-provided encryption keys (SSE-C).',
      'Use client-side encryption to provide at-rest encryption.',
      'Use an AWS Lambda function invoked by Amazon S3 events to encrypt the data using the customer\'s keys.'
    ],
    answer: ['Use server-side encryption with customer-provided encryption keys (SSE-C).', 'Use client-side encryption to provide at-rest encryption.'],
    explanation: 'Server-side encryption with customer-provided keys (SSE-C) enables Amazon S3 to encrypt objects on the server side using an encryption key provided in the PUT request. The same key must be provided in the GET requests for Amazon S3 to decrypt the object. Customers also have the option to encrypt data on the client side before uploading it to Amazon S3, and then they can decrypt the data after downloading it.',
    provider: 'aws',
    difficulty: 'hard',
    topic: 'Security',
    examLevel: 'Associate',
    hint: 'Which encryption options allow you to control the encryption keys yourself, including storing them on-premises?',
  },
  {
    id: 'ct-006',
    question: 'A company uses Amazon EC2 Reserved Instances to run its data processing workload. The nightly job typically takes 7 hours to run and must finish within a 10-hour time window. The company anticipates temporary increases in demand at the end of each month that will cause the job to run over the time limit with the capacity of the current resources. Once started, the processing job cannot be interrupted before completion. The company wants to implement a solution that would provide increased resource capacity as cost-effectively as possible. What should a solutions architect do to accomplish this?',
    options: [
      'Deploy On-Demand Instances during periods of high demand.',
      'Create a second EC2 reservation for additional instances.',
      'Deploy Spot Instances during periods of high demand.',
      'Increase the EC2 instance size in the EC2 reservation to support the increased workload.'
    ],
    answer: 'Deploy On-Demand Instances during periods of high demand.',
    explanation: 'While Spot Instances would be the least costly option, they are not suitable for jobs that cannot be interrupted or must complete within a certain time period. On-Demand Instances would be billed for the number of seconds they are running.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'Compute',
    examLevel: 'Associate',
    hint: 'Spot Instances can be interrupted. What instance type is always available but more expensive?',
  },
  {
    id: 'ct-007',
    question: 'A company runs an online voting system for a weekly live television program. During broadcasts, users submit hundreds of thousands of votes within minutes to a front-end fleet of Amazon EC2 instances that run in an Auto Scaling group. The EC2 instances write the votes to an Amazon RDS database. However, the database is unable to keep up with the requests that come from the EC2 instances. A solutions architect must design a solution that processes the votes in the most efficient manner and without downtime. Which solution meets these requirements?',
    options: [
      'Migrate the front-end application to AWS Lambda. Use Amazon API Gateway to route user requests to the Lambda functions.',
      'Scale the database horizontally by converting it to a Multi-AZ deployment. Configure the front-end application to write to both the primary and secondary DB instances.',
      'Configure the front-end application to send votes to an Amazon Simple Queue Service (Amazon SQS) queue. Provision worker instances to read the SQS queue and write the vote information to the database.',
      'Use Amazon EventBridge (Amazon CloudWatch Events) to create a scheduled event to re-provision the database with larger, memory optimized instances during voting periods. When voting ends, re-provision the database to use smaller instances.'
    ],
    answer: 'Configure the front-end application to send votes to an Amazon Simple Queue Service (Amazon SQS) queue. Provision worker instances to read the SQS queue and write the vote information to the database.',
    explanation: 'Decouple the ingestion of votes from the database to allow the voting system to continue processing votes without waiting for the database writes. Add dedicated workers to read from the SQS queue to allow votes to be entered into the database at a controllable rate. The votes will be added to the database as fast as the database can process them, but no votes will be lost.',
    provider: 'aws',
    difficulty: 'hard',
    topic: 'Architecture',
    examLevel: 'Associate',
    hint: 'How can you decouple the write requests from the database to handle burst traffic without losing data?',
  },
  {
    id: 'ct-008',
    question: 'A company has a two-tier application architecture that runs in public and private subnets. Amazon EC2 instances running the web application are in the public subnet and an EC2 instance for the database runs on the private subnet. The web application instances and the database are running in a single Availability Zone (AZ). Which combination of steps should a solutions architect take to provide high availability for this architecture? (Select TWO.)',
    options: [
      'Create new public and private subnets in the same AZ.',
      'Create an Amazon EC2 Auto Scaling group and Application Load Balancer spanning multiple AZs for the web application instances.',
      'Add the existing web application instances to an Auto Scaling group behind an Application Load Balancer.',
      'Create new public and private subnets in a new AZ. Create a database using an EC2 instance in the public subnet in the new AZ. Migrate the old database contents to the new database.',
      'Create new public and private subnets in the same VPC, each in a new AZ. Create an Amazon RDS Multi-AZ DB instance in the private subnets. Migrate the old database contents to the new DB instance.'
    ],
    answer: ['Create an Amazon EC2 Auto Scaling group and Application Load Balancer spanning multiple AZs for the web application instances.', 'Create new public and private subnets in the same VPC, each in a new AZ. Create an Amazon RDS Multi-AZ DB instance in the private subnets. Migrate the old database contents to the new DB instance.'],
    explanation: 'Create new subnets in a new Availability Zone (AZ) to provide a redundant network. Create an Auto Scaling group with instances in two AZs behind the load balancer to ensure high availability of the web application and redistribution of web traffic between the two public AZs. Create an RDS DB instance in the two private subnets to make the database tier highly available too.',
    provider: 'aws',
    difficulty: 'hard',
    topic: 'Architecture',
    examLevel: 'Associate',
    hint: 'High availability requires multiple AZs and redundant components. What AWS services provide automatic failover?',
  },

  // ── More AWS Questions (from sample) ─────────────────────────────────
  {
    id: 'ct-009',
    question: 'A website runs a custom web application that receives a burst of traffic each day at noon. The users upload new pictures and content daily, but have been complaining of timeouts. The architecture uses Amazon EC2 Auto Scaling groups, and the application consistently takes 1 minute to initiate upon boot up before responding to user requests. How should a solutions architect redesign the architecture to better respond to changing traffic?',
    options: [
      'Configure a Network Load Balancer with a slow start configuration.',
      'Configure Amazon ElastiCache for Redis to offload direct requests from the EC2 instances.',
      'Configure an Auto Scaling step scaling policy with an EC2 instance warmup condition.',
      'Configure Amazon CloudFront to use an Application Load Balancer as the origin.'
    ],
    answer: 'Configure an Auto Scaling step scaling policy with an EC2 instance warmup condition.',
    explanation: 'The current configuration puts new EC2 instances into service before they are able to respond to transactions. With a step scaling policy, you can specify the number of seconds that it takes for a newly launched instance to warm up. Until its specified warm-up time has expired, an EC2 instance is not counted toward the aggregated metrics of the Auto Scaling group.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'Compute',
    examLevel: 'Associate',
    hint: 'The issue is that instances are being counted as available before they can actually handle requests. What feature can prevent this?',
  },
  {
    id: 'ct-010',
    question: 'An application running on AWS uses an Amazon Aurora Multi-AZ DB cluster deployment for its database. When evaluating performance metrics, a solutions architect discovered that the database reads are causing high I/O and adding latency to the write requests against the database. What should the solutions architect do to separate the read requests from the write requests?',
    options: [
      'Enable read-through caching on the Aurora database.',
      'Update the application to read from the Multi-AZ standby instance.',
      'Create an Aurora replica and modify the application to use the appropriate endpoints.',
      'Create a second Aurora database and link it to the primary database as a read replica.'
    ],
    answer: 'Create an Aurora replica and modify the application to use the appropriate endpoints.',
    explanation: 'Aurora Replicas provide a way to offload read traffic. Aurora Replicas share the same underlying storage as the main database, so lag time is generally very low. Aurora Replicas have their own endpoints, so the application will need to be configured to direct read traffic to the new endpoints.',
    provider: 'aws',
    difficulty: 'hard',
    topic: 'Database',
    examLevel: 'Associate',
    hint: 'How can you offload read traffic from the primary database while keeping the data consistent?',
  },

  // ── GCP Questions (from sample) ───────────────────────────────────────
  {
    id: 'ct-020',
    question: 'Your organization plans to migrate its financial transaction data to Google Cloud. Auditors need to view the data and run reports in BigQuery, but they are not allowed to modify the data. You want to apply the principle of least privilege and follow Google-recommended practices. What should you do?',
    options: [
      'Assign roles/bigquery.dataViewer to the individual auditors.',
      'Create a group for auditors and assign roles/viewer to them.',
      'Create a group for auditors, and assign roles/bigquery.dataViewer to them.',
      'Assign a custom role to each auditor that allows view-only access to BigQuery.'
    ],
    answer: 'Create a group for auditors, and assign roles/bigquery.dataViewer to them.',
    explanation: 'It uses a predefined role to provide view access to BigQuery for the group of auditors. Auditors can be added or deleted from the group if job responsibilities change. Google recommended practice is to assign IAM roles to groups, not individuals.',
    provider: 'gcp',
    difficulty: 'easy',
    topic: 'IAM',
    examLevel: 'Associate',
    hint: 'Think about Google-recommended practices for IAM - should you assign to individuals or groups?',
  },
  {
    id: 'ct-021',
    question: 'You are managing your company\'s first Google Cloud project. Project leads, developers, and internal testers will participate in the project, which includes sensitive information. You need to ensure that only specific members of the development team have access to sensitive information. You want to assign the appropriate Identity and Access Management (IAM) roles that also require the least amount of maintenance. What should you do?',
    options: [
      'Assign a basic role to each user.',
      'Create groups. Assign a basic role to each group, and then assign users to groups.',
      'Create groups. Assign a Custom role to each group, including those who should have access to sensitive data. Assign users to groups.',
      'Create groups. Assign an IAM Predefined role to each group as required, including those who should have access to sensitive data. Assign users to groups.'
    ],
    answer: 'Create groups. Assign an IAM Predefined role to each group as required, including those who should have access to sensitive data. Assign users to groups.',
    explanation: 'Predefined roles are fine-grained enough to set permissions for specific roles requiring sensitive data access. This solution also uses groups, which is the recommended practice for managing permissions for individual roles.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'IAM',
    examLevel: 'Associate',
    hint: 'What type of roles provides the right balance of granularity and maintainability?',
  },
  {
    id: 'ct-022',
    question: 'You are responsible for monitoring all configuration changes to your Cloud Storage and Firestore resources in real-time. For each change, you need to invoke a security script that will verify the compliance of the change in near real-time. You want to accomplish this with minimal setup. What should you do?',
    options: [
      'Create a logging sink to export the audit logs to BigQuery. Modify the security script to read from BigQuery. Schedule the security script to run in a Cloud Run function daily through Cloud Scheduler.',
      'Use Cloud Storage and Firestore triggers to invoke the security script hosted in Cloud Run functions.',
      'Use a Python script to get audit logs from Cloud Logging, analyze them, and invoke the security script.',
      'Redirect your data-changing queries to an App Engine application that performs all resource changes and call the security script from the application.'
    ],
    answer: 'Use Cloud Storage and Firestore triggers to invoke the security script hosted in Cloud Run functions.',
    explanation: 'It provides a fast response and requires the minimal amount of setup. Cloud Storage and Firestore triggers can directly invoke Cloud Functions or Cloud Run in response to resource changes.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'Monitoring',
    examLevel: 'Associate',
    hint: 'What feature allows you to automatically trigger code when a resource changes?',
  },
  {
    id: 'ct-023',
    question: 'Your application needs to process a significant rate of transactions. The rate of transactions exceeds the processing capabilities of a single virtual machine (VM). You want to spread transactions across multiple servers in a managed instance group in real time and in the most cost-effective manner. Which Google Cloud product should the transactions be sent to?',
    options: ['BigQuery', 'Cloud SQL', 'Pub/Sub', 'Bigtable'],
    answer: 'Pub/Sub',
    explanation: 'Pub/Sub is a scalable solution that can effectively distribute a large number of tasks among multiple servers at a low cost. It provides asynchronous messaging which allows decoupling of producers and consumers.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'Messaging',
    examLevel: 'Associate',
    hint: 'Think about what service provides asynchronous messaging for distributing work across multiple consumers.',
  },
  {
    id: 'ct-024',
    question: 'Your team needs to directly connect your on-premises servers to several VMs inside of a Virtual Private Cloud (VPC). You want to set up a fast and secure network connection with minimal maintenance and cost. What should you do?',
    options: [
      'Set up Dedicated Interconnect.',
      'Set up Cloud VPN.',
      'Assign a public IP address to each VM, and assign a strong password to each one.',
      'Start a Compute Engine VM, install OpenVPN, and create a direct tunnel to each on-premises server.'
    ],
    answer: 'Set up Cloud VPN.',
    explanation: 'Cloud VPN is a fast and secure network connection with minimal maintenance and cost. It provides encrypted communication over the public internet between your on-premises network and your VPC.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'Networking',
    examLevel: 'Associate',
    hint: 'What provides a secure connection over the public internet without requiring dedicated hardware?',
  },
  {
    id: 'ct-025',
    question: 'You are implementing Cloud Storage for your organization. You need to follow your organization\'s policies, which include: 1) Archive data older than one year. 2) Delete data older than 5 years. 3) Use standard storage for all other data. You want to implement these guidelines automatically and in the simplest manner available. What should you do?',
    options: [
      'Set up Object Lifecycle management policies.',
      'Run a script daily. Copy data that is older than one year to an archival bucket, and delete five-year-old data.',
      'Run a script daily. Set storage class to ARCHIVE for data that is older than one year, and delete five-year-old data.',
      'Set up default storage class for three buckets named: STANDARD, ARCHIVE, DELETED. Use a script to move the data in the appropriate bucket when its condition matches your company guidelines.'
    ],
    answer: 'Set up Object Lifecycle management policies.',
    explanation: 'Object Lifecycle allows you to automate the implementation of your organization\'s data policy. You can define rules to automatically transition objects to different storage classes or delete them based on their age.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'Storage',
    examLevel: 'Associate',
    hint: 'What Cloud Storage feature allows automatic management of object lifecycle based on age?',
  },
  {
    id: 'ct-026',
    question: 'You are creating an application that requires data storage of up to 10 petabytes (PB). The application must support high-speed, real-time reads and writes of time series data with a schema that may change over time. You want to use the most economical solution for data storage. What should you do?',
    options: [
      'Store the data in Spanner and the changing schema field data in Cloud Storage as JSON files.',
      'Store the data in Cloud Storage and cache the data with Cloud CDN.',
      'Store the data in Bigtable.',
      'Store the data in BigQuery and the changing schema field data in a JSON column.'
    ],
    answer: 'Store the data in Bigtable.',
    explanation: 'Bigtable provides high-speed reads and writes, accommodates a changing schema, and is cost-effective for large-scale time series data. It is designed for high throughput and low latency workloads.',
    provider: 'gcp',
    difficulty: 'hard',
    topic: 'Database',
    examLevel: 'Associate',
    hint: 'What database is optimized for high-throughput, low-latency workloads with flexible schemas at petabyte scale?',
  },
  {
    id: 'ct-027',
    question: 'You have created two Kubernetes Deployment resources in a Google Kubernetes Engine (GKE) cluster. The first Deployment is a backend service. The second Deployment is a frontend service. You want to ensure that there is no interruption in communication between your frontend and backend Deployment Pods if they are updated or the Deployment is scaled up or down. What should you do?',
    options: [
      'Create a Kubernetes Service that groups the Pods in the backend service, and configure the frontend Pods to communicate through that service.',
      'Create a DNS entry with a fixed IP address that the frontend service can use to reach the backend service.',
      'Assign static internal IP addresses that the frontend service can use to reach the backend Pods.',
      'Assign static external IP addresses that the frontend service can use to reach the backend Pods.'
    ],
    answer: 'Create a Kubernetes Service that groups the Pods in the backend service, and configure the frontend Pods to communicate through that service.',
    explanation: 'Kubernetes Service serves the purpose of providing a destination that can be used when the Pods are moved or restarted. Services provide stable networking endpoints that abstract the underlying Pods.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'GKE',
    examLevel: 'Associate',
    hint: 'What Kubernetes abstraction provides a stable endpoint for a set of Pods?',
  },
  {
    id: 'ct-028',
    question: 'You are responsible for the employee management service for your global company. The service will add, update, delete, and list home addresses. Each of these operations is implemented by a Docker container microservice. The processing load can vary from low to very high. You want to deploy the service on Google Cloud for scalability and minimal administration. What should you do?',
    options: [
      'Deploy your Docker containers on Cloud Run.',
      'Start each Docker container as a managed instance group.',
      'Deploy your Docker containers on Google Kubernetes Engine (GKE).',
      'Combine the four microservices into one Docker image, and deploy it to the App Engine instance.'
    ],
    answer: 'Deploy your Docker containers on Cloud Run.',
    explanation: 'Cloud Run is a managed service that requires minimal administration. It automatically scales your containers based on traffic and scales to zero when not in use.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'Compute',
    examLevel: 'Associate',
    hint: 'What service provides fully managed container execution with automatic scaling and minimal administration?',
  },
  {
    id: 'ct-029',
    question: 'You provide a service on the internet. You have a server and an IP address where the application is located. You do not want to have to change the IP address on your DNS server if your server crashes or is replaced. You also want to avoid downtime and deliver a solution for minimal cost and setup. What should you do?',
    options: [
      'Create a script that updates the IP address in the DNS server when the server crashes or is replaced.',
      'Reserve a static internal IP address, and update the DNS server.',
      'Reserve a static external IP address, and update the DNS server.',
      'Use the Bring Your Own IP (BYOIP) method to use your own IP address.'
    ],
    answer: 'Reserve a static external IP address, and update the DNS server.',
    explanation: 'External IPs are routable and can be advertised and seen on the internet, and this is also the most cost-effective solution. A static external IP address remains the same even if the underlying resource is replaced.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'Networking',
    examLevel: 'Associate',
    hint: 'What type of IP address is routable on the public internet and can be reserved to stay constant?',
  },

  // ── Azure Questions (from Microsoft samples) ─────────────────────────────
  {
    id: 'ct-030',
    question: 'You have an Azure subscription that contains a resource group named RG1. RG1 contains 20 virtual machines that run Windows Server. You need to ensure that when the VMs are shut down at night, they are deallocated. What should you do?',
    options: [
      'Configure the VMs to use the Azure Reserved Instances.',
      'Configure the VMs to use the Azure Hybrid Benefit.',
      'Configure the VMs to use the Azure Spot Instances.',
      'Configure the VMs to use the Azure Auto-shutdown feature.'
    ],
    answer: 'Configure the VMs to use the Azure Auto-shutdown feature.',
    explanation: 'Azure Auto-shutdown feature allows you to automatically shut down and deallocate virtual machines at a scheduled time. When a VM is deallocated, you stop paying for the compute.',
    provider: 'azure',
    difficulty: 'easy',
    topic: 'Compute',
    examLevel: 'Associate',
    hint: 'What feature allows you to schedule automatic shutdown of VMs to save costs?',
  },
  {
    id: 'ct-031',
    question: 'You have an Azure subscription that contains a virtual network named VNet1. VNet1 contains two subnets named Subnet1 and Subnet2. Subnet1 contains a virtual machine named VM1. VM1 has a public IP address. You need to prevent VM1 from communicating with the internet while allowing VM1 to communicate with resources in Subnet2. What should you do?',
    options: [
      'Configure the network security group (NSG) for Subnet1 to block all outbound traffic.',
      'Configure the network security group (NSG) for Subnet1 to block all inbound traffic.',
      'Remove the public IP address from VM1.',
      'Configure the network security group (NSG) for VM1 to block all outbound traffic.'
    ],
    answer: 'Configure the network security group (NSG) for Subnet1 to block all outbound traffic.',
    explanation: 'By configuring the NSG for Subnet1 to block all outbound traffic to the internet while allowing traffic within the VPC, you prevent VM1 from communicating with the internet while allowing it to communicate with resources in Subnet2.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'Networking',
    examLevel: 'Associate',
    hint: 'What Azure service controls traffic flow to and from subnets and VMs?',
  },
  {
    id: 'ct-032',
    question: 'You have an Azure subscription that contains a storage account named storage1. You need to ensure that all data in storage1 is encrypted at rest. What should you do?',
    options: [
      'Configure the storage account to use Azure Disk Encryption.',
      'Configure the storage account to use Azure Storage Service Encryption.',
      'Configure the storage account to use Azure Information Protection.',
      'Configure the storage account to use Azure Key Vault.'
    ],
    answer: 'Configure the storage account to use Azure Storage Service Encryption.',
    explanation: 'Azure Storage Service Encryption encrypts data at rest for all new data in a storage account. It is enabled by default for all new storage accounts.',
    provider: 'azure',
    difficulty: 'easy',
    topic: 'Storage',
    examLevel: 'Associate',
    hint: 'What encryption feature is specifically designed for Azure Storage accounts?',
  },
  {
    id: 'ct-033',
    question: 'You have an Azure subscription that contains a resource group named RG1. RG1 contains an Azure SQL database named SQL1. You need to ensure that SQL1 is encrypted at rest. What should you do?',
    options: [
      'Configure Transparent Data Encryption (TDE) for SQL1.',
      'Configure Always Encrypted for SQL1.',
      'Configure Azure Disk Encryption for SQL1.',
      'Configure Azure Storage Service Encryption for SQL1.'
    ],
    answer: 'Configure Transparent Data Encryption (TDE) for SQL1.',
    explanation: 'Transparent Data Encryption (TDE) encrypts Azure SQL Database, Azure SQL Managed Instance, and Azure Synapse Analytics data at rest. It is enabled by default for all new Azure SQL databases.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'Database',
    examLevel: 'Associate',
    hint: 'What encryption feature encrypts the entire database at the file level?',
  },
  {
    id: 'ct-034',
    question: 'You have an Azure subscription that contains a virtual machine named VM1. VM1 is backed up by Azure Backup. You need to restore a single file from the backup of VM1. What should you do first?',
    options: [
      'Create a recovery services vault.',
      'Create a backup policy.',
      'Create a restore point.',
      'Mount the recovery point as a file share.'
    ],
    answer: 'Mount the recovery point as a file share.',
    explanation: 'To restore a single file from an Azure VM backup, you can mount the recovery point as a file share and then copy the individual file. This is the most efficient method for single file recovery.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'Backup',
    examLevel: 'Associate',
    hint: 'What feature allows you to access the contents of a VM backup to extract individual files?',
  },
  {
    id: 'ct-035',
    question: 'You have an Azure subscription that contains an Azure Kubernetes Service (AKS) cluster named AKS1. AKS1 contains a node pool named NodePool1. You need to scale NodePool1 to 5 nodes. What should you do?',
    options: [
      'Run the az aks scale command.',
      'Run the az aks nodepool scale command.',
      'Run the kubectl scale command.',
      'Run the az vmss scale command.'
    ],
    answer: 'Run the az aks nodepool scale command.',
    explanation: 'The az aks nodepool scale command allows you to scale a specific node pool in an AKS cluster. This is the correct Azure CLI command for scaling node pools.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'Containers',
    examLevel: 'Associate',
    hint: 'What Azure CLI command specifically scales node pools in AKS?',
  },
  {
    id: 'ct-036',
    question: 'You have an Azure subscription that contains an Azure Functions app named Function1. Function1 uses the Consumption plan. You need to ensure that Function1 can access an Azure SQL database named SQL1. What should you do?',
    options: [
      'Configure a virtual network integration for Function1.',
      'Configure a hybrid connection for Function1.',
      'Configure a private endpoint for SQL1.',
      'Configure a service endpoint for SQL1.'
    ],
    answer: 'Configure a private endpoint for SQL1.',
    explanation: 'A private endpoint provides a private IP address for your Azure SQL database, allowing your Function app to access it securely over the Azure backbone network without exposing it to the public internet.',
    provider: 'azure',
    difficulty: 'hard',
    topic: 'Networking',
    examLevel: 'Associate',
    hint: 'What feature provides a private IP address for a PaaS service within your VNet?',
  },
  {
    id: 'ct-037',
    question: 'You have an Azure subscription that contains an Azure Cosmos DB account named Cosmos1. Cosmos1 contains a database named DB1 and a container named Container1. You need to ensure that Container1 can store a maximum of 400 GB of data. What should you configure?',
    options: [
      'The throughput for Container1.',
      'The partition key for Container1.',
      'The indexing policy for Container1.',
      'The consistency level for Cosmos1.'
    ],
    answer: 'The throughput for Container1.',
    explanation: 'The throughput configured for a container determines the amount of data storage and request units available. By configuring the appropriate throughput, you can control the maximum storage capacity.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'Database',
    examLevel: 'Associate',
    hint: 'What Cosmos DB setting controls both performance and storage capacity?',
  },
  {
    id: 'ct-038',
    question: 'You have an Azure subscription that contains an Azure virtual machine named VM1. VM1 runs Windows Server. You need to ensure that VM1 can access a file share named Share1 in an Azure storage account named storage1. What should you do?',
    options: [
      'Configure a private endpoint for storage1.',
      'Configure a service endpoint for storage1.',
      'Configure a virtual network service endpoint for storage1.',
      'Configure a hybrid connection for storage1.'
    ],
    answer: 'Configure a private endpoint for storage1.',
    explanation: 'A private endpoint provides a private IP address for your storage account, allowing VM1 to access the file share securely over the Azure backbone network.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'Storage',
    examLevel: 'Associate',
    hint: 'What feature allows private access to a storage account from within your VNet?',
  },
  {
    id: 'ct-039',
    question: 'You have an Azure subscription that contains an Application Gateway named AppGW1. AppGW1 has two backend pools named Pool1 and Pool2. You need to ensure that requests for /api are routed to Pool1 and all other requests are routed to Pool2. What should you configure?',
    options: [
      'A path-based routing rule.',
      'A multi-site routing rule.',
      'A URL path map.',
      'A WAF policy.'
    ],
    answer: 'A URL path map.',
    explanation: 'A URL path map allows you to route requests to different backend pools based on the URL path. You can configure path-based routing to direct /api requests to Pool1 and other requests to Pool2.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'Networking',
    examLevel: 'Associate',
    hint: 'What Application Gateway feature enables routing based on URL paths?',
  },
];

/** Get a helper function to check if answer is correct (handles both single and multi-select) */
export function isAnswerCorrect(selected: string | string[], correct: string | string[]): boolean {
  if (Array.isArray(correct)) {
    if (Array.isArray(selected)) {
      return selected.length === correct.length && correct.every(c => selected.includes(c));
    }
    return correct.includes(selected);
  }
  if (Array.isArray(selected)) {
    return selected.length === 1 && selected[0] === correct;
  }
  return selected === correct;
}

export const TRIAL_PROVIDERS: (CloudProvider | 'multi')[] = [
  'aws',
  'azure',
  'gcp',
  'esg',
  'finance',
  'multi',
];
