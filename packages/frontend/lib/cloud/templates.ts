import type { CloudMission, CloudProvider } from './types';

export interface IacTemplate {
  filename: string;
  language: string;
  code: string;
}

/**
 * Generate a starter Infrastructure-as-Code template for a mission.
 * These are intentionally minimal, illustrative starting points — the goal
 * is to teach structure, not to be production-ready.
 */
export function iacTemplate(provider: CloudProvider, mission: CloudMission): IacTemplate {
  const header = `# ${mission.title}\n# BleepxCloud — ${provider.toUpperCase()} · ${mission.level}\n# Skills: ${mission.skills.join(', ')}\n`;

  switch (provider) {
    case 'aws':
      return {
        filename: 'main.tf',
        language: 'hcl',
        code: `${header}
provider "aws" {
  region = "eu-west-1"
}

# TODO: implement "${mission.title}"
# Tagging is mandatory for cost allocation (FinOps).
locals {
  common_tags = {
    Project   = "bleepx-cloud"
    Mission   = "${mission.slug}"
    ManagedBy = "terraform"
  }
}

# Example resource scaffold — replace with the services for this mission:
# ${mission.skills.map((s) => `#   - ${s}`).join('\n')}
resource "aws_s3_bucket" "example" {
  bucket = "bleepx-${mission.slug}-\${data.aws_caller_identity.current.account_id}"
  tags   = local.common_tags
}

data "aws_caller_identity" "current" {}
`,
      };
    case 'azure':
      return {
        filename: 'main.bicep',
        language: 'bicep',
        code: `${header}
// Deploy with: az deployment group create -g <rg> -f main.bicep
param location string = resourceGroup().location

var tags = {
  project: 'bleepx-cloud'
  mission: '${mission.slug}'
}

// TODO: implement "${mission.title}"
// Services to use:
${mission.skills.map((s) => `//   - ${s}`).join('\n')}
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: toLower('bleepx${replaceSlug(mission.slug)}')
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  tags: tags
}
`,
      };
    case 'gcp':
      return {
        filename: 'main.tf',
        language: 'hcl',
        code: `${header}
provider "google" {
  project = var.project_id
  region  = "europe-west1"
}

variable "project_id" { type = string }

# TODO: implement "${mission.title}"
# Services to use:
${mission.skills.map((s) => `#   - ${s}`).join('\n')}
resource "google_storage_bucket" "example" {
  name     = "bleepx-${mission.slug}-\${var.project_id}"
  location = "EU"
  labels   = { project = "bleepx-cloud", mission = "${mission.slug}" }
}
`,
      };
    case 'esg':
      return {
        filename: 'esg_pipeline.tf',
        language: 'hcl',
        code: `${header}
# ESG / decarbonization reference pipeline scaffold.
provider "aws" { region = "eu-west-1" }

# Raw ingestion zone for sensor / emissions data.
resource "aws_s3_bucket" "esg_raw" {
  bucket = "bleepx-esg-${mission.slug}-raw"
  tags   = { project = "bleepx-cloud", domain = "esg", mission = "${mission.slug}" }
}

# TODO: wire up the services for "${mission.title}":
${mission.skills.map((s) => `#   - ${s}`).join('\n')}
`,
      };
    case 'finance':
    default:
      return {
        filename: 'main.tf',
        language: 'hcl',
        code: `${header}
# Transversal (FinOps / financial-services / industry) scaffold.
provider "aws" { region = "eu-west-1" }

locals {
  cost_tags = {
    project    = "bleepx-cloud"
    domain     = "finance"
    mission    = "${mission.slug}"
    cost_center = "REPLACE_ME" # FinOps: every resource must be allocatable
  }
}

# TODO: implement "${mission.title}" using:
${mission.skills.map((s) => `#   - ${s}`).join('\n')}
`,
      };
  }
}

// Bicep resource names must be alphanumeric; strip separators.
function replaceSlug(slug: string): string {
  return slug.replace(/[^a-z0-9]/gi, '').slice(0, 18);
}
