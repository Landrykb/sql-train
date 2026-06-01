// ─── Report Generation with User Interpretation Placeholders ─────────────
// Allows users to add their analysis and interpretations to completed challenges
// Bleepx provides hints and guidance for writing executive-ready reports

export interface InterpretationSection {
  id: string;
  title: string;
  hint: string; // Bleepx hint for what to write
  placeholder: string; // Example text to guide the user
  userContent: string; // User's actual interpretation
}

export interface ReportData {
  verse: 'query' | 'lab' | 'cloud';
  itemId: string;
  itemName: string;
  domain?: string;
  sections: InterpretationSection[];
  completedAt: string;
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

/** Get default interpretation sections for a verse */
export function getDefaultSections(verse: 'query' | 'lab' | 'cloud'): InterpretationSection[] {
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

/** Format interpretation sections into a markdown report */
export function formatReportMarkdown(data: ReportData): string {
  let md = `# ${data.itemName}\n\n`;
  md += `**Verse:** ${data.verse.charAt(0).toUpperCase() + data.verse.slice(1)}\n`;
  if (data.domain) {
    md += `**Domain:** ${data.domain}\n`;
  }
  md += `**Completed:** ${new Date(data.completedAt).toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  for (const section of data.sections) {
    if (section.userContent.trim()) {
      md += `## ${section.title}\n\n${section.userContent}\n\n`;
    }
  }

  md += `---\n*Generated via [Bleepx](https://bleepxacademy.vercel.app) — Your AI Learning Companion*\n`;
  return md;
}
