---
title: __index__
---

# __index__

## Classes

<dl>
<dt><a href="#mdbdialect">MDBDialect</a></dt>
<dd><p>MariaDB + MySQL <a href="Dialect">Dialect</a> implementation for <a href="https://ugate.github.io/sqler/"><code>sqler</code></a></p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#mdbconnectiondriveroptions-object">MDBConnectionDriverOptions</a> : <code>Object</code></dt>
<dd><p>The <code>mariadb</code> (w/MySQL support) module specific options. <strong>Both <code>connection</code> and <code>pool</code> will be merged when generating the connection pool.</strong></p>
</dd>
<dt><a href="#mdbconnectionoptions-typedefs-sqlerconnectionoptions">MDBConnectionOptions</a> : <code>typedefs.SQLERConnectionOptions</code></dt>
<dd><p>MariaDB + MySQL specific extension of the <a href="SQLERConnectionOptions">SQLERConnectionOptions</a> from the <a href="https://ugate.github.io/sqler/"><code>sqler</code></a> module.</p>
</dd>
<dt><a href="#mdbexecdriveroptions-object">MDBExecDriverOptions</a> : <code>Object</code></dt>
<dd><p>MariaDB + MySQL specific extension of the <a href="SQLERExecOptions">SQLERExecOptions</a> from the <a href="https://ugate.github.io/sqler/"><code>sqler</code></a> module. When a property of <code>binds</code>
contains an object it will be <em>interpolated</em> for property values on the <code>mariadb</code> module.
For example, <code>binds.name = &#39;${SOME_MARIADB_CONSTANT}&#39;</code> will be interpolated as
<code>binds.name = mariadb.SOME_MARIADB_CONSTANT</code>.</p>
</dd>
<dt><a href="#mdbexecoptions-typedefs-sqlerexecoptions">MDBExecOptions</a> : <code>typedefs.SQLERExecOptions</code></dt>
<dd><p>MariaDB + MySQL specific extension of the <a href="SQLERExecOptions">SQLERExecOptions</a> from the <a href="https://ugate.github.io/sqler/"><code>sqler</code></a> module. When a property of <code>binds</code>
contains an object it will be <em>interpolated</em> for property values on the <code>mariadb</code> module.
For example, <code>binds.name = &#39;${SOME_MARIADB_CONSTANT}&#39;</code> will be interpolated as
<code>binds.name = mariadb.SOME_MARIADB_CONSTANT</code>.</p>
</dd>
</dl>

## MDBDialect
MariaDB + MySQL [Dialect](https://ugate.github.io/sqler/api/lib/dialect#dialect) implementation for [`sqler`](https://ugate.github.io/sqler/)

**Kind**: global class  

* [MDBDialect](#mdbdialect)
    * [new MDBDialect(priv, connConf, track, [errorLogger], [logger], [debug])](#new-mdbdialectpriv-connconf-track-errorlogger-logger-debug)
    * [.state](#MDBDialect+state) ⇒ <code>typedefs.SQLERState</code>
    * [.driver](#MDBDialect+driver) ⇒ <code>DBDriver</code>
    * [.init(opts)](#MDBDialect+init) ⇒ <code>Object</code>
    * [.beginTransaction(txId, opts)](#MDBDialect+beginTransaction) ⇒ <code>typedefs.SQLERTransaction</code>
    * [.exec(sql, opts, frags, meta, [errorOpts])](#MDBDialect+exec) ⇒ <code>typedefs.SQLERExecResults</code>
    * [.close()](#MDBDialect+close) ⇒ <code>Integer</code>

### new MDBDialect(priv, connConf, track, [errorLogger], [logger], [debug])
Constructor


| Param | Type | Description |
| --- | --- | --- |
| priv | <code>typedefs.SQLERPrivateOptions</code> | The private configuration options |
| connConf | [<code>MDBConnectionOptions</code>](#mdbconnectionoptions-typedefs-sqlerconnectionoptions) | The individual SQL __connection__ configuration for the given dialect that was passed into the originating [Manager](https://ugate.github.io/sqler/api/manager#manager) |
| track | <code>typedefs.SQLERTrack</code> | Container for sharing data between [Dialect](https://ugate.github.io/sqler/api/lib/dialect#dialect) instances. |
| [errorLogger] | <code>function</code> | A function that takes one or more arguments and logs the results as an error (similar to `console.error`) |
| [logger] | <code>function</code> | A function that takes one or more arguments and logs the results (similar to `console.log`) |
| [debug] | <code>Boolean</code> | A flag that indicates the dialect should be run in debug mode (if supported) |

### mdbDialect.state ⇒ <code>typedefs.SQLERState</code>
**Kind**: instance property of [<code>MDBDialect</code>](#mdbdialect)  
**Returns**: <code>typedefs.SQLERState</code> - The state  
### mdbDialect.driver ⇒ <code>DBDriver</code>
**Kind**: instance property of [<code>MDBDialect</code>](#mdbdialect)  
**Returns**: <code>DBDriver</code> - The MariaDB/MySQL driver module  
**Access**: protected  
### mdbDialect.init(opts) ⇒ <code>Object</code>
Initializes [MDBDialect](#mdbdialect) by creating the connection pool

**Kind**: instance method of [<code>MDBDialect</code>](#mdbdialect)  
**Returns**: <code>Object</code> - The MariaDB/MySQL connection pool  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>typedefs.SQLERInitOptions</code> | The options described by the `sqler` module |

### mdbDialect.beginTransaction(txId, opts) ⇒ <code>typedefs.SQLERTransaction</code>
Begins a transaction by opening a connection from the pool

**Kind**: instance method of [<code>MDBDialect</code>](#mdbdialect)  
**Returns**: <code>typedefs.SQLERTransaction</code> - The transaction that was started  

| Param | Type | Description |
| --- | --- | --- |
| txId | <code>String</code> | The internally generated transaction identifier |
| opts | <code>typedefs.SQLERTransactionOptions</code> | The transaction options passed in via the public API |

### mdbDialect.exec(sql, opts, frags, meta, [errorOpts]) ⇒ <code>typedefs.SQLERExecResults</code>
Executes a SQL statement

**Kind**: instance method of [<code>MDBDialect</code>](#mdbdialect)  
**Returns**: <code>typedefs.SQLERExecResults</code> - The execution results  

| Param | Type | Description |
| --- | --- | --- |
| sql | <code>String</code> | the SQL to execute |
| opts | [<code>MDBExecOptions</code>](#mdbexecoptions-typedefs-sqlerexecoptions) | The execution options |
| frags | <code>Array.&lt;String&gt;</code> | the frament keys within the SQL that will be retained |
| meta | <code>typedefs.SQLERExecMeta</code> | The SQL execution metadata |
| [errorOpts] | <code>typedefs.SQLERExecErrorOptions</code> \| <code>Boolean</code> | The error options to use |

### mdbDialect.close() ⇒ <code>Integer</code>
Closes the MariaDB/MySQL connection pool

**Kind**: instance method of [<code>MDBDialect</code>](#mdbdialect)  
**Returns**: <code>Integer</code> - The number of connections closed  
## MDBConnectionDriverOptions : <code>Object</code>
The `mariadb` (w/MySQL support) module specific options. __Both `connection` and `pool` will be merged when generating the connection pool.__

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [connection] | <code>Object</code> | An object that will contain properties/values that will be used to construct the MariaDB + MySQL connection (e.g. `{ database: 'mydb', timezone: '-0700' }`). See the `mariadb` module documentation for a full listing of available connection options. When a property value is a string surrounded by `${}`, it will be assumed to be a property that resides on either the [SQLERPrivateOptions](https://ugate.github.io/sqler/api/typedefs#typedefs-sqlerprivateoptions-object) passed into the [Manager](https://ugate.github.io/sqler/api/manager#manager) constructor or a property on the [MDBConnectionOptions](#mdbconnectionoptions-typedefs-sqlerconnectionoptions) itself (in that order of precedence). For example,  `connOpts.host = '127.0.0.1'` and `driverOptions.connection.host = '${host}'` would be interpolated into `driverOptions.connection.host = '127.0.0.1'`. In contrast to `privOpts.username = 'someUsername' and `driverOptions.connection.user = '${username}'` would be interpolated into `driverOptions.connection.user = 'someUsername'`. Interpoaltions can also contain more than one reference. For example, `driverOptions.connection.someProp = '${protocol}:${host}'` for  `privOpts = { protocol: 'TCP', host: 'example.com' }` would become `someProp='TCP:example.com'`. |
| [pool] | <code>Object</code> | The pool `conf` options that will be passed into `mariadb.createPool(conf)`. See the `mariadb` module for a full listing of avialable connection pooling options. __Using any of the generic `pool.someOption` will override the `conf` options set on `driverOptions.pool`__ (e.g. `pool.max = 10` would override  `driverOptions.pool.connectionLimit = 20`). When a value is a string surrounded by `${}`, it will be assumed to be a _constant_ property that resides on the `mariadb` module and will be interpolated accordingly. For example `driverOptions.pool.someProp = '${SOME_MARIADB_CONSTANT}'` will be interpolated as `pool.someProp = mariadb.SOME_MARIADB_CONSTANT`. |

## MDBConnectionOptions : <code>typedefs.SQLERConnectionOptions</code>
MariaDB + MySQL specific extension of the [SQLERConnectionOptions](https://ugate.github.io/sqler/api/typedefs#typedefs-sqlerconnectionoptions-object) from the [`sqler`](https://ugate.github.io/sqler/) module.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| driverOptions | [<code>MDBConnectionDriverOptions</code>](#mdbconnectiondriveroptions-object) | The `mariadb` (w/MySQL support) module specific options. __Both `connection` and `pool` will be merged when generating the connection pool.__ |

## MDBExecDriverOptions : <code>Object</code>
MariaDB + MySQL specific extension of the [SQLERExecOptions](https://ugate.github.io/sqler/api/typedefs#typedefs-sqlerexecoptions-object) from the [`sqler`](https://ugate.github.io/sqler/) module. When a property of `binds`
contains an object it will be _interpolated_ for property values on the `mariadb` module.
For example, `binds.name = '${SOME_MARIADB_CONSTANT}'` will be interpolated as
`binds.name = mariadb.SOME_MARIADB_CONSTANT`.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [preparedStatementDatabase] | <code>String</code> |  | The database name to use when generating prepared statements for the given execution. Since prepared statements are scoped only for a given connection and a temporary stored procedure is used to execute prepared statements, __`preparedStatementDatabase` is required when `execOpts.prepareStatement = true`.__ |
| [exec] | <code>Object</code> |  | The options passed into execution/query functions provided by the `mariadb` module performed during [Manager.exec](https://ugate.github.io/sqler/api/manager). When a value is a string surrounded by `${}`, it will be assumed to be a _constant_ property that resides on the `mariadb` module and will be interpolated accordingly. For example `driverOptions.exec.someDriverProp = '${SOME_MARIADB_CONSTANT}'` will be interpolated as `driverOptions.exec.someDriverProp = mariadb.SOME_MARIADB_CONSTANT`. |
| [exec.namedPlaceholders] | <code>Boolean</code> | <code>true</code> | Truthy to use named parameters in MariaDB/MySQL or falsy to convert the named parameters into a positional array of bind values. |

## MDBExecOptions : <code>typedefs.SQLERExecOptions</code>
MariaDB + MySQL specific extension of the [SQLERExecOptions](https://ugate.github.io/sqler/api/typedefs#typedefs-sqlerexecoptions-object) from the [`sqler`](https://ugate.github.io/sqler/) module. When a property of `binds`
contains an object it will be _interpolated_ for property values on the `mariadb` module.
For example, `binds.name = '${SOME_MARIADB_CONSTANT}'` will be interpolated as
`binds.name = mariadb.SOME_MARIADB_CONSTANT`.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [driverOptions] | [<code>MDBExecDriverOptions</code>](#mdbexecdriveroptions-object) | The `mariadb` module specific options. |

