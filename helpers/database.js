// pool is used instead of client to connect to postgresql (client kept returning errors)
// c.f. npm 'pg' documentation recommends pools. No need to call pool.end() - the pool can be left open
let pg = require('pg');
if (process.env.DATABASE_URL) {
  pg.defaults.ssl = true;
}
let connString = process.env.DATABASE_URL;
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: connString,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  showOrders: (callback) => {
    pool.query(
      'SELECT rowid, orderid, date, delname, email, address, postcode, type, story, charname, avatar, brand, last4, paymentintentid, paid, read FROM orders ORDER BY rowid',
      (err, res) => {
        if (err) {
          return callback(err);
        } else {
          return callback(null, res.rows);
        }
      }
    );
  },
  updateEnquiries: (error, array, callback) => {
    if (error) return callback(error);
    array.forEach((el) => {
      pool.query(
        'INSERT INTO orders(orderid, date, delname, email, address, postcode, type, story, charname, avatar, brand, last4, paymentintentid, paid, read)VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
        [
          el.orderid,
          el.data,
          el.delname,
          el.email,
          el.address,
          el.postcode,
          el.type,
          el.story,
          el.charname,
          el.avatar,
          el.brand,
          el.last4,
          el.paymentintentid,
          el.paid,
          el.read,
        ]
      );
    });
    return callback(null, true);
  },
  truncateTable: (err, callback) => {
    if (err) return callback(error);
    pool
      .query('TRUNCATE TABLE orders')
      .then(() => {
        return callback(null, true);
      })
      .catch((err) => {
        return callback(err);
      });
  },
  insertNewOrder: (customerDetails, cardDetails, paymentIntentID, orderID) => {
    pool
      .query(
        'INSERT INTO orders(orderid, date, delname, email, address, postcode, type, story, charname, avatar, brand, last4, paymentintentid, paid, read)VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
        [
          orderID,
          new Date().toISOString().slice(0, 10),
          customerDetails.delName,
          cardDetails.email,
          customerDetails.address,
          customerDetails.postcode,
          customerDetails.type,
          customerDetails.story.match(/(.*?\s){3}/g)[0],
          customerDetails.charName,
          customerDetails.avatar,
          cardDetails.brand,
          cardDetails.last4,
          paymentIntentID,
          'false',
          'false',
        ]
      )
      .then(console.log('Order inserted into database'))
      .catch((err) =>
        setImmediate(() => {
          throw err;
        })
      );
  },
  confirmPaid: (paymentIntentID) => {
    pool
      .query('UPDATE orders SET paid=($1) WHERE paymentintentid=($2)', [
        'true',
        paymentIntentID,
      ])
      .catch((err) =>
        setImmediate(() => {
          throw err;
        })
      );
  },
  registerUser: (email, hash) => {
    pool
      .query('INSERT INTO users(email, password)VALUES($1, $2)', [email, hash])
      .then(console.log('Welcome to the club!'))
      .catch((err) =>
        setImmediate(() => {
          throw err;
        })
      );
  },
  getPassword: (err, email, callback) => {
    pool
      .query('SELECT password FROM users WHERE email = $1', [email])
      .then((result) => {
        if (result.rows.length === 0) {
          callback(err);
        } else {
          hash = result.rows[0].password;
          callback(null, hash);
        }
      })
      .catch((e) => {
        callback(e.stack);
      });
  },
};
