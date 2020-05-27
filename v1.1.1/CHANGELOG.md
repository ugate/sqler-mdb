## [1.1.1](https://ugate.github.io/sqler-mdb/tree/v1.1.1) (2020-05-27)
[Full Changelog](https://ugate.github.io/sqler-mdb/compare/v1.1.0...v1.1.1)


__Fixes:__
* [[FIX]: Positional binding of falsy values](https://ugate.github.io/sqler-mdb/commit/8d93aab479dbf981b0e417de2431a854433ac08b)
* [[FIX]: Execution results had missing raw property when performing a read outside of a transaction/prepared statement](https://ugate.github.io/sqler-mdb/commit/6c2c3c506fad84856f8bf6aa0338070803caff48)
* [[FIX]: Long path names may exceed the max number of characters for prepared statements (64 chracters). In this case, a randomly generated name will be created for the stored procedure and prepared statement names.](https://ugate.github.io/sqler-mdb/commit/b15abe010701255ec38803d24736626c6020b4ec)