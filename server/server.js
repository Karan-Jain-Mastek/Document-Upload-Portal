const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');

// MongoDB connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/documentDB';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB schema for audit logging
const documentSchema = new mongoose.Schema({
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
}, { collection: 'requirement-documents' });

const Document = mongoose.model('Document', documentSchema);

// Express app setup
const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom origin function
const corsOptions = {
  origin: function (origin, callback) {
    // Allow all origins
    callback(null, true);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS middleware with the custom options
app.use(cors(corsOptions));

// Azure Blob Storage setup
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient('rd-upload-portal-documents');

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });  // Limit to 10MB

app.get("/", (req, res) => {
  res.status(200).json({
      message: 'Backend Server of Mastek Enterprise AI is running.'
  })
})

// API to get a new Interaction ID
app.get('/generate-interaction-id', async (req, res) => {
  try {
    // Try to get the counter document
    let counter = await mongoose.connection.db.collection('interactionid').findOne({ _id: 'counter' });

    // If the counter document doesn't exist or seq is undefined, initialize it
    if (!counter || counter.seq === undefined) {
      await mongoose.connection.db.collection('interactionid').updateOne(
        { _id: 'counter' },
        { $set: { seq: 1 } }, // Initialize the seq field
        { upsert: true } // Ensure the document is created if it doesn't exist
      );
      counter = { seq: 1 }; // Set the counter manually to 1 after initialization
    } else {
      // Increment the seq field
      await mongoose.connection.db.collection('interactionid').updateOne(
        { _id: 'counter' },
        { $inc: { seq: 1 } }
      );
    }

    // Generate the new interaction ID based on the incremented counter
    const newInteractionId = `RD${counter.seq.toString().padStart(3, '0')}`;
    res.status(200).json({ interactionId: newInteractionId });
  } catch (error) {
    console.error('Error generating interaction ID:', error);  // Log the error for debugging
    res.status(500).send('Error generating interaction ID');
  }
});

// API to handle file upload and logging
app.post('/upload', upload.single('files'), async (req, res) => {
  console.log('Incoming file:', req.file);  // Log the file info
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const fileName = req.file.originalname; // The original file name
  const interactionId = req.body.interactionId; // Extract interaction ID
  const newFileName = `${fileName.replace('.docx', '')}_${interactionId}.docx`; // Append Interaction ID to the file name

  const blobName = `${Date.now()}-${newFileName}`; // Blob name with interaction ID
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    await blockBlobClient.upload(req.file.buffer, req.file.size);

    const interactionId = req.body.interactionId;
    const user = req.body.user || 'default_user';

    const newDocument = new Document({
      user: user,
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

// API to delete file and metadata
app.post('/delete-file', async (req, res) => {
  const { interactionId } = req.body;
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
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Serve a simple message for the root route
app.get('/', (req, res) => {
  res.send('Backend Server of Mastek Enterprise AI is running!');
});