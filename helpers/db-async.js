// Sendgrid email invoices
const sgMail = require("@sendgrid/mail");

let pg = require("pg");
if (process.env.DATABASE_URL) {
  pg.defaults.ssl = true;
}
let connString = process.env.DATABASE_URL;
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: connString,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function emailInvoice(paymentIntentID) {
  pool
    .query(
      "SELECT rowid, orderid, date, deliveryname, email, deliveryaddress, deliverypostcode, type, story, charname, avatar, last4, paymentintentid, billingname, billingaddress, billingpostcode, paid, read FROM orders WHERE paymentintentid= $1",
      [paymentIntentID]
    )
    .then((res) => {
      console.log(res.rows[0].email);
      const order = res.rows[0].email;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to: process.env.TO_CC_EMAIL, // Change to your recipient
        from: process.env.FROM_CONTACT_EMAIL,
        subject: "Thank you for your order",
        text: `Here's your email receipt ${order}`,
        html: `<strong>Here's your email receipt</strong> ${order}`,
      };
      sgMail
        .send(msg)
        .then(() => {
          console.log("Email sent");
        })
        .catch((error) => {
          console.error(error);
        });
      return;
    })
    .catch((err) =>
      setImmediate(() => {
        throw err;
      })
    );
}

module.exports.emailInvoice = emailInvoice;
