
const express = require('express');
const routes = require('./routes');
const { connectToCosmosDb } = require('./cosmos');
const session = require('express-session');
const config = require('./config');
const app = express();

// Ładowanie zmiennych środowiskowych z pliku .env
require('dotenv').config({ path: './auth.env' });
console.log('Loaded CosmosDB connection string:', config.cosmosDb.connectionString);

// Połącz z Cosmos DB
connectToCosmosDb();

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: config.jwtSecret,
  resave: false,
  saveUninitialized: true
}));

// Trasy
app.use('/api', routes);

// Uruchomienie serwera
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});
