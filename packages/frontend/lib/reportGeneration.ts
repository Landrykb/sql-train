// ─── Report Generation with User Interpretation Placeholders ─────────────
// Allows users to add their analysis and interpretations to completed challenges
// Bleepx provides hints and guidance for writing executive-ready reports

import { generateContextHints } from './portfolioData';

export interface InterpretationSection {
  id: string;
  title: string;
  hint: string; // Bleepx hint for what to write
  placeholder: string; // Example text to guide the user
  userContent: string; // User's actual interpretation
  context?: string; // Additional context from actual completed work
}

export interface ReportData {
  verse: 'query' | 'lab' | 'cloud';
  itemId: string;
  itemName: string;
  domain?: string;
  sections: InterpretationSection[];
  completedAt: string;
  graphs?: GraphData[]; // Actual graphs/charts to include in report
  analysisResults?: AnalysisResult[]; // Actual analysis results to include in report
}

export interface AnalysisResult {
  type: 'query' | 'lab_step' | 'visualization';
  title: string;
  data: any; // Query results, model outputs, etc.
  query?: string; // SQL query used
  summary?: string; // Summary of the result
  timestamp?: string;
}

export interface GraphData {
  title: string;
  chartType: string;
  imageData?: string; // Base64 encoded chart image
  description: string;
  insights: string[];
}

export const BLEEPX_HINTS = {
  query: {
    executiveSummary: {
      hint: "💡 *bleep* Write a 2-3 sentence summary for executives. What business problem did you solve and what was the key finding?",
      placeholder: "This analysis examined [key metrics] and revealed that [main insight]. The findings suggest [business implication]."
    },
    keyFindings: {
      hint: "💡 *bleep* List 3-5 bullet points of your most important discoveries. Focus on actionable insights.",
      placeholder: "• [Finding 1]\n• [Finding 2]\n• [Finding 3]"
    },
    methodology: {
      hint: "💡 *bleep* Briefly explain your approach. What techniques did you use? Any assumptions?",
      placeholder: "I analyzed [X] using [Y] approach, considering [Z] factors."
    },
    recommendations: {
      hint: "💡 *bleep* What should the business do based on your findings? Be specific and actionable.",
      placeholder: "Based on the analysis, I recommend:\n1. [Action 1]\n2. [Action 2]\n3. [Action 3]"
    },
    limitations: {
      hint: "💡 *bleep* Be honest about what the data doesn't tell you or what you couldn't analyze.",
      placeholder: "This analysis is limited by [factor]. Additional data on [topic] would strengthen the conclusions."
    }
  },
  lab: {
    executiveSummary: {
      hint: "💡 *bleep* Summarize your data science project for non-technical stakeholders. What was the goal and outcome?",
      placeholder: "This project built a [model type] to predict [target], achieving [metric] performance. The model can be used for [business purpose]."
    },
    keyFindings: {
      hint: "💡 *bleep* What did your analysis reveal? Include statistical insights, feature importance, or model performance.",
      placeholder: "• Top features: [feature list]\n• Model accuracy: [metric]\n• Key insight: [discovery]"
    },
    methodology: {
      hint: "💡 *bleep* Explain your data science pipeline: data preparation, feature engineering, model selection, evaluation.",
      placeholder: "Used [dataset] with [preprocessing steps]. Trained [model] using [technique] and evaluated with [metrics]."
    },
    recommendations: {
      hint: "💡 *bleep* How should this model be used? What are the business applications and next steps?",
      placeholder: "Deploy this model for [use case]. Consider collecting additional data on [feature] to improve accuracy."
    },
    technicalNotes: {
      hint: "💡 *bleep* Include technical details for data scientists: hyperparameters, feature importance, model interpretability.",
      placeholder: "Best parameters: [hyperparameters]\nFeature importance: [top features]\nModel explainability: [method]"
    }
  },
  cloud: {
    executiveSummary: {
      hint: "💡 *bleep* Summarize the cloud architecture solution. What problem does it solve and for whom?",
      placeholder: "This architecture provides [service] for [use case], ensuring [benefits like scalability, security, cost-efficiency]."
    },
    keyFindings: {
      hint: "💡 *bleep* What are the architectural highlights? Key services, patterns, or design decisions?",
      placeholder: "• Uses [services] for [purpose]\n• Implements [pattern] for [benefit]\n• Ensures [non-functional requirement]"
    },
    designDecisions: {
      hint: "💡 *bleep* Explain why you chose this architecture. What alternatives did you consider?",
      placeholder: "Chose [service] over [alternative] because [reason]. This design prioritizes [requirement]."
    },
    tradeoffs: {
      hint: "💡 *bleep* Be honest about trade-offs. What are the costs, complexities, or limitations?",
      placeholder: "This approach offers [benefit] but requires [consideration]. Alternative [X] would be better if [condition]."
    },
    recommendations: {
      hint: "💡 *bleep* What improvements or next steps would you recommend?",
      placeholder: "Consider adding [service] for [benefit]. Monitor [metric] to ensure [goal]."
    }
  }
};

/** Get default interpretation sections for a verse with context-aware hints */
export function getDefaultSections(verse: 'query' | 'lab' | 'cloud', itemId: string, domain?: string): InterpretationSection[] {
  // Try to get context-aware hints first
  const contextHints = domain ? generateContextHints(verse, itemId, domain) : [];
  
  if (contextHints.length > 0) {
    return contextHints.map(h => ({
      id: h.title.toLowerCase().replace(/\s+/g, '_'),
      title: h.title,
      hint: h.hint,
      placeholder: h.placeholder,
      userContent: '',
      context: h.context
    }));
  }
  
  // Fall back to generic hints if no context available
  const hints = BLEEPX_HINTS[verse];
  const sections: InterpretationSection[] = [];
  
  for (const [id, config] of Object.entries(hints)) {
    sections.push({
      id,
      title: formatTitle(id),
      hint: config.hint,
      placeholder: config.placeholder,
      userContent: ''
    });
  }
  
  return sections;
}

function formatTitle(id: string): string {
  return id
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/** Storage key for user interpretations */
const STORAGE_KEY = 'bleepx_interpretations';

/** Save user interpretation data to localStorage */
export function saveInterpretation(data: ReportData): void {
  try {
    const existing = loadAllInterpretations();
    const key = `${data.verse}_${data.itemId}`;
    existing[key] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save interpretation:', e);
  }
}

/** Load interpretation data for a specific item */
export function loadInterpretation(verse: 'query' | 'lab' | 'cloud', itemId: string): ReportData | null {
  try {
    const existing = loadAllInterpretations();
    const key = `${verse}_${itemId}`;
    return existing[key] || null;
  } catch (e) {
    console.error('Failed to load interpretation:', e);
    return null;
  }
}

/** Load all interpretations */
export function loadAllInterpretations(): Record<string, ReportData> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Failed to load interpretations:', e);
    return {};
  }
}

/** Delete interpretation for an item */
export function deleteInterpretation(verse: 'query' | 'lab' | 'cloud', itemId: string): void {
  try {
    const existing = loadAllInterpretations();
    const key = `${verse}_${itemId}`;
    delete existing[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to delete interpretation:', e);
  }
}

/** Pull analysis results from localStorage for a completed item */
export function pullAnalysisResults(verse: 'query' | 'lab' | 'cloud', itemId: string, domain?: string): AnalysisResult[] {
  const results: AnalysisResult[] = [];

  try {
    if (verse === 'query' && domain) {
      // Pull saved query results from localStorage
      const savedKey = `bleepx_solved_${domain}_${itemId}`;
      const savedData = localStorage.getItem(savedKey);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.results && parsed.results.length > 0) {
          results.push({
            type: 'query',
            title: `${itemId} - Query Results`,
            data: parsed.results,
            query: parsed.query,
            summary: `${parsed.results.length} rows returned`,
            timestamp: parsed.timestamp || new Date().toISOString()
          });
        }
      }
    } else if (verse === 'lab') {
      // Pull Lab step results from localStorage
      const labKey = `bleepx_lab_step_${itemId}`;
      const labData = localStorage.getItem(labKey);
      
      if (labData) {
        const parsed = JSON.parse(labData);
        results.push({
          type: 'lab_step',
          title: `${itemId} - Lab Step Result`,
          data: parsed,
          summary: parsed.output || 'Lab step completed',
          timestamp: parsed.timestamp || new Date().toISOString()
        });
      }
    }
  } catch (e) {
    console.error('Failed to pull analysis results:', e);
  }

  return results;
}

/** Format analysis results into markdown */
function formatAnalysisResults(results: AnalysisResult[]): string {
  if (!results || results.length === 0) return '';
  
  let md = `## Analysis Results\n\n`;
  
  for (const result of results) {
    md += `### ${result.title}\n\n`;
    
    if (result.query) {
      md += `**Query:**\n\`\`\`sql\n${result.query}\n\`\`\`\n\n`;
    }
    
    if (result.summary) {
      md += `**Summary:** ${result.summary}\n\n`;
    }
    
    if (result.data) {
      const data = result.data;
      if (Array.isArray(data) && data.length > 0) {
        // Format as table
        const headers = Object.keys(data[0]);
        md += `**Data Preview:**\n\n`;
        md += `| ${headers.join(' | ')} |\n`;
        md += `| ${headers.map(() => '---').join(' | ')} |\n`;
        
        // Show first 10 rows
        const previewRows = data.slice(0, 10);
        for (const row of previewRows) {
          md += `| ${headers.map(h => String(row[h] ?? '')).join(' | ')} |\n`;
        }
        
        if (data.length > 10) {
          md += `\n*... and ${data.length - 10} more rows*\n\n`;
        } else {
          md += `\n`;
        }
      } else if (typeof data === 'object') {
        // Format as key-value pairs
        md += `**Result:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n`;
      }
    }
    
    md += `\n`;
  }
  
  return md;
}

/** Format graphs into markdown */
function formatGraphs(graphs: GraphData[]): string {
  if (!graphs || graphs.length === 0) return '';
  
  let md = `## Visualizations\n\n`;
  
  for (const graph of graphs) {
    md += `### ${graph.title}\n\n`;
    
    if (graph.imageData) {
      md += `
![${graph.title}](${graph.imageData})
`;
    }
    
    if (graph.description) {
      md += `**Description:** ${graph.description}\n\n`;
    }
    
    if (graph.insights && graph.insights.length > 0) {
      md += `**Insights:**\n`;
      for (const insight of graph.insights) {
        md += `- ${insight}\n`;
      }
      md += `\n`;
    }
    
    md += `\n`;
  }
  
  return md;
}

/** Format interpretation sections into a markdown report */
export function formatReportMarkdown(data: ReportData): string {
  let md = `# ${data.itemName}\n\n`;
  md += `**Verse:** ${data.verse.charAt(0).toUpperCase() + data.verse.slice(1)}\n`;
  if (data.domain) {
    md += `**Domain:** ${data.domain}\n`;
  }
  md += `**Completed:** ${new Date(data.completedAt).toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  // Include analysis results if available
  if (data.analysisResults && data.analysisResults.length > 0) {
    md += formatAnalysisResults(data.analysisResults);
    md += `---\n\n`;
  }

  // Include graphs if available
  if (data.graphs && data.graphs.length > 0) {
    md += formatGraphs(data.graphs);
    md += `---\n\n`;
  }

  // Include user interpretation sections
  for (const section of data.sections) {
    if (section.userContent.trim()) {
      md += `## ${section.title}\n\n${section.userContent}\n\n`;
    }
  }

  md += `---\n*Generated via [Bleepx](https://bleepxacademy.vercel.app) — Your AI Learning Companion*\n`;
  return md;
}

/** Generate a complete report with analysis results automatically pulled */
export function generateCompleteReport(
  verse: 'query' | 'lab' | 'cloud',
  itemId: string,
  itemName: string,
  domain?: string,
  includeAnalysisResults: boolean = true
): ReportData {
  // Load existing interpretation or create new
  let reportData = loadInterpretation(verse, itemId);
  
  if (!reportData) {
    const defaultSections = getDefaultSections(verse, itemId, domain);
    reportData = {
      verse,
      itemId,
      itemName,
      domain,
      sections: defaultSections,
      completedAt: new Date().toISOString()
    };
  }

  // Pull analysis results if requested
  if (includeAnalysisResults && !reportData.analysisResults) {
    reportData.analysisResults = pullAnalysisResults(verse, itemId, domain);
  }

  return reportData;
}
