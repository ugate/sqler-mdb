### ⚙️ Setup &amp; Configuration <sub id="conf"></sub>:

> __Most of documentation pertaining to general configuration for `sqler-mysql` can be found in the [`sqler` manual](https://ugate.github.io/sqler).__

The following modules versions are required when using `sqler-mysql`:
```jsdocp ./package.json @~ devDependencies.sqler @~ devDependencies.mysql2
```

Install the required modules:
```sh
npm install sqler
npm install sqler-mysql
npm install mysql2
```

Connection and execution option extensions can be found under the API docs for [globals](global.html).

### 💡 [MySQL Usage](tutorial-2-mysql.html)