// /api/upload.js
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/documentDB';
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

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://rd-upload-portal.vercel.app/';  // Replace with your frontend URL

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', frontendUrl);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle file upload
  upload.single('files')(req, res, async (err) => {
    if (err) {
      return res.status(500).send('Error uploading file');
    }

    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const fileName = req.file.originalname;
    const interactionId = req.body.interactionId;
    const newFileName = `${fileName.replace('.docx', '')}_${interactionId}.docx`;

    const blobName = `${Date.now()}-${newFileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.upload(req.file.buffer, req.file.size);

      const newDocument = new Document({
        user: req.body.user || 'default_user',
        pathInputFile: `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/rd-upload-portal-documents/${blobName}`,
        interactionId: interactionId,
      });

      await newDocument.save();
      res.status(200).send('File uploaded successfully');
    } catch (error) {
      console.error('Error during file upload:', error);
      res.status(500).send('Error uploading file');
    }
  });
};
