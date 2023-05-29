const mysql = require('mysql2');

const pool = mysql.createPool({
    user: "root",
    password: 'Y085bmvc456.',
    host: "localhost",
    port: 3306,
    database: "book_store"
});

const promisePool = pool.promise();

module.exports = promisePool;
