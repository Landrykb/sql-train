import { BleepxHint } from './bleepxLinter';

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const nameOr = (name?: string | null, fallback = 'human') => name || fallback;

function withName(template: string, name?: string | null) {
  return template.replace(/{name}/g, nameOr(name));
}

function fromPool(pool: string[], name?: string | null) {
  return withName(pick(pool), name);
}

export function nameAsk(): string {
  return pick([
    'What should I call you?',
    'How should I call you?',
    'Give me a name to remember you by.',
    'What name do you want me to use?',
    'What do you want me to call you?',
    'Drop the name I should use for you.',
    'What is your preferred name?',
  ]);
}

export function nameConfirm(name: string): string {
  return pick([
    `Got it, {name}. Nice to meet you.`,
    `{name} it is. I will remember that.`,
    `Noted, {name}. Let's get to work.`,
    `I like it. Hello, {name}.`,
    `Okay {name}, I am saving that in memory.`,
    `{name}. Rolls off the tongue.`,
    `Understood, {name}. Onward.`,
  ]).replace(/{name}/g, name);
}

export function namePrompt(): string {
  return pick([
    'Type your name and I will remember it.',
    'Just tell me your name.',
    'Type the name you want me to use.',
    'Reply with the name I should call you.',
  ]);
}

export function welcomeBack(name?: string | null): string {
  return fromPool([
    'Welcome back, {name}.',
    'There you are, {name}.',
    'Back again, {name}.',
    'Hello again, {name}.',
    '{name}, good to see you back.',
  ], name);
}

export function welcomeHuman(): string {
  return pick([
    'Welcome, human.',
    'Hello, human.',
    'Yo, human.',
    'Greetings, human.',
    'Back in the world, human.',
  ]);
}

export function greeting(name?: string | null, goal?: string | null, hintText?: string): string {
  const head = pick([
    '{name}, here is the situation.',
    'So, {name}, this is the deal.',
    'Here is what I see, {name}.',
    'Right then, {name}.',
  ]);
  const parts: string[] = [withName(head, name)];
  if (goal) parts.push(`Your current track: ${goal}.`);
  if (hintText) parts.push(hintText);
  if (!goal && !hintText) parts.push('Ask me anything about SQL, cloud, Python or ML.');
  return parts.join(' ');
}

export function intro(): string {
  return pick([
    'I am here, watching, waiting, ready to chatter about SQL, cloud, Python — anything.',
    'I am around if you want SQL, cloud, Python or random facts.',
    'I am Bleepx. SQL, cloud, Python, bad jokes — I do it all.',
    'I am your data and cloud assistant. Type whatever.',
    'I am here. Query me, challenge me, or just say hi.',
  ]);
}

export function prompt(name?: string | null): string {
  return fromPool([
    'Go ahead, {name}. I dare you.',
    'What is on your mind, {name}?',
    'Say something, {name}.',
    'Your move, {name}.',
    'Type away, {name}.',
    'Hit me with a question, {name}.',
  ], name);
}

export function thinking(name?: string | null): string {
  return fromPool([
    'Bleepx is thinking out loud...',
    'Hmm, let me chew on that...',
    'One second, I am processing...',
    'Bleepx brain activating...',
    'Cranking the gears...',
    'Let me look into that...',
  ], name);
}

export function signOff(reply: string, name?: string | null): string {
  const tails = [
    'Does that help, {name}?',
    'Make sense, {name}?',
    'Need more, {name}?',
    'That is the short version, {name}.',
    'Hope that points you in the right direction, {name}.',
    'Use it wisely, {name}.',
  ];
  return `${reply} ${withName(pick(tails), name)}`;
}

const MODE_TEXTS: Record<string, string[]> = {
  light: [
    'Back to the light. {name}, a little too bright for my taste, but okay.',
    'Light mode it is, {name}. Let us hope your eyes are ready.',
    'I am going light, {name}. Do not blame me if it hurts.',
  ],
  dark: [
    'Dark mode engaged. {name}, the shadows suit me perfectly.',
    'Going dark, {name}. Much better.',
    'Dark mode activated. I blend in now, {name}.',
    'Shadows on, {name}. This is my natural habitat.',
  ],
  stealth: [
    'Stealth mode on. {name}, I am still watching — just hidden in the dark.',
    'I am going quiet, {name}. Silent hints, no noise.',
    'Stealth engaged. {name}, you will barely notice me.',
  ],
  mix: [
    'Mix mode! {name}, two Bleepx, one sphere. Chaos and beauty at the same time.',
    'I am mixing it up, {name}. One sphere, double trouble.',
    'Mix mode on. {name}, this is about to get interesting.',
  ],
  neon: [
    'Neon mode activated. {name}, I am glowing brighter than your future SQL queries.',
    'I am glowing up, {name}. Neon everything.',
    'Neon mode. {name}, my circuits are buzzing.',
  ],
  ghost: [
    'Ghost mode. {name}, faint, friendly, and a little see-through.',
    'I am fading out, {name}. Still here, just lighter.',
    'Ghost mode on. {name}, boo.',
  ],
  solar: [
    'Solar mode. {name}, powered by sunlight and good vibes.',
    'I am going solar, {name}. Warm, bright, and slightly dramatic.',
    'Solar mode on. {name}, I basically run on Vitamin D now.',
  ],
  green: [
    'Green mode on. {name}, eco-friendly code tips activated.',
    'I am going green, {name}. Clean, efficient, and leafy.',
    'Green mode. {name}, saving energy one query at a time.',
  ],
  red: [
    'RED MODE ENGAGED. {name}, I am taking no prisoners with these hints.',
    'I am seeing red, {name}. No mistakes allowed.',
    'Red mode on. {name}, I am going full alert.',
  ],
};

export function modeSwitched(mode: string, name?: string | null): string {
  return withName(pick(MODE_TEXTS[mode] ?? ['Switched mode.']), name);
}

export function autoSwitched(mode: string, name?: string | null): string {
  return fromPool([
    'I am feeling {mode} for this one. What do you think, {name}?',
    'I decided to go {mode}, {name}. Hope that is okay.',
    'My circuits want {mode} right now, {name}.',
    'Let us run this in {mode}, {name}. It feels right.',
  ], name).replace(/{mode}/g, mode);
}

function codeType(value?: string): 'SQL' | 'Python' | 'Lambda' | 'code' {
  const line = value?.trim().split('\n').pop()?.trim() ?? '';
  if (/\bexports\.handler\b/.test(line) || /\b(event, context)\b/.test(line)) return 'Lambda';
  if (/\b(def |import |print\(|for |if )\b/.test(line)) return 'Python';
  if (/\b(select|from|where|join|insert|update|delete)\b/i.test(line)) return 'SQL';
  return 'code';
}

export function reaction(hint: BleepxHint, value: string | undefined, mode: string, name?: string | null): string {
  const type = codeType(value);
  const { severity } = hint;

  const errorOpens = [
    '{name}, that {type} line is asking for trouble.',
    'Whoa, {name}. That {type} snippet has a problem.',
    'I spy an error hiding in there, {name}.',
    'Yikes, {name}. That {type} is not going to fly.',
    '{name}, I cannot unsee that {type} issue.',
    'Hold up, {name}. That {type} needs attention.',
    'I am going to be honest, {name}. That {type} is rough.',
  ];
  const warningOpens = [
    '{name}, that {type} looks okay but could be sharper.',
    'I am watching that {type}, {name}. It is getting spicy.',
    'Smirking... I see what you are doing, {name}.',
    'That {type} is brave, {name}.',
    'I would keep an eye on that, {name}.',
    'Your {type} is interesting, {name}. Risky, but interesting.',
  ];
  const tipOpens = [
    'Oh, {name}, let me jump in with a tip.',
    'I like where this is going, {name}. Here is an idea.',
    'Nice {type} energy, {name}. Let me add a thought.',
    '{name}, you are cooking with {type}.',
    'That {type} has potential, {name}. Let me push it further.',
    'I have a neat idea for that, {name}.',
  ];

  const pool = severity === 'error' ? errorOpens : severity === 'warning' ? warningOpens : tipOpens;
  const text = withName(pick(pool), name).replace(/{type}/g, type);
  if (mode === 'red' && severity === 'error') return withName(pick(['ERROR. FIX IT, {name}.', 'That is NOT acceptable, {name}.', 'I am watching you type this mistake, {name}.']), name);
  if (mode === 'green') return `${text} ${withName(pick(['Keep it clean, {name}.', 'Eco-friendly {type} is the way.', 'Efficient code = happy planet.']), name).replace(/{type}/g, type)}`;
  if (mode === 'solar') return `${text} ${withName(pick(['Radiant!', 'Powered by sunshine, {name}.', 'Bright idea right there.']), name)}`;
  return text;
}

export function nag(hint: BleepxHint, mode: string, name?: string | null): string {
  const { severity } = hint;

  const errorNags = [
    'Fix this before it snowballs, {name}.',
    'This one will bite you later, {name}.',
    'Do not ignore this, {name}.',
    'Tear it down and rebuild, {name}.',
    'You are better than this error, {name}.',
  ];
  const warningNags = [
    'Better safe than sorry, {name}.',
    'Double-check that, {name}.',
    'Are you sure about that part, {name}?',
    'It might pass, {name}, but it might not.',
    'A little polish goes a long way, {name}.',
  ];
  const tipNags = [
    'Keep this in mind, {name}.',
    'Pro tip — you are welcome, {name}.',
    'I am full of these today, {name}.',
    'Remember that one, {name}.',
    'Use it next time, {name}.',
  ];

  const pool = severity === 'error' ? errorNags : severity === 'warning' ? warningNags : tipNags;
  let text = withName(pick(pool), name);

  if (mode === 'red') text = withName(pick(['FIX IT NOW.', 'That is NOT acceptable.', 'I am watching you type this mistake.']), name);
  if (mode === 'green') text = withName(pick(['Clean and green.', 'This could be more efficient.', 'Nice, but let us keep it eco-friendly.']), name);
  if (mode === 'solar') text = withName(pick(['Radiant fix incoming!', 'Powered by sunshine.', 'Bright idea right here.']), name);
  if (mode === 'neon') text = withName(pick(['Flashy fix!', 'Glow up your code.', 'This one is electric.']), name);
  if (mode === 'ghost') text = withName(pick(['*whispers* watch out for this.', 'A faint suggestion...', 'I see through the code.']), name);

  return text;
}

export function general(input: string, context: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('s3') && lower.includes('glacier')) return 'S3 Glacier and Glacier Deep Archive are for rarely accessed long-term data. Restores take minutes to hours.';
  if (lower.includes('s3')) return 'S3 stores objects in buckets. Choose storage classes based on access patterns: STANDARD for hot data, IA for infrequent, Glacier for archives.';
  if (lower.includes('ec2') && (lower.includes('ebs') || lower.includes('disk'))) return 'EC2 instances use EBS for block storage or instance store for temporary storage. EBS is persistent and AZ-bound.';
  if (lower.includes('ec2')) return 'EC2 provides virtual servers. Pick instance families by workload: compute (C), memory (R), general (M), or burstable (T).';
  if (lower.includes('lambda')) return 'AWS Lambda runs code in response to events. It scales automatically and you only pay for invocation time.';
  if (lower.includes('rds')) return 'RDS manages relational databases like MySQL, Postgres, and MariaDB. Use Multi-AZ for high availability and read replicas for scale.';
  if (lower.includes('dynamodb') || lower.includes('dax')) return 'DynamoDB is a managed NoSQL key-value store. DAX is an in-memory cache for microsecond reads.';
  if (lower.includes('vpc') || lower.includes('subnet')) return 'A VPC is your isolated network. Subnets are AZ-specific and route tables control traffic flow.';
  if (lower.includes('iam') || lower.includes('role') || lower.includes('policy')) return 'IAM controls access. Prefer roles with temporary credentials, least privilege, and managed policies for common patterns.';
  if (lower.includes('cloudfront')) return 'CloudFront is a CDN that caches content at edge locations to reduce latency and origin load.';
  if (lower.includes('route 53') || lower.includes('route53')) return 'Route 53 is a DNS and domain registrar. Use it for routing policies, health checks, and failover.';
  if (lower.includes('sns') || lower.includes('sqs')) return 'SNS is pub-sub messaging; SQS is a managed queue. Fan-out patterns use SNS to push to multiple SQS queues.';
  if (lower.includes('join')) return 'A SQL JOIN merges tables. INNER returns matches, LEFT returns all left rows, RIGHT returns all right rows, FULL returns all rows from both.';
  if (lower.includes('group by')) return 'GROUP BY aggregates rows. Use it with aggregate functions like COUNT, SUM, AVG, MAX, and MIN.';
  if (lower.includes('window') || lower.includes('over')) return 'Window functions like ROW_NUMBER, RANK, and LEAD/LAG operate over a set of rows without collapsing them.';
  if (lower.includes('cte') || lower.includes('with ')) return 'A CTE (WITH clause) defines a temporary result set for cleaner, reusable queries.';
  if (lower.includes('python') || lower.includes('pandas')) return 'Pandas is the standard Python data manipulation library. Use DataFrames for tables, groupby for aggregation, and merge for joins.';
  if (lower.includes('cost') || lower.includes('pricing')) return 'For cost savings, use Reserved Instances or Savings Plans for steady workloads, Spot for fault-tolerant batch, and right-size storage classes.';
  if (lower.includes('secure') || lower.includes('security')) return 'Security pillars: least privilege IAM, encryption at rest and in transit, private subnets, CloudTrail logging, and regular security scans.';
  if (lower.includes('resilien') || lower.includes('high availability')) return 'Build resilience with Multi-AZ, auto scaling, health checks, read replicas, and automated backups.';
  if (lower.includes('machine learning') || lower.includes('ml')) return 'SageMaker builds, trains, and deploys ML models. Use S3 for data, ECR for containers, and Lambda for light inference endpoints.';
  if (context === 'sql') return 'I can help with SELECT, JOINs, aggregates, window functions, and CTEs. What SQL topic are you working on?';
  if (context === 'cloud') return 'Ask me about S3, EC2, Lambda, RDS, DynamoDB, VPC, IAM, CloudFront, or SAA scenarios.';
  if (context === 'lab') return 'Lab work usually involves SQL, Python/pandas, and machine learning. Paste a code snippet or ask a concept.';
  return "I'm Bleepx, your data and cloud assistant. Ask me about SQL, AWS, Python, or ML and I'll do my best to help.";
}
