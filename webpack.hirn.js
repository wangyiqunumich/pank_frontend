const path = require('path');

const dotenv = require('dotenv');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env.development') });

const appEnv = Object.fromEntries(
  Object.entries(process.env)
    .filter(([key]) => key.startsWith('REACT_APP_'))
);

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'src/index.hirn.js'),
  devtool: 'eval-cheap-module-source-map',
  output: {
    path: path.resolve(__dirname, 'build-hirn'),
    filename: 'hirn-demo.js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [require.resolve('babel-preset-react-app')],
            cacheDirectory: true,
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.svg$/,
        issuer: /\.[jt]sx?$/,
        use: [
          path.resolve(__dirname, 'scripts/svgr-named-loader.js'),
          '@svgr/webpack',
        ],
      },
      {
        test: /\.(png|jpe?g|gif|webp)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'public/hirn-index.html') }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({ NODE_ENV: 'development', ...appEnv }),
    }),
  ],
  devServer: {
    host: '127.0.0.1',
    port: Number(process.env.PORT || 3001),
    historyApiFallback: true,
    hot: true,
    open: false,
    client: { overlay: true },
  },
};
