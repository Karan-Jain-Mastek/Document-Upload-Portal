// /api/delete-file.js
const mongoose = require('mongoose');
const { BlobServiceClient } = require('@azure/storage-blob');

// MongoDB connection
const mongoUri = process.env.MONGO_URI;
// const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/documentDB'; 
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const Document = mongoose.model('Document', new mongoose.Schema({
  createDate: { type: Date, default: Date.now },
  updateDate: { type: Date, default: Date.now },
  user: { type: String, required: true },
  pathInputFile: { type: String, required: true },
  interactionId: { type: String, required: true, unique: true },
  fileUploaded: { type: String, enum: ['Y', ''], default: '' },
  documentInProcess: { type: String, enum: ['Y', ''], default: '' },
  sqlCreation: { type: String, enum: ['Y', ''], default: '' },
  pathSqlFile: { type: String, default: '' },
  sqlStatus: { type: String, enum: ['Success', 'Fail'] },
  status: { type: String }
}, { collection: 'requirement-documents' }));

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient('rd-upload-portal-documents');

module.exports = async (req, res) => {
  const { interactionId } = req.body;
  const frontendUrl = process.env.FRONTEND_URL || 'https://rd-upload-portal.vercel.app';  // Replace with your frontend URL

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', frontendUrl);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!interactionId) {
    return res.status(400).send('Interaction ID is required');
  }

  try {
    const document = await Document.findOne({ interactionId });
    if (!document) {
      return res.status(404).send('File not found');
    }

    const blobName = document.pathInputFile.split('/').pop();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
    await Document.deleteOne({ interactionId });

    res.status(200).send('File and metadata deleted successfully');
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).send('Error deleting file');
  }
};
