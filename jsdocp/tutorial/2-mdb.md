### 💡 [MariaDB](https://mariadb.org) and/or [MySQL](https://www.mdb.com) Examples:

#### Examples:<sub id="examples"></sub>

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

__Create Rows:__

```jsdocp ./test/db/mdb/create.table.rows.sql
-- db/mdb/create.table.rows.sql
```

```jsdocp ./test/lib/mdb/create.table.rows.js
```

__Read Rows:__

```jsdocp ./test/db/mdb/read.table.rows.sql
-- db/mdb/read.table.rows.sql
```

```jsdocp ./test/lib/mdb/read.table.rows.js
```

__Update Rows:__

```jsdocp ./test/db/mdb/update.table.rows.sql
-- db/mdb/update.table.rows.sql
```

```jsdocp ./test/lib/mdb/update.table.rows.js
```

__Delete Rows:__

```jsdocp ./test/db/mdb/delete.table.rows.sql
-- db/mdb/delete.table.rows.sql
```

```jsdocp ./test/lib/mdb/delete.table.rows.js
```

__Delete Database:__

```jsdocp ./test/db/mdb/setup/delete.database.sql
-- db/mdb/setup/delete.database.sql
```

```jsdocp ./test/lib/mdb/setup/delete.database.js
```