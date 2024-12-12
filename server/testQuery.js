// Import the MongoClient from the mongodb package
const { MongoClient } = require('mongodb');

// Replace with your actual MongoDB connection string
const uri = "mongodb://localhost:27017"; // Local MongoDB instance, change it if using a different URI

// Create a new MongoClient instance
const client = new MongoClient(uri);

async function run() {
  try {
    // Connect to the MongoDB client
    await client.connect();

    // Access the database and the 'interactionid' collection
    const database = client.db('documentDB'); // Replace with your database name
    const interactionidCollection = database.collection('interactionid'); // The collection to store the counter

    // Check if the 'counter' document exists in the 'interactionid' collection
    const existingCounter = await interactionidCollection.findOne({ _id: 'counter' });

    if (!existingCounter) {
      // If the counter doesn't exist, initialize it
      const result = await interactionidCollection.insertOne({ _id: 'counter', seq: 0 });
      console.log('Counter initialized:', result);
    } else {
      console.log('Counter already initialized');
    }

    // Access the 'requirement-documents' collection and print its documents
    const documents = await database.collection('requirement-documents').find().toArray();

    // const result = await database.collection('requirement-documents').deleteMany({});
    // const documents = await database.collection('requirement-documents').find().toArray();

    // Log the documents from the 'requirement-documents' collection
    console.log(documents);
  } catch (err) {
    console.error('Error querying MongoDB:', err);
  } finally {
    // Close the MongoDB client
    await client.close();
  }
}

// Run the function and catch any errors
run().catch(console.error);
