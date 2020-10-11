Adding a postgresql database to a heroku hosted project:

npm install pg
In the app's Heroku dashboard: add postgres as an add-on in the Resources tab
heroku pg:psql -a storybook-backend -a <app-name> // To enter database CLI

// postgresql CLI commands
CREATE TABLE orders(rowid SERIAL PRIMARY KEY,orderid VARCHAR(50),date VARCHAR(50),delname VARCHAR(50),email VARCHAR(50),address VARCHAR(255)); // Example create table (called orders). Need to end with ;

CREATE TABLE users(rowid SERIAL PRIMARY KEY,email VARCHAR(50) UNIQUE,password VARCHAR(255));

\dt // list table
DROP TABLE tablename; // Delete table
TABLE tablename; // View tablename's data in CLI

Used Postman website to register user. Used 'raw' then JSON to send
