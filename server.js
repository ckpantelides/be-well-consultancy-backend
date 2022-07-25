const express = require("express");
const app = express();

const cors = require("cors");

const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true })); // support urlencoded bodies
 
const whitelistContactForm = ["https://bewellconsultancy.com", "https://bewellconsultancy.com/#contact", "https://bewellconsultancy.com/founder", "https://bewellconsultancy.com/therapy"];
const corsContactForm = {
  origin: function (origin, callback) {
    if (whitelistContactForm.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "DELETE, POST, GET, OPTIONS, PUT",
  allowedHeaders: "Content-Type,Authorization,X-Requested-With",
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: "Content-Range,X-Content-Range",
  preflightContinue: true,
};

app.use(express.static("."));

// Pre-flight requests for api routes from whitelist only
app.options("/contact-form", cors(corsContactForm))

app.get("/", cors(), (req, res) => res.send("Be Well :)"));

app.get("/create-payment-intent", cors(), (req, res) =>
  res.send("Create payment intent")
);

// Webhook route confirms with Stripe that a payment intent succeeded
app.post(
  "/contact-form",
 [cors(corsContactForm), express.json()],
 (request, response) => {
   const contact = request.body;
   console.log(contact)

   const sgMail = require("@sendgrid/mail");

   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   const msg = {
     to: [process.env.FROM_CONTACT_EMAIL], 
     from: process.env.FROM_CONTACT_EMAIL,
     subject: 'Contact form message from Be Well Consultancy',
     text: `${contact.name} at ${contact.email} says: ${contact.message}`,
     html: `${contact.name} at ${contact.email} says:<br /><br />${contact.message}`
   };
   sgMail
     .send(msg)
     .then(() => {
       console.log("Email sent");
     })
     .catch((error) => {
       console.error(error);
     });
    response.sendStatus(200);
  }
);

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Our app is running on port ${PORT}`);
});

module.exports = app;
