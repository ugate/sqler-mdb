## Examples {#examples}

The examples below use the following setup:

__[Private Options Configuration:](https://example.com/guide/manager#~PrivateOptions)__
(appended to the subsequent connection options)

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

> db/mdb/update.table.rows.sql

(demo multiple table updated in a single SQL script)

<<< ../../test/db/mdb/update.table.rows.sql

> db/mdb/update.table1.rows.sql

(demo prepared statements)

<<< ../../test/db/mdb/update.table1.rows.sql

> db/mdb/update.table2.rows.sql

(demo transactions)

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