const express = require('express');
const app = express();
const { resolve } = require('path');
const cors = require('cors');

const bodyParser = require('body-parser');
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
  type === 'paperback' ? (amount = 1199) : (amount = 1999);
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

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(bookType),
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
