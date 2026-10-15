// JSDOM does not expose the browser Web Crypto API used by durable request IDs.
Object.defineProperty(window, 'crypto', { configurable: true, value: require('crypto').webcrypto });
