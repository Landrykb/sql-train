const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/** @type {import('next').NextConfig} */
module.exports = {
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    config.resolve.alias['@cases'] = path.join(__dirname, 'cases');
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