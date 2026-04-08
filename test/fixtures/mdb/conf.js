'use strict';

const fs = require('node:fs');
const path = require('node:path');

module.exports = function buildConf() {
  const sslBase = process.env.SQLER_TEST_SSL_DIR || path.join(__dirname, '..', 'ssl');

  const useTLS = !process.env.SQLER_TEST_NO_TLS;

  const connection = {
    multipleStatements: true
  };

  if (useTLS) {
    connection.ssl = {
      ca: fs.readFileSync(path.join(sslBase, 'ca.pem'), 'utf8'),
      cert: fs.readFileSync(path.join(sslBase, 'client-cert.pem'), 'utf8'),
      key: fs.readFileSync(path.join(sslBase, 'client-key.pem'), 'utf8'),
      // rejectUnauthorized should normally be set to true, but is set to false for testing/illustration purposes
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    };
  } else {
    // temporary fallback if you need non-TLS local testing while migrating
    connection.allowPublicKeyRetrieval = true;
  }

  return {
    db: {
      dialects: {
        mdb: 'sqler-mdb'
      },
      connections: [
        {
          id: 'mdb',
          name: 'mdb',
          dir: 'db/mdb',
          service: 'MySQL',
          dialect: 'mdb',
          pool: {},
          driverOptions: {
            connection
          }
        }
      ]
    }
  };
};