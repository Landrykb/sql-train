// ─── Portfolio Data Extraction & Context Generation ─────────────────────
// Extracts actual results from completed challenges to provide context for interpretations
// Generates meaningful hints based on real data, graphs, and analysis results

import { fullCaseOrder, visualizationConfigs } from '@/lib/constants';
import { LAB_CASE_ORDER, LAB_DOMAIN_META } from '@/lib/labConstants';
import { CLOUD_MISSIONS, CLOUD_PROVIDER_META, CLOUD_PROVIDERS, cloudMissionId, type CloudProvider } from '@/lib/cloud';

export interface CompletedQueryCase {
  domain: string;
  caseId: string;
  query: string;
  time?: number;
  attempts?: number;
  solvedAt?: number;
}

export interface CompletedLabProject {
  domain: string;
  projectId: string;
  solutionCode?: string;
  completedAt?: number;
}

export interface CompletedCloudMission {
  provider: string;
  missionSlug: string;
  completedAt?: number;
}

export interface DomainPortfolioData {
  domain: string;
  completedCases: CompletedQueryCase[];
  visualizationData: ChartData[];
  summary: string;
}

export interface LabDomainPortfolioData {
  domain: string;
  completedProjects: CompletedLabProject[];
  summary: string;
}

export interface CloudTrackPortfolioData {
  provider: string;
  completedMissions: CompletedCloudMission[];
  summary: string;
}

export interface ChartData {
  title: string;
  query: string;
  rows: Record<string, any>[];
  columns: string[];
  chartType: string;
  keyInsights: string[];
}

/** Extract completed SQL query cases for a domain */
export function extractDomainQueryData(domain: string, completed: Set<string>): DomainPortfolioData {
  const allCases = fullCaseOrder[domain] || [];
  const completedCases: CompletedQueryCase[] = [];
  
  for (const caseId of allCases) {
    if (completed.has(caseId)) {
      try {
        const saved = localStorage.getItem(`bleepx_solved_${domain}_${caseId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          completedCases.push({
            domain,
            caseId,
            query: parsed.query || '',
            time: parsed.time,
            attempts: parsed.attempts,
            solvedAt: parsed.solvedAt
          });
        }
      } catch { /* ignore */ }
    }
  }

  const visualizationData = extractVisualizationData(domain, completedCases);
  const summary = generateDomainSummary(domain, completedCases, visualizationData);

  return {
    domain,
    completedCases,
    visualizationData,
    summary
  };
}

/** Extract visualization data for completed cases */
export function extractVisualizationData(domain: string, completedCases: CompletedQueryCase[]): ChartData[] {
  const charts: ChartData[] = [];
  const configs = visualizationConfigs[domain] || {};

  for (const caseData of completedCases) {
    const caseConfigs = configs[caseData.caseId] || [];
    for (const cfg of caseConfigs) {
      // Extract key insights from the query and chart type
      const chartType = inferChartType(cfg.layout);
      const keyInsights = generateChartInsights(cfg, caseData.caseId);
      
      charts.push({
        title: cfg.layout?.title?.text || `Analysis for ${caseData.caseId}`,
        query: cfg.query,
        rows: [], // Would need to re-run query to get actual data
        columns: [],
        chartType,
        keyInsights
      });
    }
  }

  return charts;
}

/** Infer chart type from layout configuration */
function inferChartType(layout: any): string {
  if (!layout) return 'table';
  if (layout.xaxis && layout.yaxis) {
    if (layout.barmode) return 'bar';
    if (layout.polar) return 'polar';
    return 'scatter';
  }
  if (layout.pie) return 'pie';
  if (layout.geo) return 'map';
  return 'table';
}

/** Generate insights from chart configuration */
function generateChartInsights(cfg: any, caseId: string): string[] {
  const insights: string[] = [];
  const title = cfg.layout?.title?.text || '';
  
  // Analyze query for common patterns
  const query = cfg.query.toLowerCase();
  
  if (query.includes('count') || query.includes('sum') || query.includes('avg')) {
    insights.push('Aggregation analysis showing summary statistics');
  }
  if (query.includes('group by')) {
    insights.push('Grouped analysis revealing patterns across categories');
  }
  if (query.includes('join')) {
    insights.push('Multi-table analysis combining related datasets');
  }
  if (query.includes('window') || query.includes('over')) {
    insights.push('Window function analysis for trend comparison');
  }
  if (query.includes('order by') && query.includes('desc')) {
    insights.push('Top/bottom ranking analysis');
  }
  if (query.includes('where') && (query.includes('date') || query.includes('time'))) {
    insights.push('Time-based filtering for temporal analysis');
  }

  if (title) {
    insights.push(`Focus: ${title}`);
  }

  return insights.length > 0 ? insights : ['Data visualization for query results'];
}

/** Generate domain summary based on completed work */
function generateDomainSummary(domain: string, completedCases: CompletedQueryCase[], vizData: ChartData[]): string {
  const caseCount = completedCases.length;
  const vizCount = vizData.length;
  const avgTime = completedCases.filter(c => c.time).reduce((a, c) => a + (c.time || 0), 0) / (completedCases.filter(c => c.time).length || 1);
  
  const domainMeta: Record<string, string> = {
    business: 'Business Retail',
    crime: 'Crime Chicago',
    farming: 'Farming NDVI',
    finance: 'Finance Stocks',
    healthcare: 'Healthcare',
    social: 'Social Twitter',
    space: 'Space NEO',
    sports: 'Sports NBA'
  };

  return `Completed ${caseCount} SQL challenges in ${domainMeta[domain] || domain} with ${vizCount} data visualizations. Average solve time: ${Math.round(avgTime / 60)} minutes.`;
}

/** Extract completed Lab projects for a domain */
export function extractLabDomainData(domain: string, completed: Set<string>): LabDomainPortfolioData {
  const allProjects = LAB_CASE_ORDER[domain] || [];
  const completedProjects: CompletedLabProject[] = [];
  
  for (const projectId of allProjects) {
    if (completed.has(projectId) || completed.has(`lab_${projectId}`)) {
      try {
        const saved = localStorage.getItem(`bleepx_lab_${domain}_${projectId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          completedProjects.push({
            domain,
            projectId,
            solutionCode: parsed.solutionCode,
            completedAt: parsed.completedAt
          });
        }
      } catch { /* ignore */ }
    }
  }

  const meta = LAB_DOMAIN_META[domain];
  const summary = `Completed ${completedProjects.length}/${allProjects.length} data science projects in ${meta?.name || domain}. Projects include data analysis, visualization, and machine learning pipelines.`;

  return {
    domain,
    completedProjects,
    summary
  };
}

/** Extract completed Cloud missions for a provider */
export function extractCloudTrackData(provider: CloudProvider, completed: Set<string>): CloudTrackPortfolioData {
  const missions = CLOUD_MISSIONS[provider] || [];
  const completedMissions: CompletedCloudMission[] = [];
  
  for (const mission of missions) {
    const missionId = cloudMissionId(provider, mission.slug);
    if (completed.has(missionId)) {
      try {
        const saved = localStorage.getItem(`bleepx_cloud_${provider}_${mission.slug}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          completedMissions.push({
            provider,
            missionSlug: mission.slug,
            completedAt: parsed.completedAt
          });
        }
      } catch { /* ignore */ }
    }
  }

  const meta = CLOUD_PROVIDER_META[provider];
  const summary = `Completed ${completedMissions.length}/${missions.length} cloud architecture missions in ${meta?.name || provider}. Covers infrastructure design, security, scalability, and cost optimization.`;

  return {
    provider,
    completedMissions,
    summary
  };
}

/** Generate context-aware interpretation hints based on actual data */
export function generateContextHints(
  verse: 'query' | 'lab' | 'cloud',
  itemId: string,
  domain?: string
): { title: string; hint: string; placeholder: string; context: string }[] {
  const progressData = JSON.parse(localStorage.getItem('bleepx_progress') || '{}');
  const completed = new Set<string>(progressData.completed || []);
  
  if (verse === 'query' && domain) {
    const data = extractDomainQueryData(domain, completed);
    return generateQueryContextHints(data);
  }
  
  if (verse === 'lab' && domain) {
    const data = extractLabDomainData(domain, completed);
    return generateLabContextHints(data);
  }
  
  if (verse === 'cloud' && domain) {
    // Validate that domain is a valid CloudProvider
    if (CLOUD_PROVIDERS.includes(domain as CloudProvider)) {
      const provider = domain as CloudProvider;
      const data = extractCloudTrackData(provider, completed);
      return generateCloudContextHints(data);
    }
  }

  return [];
}

/** Generate context-aware hints for Query domain */
function generateQueryContextHints(data: DomainPortfolioData) {
  const { completedCases, visualizationData, summary } = data;
  
  return [
    {
      title: 'Executive Summary',
      hint: `💡 *bleep* Based on your ${completedCases.length} completed challenges in ${data.domain}, summarize the key business insights. Focus on what the data reveals about ${data.domain}.`,
      placeholder: `This analysis of ${data.domain} data examined ${completedCases.length} key business questions. The findings reveal patterns in [key metrics] that suggest [business implication].`,
      context: summary
    },
    {
      title: 'Key Findings',
      hint: `💡 *bleep* You created ${visualizationData.length} visualizations. What patterns did you discover? Include specific insights from your charts.`,
      placeholder: `• ${visualizationData[0]?.keyInsights[0] || 'Key insight from analysis'}\n• ${visualizationData[1]?.keyInsights[0] || 'Secondary finding'}\n• ${visualizationData[2]?.keyInsights[0] || 'Additional discovery'}`,
      context: visualizationData.map(v => v.title).join(', ')
    },
    {
      title: 'Methodology',
      hint: `💡 *bleep* You used SQL techniques including ${getTechniquesUsed(completedCases)}. Explain your analytical approach.`,
      placeholder: `Analyzed ${data.domain} dataset using ${getTechniquesUsed(completedCases).join(', ')} techniques. Focused on extracting actionable business insights from raw data.`,
      context: getTechniquesUsed(completedCases).join(', ')
    },
    {
      title: 'Recommendations',
      hint: `💡 *bleep* Based on your findings, what should ${data.domain} stakeholders do? Be specific and actionable.`,
      placeholder: `1. Optimize [metric] based on analysis patterns\n2. Investigate [anomaly] revealed in visualizations\n3. Monitor [trend] for future decision-making`,
      context: 'Business recommendations based on data analysis'
    }
  ];
}

/** Generate context-aware hints for Lab domain */
function generateLabContextHints(data: LabDomainPortfolioData) {
  const { completedProjects, summary } = data;
  
  return [
    {
      title: 'Executive Summary',
      hint: `💡 *bleep* You completed ${completedProjects.length} data science projects in ${data.domain}. Summarize your technical work for non-technical stakeholders.`,
      placeholder: `Built ${completedProjects.length} end-to-end data science solutions for ${data.domain}, including data preprocessing, analysis, and modeling. Projects demonstrate proficiency in Python/R and machine learning.`,
      context: summary
    },
    {
      title: 'Key Findings',
      hint: `💡 *bleep* What did your models reveal? Include performance metrics, feature importance, or statistical insights.`,
      placeholder: `• Model accuracy: [X]% on test data\n• Top predictive features: [feature list]\n• Key insight: [discovery from analysis]`,
      context: 'Model performance and insights'
    },
    {
      title: 'Methodology',
      hint: `💡 *bleep* Explain your data science pipeline: data loading, cleaning, feature engineering, modeling, evaluation.`,
      placeholder: `Used Kaggle datasets with ${completedProjects.length} projects. Applied preprocessing, feature engineering, and model training. Evaluated using accuracy, precision, recall metrics.`,
      context: 'Data science pipeline and techniques'
    },
    {
      title: 'Technical Notes',
      hint: `💡 *bleep* Include technical details: libraries used, hyperparameters, model architecture.`,
      placeholder: `Libraries: pandas, scikit-learn, matplotlib\nModels: [model types]\nBest parameters: [hyperparameters]`,
      context: 'Technical implementation details'
    }
  ];
}

/** Generate context-aware hints for Cloud track */
function generateCloudContextHints(data: CloudTrackPortfolioData) {
  const { completedMissions, summary } = data;
  
  return [
    {
      title: 'Executive Summary',
      hint: `💡 *bleep* You completed ${completedMissions.length} cloud architecture missions in ${data.provider}. Summarize the solutions you designed.`,
      placeholder: `Designed ${completedMissions.length} production-ready cloud architectures on ${data.provider}, focusing on scalability, security, and cost optimization. Solutions follow best practices and well-architected frameworks.`,
      context: summary
    },
    {
      title: 'Key Findings',
      hint: `💡 *bleep* What architectural patterns did you implement? Highlight key services and design decisions.`,
      placeholder: `• Implemented [pattern] for [benefit]\n• Used [services] for [purpose]\n• Ensured [non-functional requirement]`,
      context: 'Architectural patterns and services'
    },
    {
      title: 'Design Decisions',
      hint: `💡 *bleep* Explain why you chose specific services. What alternatives did you consider?`,
      placeholder: `Chose [service] over [alternative] because [reason]. Design prioritizes [requirement] while maintaining [quality attribute].`,
      context: 'Architecture decision rationale'
    },
    {
      title: 'Recommendations',
      hint: `💡 *bleep* What improvements or next steps would you recommend for these architectures?`,
      placeholder: `Consider adding [service] for [benefit]. Implement [practice] to improve [aspect]. Monitor [metric] for operational excellence.`,
      context: 'Architecture improvements'
    }
  ];
}

/** Extract SQL techniques used from completed cases */
function getTechniquesUsed(cases: CompletedQueryCase[]): string[] {
  const techniques = new Set<string>();
  
  for (const c of cases) {
    const query = c.query.toLowerCase();
    
    if (query.includes('join')) techniques.add('JOINs');
    if (query.includes('group by')) techniques.add('GROUP BY aggregation');
    if (query.includes('window') || query.includes('over')) techniques.add('Window functions');
    if (query.includes('cte') || query.includes('with')) techniques.add('CTEs');
    if (query.includes('subquery') || query.includes('select') && query.includes('select')) techniques.add('Subqueries');
    if (query.includes('case when')) techniques.add('CASE expressions');
    if (query.includes('count') || query.includes('sum') || query.includes('avg')) techniques.add('Aggregate functions');
    if (query.includes('order by')) techniques.add('Sorting');
    if (query.includes('having')) techniques.add('HAVING clauses');
  }
  
  return Array.from(techniques);
}
