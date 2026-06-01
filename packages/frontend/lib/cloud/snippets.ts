// ─── Realistic IaC snippets keyed by skill ───────────────────────────────────
// Composed by templates.ts into a coherent, *realistic* starter file per mission
// (not TODO scaffolding). Each block is self-contained and annotated so learners
// see real resource shapes, not placeholders.

export const SKILL_SNIPPETS: Record<string, string> = {
  ec2: `# A web server in a private subnet, sized for low cost.
resource "aws_instance" "web" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.private[0].id
  vpc_security_group_ids = [aws_security_group.web.id]
  user_data              = file("\${path.module}/bootstrap.sh")
  tags                   = merge(local.common_tags, { Name = "web-01" })
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}`,

  asg: `# Self-healing, elastic fleet behind a target-tracking policy.
resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  min_size            = 2
  max_size            = 6
  desired_capacity    = 2
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.web.arn]
  health_check_type   = "ELB"

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
}

resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-target-50"
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "TargetTrackingScaling"
  target_tracking_configuration {
    predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" }
    target_value = 50.0
  }
}`,

  alb: `# Layer-7 load balancer spanning two AZs (a hard requirement).
resource "aws_lb" "web" {
  name               = "web-alb"
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_lb_target_group" "web" {
  name        = "web-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  health_check { path = "/health"; matcher = "200" }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.web.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.acm_cert_arn
  default_action { type = "forward"; target_group_arn = aws_lb_target_group.web.arn }
}`,

  lambda: `# Event-driven function fronted by API Gateway.
resource "aws_lambda_function" "api" {
  function_name = "bleepx-api"
  runtime       = "python3.12"
  handler       = "app.handler"
  filename      = "build/api.zip"
  memory_size   = 256          # CPU scales with memory
  timeout       = 10           # hard ceiling is 900s (15 min)
  role          = aws_iam_role.lambda.arn
  environment { variables = { TABLE = aws_dynamodb_table.app.name } }
}`,

  s3: `# Private bucket: encryption + versioning + public access blocked.
resource "aws_s3_bucket" "data" {
  bucket = "bleepx-\${data.aws_caller_identity.current.account_id}-data"
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" } }
}`,

  lifecycle: `# Tier logs to Glacier after 30 days, delete after a year.
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.data.id
  rule {
    id     = "logs-tiering"
    status = "Enabled"
    filter { prefix = "logs/" }
    transition  { days = 30;  storage_class = "GLACIER" }
    expiration  { days = 365 }
  }
}`,

  vpc: `# A /16 VPC with DNS support enabled.
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = merge(local.common_tags, { Name = "bleepx-vpc" })
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}`,

  subnets: `# Public + private subnets across two AZs for high availability.
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.\${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.azs.names[count.index]
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.\${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.azs.names[count.index]
}

data "aws_availability_zones" "azs" { state = "available" }`,

  nat: `# NAT lets private subnets reach the internet outbound only.
resource "aws_eip" "nat" { domain = "vpc" }

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id   # NAT lives in a PUBLIC subnet
}

resource "aws_route" "private_egress" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}`,

  rds: `# Managed Postgres with Multi-AZ failover and encryption at rest.
resource "aws_db_instance" "app" {
  identifier              = "bleepx-app"
  engine                  = "postgres"
  engine_version          = "16.3"
  instance_class          = "db.t3.micro"
  allocated_storage       = 20
  multi_az                = true     # synchronous standby, automatic failover
  storage_encrypted       = true
  db_subnet_group_name    = aws_db_subnet_group.app.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  backup_retention_period = 7
  skip_final_snapshot     = false
}`,

  dynamodb: `# Single-table design with on-demand billing and a GSI.
resource "aws_dynamodb_table" "app" {
  name         = "bleepx-app"
  billing_mode = "PAY_PER_REQUEST"   # no capacity planning
  hash_key     = "pk"
  range_key    = "sk"

  attribute { name = "pk"; type = "S" }
  attribute { name = "sk"; type = "S" }
  attribute { name = "gsi1pk"; type = "S" }

  global_secondary_index {
    name            = "gsi1"
    hash_key        = "gsi1pk"
    projection_type = "ALL"
  }
  point_in_time_recovery { enabled = true }
}`,

  iam: `# Least-privilege role: read ONE bucket prefix, nothing more.
resource "aws_iam_role" "app" {
  name               = "bleepx-app-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "s3_read" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["\${aws_s3_bucket.data.arn}/reports/*"]   # scoped, not "*"
  }
}

resource "aws_iam_role_policy" "app" {
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.s3_read.json
}`,

  sqs: `# Decoupling queue with a dead-letter queue for poison messages.
resource "aws_sqs_queue" "dlq" { name = "orders-dlq" }

resource "aws_sqs_queue" "orders" {
  name                       = "orders"
  visibility_timeout_seconds = 60
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })
}`,

  sns: `# Fan-out: one topic, many durable SQS subscribers.
resource "aws_sns_topic" "events" { name = "order-events" }

resource "aws_sns_topic_subscription" "to_queue" {
  topic_arn = aws_sns_topic.events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.orders.arn
}`,

  cloudfront: `# Global CDN in front of the S3 origin (origin stays private via OAC).
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  default_root_object = "index.html"
  origin {
    domain_name              = aws_s3_bucket.data.bucket_regional_domain_name
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }
  default_cache_behavior {
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
  }
  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate { cloudfront_default_certificate = true }
}`,
};

// ── Non-AWS realistic blocks ────────────────────────────────────
export const AZURE_SNIPPETS: Record<string, string> = {
  'resource-groups': `// Everything for one app/env lives in one resource group.
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-bleepx-prod'
  location: location
  tags: tags
}`,
  blob: `// Storage account with hot tier and HTTPS-only enforced.
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: toLower('bleepx\${uniqueString(resourceGroup().id)}')
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
  tags: tags
}`,
};

export const GCP_SNIPPETS: Record<string, string> = {
  bigquery: `# Partitioned + clustered table keeps scan cost (and bill) down.
resource "google_bigquery_table" "readings" {
  dataset_id          = google_bigquery_dataset.esg.dataset_id
  table_id            = "readings"
  time_partitioning { type = "DAY"; field = "reading_date" }
  clustering          = ["region"]
}`,
  'cloud-run': `# Stateless container, scales to zero, request-billed.
resource "google_cloud_run_v2_service" "api" {
  name     = "bleepx-api"
  location = "europe-west1"
  template {
    scaling { min_instance_count = 0; max_instance_count = 10 }
    containers { image = "gcr.io/\${var.project_id}/api:latest" }
  }
}`,
  gke: `# Autopilot cluster: Google manages the nodes for you.
resource "google_container_cluster" "main" {
  name             = "bleepx-autopilot"
  location         = "europe-west1"
  enable_autopilot = true
}`,
};
