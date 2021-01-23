const express = require('express');
const app = express();
const { resolve } = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const bodyParser = require('body-parser');

// Stripe handles payments for physical books via create-payment-intent
const stripe = require('stripe')(process.env.stripeTestKey);

// Web tokens will be used to authenticate admin
const jwt = require('jsonwebtoken');
const JWTsecret = process.env.JWTsecret;

// Cookie parser ensures only users with web token can access protected routes
const cookieParser = require('cookie-parser');
const withAuth = require('./middleware'); // Checks token from user is valid

// Used to generate order IDs
const shortid = require('shortid');

// helper functions
const {
  showOrders,
  truncateTable,
  updateEnquiries,
  insertNewOrder,
  confirmPaid,
  registerUser,
  getPassword,
} = require('./helpers/database.js');
const { calculateOrderAmount } = require('./helpers/util.js');

app.use(bodyParser.urlencoded({ extended: true })); // support urlencoded bodies
app.use(cookieParser());

// Stripe webhook secret
const endpointSecret = process.env.webhookSecret;

let whitelist = ['https://ckpantelides.github.io'];

let corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'DELETE, POST, GET, OPTIONS, PUT',
  allowedHeaders: 'Content-Type,Authorization,X-Requested-With',
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: 'Content-Range,X-Content-Range',
  preflightContinue: true,
};

app.use(express.static('.'));

// Pre-flight requests for api routes from whitelist only
app.options('/update', [cors(corsOptions), bodyParser.json()], function (
  req,
  res
) {
  res.sendStatus(200);
});
app.options('/api/authenticate', cors(corsOptions));
app.options('/api/secret', cors(corsOptions));
app.options('/api/checkToken', cors(corsOptions));
app.options('/orders', cors(corsOptions));

// Pre-flight requests for payment and TEMPORARILY register & update allowed from all origins
app.options('/create-payment-intent', cors());
app.options('/webhook', cors());
app.options('/register', cors());

app.get('/', cors(), (req, res) => res.send('Hello World!'));

app.get('/create-payment-intent', cors(), (req, res) =>
  res.send('Create payment intent')
);

app.post('/create-payment-intent', cors(), async (req, res) => {
  /*
  let data = Object.keys(req.body);
  console.log(req);
  console.log(data);
  let customerDetails = JSON.parse(data[0]);
  let cardDetails = JSON.parse(data[1]);
  */
  let orderID = shortid.generate().substring(0, 6);

  const paymentIntent = await stripe.paymentIntents.create({
  //  amount: calculateOrderAmount(customerDetails.type),
    amount: 2400,
    currency: 'gbp',
    payment_method_types: ['card']
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
    orderID: orderID
  });

  // insert the order into the order table. "Paid" will be set as false, and updated once
  // confirmation is received from Stripe via webhook
  //TODO catch error here?
 
  insertNewOrder(customerDetails, cardDetails, paymentIntent.id, orderID);
});

// Webhook route confirms with Stripe that a payment intent succeeded
app.post(
  '/webhook',
  [cors(), bodyParser.raw({ type: 'application/json' })],
  (request, response) => {
    let event;
    try {
      event = JSON.parse(request.body);
      //event = request.body;
    } catch (err) {
      console.log(
        `⚠️  Webhook error while parsing basic request.`,
        err.message
      );
      return response.send();
    }
    // Only verify the event if you have an endpoint secret defined.
    // Otherwise use the basic event deserialized with JSON.parse
    if (endpointSecret) {
      // Get the signature sent by Stripe
      const signature = request.headers['stripe-signature'];
      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          signature,
          endpointSecret
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return response.send(200);
      }
    }
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        // Add paid: 'true' to the order in the orders table
        confirmPaid(paymentIntent.id);
        break;
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}.`);
    }
    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);

// This route is called to show the orders to the dashboard
app.get('/orders', [cors(corsOptions), withAuth, bodyParser.json()], function (
  request,
  response
) {
  showOrders(function (error, data) {
    if (error) return response.send(error);
    response.status(200).send(data);
  });
});

app.post('/update', [cors(corsOptions), bodyParser.json()], function (
  request,
  response
) {
  // set data to the updated enquiries received from the frontend
  const data = request.body;
  // Update enquiries saved in orders table - remove deleted, save orders that have been 'read'
  truncateTable(null, function (err, res) {
    if (err) return response.send(err);
    if (res) {
      updateEnquiries(null, data, function (error, result) {
        if (error) return response.send(error);
        if (result) return response.send(200);
      });
    }
  });
});

// Test route for admin login
app.get('/api/home', [cors(corsOptions), bodyParser.json()], function (
  req,
  res
) {
  res.send("The server's up and running");
});

// Test route for admin login
app.get(
  '/api/secret',
  [cors(corsOptions), withAuth, bodyParser.json()],
  function (req, res) {
    res.send('Christos is the best');
  }
);

// Route for the front-end to check it has a valid token
app.get(
  '/api/checkToken',
  [cors(corsOptions), withAuth, bodyParser.json()],
  function (req, res) {
    res.sendStatus(200);
  }
);

// POST route to register a user
app.post('/register', bodyParser.json(), function (req, res) {
  const { email, password } = req.body;

  // Auto generates salt and hash
  bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
      res.status(500).send('Error registering new user please try again.');
    } else {
      // Store email and password hash
      registerUser(email, hash);
    }
  });
});

app.post('/api/authenticate', [cors(corsOptions), bodyParser.json()], function (
  req,
  res
) {
  const { email, password } = req.body;
  let hash = '';

  function comparePassword(plaintext, hashedword) {
    bcrypt.compare(plaintext, hashedword, function (err, same) {
      if (err) {
        console.log('Error with bcrypt');
        res.status(500).json({ error: 'Internal error please try again' });
      } else if (!same) {
        console.log('Incorrect password');
        res.status(401).json({ error: 'Incorrect email or password' });
      } else {
        // Issue token
        const payload = { email };
        const token = jwt.sign(payload, JWTsecret, {
          expiresIn: '1h',
        });
        res
          .cookie('token', token, {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
          })
          .status(200)
          .send('Token issued');
      }
    });
  }
  getPassword(null, email, function (err, result) {
    if (err) {
      res.status(401).json({ error: 'Incorrect email or password' });
    } else {
      comparePassword(password, result);
    }
  });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Our app is running on port ${PORT}`);
});

module.exports = app;
