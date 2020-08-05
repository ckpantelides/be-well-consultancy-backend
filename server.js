const express = require('express');
const app = express();
const { resolve } = require('path');
const cors = require('cors');

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

const calculateOrderAmount = (items) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return 1400;
};

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/create-payment-intent', (req, res) =>
  res.send('Create payment intent')
);

app.post('/create-payment-intent', async (req, res) => {
  // console.log('Intent received');
  // res.send('Create payment intent');

  const { items } = req.body;
  console.log(items);
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(items),
    currency: 'gbp',
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

// app.listen(4242, () => console.log('Node server listening on port 4242!'));
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Our app is running on port ${PORT}`);
});

module.exports = app;
