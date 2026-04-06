# 💡 [MariaDB](https://mariadb.org) and/or [MySQL](https://www.mysql.com)
There are a few additional [execution driverOptions](https://example.com/global.html#MDBExecOptions) that are MySQL/MariaDB specific.

## Prepared Statements {#ps}
In order to facilitate a [prepared statement](https://en.wikipedia.org/wiki/Prepared_statement), SQL calls are made using `PREPARE`, `EXECUTE` and `DEALLOCATE PREPARE` statements and are executed within a _temporary_ [stored procedure](https://en.wikipedia.org/wiki/Stored_procedure) that is generated on the _first_ execution of a SQL script that has `execOpts.prepareStatement = true`. The use of _temporary_ stored procedures helps to ensure that the minumum number of round trip executions are made to the server and the _user defined variables_ used for prepared statements are managed appropriately. Since the stored procedure is used, a valid/accessible database name must be defined on `execOpts.driverOptions.preparedStatementDatabase` that will be used to explicitly associate the routine with a given database. It's important to note that the generated stored procedure only exists until the resulting execution's `unprepare` is called (or when using a transaction, `commit` or `rollback` is called). Any calls to the _same_ SQL script before `prepare`/`commit`/`rollback` that have `execOpts.prepareStatement = true` will use the _same connection and prepared statement_. Once `prepare`/`commit`/`rollback` is called the connection used for the prepared statement will be released back to the pool. See the [Update Rows](#update) for example usage- including an example for wrapping a prepared statement within a transaction.

## Examples {#examples}

The examples below use the following setup:

__[Private Options Configuration:](https://example.com/guide/manager#~PrivateOptions)__ (appended to the subsequent connection options)
<<< ../../test/fixtures/priv.json

__[Connection Options Configuration:](https://example.com/global.html#MDBConnectionOptions)__
<<< ../../test/fixtures/mdb/conf.json

Test code that illustrates how to use MariaDB/MySQL with various examples
<<< ../../test/fixtures/run-example.js

### Create Database {#create_db}

> db/mdb/setup/create.database.sql
<<< ../../test/db/mdb/setup/create.database.sql

<<< ../../test/lib/mdb/setup/create.database.js

### Create Table(s) {#create_tables}

> db/mdb/setup/create.table1.sql
<<< ../../test/db/mdb/setup/create.table1.sql

> db/mdb/setup/create.table2.sql
<<< ../../test/db/mdb/setup/create.table2.sql

### Create Rows {#create_rows}

> db/mdb/create.table.rows.sql
<<< ../../test/db/mdb/create.table.rows.sql

<<< ../../test/lib/mdb/create.table.rows.js

### Read Rows {#read}

> db/mdb/read.table.rows.sql
<<< ../../test/db/mdb/read.table.rows.sql

<<< ../../test/lib/mdb/read.table.rows.js

### Update Rows {#update}

> db/mdb/update.table.rows.sql <br/>(demo multiple table updated in a single SQL script)
<<< ../../test/db/mdb/update.table.rows.sql

> db/mdb/update.table1.rows.sql <br/>(demo prepared statements)
<<< ../../test/db/mdb/update.table1.rows.sql

> db/mdb/update.table2.rows.sql <br/>(demo transactions)
<<< ../../test/db/mdb/update.table2.rows.sql

<<< ../../test/lib/mdb/update.table.rows.js

### Delete Rows {#delete}

> db/mdb/delete.table.rows.sql
<<< ../../test/db/mdb/delete.table.rows.sql

<<< ../../test/lib/mdb/delete.table.rows.js

### Create Rows (streaming using the same SQL as the [prior create rows example](#create_rows)) {#create_stream}

<<< ../../test/lib/mdb/create.stream.table.rows.js

### Read Rows (streaming using the same SQL as the [prior read rows example](#read)) {#read_stream}

<<< ../../test/lib/mdb/read.stream.table.rows.js

### Update Rows (streaming using the same SQL as the [prior update rows example](#update)) {#update_stream}

<<< ../../test/lib/mdb/update.stream.table.rows.js

### Delete Rows (streaming using the same SQL as the [prior delete rows example](#delete)) {#delete_stream}

<<< ../../test/lib/mdb/delete.stream.table.rows.js

### Delete Database {#delete_db}

> db/mdb/setup/delete.database.sql
<<< ../../test/db/mdb/setup/delete.database.sql

<<< ../../test/lib/mdb/setup/delete.database.js