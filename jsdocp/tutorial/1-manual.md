### ⚙️ Setup &amp; Configuration <sub id="conf"></sub>:

> __Most of documentation pertaining to general configuration for `sqler-mdb` can be found in the [`sqler` manual](https://ugate.github.io/sqler).__

The following modules versions are required when using `sqler-mdb` for [MariaDB](https://mariadb.org) and/or [MySQL](https://www.mysql.com):
```jsdocp ./package.json @~ devDependencies.sqler @~ devDependencies.mariadb
```

Install the required modules:
```sh
npm install sqler
npm install sqler-mariadb
npm install mysql2
```

Connection and execution option extensions can be found under the API docs for [globals](global.html).

### 💡 [MariaDB and/or MySQL Usage](tutorial-2-mdb.html)