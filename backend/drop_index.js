require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to MongoDB. Dropping slug_1 index from companies collection...');
    try {
      await mongoose.connection.collection('companies').dropIndex('slug_1');
      console.log('Successfully dropped slug_1 index.');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('Index slug_1 not found, nothing to do.');
      } else {
        console.error('Error dropping index:', err);
      }
    }
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Connection error:', err);
  });
