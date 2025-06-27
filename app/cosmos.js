const mongoose = require('mongoose');
const config = require('./config');

const statusSchema = new mongoose.Schema({
  value: { type: Number, required: true }
});
const StatusModel = mongoose.models.Status || mongoose.model('Status', statusSchema);

async function connectToCosmosDb() {
  try {
    await mongoose.connect(config.cosmosDb.connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Połączono z Cosmos DB!');
  } catch (error) {
    console.error('❌ Błąd połączenia z Cosmos DB:', error);
  }
}

async function getStatus() {
  return StatusModel.findOne();
}

async function updateStatus(value) {
  let status = await StatusModel.findOne();
  if (status) {
    status.value = value;
    await status.save();
  } else {
    const newStatus = new StatusModel({ value });
    await newStatus.save();
  }
}

module.exports = {
  connectToCosmosDb,
  getStatus,
  updateStatus
};
