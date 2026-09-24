process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.BABEL_ENV = process.env.BABEL_ENV || 'development';

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

const config = require('../webpack.hirn');
const compiler = webpack(config);
const server = new WebpackDevServer(config.devServer, compiler);

async function start() {
  await server.start();
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function stop() {
  await server.stop();
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
