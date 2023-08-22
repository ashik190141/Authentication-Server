const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 
// 



const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_pass}@cluster0.nugqait.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJwt = (req,res,next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized Access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.access_token, (error, decoded) => {
    if (error) {
      return res.send({error:true, message:'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("student_information").collection("students");
    const postsCollection = client.db('student_information').collection('posts');

    //jwt
    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.access_token, {expiresIn:'5hr'})
        res.send({token})
    })


    // authenticate

    app.post('/users', async (req, res) => {
        const user = req.body;
        const userID = { user_name: user.user_name};
        const existing = await userCollection.findOne(userID);
        if(existing){
          return res.json({ message: 'This user id is already exist' });
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/:user_name', async (req, res) => {
        const user = req.params.user_name;
        const userID = { user_name: user };
        const existing = await userCollection.findOne(userID);
        if (existing) {
          const result = await userCollection.findOne(userID);
          res.send(result);
        } else {
          return res.json({ message: 'Username is not find' });
        }
    })

    app.get('/forgetPassword/:email', async (req, res) => {
        const user = req.params.email;
        const email = { email: user };
        const existing = await userCollection.findOne(email);
        if (existing) {
          const result = await userCollection.findOne(email);
          res.send(result);
        } else {
          return res.json({ message: 'This email id is not exist. Please Enter Your Valid Email ID' });
        }
    })
      
    app.patch('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedUser = {
        $set: {
          password: user.password
        },
      };
      const result = await userCollection.updateOne(filter, updatedUser, options);
      res.send(result);
    })

    //post create api

    app.post('/posts', verifyJwt, async (req, res) => {
        const post = req.body;
        const result = await postsCollection.insertOne(post);
        res.send(result);
    })

    app.get('/posts', verifyJwt, async (req, res) => {
        const result = await postsCollection.find().toArray();
        res.send(result);
    })

    // feedback related api
    
    app.put('/feedback/:id', verifyJwt, async(req,res)=> {
        const id = req.params.id;
        const feedbackBody = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const giveFeedback = {
          $push: {
            comment: feedbackBody
          },
          $inc: {
            totalComment: 1,
            totalReaction: 1
          }
        }
        const result = await postsCollection.updateOne(filter, giveFeedback, options);
        res.send(result);
    })

    // like related api
    
    app.put('/like/:id', verifyJwt, async(req,res)=> {
        const id = req.params.id;
        const likeBody = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const giveLike = {
          $push: {
            like: likeBody
          },
          $inc: {
            totalLike: 1,
            totalReaction: 1
          }
        }
        const result = await postsCollection.updateOne(filter, giveLike, options);
        res.send(result);
    })
    
    //unlike related api
    
    app.put('/unlike/:id', verifyJwt, async(req,res)=> {
        const id = req.params.id;
        const unLikeBody = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const giveUnLike = {
          $pull: {
            like: unLikeBody
          },
          $inc: {
            totalLike: -1,
            totalReaction: -1
          }
        }
        const result = await postsCollection.updateOne(filter, giveUnLike, options);
        res.send(result);
    })

    // my post

    app.get('/specificPost', verifyJwt, async (req, res) => {
        let query = {}
        if (req.query?.username) {
          query = { username: req.query?.username }
        }
        const result = await postsCollection.find(query).toArray();
        res.send(result)
    })

    app.delete('/post/:id', verifyJwt, async(req,res)=>{
        const id = req.params.id;
        const query = { _id : new ObjectId(id)};
        const result = await postsCollection.deleteOne(query);
        res.send(result);
    })

      //update blog
    app.get('/post/:id', verifyJwt, async (req, res) => {
        const id = req.params.id;
        const query = { _id : new ObjectId(id)};
        const result = await postsCollection.findOne(query);
        res.send(result);
    })
  
    app.put('/post/:id', verifyJwt, async(req,res)=>{
        const id = req.params.id;
        const blogInfo = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateBlog = {
          $set: {
            name: blogInfo.name,
            blogTitle: blogInfo.blogTitle,
            blog: blogInfo.blog,
          },
        }
        const result = await postsCollection.updateOne(filter, updateBlog, options);
        res.send(result);
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Database is running");
})

app.listen(port, () => {
    console.log('Running on port ', port);
})