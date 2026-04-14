const { getDefaultConfig } = require('expo/metro-config');
const https = require('https');

const config = getDefaultConfig(__dirname);

const OPENAI_HOST = 'api.openai.com';
const previousEnhanceMiddleware = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (middleware, metroServer) => {
  const chain = previousEnhanceMiddleware
    ? previousEnhanceMiddleware(middleware, metroServer)
    : middleware;

  return (req, res, next) => {
    const url = req.url || '';
    if (!url.startsWith('/__openai/')) {
      return chain(req, res, next);
    }

    const forwardPath = url.replace(/^\/__openai/, '') || '/';

    const headers = { ...req.headers, host: OPENAI_HOST };
    delete headers.connection;
    delete headers['transfer-encoding'];

    const proxyReq = https.request(
      {
        hostname: OPENAI_HOST,
        port: 443,
        path: forwardPath,
        method: req.method || 'GET',
        headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    req.pipe(proxyReq);
  };
};

module.exports = config;
