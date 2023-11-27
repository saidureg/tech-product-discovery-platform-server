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
    const reviewsCollection = client.db("techWaveDB").collection("reviews");
    const reportCollection = client.db("techWaveDB").collection("reports");

    // product related api
    app.get("/products", async (req, res) => {
      const query = {
        status: "accepted",
      };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
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
