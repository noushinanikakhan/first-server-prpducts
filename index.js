const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require ('cors')
const app = express()
const port = process.env.PORT || 3000;
console.log(process.env)

const admin = require("firebase-admin");

const serviceAccount = require("./smart-deals-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json())

const logger = (req, res, next)=> {
  console.log('logging info')
  next()
}
// const verifyFireBaseToken = (req, res, next) => {
//   console.log('Authorization header:', req.headers.authorization);
  
//   // TEMPORARY: Skip authentication for testing
//   console.log('⚠️ TEMPORARILY SKIPPING AUTH FOR TESTING');
//   next();
  
//   // Comment out the actual authentication for now:
//   /*
//   if (!req.headers.authorization) {
//     return res.status(401).send({ message: 'unauthorized access' });
//   }
//   // ... rest of your auth code
//   */
// };

const verifyFireBaseToken = async (req, res, next)=> {
  console.log('in the middleware', req.headers.authorization)
  if(!req.headers.authorization){
    // do not allow to go
    return res.status(401).send({message: 'unauthorized access'})
  }
  const token = req.headers.authorization.split(' ')[1];
  if(!token){
    // do not allow to go
    return res.status(401).send({message: 'unauthorized access'})
  } 
  try {
    const userInfo= await admin.auth().verifyIdToken(token);
     console.log('after token validation', userInfo)
     next()
  }
   catch {
        return res.status(401).send({message: 'unauthorized access'})

   }
  // verify token
  // next()
}

// const uri = "mongodb+srv://SmartDbUser:YfsVErx8Q5F6vDZ3@cluster0.a0a09os.mongodb.net/?appName=Cluster0";

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

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
          res.send({message: 'User already exists. Don not need to register again!'})
      }
      else{
          const result= await usersCollection.insertOne(newUser)
        res.send(result)
      }

   
     })
    //  products api
    app.get('/products', async (req, res) => {
    //    const cursor = productsCollection.find().sort({price_min: 1}).skip(5).limit(5);
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

     app.post('/products', verifyFireBaseToken, async (req, res) => {
        const newProduct = req.body;
        const result = await productsCollection.insertOne(newProduct)
        res.send(result)
     })

     app.patch('/products/:id', async (req, res)=> {
            const id = req.params.id;
            const updatedProduct = req.body;
            const query = { _id: id}
            const update = {
                $set: {
                name: updatedProduct.name,
                price: updatedProduct.price
                }
            }
       const result = await productsCollection.updateOne(query, update) 
       res.send(result)

     })


     app.delete('/products/:id', async (req, res)=> {
        const id = req.params.id;
        const query = { _id: new ObjectId(id)}
         const result= await productsCollection.deleteOne(query)
        res.send(result);
     })

    //  bids rwlated api

    app.get('/bids', logger, verifyFireBaseToken, async  (req, res)=> {
      // console.log('headers', req.headers)
        const email = req.query.email;
        const query={};
        if (email){
            query.buyer_email = email;
        }

        const cursor = bidsCollection.find(query)
        const result = await cursor.toArray()
        res.send(result);
     })

     
      
     app.post('/bids', async (req, res) => {
        const newBid = req.body;
        const result = await bidsCollection.insertOne(newBid)
        res.send(result)
     }) 
    
     app.get('/products/bids/:productId', verifyFireBaseToken, async (req, res)=> {
        const productId = req.params.productId;
        const query = { product: productId}
        const cursor = bidsCollection.find(query).sort({bid_price: -1})
        const result = await cursor.toArray()
        res.send(result);
     })

    //  app.get('/bids', async(req, res)=> {
    //  const query={};
    //    if (query.email){
    //     query.buyer_email = email
    //    }

    //   const cursor = bidsCollection.find(query);
    //   const result = await cursor.toArray()
    //     res.send(result);
    //  })

     app.delete('/bids/:id', async(req, res)=> {
      const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result= await bidsCollection.deleteOne(query)
             res.send(result);
     })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


  } finally {
   
  }

}

run().catch(console.dir)

app.listen(port, () => {
  console.log(`Smart server is running on port ${port}`)
})
