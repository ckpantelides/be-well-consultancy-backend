const express = require('express');
const app = express();
const { resolve } = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const bodyParser = require('body-parser');

// Stripe handles payments for physical books via create-payment-intent
const stripe = require('stripe')(process.env.stripeTestKey);

// Used to generate order IDs
const shortid = require('shortid');

// Web tokens will be used to authenticate admin
const jwt = require('jsonwebtoken');
const JWTsecret = process.env.JWTsecret;

// Cookie parser ensures only users with web token can access protected routes
const cookieParser = require('cookie-parser');
const withAuth = require('./middleware'); // Checks token from user is valid

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
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support urlencoded bodies
app.use(cookieParser());

let whitelist = ['https://ckpantelides.github.io', 'http://localhost:3000']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  method: 'GET,POST'
}

app.use(express.static('.'));
app.use(express.json());

const calculateOrderAmount = (type) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  let price = '';
  type === 'paperback' ? (amount = 1698) : (amount = 2498);
  return amount;
};

// Pre-flight requests for api routes from whitelist only
app.options('/api/authenticate', cors(corsOptions));
app.options('/api/secret', cors(corsOptions)); 
app.options('/api/checkToken', cors(corsOptions));
app.options('/orders', cors(corsOptions)); 


// Pre-flight requests for payment and TEMPORARILY register & update allowed from all origins
app.options('/create-payment-intent', cors());
app.options('/register', cors());
app.options('/update', cors()); 

app.get('/', cors(), (req, res) => res.send('Hello World!'));

app.get('/create-payment-intent', cors(), (req, res) =>
  res.send('Create payment intent')
);

app.post('/create-payment-intent', cors(), async (req, res) => {
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

  // Add all details when payment intent created
  // Have field 'paid' and paymentintentid to track payment
  // Need webhook to track if successful. Then inform user with orderid
  // Collect billing address!

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(customerDetails.type),
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

// This route is called to show the orders to the dashboard
app.get('/orders', [cors(corsOptions), withAuth], function (request, response) {
  pool.query(
    'SELECT rowid, orderid, date, delname, email, address, postcode, type, story, charname, avatar, brand, last4, paymentintentid, paid, read FROM orders ORDER BY rowid',
    (err, res) => {
      if (err) {
        return console.log(err.message);
      } else {
        response.send(res.rows);
      }
    }
  );
});

app.post('/update'), cors(), function (request, response) {
   // set data to the updated enquiries received from the frontend
   console.log(request.body);
   const data = request.body.data;

   // iterate over the updated enquiry data and insert into requests table
   function updateEnquiries() {
     data.forEach(function(el, index) {
       // rowid is reset to account for orders being deleted on the front-end
       let rowid = index + 1;
 
       // insert updated enquiry data into requests table
       pool
         .query(
          'INSERT INTO orders(rowid, orderid, date, delname, email, address, postcode, type, story, charname, avatar, brand, last4, paymentintentid, paid, read)VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)'           [
             el.rowid,
             el.orderid,
             el.date,
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
             el.read
           ]
         )
         .catch(err =>
           setImmediate(() => {
             throw err;
           })
         );
     });
   }
 
   // this will be used in the query below to set the primary key to data.length + 1
   let resetPrimaryKey = `SELECT setval('requests_rowid_seq', ${data.length}, true);`;
 
   // deletes all rows from the requests table and then calls updateEnquiries()
   // this is necessary to reset the rowids, to account for reodered enquiries
   pool.query('TRUNCATE TABLE orders', function(err) {
     if (err) {
       return console.error(err.message);
     } else {
       pool.query(resetPrimaryKey);
       updateEnquiries();
     }
   });
}

// Test route for admin login
app.get('/api/home', cors(corsOptions), function (req, res) {
  res.send("The server's up and running");
});

// Test route for admin login
app.get('/api/secret', [cors(corsOptions), withAuth], function (req, res) {
  res.send('Christos is the best');
});

// Route for the front-end to check it has a valid token
app.get('/api/checkToken', [cors(corsOptions), withAuth], function(req, res) {
  res.sendStatus(200);
});

// POST route to register a user
app.post('/register', function (req, res) {
  const { email, password } = req.body;

  // Auto generates salt and hash
  bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
      res.status(500).send('Error registering new user please try again.');
    } else {
      // Store email and password hash
      pool
        .query('INSERT INTO users(email, password)VALUES($1, $2)', [
          email,
          hash,
        ])
        .then(res.status(200).send('Welcome to the club!'))
        .catch((err) =>
          setImmediate(() => {
            throw err;
          })
        );
    }
  });
});

app.post('/api/authenticate', cors(corsOptions), function (req, res) {
  const { email, password } = req.body;
  let hash = '';

  function comparePassword(plaintext, hashedword) {
    bcrypt.compare(plaintext, hashedword, function (err, same) {
      if (err) {
        console.log('Error with bcrypt');
        res.status(500).json({ error: 'Internal error please try again'});
      } else if (!same) {
        console.log('Incorrect password');
        res.status(401).json({ error: 'Incorrect email or password'});
      } else {
        // Issue token
        const payload = { email };
        const token = jwt.sign(payload, JWTsecret, {
          expiresIn: '1h',
        });
        res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true }).status(200).send('Token issued');
      }
    });
  }
  pool
    .query('SELECT password FROM users WHERE email = $1', [email])
    .then((result) => {
      if (result.rows.length === 0) {
        console.log('Incorrect email address');
        res.status(401).json({ error: 'Incorrect email or password'});
      } else {
       // console.log(result.rows[0]);
        hash = result.rows[0].password;
        comparePassword(password, hash);
      }
    })
    .catch((e) => {
      console.error(e.stack);
      res.status(500).json({ error: 'Internal error please try again'});
    });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Our app is running on port ${PORT}`);
});

module.exports = app;
