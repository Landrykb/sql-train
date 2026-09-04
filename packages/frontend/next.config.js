const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/** @type {import('next').NextConfig} */
module.exports = {
  turbopack: {},
  staticPageGenerationTimeout: 180,
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    config.resolve.alias['@cases'] = path.join(__dirname, 'cases');

    // Force single copies of CodeMirror packages to prevent
    // "multiple instances of @codemirror/state" runtime crash
    const cmPkgs = ['state', 'view', 'language', 'commands', 'autocomplete', 'lint', 'search'];
    for (const pkg of cmPkgs) {
      try {
        const resolved = require.resolve(`@codemirror/${pkg}`);
        // resolved is e.g. .../node_modules/@codemirror/state/dist/index.cjs
        // We need the package dir: .../node_modules/@codemirror/state
        const idx = resolved.lastIndexOf(`@codemirror/${pkg}`);
        if (idx !== -1) {
          config.resolve.alias[`@codemirror/${pkg}`] = resolved.slice(0, idx + `@codemirror/${pkg}`.length);
        }
      } catch { /* skip */ }
    }
    config.module.rules.push({
      test: /\.ya?ml$/,
      type: 'asset/source',
    });
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name][ext][query]',
      },
    });

    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.join(
              path.dirname(require.resolve('sql.js')),
              'sql-wasm.wasm'
            ),
            to: path.join(__dirname, 'public', 'static', 'wasm', 'sql-wasm.wasm'),
            noErrorOnMissing: false,
          },
          {
            from: path.join(__dirname, 'public', 'datasets'),
            to: path.join(__dirname, 'public', 'datasets'),
            noErrorOnMissing: true,
          },
        ],
      })
    );

    return config;
  },
};