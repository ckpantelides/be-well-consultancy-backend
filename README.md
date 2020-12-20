Adding a postgresql database to a heroku hosted project:

npm install pg
In the app's Heroku dashboard: add postgres as an add-on in the Resources tab
heroku pg:psql -a storybook-backend // To enter database CLI

// postgresql CLI commands
CREATE TABLE orders(rowid SERIAL PRIMARY KEY,orderid VARCHAR(50),date VARCHAR(50),deliveryname VARCHAR(50),email VARCHAR(50),deliveryaddress VARCHAR(255),deliverypostcode VARCHAR(50),type VARCHAR(50),story VARCHAR(50),charname VARCHAR(50),avatar VARCHAR(50), brand VARCHAR(50), last4 VARCHAR(50), paymentintentid VARCHAR(50), billingname VARCHAR(50), billingaddress VARCHAR(255), billingpostcode VARCHAR(50), paid VARCHAR(50), read VARCHAR(50)); // Example create table (called orders). Need to end with ;

CREATE TABLE users(rowid SERIAL PRIMARY KEY,email VARCHAR(50) UNIQUE,password VARCHAR(255));

\dt // list table
DROP TABLE tablename; // Delete table
TABLE tablename; // View tablename's data in CLI

Used Postman website to register user. Used 'raw' then JSON to send
