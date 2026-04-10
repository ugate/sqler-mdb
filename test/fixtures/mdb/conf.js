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
      // using mutual TLS (server/client, CA must be signed by same CA)
      ca: fs.readFileSync(path.join(sslBase, 'ca.pem'), 'utf8'),
      cert: fs.readFileSync(path.join(sslBase, 'client-cert.pem'), 'utf8'),
      key: fs.readFileSync(path.join(sslBase, 'client-key.pem'), 'utf8'),
      // rejectUnauthorized should normally be set to true,
      // but is set to false for testing/illustration purposes using a self-signed certificate 
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
            connection,
            // prepared statements in MySQL/MariaDB use a temporary
            // stored procedure to execute prepared statements...
            // in order to do so, the stored procedure needs to have
            // a database scope defined where it will reside
            // (can also be overridden in the prepared function exec)
            preparedStatementDatabase: 'sqlermysql'
          }
        }
      ]
    }
  };
};