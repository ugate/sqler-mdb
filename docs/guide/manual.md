## Examples {#examples}

The examples below use the following setup:

__[Private Options Configuration:](https://example.com/guide/manager#~PrivateOptions)__
(appended to the subsequent connection options)

<<< @/_test/fixtures/priv.json

__[Connection Options Configuration:](https://example.com/global.html#MDBConnectionOptions)__

<<< @/_test/fixtures/mdb/conf.json

Test code that illustrates how to use MariaDB/MySQL with various examples

<<< @/_test/fixtures/run-example.js

### Create Database {#create_db}

> db/mdb/setup/create.database.sql

<<< @/_test/db/mdb/setup/create.database.sql

<<< @/_test/lib/mdb/setup/create.database.js

### Create Table(s) {#create_tables}

> db/mdb/setup/create.table1.sql

<<< @/_test/db/mdb/setup/create.table1.sql

> db/mdb/setup/create.table2.sql

<<< @/_test/db/mdb/setup/create.table2.sql

### Create Rows {#create_rows}

> db/mdb/create.table.rows.sql

<<< @/_test/db/mdb/create.table.rows.sql

<<< @/_test/lib/mdb/create.table.rows.js

### Read Rows {#read}

> db/mdb/read.table.rows.sql

<<< @/_test/db/mdb/read.table.rows.sql

<<< @/_test/lib/mdb/read.table.rows.js

### Update Rows {#update}

> db/mdb/update.table.rows.sql

(demo multiple table updated in a single SQL script)

<<< @/_test/db/mdb/update.table.rows.sql

> db/mdb/update.table1.rows.sql

(demo prepared statements)

<<< @/_test/db/mdb/update.table1.rows.sql

> db/mdb/update.table2.rows.sql

(demo transactions)

<<< @/_test/db/mdb/update.table2.rows.sql

<<< @/_test/lib/mdb/update.table.rows.js

### Delete Rows {#delete}

> db/mdb/delete.table.rows.sql

<<< @/_test/db/mdb/delete.table.rows.sql

<<< @/_test/lib/mdb/delete.table.rows.js

### Create Rows (streaming using the same SQL as the prior create rows example) {#create_stream}

<<< @/_test/lib/mdb/create.stream.table.rows.js

### Read Rows (streaming using the same SQL as the prior read rows example) {#read_stream}

<<< @/_test/lib/mdb/read.stream.table.rows.js

### Update Rows (streaming using the same SQL as the prior update rows example) {#update_stream}

<<< @/_test/lib/mdb/update.stream.table.rows.js

### Delete Rows (streaming using the same SQL as the prior delete rows example) {#delete_stream}

<<< @/_test/lib/mdb/delete.stream.table.rows.js

### Delete Database {#delete_db}

> db/mdb/setup/delete.database.sql

<<< @/_test/db/mdb/setup/delete.database.sql

<<< @/_test/lib/mdb/setup/delete.database.js