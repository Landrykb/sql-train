/**
 * Real-code duel rounds for the Lab and Cloud arenas.
 *
 * Lab Arena finale: champions write Python that runs for real in Pyodide —
 * `setup` builds the dataframe, the bot's code must transform it, and `check`
 * asserts the result (any exception = a bug, scored as a miss).
 *
 * Cloud Arena finale: champions execute a build mission inside the in-memory
 * AWS simulator (`lib/cloud/sandbox` + `sandboxActions`). A mission is a list
 * of actions; `check` validates the resulting state. The action list is
 * serialized to the arena UI as feed lines (`▸ createS3Bucket 'arena-vault'`).
 */

import { createEmptySandboxState, type CloudSandboxState } from '../cloud/sandbox';
import {
  createS3Bucket,
  putS3Object,
  setS3PublicAccess,
  setS3Encryption,
  createIAMUser,
  createIAMPolicy,
  attachIAMPolicy,
  launchEC2Instance,
} from '../cloud/sandboxActions';
import {
  hasBucket,
  hasObject,
  bucketIsPrivate,
  bucketHasEncryption,
  hasEC2Instance,
  hasUser,
  userHasPolicy,
} from '../cloud/scenarios';

// ─── Python duels ────────────────────────────────────────────────────────────

export interface PythonDuel {
  id: string;
  name: string;
  instructions: string;
  /** Builds the working data before the bot's code runs. */
  setup: string;
  /** Canonical solution. */
  solution: string;
  /** Plausible-but-wrong variant for scripted bug drama. */
  buggy: string;
  /** Runs after bot code; must raise to fail. */
  check: string;
  /** Shown to a tagged-in player as starter code. */
  starter: string;
}

export const PYTHON_DUELS: PythonDuel[] = [
  {
    id: 'py-clean-nulls',
    name: 'Clean the Nulls',
    instructions: 'Fill every missing value in df with its column mean. Leave df mutated — no new frame.',
    setup: `import pandas as pd\ndf = pd.DataFrame({'a': [1.0, None, 3.0, 4.0], 'b': [10.0, 20.0, None, 40.0]})`,
    solution: `df['a'] = df['a'].fillna(df['a'].mean())\ndf['b'] = df['b'].fillna(df['b'].mean())`,
    buggy: `df = df.fillna(0)`,
    check: `assert df['a'].isna().sum() == 0 and df['b'].isna().sum() == 0, 'nulls remain'\nassert abs(df['a'].iloc[1] - 8/3) < 1e-9, 'wrong fill value in a'\nassert df['b'].iloc[2] == 70/3, 'wrong fill value in b'`,
    starter: `# fill the missing values in df with each column's mean\n`,
  },
  {
    id: 'py-top-products',
    name: 'Top-3 Revenue',
    instructions: 'Group sales by product, sum revenue, and put the top 3 into a frame called `top3` (highest first, column named `revenue`).',
    setup: `import pandas as pd\ndf = pd.DataFrame({'product': ['a','b','a','c','b','d','c','a'], 'revenue': [10, 40, 15, 30, 25, 5, 20, 10]})`,
    solution: `top3 = df.groupby('product', as_index=False)['revenue'].sum().sort_values('revenue', ascending=False).head(3).reset_index(drop=True)`,
    buggy: `top3 = df.groupby('product', as_index=False)['revenue'].sum().sort_values('revenue').head(3).reset_index(drop=True)`,
    check: `assert list(top3['product']) == ['b', 'c', 'a'], f"wrong order: {list(top3['product'])}"\nassert list(top3['revenue']) == [65, 50, 35], 'wrong totals'`,
    starter: `# build top3: top 3 products by total revenue, highest first\n`,
  },
  {
    id: 'py-normalize',
    name: 'Normalize Scores',
    instructions: 'Add a column `score_norm` to df with min-max normalized `score` values (0..1).',
    setup: `import pandas as pd\ndf = pd.DataFrame({'player': ['x','y','z','w'], 'score': [10, 50, 30, 90]})`,
    solution: `df['score_norm'] = (df['score'] - df['score'].min()) / (df['score'].max() - df['score'].min())`,
    buggy: `df['score_norm'] = df['score'] / df['score'].max()`,
    check: `assert 'score_norm' in df.columns, 'score_norm missing'\nassert df['score_norm'].min() == 0 and df['score_norm'].max() == 1, 'not normalized to 0..1'\nassert abs(df.loc[2, 'score_norm'] - 0.25) < 1e-9, 'wrong normalization'`,
    starter: `# add df['score_norm'] = min-max normalized score (0..1)\n`,
  },
  {
    id: 'py-dedupe',
    name: 'Dedupe Keep-Last',
    instructions: 'Drop duplicate `user` rows keeping the LAST occurrence, into `dedup` (reset the index).',
    setup: `import pandas as pd\ndf = pd.DataFrame({'user': ['a','b','a','c','b'], 'score': [1, 5, 9, 3, 7]})`,
    solution: `dedup = df.drop_duplicates(subset='user', keep='last').reset_index(drop=True)`,
    buggy: `dedup = df.drop_duplicates(subset='user', keep='first').reset_index(drop=True)`,
    check: `assert list(dedup['user']) == ['a', 'c', 'b'], f"wrong rows: {list(dedup['user'])}"\nassert list(dedup['score']) == [9, 3, 7], 'kept wrong occurrence'`,
    starter: `# dedup: last row per user, index reset\n`,
  },
  {
    id: 'py-rolling',
    name: 'Rolling Average',
    instructions: 'Add column `ma3` to df: the 3-day rolling mean of `sales` (window=3, min_periods=1).',
    setup: `import pandas as pd\ndf = pd.DataFrame({'day': range(6), 'sales': [10, 20, 30, 40, 50, 60]})`,
    solution: `df['ma3'] = df['sales'].rolling(3, min_periods=1).mean()`,
    buggy: `df['ma3'] = df['sales'].rolling(3).mean()`,
    check: `assert 'ma3' in df.columns, 'ma3 missing'\nassert df['ma3'].iloc[0] == 10 and df['ma3'].iloc[2] == 20 and df['ma3'].iloc[5] == 50, 'wrong rolling mean'`,
    starter: `# df['ma3'] = 3-day rolling mean of sales (min_periods=1)\n`,
  },
  {
    id: 'py-pivot',
    name: 'Pivot the Table',
    instructions: 'Build `piv`: pivot df so rows are `region`, columns are `product`, values are `revenue` summed.',
    setup: `import pandas as pd\ndf = pd.DataFrame({'region': ['n','n','s','s'], 'product': ['x','y','x','y'], 'revenue': [1, 2, 3, 4]})`,
    solution: `piv = df.pivot_table(index='region', columns='product', values='revenue', aggfunc='sum')`,
    buggy: `piv = df.pivot_table(index='product', columns='region', values='revenue', aggfunc='sum')`,
    check: `assert list(piv.index) == ['n', 's'], 'wrong index'\nassert piv.loc['n', 'x'] == 1 and piv.loc['s', 'y'] == 4, 'wrong values'`,
    starter: `# piv: regions as rows, products as columns, revenue summed\n`,
  },
];

// ─── Cloud missions ──────────────────────────────────────────────────────────

export interface CloudAction {
  /** Feed line shown in the fighter card, e.g. `createS3Bucket 'arena-vault'`. */
  label: string;
  run: (s: CloudSandboxState) => CloudSandboxState;
}

export interface CloudMissionMeta {
  id: string;
  name: string;
  instructions: string;
  service: string;
}

export interface CloudMission extends CloudMissionMeta {
  solution: CloudAction[];
  buggy: CloudAction[];
  /** Solution + decoys, shuffled, for the tag-team action picker. */
  palette: CloudAction[];
  check: (s: CloudSandboxState) => { ok: boolean; detail: string };
}

const act = (label: string, run: (s: CloudSandboxState) => CloudSandboxState): CloudAction => ({ label, run });

export const CLOUD_MISSIONS: CloudMission[] = [
  {
    id: 'cl-secure-vault',
    name: 'Secure the Vault',
    service: 'S3',
    instructions: "Create a bucket 'arena-vault', block ALL public access, and encrypt it with AES256.",
    solution: [
      act(`createS3Bucket 'arena-vault'`, (s) => createS3Bucket(s, 'arena-vault')),
      act(`setS3PublicAccess 'arena-vault' block=true`, (s) => setS3PublicAccess(s, 'arena-vault', true)),
      act(`setS3Encryption 'arena-vault' AES256`, (s) => setS3Encryption(s, 'arena-vault', 'AES256')),
    ],
    buggy: [
      act(`createS3Bucket 'arena-vault'`, (s) => createS3Bucket(s, 'arena-vault')),
      act(`setS3PublicAccess 'arena-vault' block=false`, (s) => setS3PublicAccess(s, 'arena-vault', false)),
    ],
    palette: [],
    check: (s) => {
      if (!hasBucket(s, 'arena-vault')) return { ok: false, detail: 'bucket missing' };
      if (!bucketIsPrivate(s, 'arena-vault')) return { ok: false, detail: 'public access left open' };
      if (!bucketHasEncryption(s, 'arena-vault', 'AES256')) return { ok: false, detail: 'no encryption' };
      return { ok: true, detail: 'vault secured' };
    },
  },
  {
    id: 'cl-web-tier',
    name: 'Launch the Web Tier',
    service: 'EC2',
    instructions: "Launch a t3.micro instance named 'web-1' on the Amazon Linux 2023 AMI.",
    solution: [
      act(`launchEC2 'web-1' ami-amazon-linux-2023 t3.micro`, (s) =>
        launchEC2Instance(s, { name: 'web-1', ami: 'ami-amazon-linux-2023', size: 't3.micro' })),
    ],
    buggy: [
      act(`launchEC2 'web-1' ami-amazon-linux-2023 t3.large`, (s) =>
        launchEC2Instance(s, { name: 'web-1', ami: 'ami-amazon-linux-2023', size: 't3.large' })),
    ],
    palette: [],
    check: (s) => {
      const ok = hasEC2Instance(s, (i: any) => i.name === 'web-1' && i.size === 't3.micro' && i.state === 'running');
      if (!ok) return { ok: false, detail: 'no running t3.micro named web-1' };
      return { ok: true, detail: 'web tier up' };
    },
  },
  {
    id: 'cl-private-lake',
    name: 'Private Data Lake',
    service: 'S3',
    instructions: "Create bucket 'data-lake', upload 'sales.csv', and keep everything private.",
    solution: [
      act(`createS3Bucket 'data-lake'`, (s) => createS3Bucket(s, 'data-lake')),
      act(`setS3PublicAccess 'data-lake' block=true`, (s) => setS3PublicAccess(s, 'data-lake', true)),
      act(`putS3Object 'data-lake' 'sales.csv'`, (s) => putS3Object(s, 'data-lake', 'sales.csv', 'region,total\nus,1200')),
    ],
    buggy: [
      act(`createS3Bucket 'data-lake'`, (s) => createS3Bucket(s, 'data-lake')),
      act(`putS3Object 'data-lake' 'sales.csv'`, (s) => putS3Object(s, 'data-lake', 'sales.csv', 'region,total\nus,1200')),
    ],
    palette: [],
    check: (s) => {
      if (!hasBucket(s, 'data-lake')) return { ok: false, detail: 'bucket missing' };
      if (!hasObject(s, 'data-lake', 'sales.csv')) return { ok: false, detail: 'sales.csv missing' };
      if (!bucketIsPrivate(s, 'data-lake')) return { ok: false, detail: 'lake left public' };
      return { ok: true, detail: 'lake sealed' };
    },
  },
  {
    id: 'cl-least-privilege',
    name: 'Least Privilege',
    service: 'IAM',
    instructions: "Create user 'analyst', a policy 'read-metrics' allowing s3:GetObject on 'data-lake/*', and attach it.",
    solution: [
      act(`createIAMUser 'analyst'`, (s) => createIAMUser(s, 'analyst')),
      act(`createIAMPolicy 'read-metrics' s3:GetObject`, (s) =>
        createIAMPolicy(s, 'read-metrics', [{ Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::data-lake/*' }])),
      act(`attachIAMPolicy 'analyst' 'read-metrics'`, (s) => attachIAMPolicy(s, 'analyst', 'read-metrics')),
    ],
    buggy: [
      act(`createIAMUser 'analyst'`, (s) => createIAMUser(s, 'analyst')),
      act(`createIAMPolicy 'read-metrics' s3:*`, (s) =>
        createIAMPolicy(s, 'read-metrics', [{ Effect: 'Allow', Action: 's3:*', Resource: '*' }])),
      act(`attachIAMPolicy 'analyst' 'read-metrics'`, (s) => attachIAMPolicy(s, 'analyst', 'read-metrics')),
    ],
    palette: [],
    check: (s) => {
      if (!hasUser(s, 'analyst')) return { ok: false, detail: 'user missing' };
      if (!userHasPolicy(s, 'analyst', 'read-metrics')) return { ok: false, detail: 'policy not attached' };
      const pol = s.iam.policies['read-metrics'];
      const stmt = pol?.statements?.[0];
      if (!stmt || stmt.Action !== 's3:GetObject' || stmt.Resource !== 'arn:aws:s3:::data-lake/*') {
        return { ok: false, detail: 'policy over-privileged' };
      }
      return { ok: true, detail: 'least privilege granted' };
    },
  },
  {
    id: 'cl-static-site',
    name: 'Ship the Static Site',
    service: 'S3',
    instructions: "Create bucket 'arena-site', upload 'index.html', and leave public access OPEN (it's a website).",
    solution: [
      act(`createS3Bucket 'arena-site'`, (s) => createS3Bucket(s, 'arena-site')),
      act(`putS3Object 'arena-site' 'index.html'`, (s) => putS3Object(s, 'arena-site', 'index.html', '<h1>arena</h1>')),
      act(`setS3PublicAccess 'arena-site' block=false`, (s) => setS3PublicAccess(s, 'arena-site', false)),
    ],
    buggy: [
      act(`createS3Bucket 'arena-site'`, (s) => createS3Bucket(s, 'arena-site')),
      act(`setS3PublicAccess 'arena-site' block=true`, (s) => setS3PublicAccess(s, 'arena-site', true)),
    ],
    palette: [],
    check: (s) => {
      if (!hasBucket(s, 'arena-site')) return { ok: false, detail: 'bucket missing' };
      if (!hasObject(s, 'arena-site', 'index.html')) return { ok: false, detail: 'index.html missing' };
      if (bucketIsPrivate(s, 'arena-site')) return { ok: false, detail: 'site blocked — no one can see it' };
      return { ok: true, detail: 'site live' };
    },
  },
  {
    id: 'cl-encrypted-lake',
    name: 'Lock the Lake',
    service: 'S3',
    instructions: "Create bucket 'secure-lake', encrypt it with AES256, then upload 'secret.csv' — all private.",
    solution: [
      act(`createS3Bucket 'secure-lake'`, (s) => createS3Bucket(s, 'secure-lake')),
      act(`setS3Encryption 'secure-lake' AES256`, (s) => setS3Encryption(s, 'secure-lake', 'AES256')),
      act(`setS3PublicAccess 'secure-lake' block=true`, (s) => setS3PublicAccess(s, 'secure-lake', true)),
      act(`putS3Object 'secure-lake' 'secret.csv'`, (s) => putS3Object(s, 'secure-lake', 'secret.csv', 'k,v\n1,x')),
    ],
    buggy: [
      act(`createS3Bucket 'secure-lake'`, (s) => createS3Bucket(s, 'secure-lake')),
      act(`putS3Object 'secure-lake' 'secret.csv'`, (s) => putS3Object(s, 'secure-lake', 'secret.csv', 'k,v\n1,x')),
    ],
    palette: [],
    check: (s) => {
      if (!hasBucket(s, 'secure-lake')) return { ok: false, detail: 'bucket missing' };
      if (!bucketHasEncryption(s, 'secure-lake', 'AES256')) return { ok: false, detail: 'not encrypted' };
      if (!bucketIsPrivate(s, 'secure-lake')) return { ok: false, detail: 'left public' };
      if (!hasObject(s, 'secure-lake', 'secret.csv')) return { ok: false, detail: 'secret.csv missing' };
      return { ok: true, detail: 'lake locked' };
    },
  },
];

// Wire palettes: union of solution + buggy actions by label — the player must
// pick the RIGHT calls (the buggy variants are the decoys).
for (const m of CLOUD_MISSIONS) {
  const seen = new Set<string>();
  m.palette = [...m.solution, ...m.buggy].filter((a) => {
    if (seen.has(a.label)) return false;
    seen.add(a.label);
    return true;
  });
}

export const CLOUD_MISSION_META: CloudMissionMeta[] = CLOUD_MISSIONS.map(
  ({ id, name, instructions, service }) => ({ id, name, instructions, service }),
);

export function cloudMissionById(id: string): CloudMission | undefined {
  return CLOUD_MISSIONS.find((m) => m.id === id);
}

export function actionsToLines(list: CloudAction[]): string {
  return list.map((a) => `▸ ${a.label}`).join('\n');
}

export function freshSandbox(): CloudSandboxState {
  return createEmptySandboxState();
}
