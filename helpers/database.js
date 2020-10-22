let pg = require('pg');
if (process.env.DATABASE_URL) {
  pg.defaults.ssl = true;
}

// pool is used instead of client to connect to postgresql (client kept returning errors)
// c.f. npm 'pg' documentation recommends pools. No need to call pool.end() - the pool can be left open
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
            return  callback(err);
          } else {
            return callback(null, res.rows);
          }
        }
    );  
  },
  updateEnquiries: (array) => {
    array.forEach(el => { 
      pool
      .query(
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
      )
      .then(console.log('Order database updated'))
      .catch((err) =>
        setImmediate(() => {
          throw err;
        })
      );
    });
   }
}