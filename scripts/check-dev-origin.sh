#!/usr/bin/env bash
# Read-only deployment diagnostic. No credentials, query data, or model calls.
# Failure is reported without changing the frontend deployment outcome.
set +e
printf 'PANK_ORIGIN_CHECK_BEGIN\n'
curl --silent --show-error --connect-timeout 8 --max-time 15 --output /dev/null --write-out 'PANK_ORIGIN_CURL http=%{http_code} tls_verify=%{ssl_verify_result} remote_ip=%{remote_ip}\n' https://jieliulab3.dcmb.med.umich.edu/pankgraph-vnext/health/ready
printf 'PANK_ORIGIN_CURL_EXIT=%s\n' "$?"
node <<'NODE'
const https = require('https');
const dns = require('dns');
const host = 'jieliulab3.dcmb.med.umich.edu';
dns.lookup(host, { all: true }, (err, addresses) => console.log('PANK_ORIGIN_DNS', err ? err.code : addresses));
const req = https.get('https://' + host + '/pankgraph-vnext/health/ready', {timeout:15000}, res => {
 console.log('PANK_ORIGIN_NODE_HTTP', res.statusCode);
 res.resume();
});
req.on('timeout', () => req.destroy(new Error('origin request timeout')));
req.on('error', err => console.log('PANK_ORIGIN_NODE_ERROR', err.code, err.message));
NODE
printf 'PANK_ORIGIN_CHECK_END\n'
exit 0
