require('dotenv').config({ path: './auth.env' });

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  gmail: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  cosmosDb: {
    connectionString: process.env.COSMOS_DB_CONNECTION_STRING
  }
};
