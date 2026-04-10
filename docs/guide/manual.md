# Examples {#examples}

The examples below use the following setup:

__[Private Options Configuration:](https://ugate.github.io/sqler/api/typedefs#typedefs-sqlerprivateoptions-object)__
(appended to the subsequent connection options)

<<< @/_test/fixtures/priv.json

__[Connection Options Configuration:](https://ugate.github.io/sqler/api/typedefs#typedefs-sqlerconnectionoptions-object)__

<<< @/_test/fixtures/mdb/conf.js

Test code that illustrates how to use MariaDB/MySQL with various examples

<<< @/_test/fixtures/run-example.js

## Create Database {#create_db}

> db/mdb/setup/create.database.sql

<<< @/_test/db/mdb/setup/create.database.sql

<<< @/_test/lib/mdb/setup/create.database.js

## Create Table(s) {#create_tables}

> db/mdb/setup/create.table1.sql

<<< @/_test/db/mdb/setup/create.table1.sql

> db/mdb/setup/create.table2.sql

<<< @/_test/db/mdb/setup/create.table2.sql

## Create Rows {#create_rows}

> db/mdb/create.table.rows.sql

<<< @/_test/db/mdb/create.table.rows.sql

<<< @/_test/lib/mdb/create.table.rows.js

## Read Rows {#read}

> db/mdb/read.table.rows.sql

<<< @/_test/db/mdb/read.table.rows.sql

<<< @/_test/lib/mdb/read.table.rows.js

## Update Rows {#update}

Demo multiple table updated in a single SQL script:

> db/mdb/update.table.rows.sql

<<< @/_test/db/mdb/update.table.rows.sql

Demo prepared statements:

> db/mdb/update.table1.rows.sql

<<< @/_test/db/mdb/update.table1.rows.sql

Demo transactions:

> db/mdb/update.table2.rows.sql

<<< @/_test/db/mdb/update.table2.rows.sql

<<< @/_test/lib/mdb/update.table.rows.js

## Delete Rows {#delete}

> db/mdb/delete.table.rows.sql

<<< @/_test/db/mdb/delete.table.rows.sql

<<< @/_test/lib/mdb/delete.table.rows.js

## Create Rows (streaming) {#create_stream}

> db/mdb/create.stream.table.rows.sql

<<< @/_test/db/mdb/create.stream.table.rows.sql

<<< @/_test/lib/mdb/create.stream.table.rows.js

## Read Rows (streaming) {#read_stream}

> db/mdb/read.table.rows.sql

<<< @/_test/db/mdb/read.table.rows.sql

<<< @/_test/lib/mdb/read.stream.table.rows.js

## Update Rows (streaming) {#update_stream}

> db/mdb/update.table1.rows.sql

<<< @/_test/db/mdb/update.table1.rows.sql

> db/mdb/update.table2.rows.sql

<<< @/_test/db/mdb/update.table2.rows.sql

<<< @/_test/lib/mdb/update.stream.table.rows.js

## Delete Rows (streaming) {#delete_stream}

> db/mdb/delete.stream.table.rows.sql

<<< @/_test/db/mdb/delete.stream.table.rows.sql

<<< @/_test/lib/mdb/delete.stream.table.rows.js

## Delete Database {#delete_db}

> db/mdb/setup/delete.database.sql

<<< @/_test/db/mdb/setup/delete.database.sql

<<< @/_test/lib/mdb/setup/delete.database.js