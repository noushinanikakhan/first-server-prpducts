const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require ('cors')
const app = express()
const port = process.env.PORT || 3000;

console.log('=== DEBUG: Checking environment ===');
console.log('DB_USER exists:', !!process.env.DB_USER);
console.log('FIREBASE_SERVICE_key exists:', !!process.env.FIREBASE_SERVICE_key);

// TEMPORARILY DISABLE FIREBASE TO GET SERVER RUNNING
let admin;
try {
  const admin = require("firebase-admin");
  if (process.env.FIREBASE_SERVICE_key) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_key, "base64").toString("utf8");
    const serviceAccount = JSON.parse(decoded);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase initialized successfully');
  } else {
    console.log('⚠️ Firebase key not found, skipping Firebase');
  }
} catch (error) {
  console.log('❌ Firebase initialization failed:', error.message);
  console.log('⚠️ Continuing without Firebase');
}

// middleware
app.use(cors());
app.use(express.json())

const logger = (req, res, next)=> {
  console.log('logging info')
  next()
}

// TEMPORARILY DISABLE AUTH
const verifyFireBaseToken = async (req, res, next) => {
  console.log('⚠️ Auth temporarily disabled - allowing request');
  next(); // Skip authentication for now
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a0a09os.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res) => {
  res.send('Smart server is running!')
})

async function run (){
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('smart_db');
    const productsCollection = db.collection ('products')
    const bidsCollection = db.collection('bids');
    const usersCollection = db.collection('users');

    // users api
    app.post('/users', async (req, res)=>{
      const newUser = req.body;
      const query= {email: newUser.email}
      const existingUser = await usersCollection.findOne(query);
      if (existingUser){
        res.send({message: 'User already exists. Do not need to register again!'})
      } else {
        const result= await usersCollection.insertOne(newUser)
        res.send(result)
      }
    })

    // products api - NO AUTH FOR NOW
    app.get('/products', async (req, res) => {
      const cursor = productsCollection.find();
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/latest-products', async (req, res)=>{
      const cursor = productsCollection.find().sort({created_at: -1}).limit(6);
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/products/:id', async (req, res)=>{
      const id = req.params.id;
      const query = { _id: id}
      const result = await productsCollection.findOne(query)
      res.send(result)
    })

    // Temporarily remove auth from these routes
    app.post('/products', async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct)
      res.send(result)
    })

    // ... rest of your routes with auth temporarily removed

  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

run().catch(console.dir)

app.listen(port, () => {
  console.log(`Smart server is running on port ${port}`)
})