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
      const order = res.rows[0];
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to: [order.email],
        bcc: [
          process.env.TO_CC_EMAIL,
          process.env.TO_CC_EMAIL_2,
          process.env.FROM_CONTACT_EMAIL,
        ],
        from: process.env.FROM_CONTACT_EMAIL,
        templateId: "d-6851a120c8a647899067111e29e297f4",
        dynamicTemplateData: {
          Order_Number: order.orderid,
          Story: order.story,
          Hero_Name: order.charname,
          Type: order.type,
          Delivery_Name: order.deliveryname,
          Delivery_Address: `${order.deliveryaddress} ${order.deliverypostcode}`,
          Amound_Paid: order.type === "paperback" ? "£16.98" : "£24.98",
          Card_Ending: order.last4,
          Billing_Name: order.billingname,
          Billing_Address: `${order.billingaddress}  ${order.billingpostcode}`,
          Sender_Name: "Vivlio Ltd",
          Sender_Address: "www.vivlioltd.com",
        },
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
