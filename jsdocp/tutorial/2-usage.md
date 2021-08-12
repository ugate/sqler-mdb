### 💡 [MariaDB](https://mariadb.org) and/or [MySQL](https://www.mysql.com) Examples:
There are a few additional [execution driverOptions](global.html#MDBExecOptions) that are MySQL/MariaDB specific.

#### Prepared Statements:<ins id="ps"></ins>
In order to facilitate a [prepared statement](https://en.wikipedia.org/wiki/Prepared_statement), SQL calls are made using `PREPARE`, `EXECUTE` and `DEALLOCATE PREPARE` statements and are executed within a _temporary_ [stored procedure](https://en.wikipedia.org/wiki/Stored_procedure) that is generated on the _first_ execution of a SQL script that has `execOpts.prepareStatement = true`. The use of _temporary_ stored procedures helps to ensure that the minumum number of round trip executions are made to the server and the _user defined variables_ used for prepared statements are managed appropriately. Since the stored procedure is used, a valid/accessible database name must be defined on `execOpts.driverOptions.preparedStatementDatabase` that will be used to explicitly associate the routine with a given database. It's important to note that the generated stored procedure only exists until the resulting execution's `unprepare` is called (or when using a transaction, `commit` or `rollback` is called). Any calls to the _same_ SQL script before `prepare`/`commit`/`rollback` that have `execOpts.prepareStatement = true` will use the _same connection and prepared statement_. Once `prepare`/`commit`/`rollback` is called the connection used for the prepared statement will be released back to the pool. See the [Update Rows](#update) for example usage- including an example for wrapping a prepared statement within a transaction.

#### Examples:<ins id="examples"></ins>

The examples below use the following setup:

__[Private Options Configuration:](https://ugate.github.io/sqler/Manager.html#~PrivateOptions)__ (appended to the subsequent connection options)
```jsdocp ./test/fixtures/priv.json
```

__[Connection Options Configuration:](global.html#MDBConnectionOptions)__
```jsdocp ./test/fixtures/mdb/conf.json
```

Test code that illustrates how to use MariaDB/MySQL with various examples
```jsdocp ./test/fixtures/run-example.js
```

__Create Database:__

```jsdocp ./test/db/mdb/setup/create.database.sql
-- db/mdb/setup/create.database.sql
```

```jsdocp ./test/lib/mdb/setup/create.database.js
```

__Create Table(s):__

```jsdocp ./test/db/mdb/setup/create.table1.sql
-- db/mdb/setup/create.table1.sql
```
```jsdocp ./test/db/mdb/setup/create.table2.sql
-- db/mdb/setup/create.table2.sql
```

```jsdocp ./test/lib/mdb/setup/create.table1.js
```
```jsdocp ./test/lib/mdb/setup/create.table2.js
```

__Create Rows:__<ins id="create"></ins>

```jsdocp ./test/db/mdb/create.table.rows.sql
-- db/mdb/create.table.rows.sql
```

```jsdocp ./test/lib/mdb/create.table.rows.js
```

__Read Rows:__<ins id="read"></ins>

```jsdocp ./test/db/mdb/read.table.rows.sql
-- db/mdb/read.table.rows.sql
```

```jsdocp ./test/lib/mdb/read.table.rows.js
```

__Update Rows:__<ins id="update"></ins>

```jsdocp ./test/db/mdb/update.table.rows.sql
-- db/mdb/update.table.rows.sql
-- (demo multiple table updated in a single SQL script)
```
```jsdocp ./test/db/mdb/update.table1.rows.sql
-- db/mdb/update.table1.rows.sql
-- (demo prepared statements)
```
```jsdocp ./test/db/mdb/update.table2.rows.sql
-- db/mdb/update.table2.rows.sql
-- (demo transactions)
```

```jsdocp ./test/lib/mdb/update.table.rows.js
```

__Delete Rows:__<ins id="delete"></ins>

```jsdocp ./test/db/mdb/delete.table.rows.sql
-- db/mdb/delete.table.rows.sql
```

```jsdocp ./test/lib/mdb/delete.table.rows.js
```

__Create Rows (streaming using the same SQL as the [prior create rows example](#create)):__<ins id="create_stream"></ins>

```jsdocp ./test/lib/mdb/create.table.rows.js
```

__Read Rows (streaming using the same SQL as the [prior read rows example](#read)):__<ins id="read_stream"></ins>

```jsdocp ./test/lib/mdb/read.stream.table.rows.js
```

__Update Rows (streaming using the same SQL as the [prior update rows example](#update)):__<ins id="update_stream"></ins>

```jsdocp ./test/lib/mdb/update.stream.table.rows.js
```

__Delete Rows (streaming using the same SQL as the [prior delete rows example](#delete)):__<ins id="delete_stream"></ins>

```jsdocp ./test/lib/mdb/delete.stream.table.rows.js
```

__Delete Database:__

```jsdocp ./test/db/mdb/setup/delete.database.sql
-- db/mdb/setup/delete.database.sql
```

```jsdocp ./test/lib/mdb/setup/delete.database.js
```