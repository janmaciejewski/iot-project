
const express = require('express');
const routes = require('./routes');
const { connectToCosmosDb } = require('./cosmos');
const session = require('express-session');
const config = require('./config');
const app = express();
const User = require('./User');

require('dotenv').config({ path: './auth.env' });
console.log('Loaded CosmosDB connection string:', config.cosmosDb.connectionString);

connectToCosmosDb();


app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: config.jwtSecret,
  resave: false,
  saveUninitialized: true
}));

app.use('/api', routes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});
