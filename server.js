const express = require('express');
const app = express();
const { resolve } = require('path');
const cors = require('cors');

const bodyParser = require('body-parser');

// Used to generate order IDs
const shortid = require('shortid');

// pg is the module used for node to interact with postgresql
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
});

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support urlencoded bodies

const stripe = require('stripe')(process.env.stripeTestKey);
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.use(cors());

app.use(express.static('.'));
app.use(express.json());

const calculateOrderAmount = (type) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  let price = '';
  type === 'paperback' ? (amount = 1699) : (amount = 1499);
  return amount;
};

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/create-payment-intent', (req, res) =>
  res.send('Create payment intent')
);

app.post('/create-payment-intent', async (req, res) => {
  // console.log('Intent received');
  // res.send('Create payment intent');
  /*
  const { items } = req.body;
  console.log(req.body);
  console.log(items);
*/
  let data = Object.keys(req.body);
  let customerDetails = JSON.parse(data[0]);
  let cardDetails = JSON.parse(data[1]);
  console.log(customerDetails.type);
  console.log(cardDetails.email);
  let bookType = customerDetails.type;

  // Add all details when payment intent created
  // Have field 'paid' and paymentintentid to track payment
  // Need webhook to track if successful. Then inform user with orderid
  // Collect billing address!

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(bookType),
    currency: 'gbp',
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });

  // insert the order into the order table. "Paid" will be set as false, and updated once
  // confirmation is received from Stripe via webhook
  pool
    .query(
      'INSERT INTO orders(orderid, date, delname, email, address, postcode, type, story, charname, avatar, brand, last4, paymentintentid, paid, read)VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
      [
        shortid.generate(),
        new Date().toISOString().slice(0, 10),
        customerDetails.delName,
        cardDetails.email,
        customerDetails.address,
        customerDetails.postcode,
        customerDetails.type,
        customerDetails.story,
        customerDetails.charName,
        customerDetails.avatar,
        cardDetails.brand,
        cardDetails.last4,
        paymentIntent.id,
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
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Our app is running on port ${PORT}`);
});

module.exports = app;
