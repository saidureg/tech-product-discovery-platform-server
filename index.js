const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.24f3vqg.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const productCollection = client.db("techWaveDB").collection("products");
    const featureCollection = client.db("techWaveDB").collection("features");
    const reviewsCollection = client.db("techWaveDB").collection("reviews");
    const reportCollection = client.db("techWaveDB").collection("reports");

    // product related api
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.get("/products/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { OwnerEmail: email };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/product/search", async (req, res) => {
      const filter = req.query;
      const query = {
        status: "accepted",
        "tags.text": { $regex: filter.search, $options: "i" },
      };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const item = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          product_name: item.product_name,
          photoURL: item.photoURL,
          tags: item.tags,
          description: item.description,
          externalLink: item.externalLink,
          time: item.time,
          status: item.status,
        },
      };
      const result = await productCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    // for feature
    app.get("/features", async (req, res) => {
      const result = await featureCollection.find().toArray();
      res.send(result);
    });

    app.post("/products/features", async (req, res) => {
      const makeFeatured = req.body;
      const result = await featureCollection.insertOne(makeFeatured);
      res.send(result);
    });

    //  for review
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    app.post("/reviews", async (req, res) => {
      const productReview = req.body;
      const result = await reviewsCollection.insertOne(productReview);
      res.send(result);
    });

    // for report
    app.post("/reports", async (req, res) => {
      const productReport = req.body;
      const result = await reportCollection.insertOne(productReport);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Tech wave server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
