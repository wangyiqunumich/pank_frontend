const { createProxyMiddleware } = require('http-proxy-middleware');

const target = process.env.PANKGRAPH_DEV_PROXY_TARGET || 'https://dev.pankgraph.org';

module.exports = function setupProxy(app) {
  app.use(createProxyMiddleware(
    ['/pankgraph-vnext/api', '/pankgraph-vnext/access'],
    {
      target,
      changeOrigin: true,
      secure: true,
      xfwd: true,
      logLevel: 'warn',
    },
  ));
};
