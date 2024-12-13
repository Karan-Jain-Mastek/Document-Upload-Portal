const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string
const mongoUri = process.env.MONGO_URI; 
// const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/documentDB'; 

// MongoDB connection logic
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true, autoReconnect: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

module.exports = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://rd-upload-portal.vercel.app';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', frontendUrl);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let counter = await mongoose.connection.db.collection('interactionid').findOne({ _id: 'counter' });

    if (!counter || counter.seq === undefined) {
      await mongoose.connection.db.collection('interactionid').updateOne(
        { _id: 'counter' },
        { $set: { seq: 1 } },
        { upsert: true }
      );
      counter = { seq: 1 };
    } else {
      await mongoose.connection.db.collection('interactionid').updateOne(
        { _id: 'counter' },
        { $inc: { seq: 1 } }
      );
    }

    const newInteractionId = `RD${counter.seq.toString().padStart(3, '0')}`;
    res.status(200).json({ interactionId: newInteractionId });
  } catch (error) {
    console.error('Error generating interaction ID:', error);
    res.status(500).send('Error generating interaction ID');
  }
};
