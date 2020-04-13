### 💡 [MySQL](https://www.mysql.com) Examples:

#### Examples:<sub id="examples"></sub>

The examples below use the following setup:

__[Private Options Configuration:](https://ugate.github.io/sqler/Manager.html#~PrivateOptions)__ (appended to the subsequent connection options)
```jsdocp ./test/fixtures/priv.json
```

__[Connection Options Configuration:](global.html#MySQLConnectionOptions)__
```jsdocp ./test/fixtures/mysql/conf.json
```

Test code that illustrates how to use MySQL with various examples
```jsdocp ./test/fixtures/run-example.js
```

__Create Database:__

```jsdocp ./test/db/mysql/setup/create.database.sql
-- db/mysql/setup/create.database.sql
```

```jsdocp ./test/lib/mysql/setup/create.database.js
```

__Create Table(s):__

```jsdocp ./test/db/mysql/setup/create.table1.sql
-- db/mysql/setup/create.table1.sql
```
```jsdocp ./test/db/mysql/setup/create.table2.sql
-- db/mysql/setup/create.table2.sql
```

```jsdocp ./test/lib/mysql/setup/create.table1.js
```
```jsdocp ./test/lib/mysql/setup/create.table2.js
```

__Create Rows:__

```jsdocp ./test/db/mysql/create.table.rows.sql
-- db/mysql/create.table.rows.sql
```

```jsdocp ./test/lib/mysql/create.table.rows.js
```

__Read Rows:__

```jsdocp ./test/db/mysql/read.table.rows.sql
-- db/mysql/read.table.rows.sql
```

```jsdocp ./test/lib/mysql/read.table.rows.js
```

__Update Rows:__

```jsdocp ./test/db/mysql/update.table.rows.sql
-- db/mysql/update.table.rows.sql
```

```jsdocp ./test/lib/mysql/update.table.rows.js
```

__Delete Rows:__

```jsdocp ./test/db/mysql/delete.table.rows.sql
-- db/mysql/delete.table.rows.sql
```

```jsdocp ./test/lib/mysql/delete.table.rows.js
```

__Delete Database:__

```jsdocp ./test/db/mysql/setup/delete.database.sql
-- db/mysql/setup/delete.database.sql
```

```jsdocp ./test/lib/mysql/setup/delete.database.js
```