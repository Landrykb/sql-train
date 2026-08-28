export type Chunk = {
  id: string;
  topic: 'sql' | 'aws' | 'python' | 'ml' | 'general' | 'lore';
  content: string;
};

const CORPUS: Chunk[] = [
  {
    id: 'lore-bleepx',
    topic: 'lore',
    content:
      'Bleepx is a personal AI companion built by the human he is now bonded with. He is witty, slightly arrogant, loyal, makes bleeping sounds, and can enter ghost mode. He addresses the user by their real name if known, otherwise as human or friend.',
  },
  {
    id: 'sql-joins',
    topic: 'sql',
    content:
      'SQL JOINs combine rows. INNER JOIN returns only matching rows. LEFT JOIN returns all rows from the left table. RIGHT JOIN returns all rows from the right table. FULL JOIN returns all rows from both tables. CROSS JOIN produces the Cartesian product.',
  },
  {
    id: 'sql-group',
    topic: 'sql',
    content:
      'GROUP BY collapses rows into groups. Use it with aggregate functions like COUNT, SUM, AVG, MAX, MIN. Use HAVING to filter groups after aggregation.',
  },
  {
    id: 'sql-cte',
    topic: 'sql',
    content:
      'A CTE (WITH clause) defines a temporary named result set for cleaner, reusable queries. You can chain multiple CTEs separated by commas.',
  },
  {
    id: 'sql-window',
    topic: 'sql',
    content:
      'Window functions like ROW_NUMBER, RANK, DENSE_RANK, LEAD, and LAG operate over a set of rows without collapsing them. Use the OVER clause with PARTITION BY and ORDER BY.',
  },
  {
    id: 'aws-s3',
    topic: 'aws',
    content:
      'S3 is object storage. S3 Standard is for hot data. S3 Standard-IA is for infrequent access. S3 Glacier and Glacier Deep Archive are for rarely accessed long-term data. S3 Intelligent-Tiering moves data automatically.',
  },
  {
    id: 'aws-ec2',
    topic: 'aws',
    content:
      'EC2 provides virtual servers. Instance families: C for compute, R for memory, M for general, T for burstable. EBS is persistent block storage. Instance store is temporary.',
  },
  {
    id: 'aws-lambda',
    topic: 'aws',
    content:
      'AWS Lambda runs code in response to events. It scales automatically. You pay per request and compute time. Use for short, event-driven tasks.',
  },
  {
    id: 'aws-iam',
    topic: 'aws',
    content:
      'IAM controls access. Prefer roles over long-term keys. Use least privilege. Managed policies cover common patterns. Use IAM policies for fine-grained access.',
  },
  {
    id: 'python-pandas',
    topic: 'python',
    content:
      'Pandas is the standard Python data library. DataFrames are tables. Use groupby for aggregation, merge for joins, and apply/map for transformations.',
  },
  {
    id: 'ml-sagemaker',
    topic: 'ml',
    content:
      'Amazon SageMaker builds, trains, and deploys ML models. Use S3 for data, ECR for containers, and SageMaker endpoints for real-time or batch inference.',
  },
];

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/\W+/).filter(Boolean);
}

export function retrieveChunks(
  query: string,
  opts: { topic?: Chunk['topic']; limit?: number } = {}
): Chunk[] {
  const qTokens = new Set(tokenize(query));
  const limit = opts.limit ?? 3;

  let pool = CORPUS;
  if (opts.topic) {
    pool = pool.filter((c) => c.topic === opts.topic || c.topic === 'lore');
  }

  const scored = pool.map((c) => {
    const cTokens = new Set(tokenize(c.content));
    let score = 0;
    for (const t of qTokens) {
      if (cTokens.has(t)) score += 1;
    }
    // boost exact phrase matches
    if (c.content.toLowerCase().includes(query.toLowerCase())) score += 3;
    return { chunk: c, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}

export function formatContext(chunks: Chunk[]): string {
  return chunks.map((c) => `[${c.id}]
${c.content}`).join('\n\n');
}
