import type { CloudMission, CloudProvider } from './types';
import { SKILL_SNIPPETS, AZURE_SNIPPETS, GCP_SNIPPETS } from './snippets';

export interface IacTemplate {
  filename: string;
  language: string;
  code: string;
}

/**
 * Compose a *realistic* Infrastructure-as-Code starter for a mission by
 * stitching together annotated, real resource blocks for the mission's skills.
 * Falls back to a sensible, provider-correct base when no skill blocks match.
 */
export function iacTemplate(provider: CloudProvider, mission: CloudMission): IacTemplate {
  const header = `# ${mission.title}\n# BleepxCloud — ${provider.toUpperCase()} · ${mission.level}\n# Realistic starter — adapt names, regions and CIDRs to your environment.\n`;

  // Pick the realistic blocks that match this mission's skills.
  const awsBlocks = mission.skills.map((s) => SKILL_SNIPPETS[s]).filter(Boolean) as string[];

  switch (provider) {
    case 'aws':
    case 'esg':
    case 'finance': {
      const domainTag =
        provider === 'esg' ? 'esg' : provider === 'finance' ? 'finance' : 'core';
      const body = awsBlocks.length
        ? awsBlocks.join('\n\n')
        : `# This mission is design-led — model the services below as resources:\n${mission.skills
            .map((s) => `#   - ${s}`)
            .join('\n')}`;
      return {
        filename: 'main.tf',
        language: 'hcl',
        code: `${header}
terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}

provider "aws" {
  region = "eu-west-1"   # pick a region close to users / data-residency rules
}

# FinOps: mandatory cost-allocation tags on every resource.
locals {
  common_tags = {
    Project    = "bleepx-cloud"
    Domain     = "${domainTag}"
    Mission    = "${mission.slug}"
    ManagedBy  = "terraform"
    CostCenter = "REPLACE_ME"
  }
}

data "aws_caller_identity" "current" {}

${body}
`,
      };
    }
    case 'azure': {
      const blocks = mission.skills.map((s) => AZURE_SNIPPETS[s]).filter(Boolean) as string[];
      const body = blocks.length
        ? blocks.join('\n\n')
        : `// Model the services below as resources:\n${mission.skills
            .map((s) => `//   - ${s}`)
            .join('\n')}`;
      return {
        filename: 'main.bicep',
        language: 'bicep',
        code: `${header}
// Deploy: az deployment group create -g <rg> -f main.bicep
param location string = resourceGroup().location

var tags = {
  project: 'bleepx-cloud'
  mission: '${mission.slug}'
}

${body}
`,
      };
    }
    case 'gcp':
    default: {
      const blocks = mission.skills.map((s) => GCP_SNIPPETS[s]).filter(Boolean) as string[];
      const body = blocks.length
        ? blocks.join('\n\n')
        : `# Model the services below as resources:\n${mission.skills
            .map((s) => `#   - ${s}`)
            .join('\n')}`;
      return {
        filename: 'main.tf',
        language: 'hcl',
        code: `${header}
provider "google" {
  project = var.project_id
  region  = "europe-west1"
}

variable "project_id" { type = string }

${body}
`,
      };
    }
  }
}
