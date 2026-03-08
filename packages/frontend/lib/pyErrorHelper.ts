/**
 * Python Error Helper
 * Parses raw Python error messages and returns beginner-friendly explanations
 * with specific fix suggestions — mirrors sqlErrorHelper.ts for BleepxQuery parity.
 */

export interface PyErrorHelp {
  title: string;
  explanation: string;
  suggestions: string[];
  guideSection?: string;
}

export function getPyErrorHelp(rawError: string, userCode: string): PyErrorHelp {
  const error = rawError.toLowerCase();
  const code = userCode.trim();

  // --- FileNotFoundError ---
  const fileMatch = rawError.match(/FileNotFoundError.*?['"]([^'"]+)['"]/i) || rawError.match(/No such file or directory:\s*['"]([^'"]+)['"]/i);
  if (fileMatch || error.includes('filenotfounderror') || error.includes('no such file or directory')) {
    const fileName = fileMatch?.[1] || 'your file';
    return {
      title: `File "${fileName}" not found`,
      explanation: `The file "${fileName}" doesn't exist in the browser Python environment. Pyodide runs in-browser and has no access to your local filesystem.`,
      suggestions: [
        'Use a public URL to load data: pd.read_csv("https://raw.githubusercontent.com/...")',
        'Check the dataset link at the top of this step for the correct URL',
        'For practice, create sample data inline: pd.DataFrame({"col": [1, 2, 3]})',
        'Click "📊 Download Dataset" above to see the data source',
      ],
      guideSection: 'loading-data',
    };
  }

  // --- ModuleNotFoundError / ImportError ---
  const moduleMatch = rawError.match(/(?:ModuleNotFoundError|ImportError).*?['"]([^'"]+)['"]/i) || rawError.match(/No module named\s+'([^']+)'/i);
  if (moduleMatch || error.includes('modulenotfounderror') || error.includes('no module named')) {
    const modName = moduleMatch?.[1] || 'the module';
    const preloaded = ['numpy', 'pandas', 'scipy', 'sklearn', 'scikit-learn', 'matplotlib'];
    const isPreloaded = preloaded.some(m => modName.includes(m));
    const isSklearn = modName.includes('sklearn') || modName.includes('scikit-learn');
    return {
      title: `Module "${modName}" not found`,
      explanation: isSklearn
        ? `"${modName}" is pre-installed but may still be loading. Click "▶ Run" again — it should work on the second attempt.`
        : isPreloaded
        ? `"${modName}" should be available but may need to be loaded. Try running your import again.`
        : `The module "${modName}" is not available in the browser Python environment. Only a subset of Python packages are supported.`,
      suggestions: isSklearn ? [
        'Run your code again — sklearn loads asynchronously and should be ready now',
        'The import name is "sklearn", not "scikit-learn": from sklearn.model_selection import train_test_split',
        'Pre-installed packages: numpy, pandas, scikit-learn, scipy, matplotlib',
      ] : [
        isPreloaded ? `Try: import ${modName.split('.')[0]}` : `"${modName}" may not be available in Pyodide (browser Python)`,
        'Pre-installed packages: numpy, pandas, scikit-learn, scipy, matplotlib',
        'For other packages, try: import micropip; await micropip.install("package_name")',
        'Some packages with C extensions are not supported in browser Python',
      ],
      guideSection: 'imports',
    };
  }

  // --- NameError ---
  const nameMatch = rawError.match(/NameError:\s*name\s+'([^']+)'\s+is not defined/i);
  if (nameMatch || error.includes('nameerror')) {
    const varName = nameMatch?.[1] || 'variable';
    return {
      title: `"${varName}" is not defined`,
      explanation: `Python can't find a variable or function called "${varName}". This usually means it hasn't been created yet or there's a typo.`,
      suggestions: [
        `Check the spelling of "${varName}" — Python is case-sensitive`,
        'Make sure you ran the cell that defines this variable first',
        `If it's a library function, did you import it? e.g., import pandas as pd`,
        'Run your code cells in order from top to bottom',
      ],
    };
  }

  // --- TypeError ---
  const typeMatch = rawError.match(/TypeError:\s*(.*)/i);
  if (typeMatch || error.includes('typeerror')) {
    const detail = typeMatch?.[1] || '';
    if (detail.includes('not callable')) {
      return {
        title: 'Object is not callable',
        explanation: 'You tried to call something as a function (with parentheses) that isn\'t a function. This often happens when a variable name shadows a built-in function.',
        suggestions: [
          'Check if you accidentally used a function name as a variable: e.g., list = [1,2,3] then list()',
          'Use different variable names that don\'t shadow built-ins',
          'Restart the environment if a built-in was overwritten',
        ],
      };
    }
    if (detail.includes('unsupported operand')) {
      return {
        title: 'Incompatible types in operation',
        explanation: 'You tried to use an operator (+, -, *, etc.) with types that don\'t support it.',
        suggestions: [
          'Check that both operands are the same type (e.g., both numbers or both strings)',
          'Convert types explicitly: int(), float(), str()',
          'For pandas: use .astype() to convert column types',
        ],
      };
    }
    return {
      title: 'Type error',
      explanation: `A type mismatch occurred: ${detail || 'an operation received the wrong type of argument.'}`,
      suggestions: [
        'Check the types of your variables with type(variable)',
        'Convert types explicitly: int(), float(), str(), list()',
        'For pandas DataFrames, check dtypes with df.dtypes',
      ],
    };
  }

  // --- KeyError ---
  const keyMatch = rawError.match(/KeyError:\s*['"]*([^'"]*)['"]*$/im);
  if (keyMatch || error.includes('keyerror')) {
    const key = keyMatch?.[1] || 'key';
    return {
      title: `Column/key "${key}" not found`,
      explanation: `The key "${key}" doesn't exist in the dictionary or DataFrame. This is usually a column name typo.`,
      suggestions: [
        `Check the exact column name — use df.columns to see all available columns`,
        'Column names are case-sensitive: "Name" ≠ "name"',
        'Watch for extra spaces: " Name" ≠ "Name"',
        'Use df.columns.tolist() to see all column names as a list',
      ],
      guideSection: 'dataframes',
    };
  }

  // --- ValueError ---
  if (error.includes('valueerror')) {
    if (error.includes('could not convert') || error.includes('invalid literal')) {
      return {
        title: 'Value conversion error',
        explanation: 'Python tried to convert a value to a different type but the value isn\'t compatible.',
        suggestions: [
          'Check for non-numeric values in numeric columns: df["col"].unique()',
          'Clean data first: pd.to_numeric(df["col"], errors="coerce")',
          'Remove NaN/null values: df.dropna(subset=["col"])',
        ],
      };
    }
    return {
      title: 'Value error',
      explanation: 'A function received an argument with the right type but wrong value.',
      suggestions: [
        'Check function documentation for valid argument values',
        'Verify your data doesn\'t contain unexpected values',
        'Use df.describe() and df.info() to inspect your data',
      ],
    };
  }

  // --- IndexError ---
  if (error.includes('indexerror')) {
    return {
      title: 'Index out of range',
      explanation: 'You tried to access an element at a position that doesn\'t exist. The list/array is shorter than you expected.',
      suggestions: [
        'Check the length with len(your_list)',
        'Remember Python uses 0-based indexing: first element is [0]',
        'Use -1 for the last element: my_list[-1]',
        'For DataFrames, use .iloc[row] for position-based access',
      ],
    };
  }

  // --- AttributeError ---
  const attrMatch = rawError.match(/AttributeError:.*?has no attribute\s+'([^']+)'/i);
  if (attrMatch || error.includes('attributeerror')) {
    const attr = attrMatch?.[1] || 'attribute';
    return {
      title: `Attribute "${attr}" not found`,
      explanation: `The object doesn't have a method or property called "${attr}". This often means you're calling the wrong method on the wrong type.`,
      suggestions: [
        `Check the type of your object: type(your_variable)`,
        `If it's a DataFrame, check available methods: dir(df)`,
        `Common mix-up: .value_counts() (with underscore), not .valueCounts()`,
        'Make sure your variable is the type you expect (DataFrame, Series, etc.)',
      ],
    };
  }

  // --- SyntaxError ---
  if (error.includes('syntaxerror')) {
    if (error.includes('invalid syntax')) {
      return {
        title: 'Invalid Python syntax',
        explanation: 'Your code has a syntax error — Python can\'t understand the structure. Something is missing or misplaced.',
        suggestions: [
          'Check for missing colons after if/for/def/class statements',
          'Make sure all parentheses (), brackets [], and braces {} are matched',
          'Check for missing commas in function arguments or lists',
          'Verify proper indentation (Python uses 4 spaces)',
        ],
      };
    }
    if (error.includes('unexpected indent') || error.includes('indentation')) {
      return {
        title: 'Indentation error',
        explanation: 'Python uses indentation to define code blocks. Your indentation is inconsistent.',
        suggestions: [
          'Use consistent indentation — 4 spaces per level is standard',
          'Don\'t mix tabs and spaces',
          'Check that code inside if/for/def blocks is indented',
          'Make sure all lines at the same level have the same indentation',
        ],
      };
    }
    return {
      title: 'Syntax error',
      explanation: 'Your code has a structural problem that Python can\'t parse.',
      suggestions: [
        'Check for missing/extra parentheses, brackets, or quotes',
        'Make sure strings are properly closed with matching quotes',
        'Check for missing colons (:) after if, for, while, def, class',
        'Verify proper indentation throughout your code',
      ],
    };
  }

  // --- ZeroDivisionError ---
  if (error.includes('zerodivisionerror') || error.includes('division by zero')) {
    return {
      title: 'Division by zero',
      explanation: 'Your code tried to divide a number by zero.',
      suggestions: [
        'Add a check: if denominator != 0: result = num / denominator',
        'For pandas: use .replace(0, np.nan) before dividing',
        'Use numpy: np.divide(a, b, where=b!=0)',
      ],
    };
  }

  // --- Memory / recursion ---
  if (error.includes('recursionerror') || error.includes('maximum recursion')) {
    return {
      title: 'Maximum recursion depth exceeded',
      explanation: 'Your code called itself too many times (infinite recursion) or the data is too deeply nested.',
      suggestions: [
        'Check for infinite loops in recursive functions',
        'Add a proper base case to stop recursion',
        'Consider using iteration instead of recursion',
      ],
    };
  }

  // --- Generic fallback ---
  return {
    title: 'Python error',
    explanation: 'Something went wrong with your code. Here are some common things to check:',
    suggestions: [
      'Read the error message carefully — it usually points to the exact line',
      'Check for typos in variable and function names',
      'Make sure all imports are at the top and executed first',
      'Use print() statements to debug intermediate values',
      'Check the "📖 DS Guide" link above for reference material',
    ],
  };
}
