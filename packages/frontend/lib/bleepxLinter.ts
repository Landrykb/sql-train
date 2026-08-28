export type LintLanguage = 'sql' | 'python' | 'cloudformation' | 'terraform' | 'json' | 'lambda' | 'general';

export interface BleepxHint {
  message: string;
  fix?: string;
  severity: 'tip' | 'warning' | 'error';
  snippet?: string;
}

function likelySql(value: string, el: Element | null): boolean {
  const lower = value.toLowerCase();
  const text = (el?.getAttribute('placeholder') || '') + ' ' + (el?.className || '');
  return /\b(select|from|where|join|group by|order by|insert|update|delete)\b/.test(lower) || /sql|query/i.test(text);
}

function likelyPython(value: string, el: Element | null): boolean {
  const lower = value.toLowerCase();
  const text = (el?.getAttribute('placeholder') || '') + ' ' + (el?.className || '');
  return /\b(def |import |print\(|for |if |elif |else:|return |class )\b/.test(value) || /python|code|script/i.test(text);
}

function likelyCloudFormation(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.includes('awstemplateformatversion') || lower.includes('resources:') || /\btype:\s*aws::/.test(lower);
}

function likelyTerraform(value: string): boolean {
  const lower = value.toLowerCase();
  return /\bresource\s+"/.test(value) || /\bprovider\s+"/.test(value) || /\bvariable\s+"/.test(value) || lower.includes('terraform {') || lower.includes('= ');
}

function likelyLambda(value: string, el: Element | null, pathname?: string): boolean {
  const lower = value.toLowerCase();
  const text = (el?.getAttribute('placeholder') || '') + ' ' + (el?.className || '');
  return (pathname?.startsWith('/cloud/sandbox') && /python|code|lambda/i.test(text)) || /\b(event, context)\b/.test(value);
}

export function detectLanguage(value: string, el: Element | null, pathname?: string): LintLanguage {
  if (likelyLambda(value, el, pathname)) return 'lambda';
  if (likelySql(value, el)) return 'sql';
  if (likelyCloudFormation(value)) return 'cloudformation';
  if (likelyTerraform(value)) return 'terraform';
  if (likelyPython(value, el)) return 'python';
  if (/^\s*[\{\[]/.test(value)) return 'json';
  return 'general';
}

function sqlLint(value: string, el: Element | null, pathname?: string): BleepxHint | null {
  const lower = value.toLowerCase();
  const errors: BleepxHint[] = [];

  if (/select\s+\*/.test(lower)) {
    errors.push({
      message: 'Avoid `SELECT *` in real queries. It fetches every column, wastes I/O, and breaks if the schema changes.',
      fix: 'List the columns you need and add a LIMIT.',
      severity: 'tip',
      snippet: 'SELECT customer_id, name, region FROM customers WHERE active = 1 LIMIT 100;',
    });
  }

  if (/\b(count|sum|avg|min|max)\s*\(/.test(lower) && !/\bgroup\s+by\b/.test(lower)) {
    errors.push({
      message: 'You are using an aggregate function without a `GROUP BY`. That collapses all rows into one result.',
      fix: 'Add `GROUP BY <column>` if you want one result per category.',
      severity: 'warning',
      snippet: 'SELECT region, COUNT(*) FROM customers GROUP BY region;',
    });
  }

  if (/\bjoin\b/.test(lower) && !/\bon\b/.test(lower)) {
    errors.push({
      message: 'A `JOIN` without an `ON` condition becomes a `CROSS JOIN` — the Cartesian product of both tables.',
      fix: 'Always specify how the tables relate.',
      severity: 'error',
      snippet: 'SELECT * FROM orders JOIN customers ON orders.customer_id = customers.customer_id;',
    });
  }

  if (/where\s+\w+\s*=\s*[a-zA-Z][\w\s]/.test(value) && !/where\s+\w+\s*=\s*['"]/.test(value)) {
    errors.push({
      message: 'String values in SQL must be wrapped in single quotes. Without them, the parser treats the value as a column name.',
      fix: "Wrap the literal in quotes: `WHERE name = 'Alice'`.",
      severity: 'error',
      snippet: "WHERE status = 'pending'",
    });
  }

  if (/group\s+by\s+\w+/.test(lower) && /,\s*\w+\s+from/.test(value) && !/select\s+.*\(.*\).*,/.test(lower)) {
    errors.push({
      message: "In standard SQL, every non-aggregated column in `SELECT` must appear in `GROUP BY`.",
      fix: 'Either add the column to `GROUP BY` or wrap it in an aggregate function.',
      severity: 'warning',
      snippet: 'SELECT region, MAX(balance) FROM customers GROUP BY region;',
    });
  }

  if (/(?<!-)limit\s+\d+/.test(lower) === false && lower.includes('select') && value.length > 200) {
    errors.push({
      message: 'Exploratory queries should use `LIMIT` to avoid returning huge result sets.',
      fix: 'Add `LIMIT 50` or `LIMIT 100` while you are iterating.',
      severity: 'tip',
      snippet: 'SELECT * FROM sales LIMIT 100;',
    });
  }

  return errors[0] ?? null;
}

function pythonLint(value: string): BleepxHint | null {
  const errors: BleepxHint[] = [];

  if (/\bif\s+\w+\s*=\s*[\w'"]/.test(value) && !/==/.test(value)) {
    errors.push({
      message: 'Python uses `==` for comparison, not `=`. `=` is only for assignment.',
      fix: 'Change `if x = 1` to `if x == 1`.',
      severity: 'error',
      snippet: 'if status == "active":',
    });
  }

  if (/\bif\s+.+[^:=\s]\s*$/.test(value) && !/:\s*$/.test(value.split('\n').pop() || '')) {
    errors.push({
      message: 'Python blocks need a trailing colon.',
      fix: 'Add `:` to the end of `if`, `for`, `def`, and `while` lines.',
      severity: 'error',
      snippet: 'def handler(event, context):',
    });
  }

  if (/\bprint\s+['"\w]/.test(value) && !/print\(/.test(value)) {
    errors.push({
      message: 'In Python 3, `print` is a function and needs parentheses.',
      fix: 'Use `print("hello")` instead of `print "hello"`.',
      severity: 'error',
      snippet: 'print("Records processed:", count)',
    });
  }

  if (/\.append\s*\(/.test(value) && /for\s+\w+\s+in\s+/.test(value)) {
    errors.push({
      message: 'Calling `.append()` inside a loop is slow for large DataFrames or lists.',
      fix: 'Collect items in a plain list, then build one DataFrame at the end.',
      severity: 'tip',
      snippet: 'rows = [{"id": i} for i in range(1000)]\ndf = pd.DataFrame(rows)',
    });
  }

  if (/\bpd\./.test(value) && !/import\s+pandas/.test(value)) {
    errors.push({
      message: 'You are using `pd.` but `pandas` has not been imported.',
      fix: 'Add `import pandas as pd` at the top.',
      severity: 'error',
      snippet: 'import pandas as pd\nimport numpy as np',
    });
  }

  if (/\b\w+\s*=\s*\[\]/.test(value) && /\bfor\b/.test(value) && !/\.extend\s*\(/.test(value)) {
    // too noisy, skip
  }

  return errors[0] ?? null;
}

function lambdaLint(value: string): BleepxHint | null {
  const errors: BleepxHint[] = [];

  if (!/def\s+\w+\s*\(/.test(value)) {
    errors.push({
      message: 'A Python Lambda handler needs a `def` function.',
      fix: 'Define a function with `event` and `context` parameters.',
      severity: 'error',
      snippet: 'def handler(event, context):\n    return {"statusCode": 200, "body": "ok"}',
    });
  }

  if (/def\s+\w+\s*\([^)]*\)/.test(value) && !/return\b/.test(value)) {
    errors.push({
      message: 'Lambda functions should return a response. Without a return, the caller gets `null`.',
      fix: 'Return a dict or list at the end of the handler.',
      severity: 'warning',
      snippet: '    return {"statusCode": 200, "body": json.dumps({"message": "ok"})}',
    });
  }

  if (/\bjson\.dumps\b/.test(value) && !/import\s+json/.test(value)) {
    errors.push({
      message: 'You use `json.dumps` but `json` is not imported.',
      fix: 'Add `import json` at the top.',
      severity: 'error',
      snippet: 'import json\nimport boto3',
    });
  }

  return errors[0] ?? null;
}

function cloudFormationLint(value: string): BleepxHint | null {
  const lower = value.toLowerCase();
  const errors: BleepxHint[] = [];

  if (!/awstemplateformatversion/.test(lower)) {
    errors.push({
      message: 'CloudFormation templates usually declare a version. Without it, AWS assumes a default but it is risky.',
      fix: 'Add `AWSTemplateFormatVersion: "2010-09-09"` at the top.',
      severity: 'tip',
      snippet: 'AWSTemplateFormatVersion: "2010-09-09"\nDescription: My stack',
    });
  }

  if (!/resources:/.test(lower)) {
    errors.push({
      message: 'A CloudFormation template needs a `Resources` section. That is where AWS resources are defined.',
      fix: 'Add `Resources:` and at least one resource with a `Type`.',
      severity: 'error',
      snippet: 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
    });
  }

  if (/type:\s*aws::ec2::instance/.test(lower) && !/keyname:/.test(lower) && !/imagedid:/.test(lower)) {
    errors.push({
      message: 'An EC2 instance in CloudFormation needs an `ImageId` at minimum. `KeyName` is also required for SSH access.',
      fix: 'Provide an AMI ID and optionally a key pair.',
      severity: 'error',
      snippet: 'Properties:\n  ImageId: ami-12345678\n  InstanceType: t3.micro',
    });
  }

  return errors[0] ?? null;
}

function terraformLint(value: string): BleepxHint | null {
  const errors: BleepxHint[] = [];

  if (/resource\s+"\w+"\s*{/.test(value)) {
    errors.push({
      message: 'Terraform `resource` blocks need two labels: the resource type and a logical name.',
      fix: 'Use `resource "aws_s3_bucket" "my_bucket" { ... }`.',
      severity: 'error',
      snippet: 'resource "aws_s3_bucket" "data_lake" {\n  bucket = "my-unique-bucket"\n}',
    });
  }

  if (/resource\s+"/.test(value) && !/=\s*"/.test(value)) {
    errors.push({
      message: 'Terraform arguments use `=` assignment.',
      fix: 'Set properties with `key = value`.',
      severity: 'error',
      snippet: '  instance_type = "t3.micro"',
    });
  }

  if (/var\./.test(value) && !/variable\s+"/.test(value)) {
    errors.push({
      message: 'You reference `var.something` but no `variable` block is defined.',
      fix: 'Declare the variable before using it.',
      severity: 'warning',
      snippet: 'variable "instance_type" {\n  default = "t3.micro"\n}',
    });
  }

  return errors[0] ?? null;
}

function jsonLint(value: string): BleepxHint | null {
  try {
    JSON.parse(value);
    return null;
  } catch (e: any) {
    return {
      message: 'This does not look like valid JSON. ' + (e?.message || 'Check quotes, commas, and brackets.'),
      fix: 'Use double quotes for keys and strings, and remove trailing commas.',
      severity: 'error',
      snippet: '{"name": "example", "count": 1}',
    };
  }
}

function generalLint(value: string, el: Element | null): BleepxHint | null {
  if (value.trim() === '' && (el as HTMLInputElement | HTMLTextAreaElement | null)?.required) {
    return {
      message: 'This field looks empty. Bleepx can help once you start typing.',
      fix: 'Add some content, then I will watch for mistakes.',
      severity: 'tip',
    };
  }
  if (value.length > 1000 && !/[\n\r]/.test(value)) {
    return {
      message: 'That is a very long single line. Breaking it onto multiple lines will make it easier to debug.',
      fix: 'Add newlines and indentation to group related logic.',
      severity: 'tip',
    };
  }
  return null;
}

export function lintInput(value: string, el: Element | null, pathname?: string): BleepxHint | null {
  const lang = detectLanguage(value, el, pathname);
  switch (lang) {
    case 'sql':
      return sqlLint(value, el, pathname);
    case 'python':
      return pythonLint(value);
    case 'lambda':
      return lambdaLint(value);
    case 'cloudformation':
      return cloudFormationLint(value);
    case 'terraform':
      return terraformLint(value);
    case 'json':
      return jsonLint(value);
    default:
      return generalLint(value, el);
  }
}
