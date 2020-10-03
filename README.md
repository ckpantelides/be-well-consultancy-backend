Adding a postgresql database to a heroku hosted project:

npm install pg
In the app's Heroku dashboard: add postgres as an add-on in the Resources tab
heroku pg:psql -a storybook-backend -a <app-name> // To enter database CLI
CREATE TABLE orders(rowid SERIAL PRIMARY KEY,orderid VARCHAR(50),date VARCHAR(50),delname VARCHAR(50),email VARCHAR(50),address VARCHAR(255)); // Example create table (called orders). Need to end with ;

\dt // list table
DROP TABLE tablename; // Delete table
