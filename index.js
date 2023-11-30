const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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

    const userCollection = client.db("techWaveDB").collection("users");
    const productCollection = client.db("techWaveDB").collection("products");
    const upVoteCollection = client.db("techWaveDB").collection("upVote");
    const downVoteCollection = client.db("techWaveDB").collection("downVote");
    const featureCollection = client.db("techWaveDB").collection("features");
    const reviewsCollection = client.db("techWaveDB").collection("reviews");
    const reportCollection = client.db("techWaveDB").collection("reports");
    const couponCollection = client.db("techWaveDB").collection("coupon");
    const paymentCollection = client.db("techWaveDB").collection("payments");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res.send({ token });
    });

    // middleware to verify jwt token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //  verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    //  verify moderator
    const verifyModerator = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isModerator = user?.role === "moderator";
      if (!isModerator) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    // user related api

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/users/moderator/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let moderator = false;
      if (user) {
        moderator = user?.role === "moderator";
      }
      res.send({ moderator });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email to check if user already exists
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.patch(
      "/users/moderator/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "moderator",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

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

    app.get("/products/user/:email", verifyToken, async (req, res) => {
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

    app.post("/products", verifyToken, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    app.patch("/products/:id", verifyToken, async (req, res) => {
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

    app.delete("/products/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    // for upvote
    app.get("/upVote/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const result = await upVoteCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/product/upVote/:id", async (req, res) => {
      const id = req.params.id;
      const query = { product_id: id };
      const result = await upVoteCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/product/upVote", verifyToken, async (req, res) => {
      const upVoteUserInfo = req.body;
      // insert vote to check if user already vote or not
      const query = {
        user_email: upVoteUserInfo.user_email,
        product_id: upVoteUserInfo.product_id,
      };
      const existingVote = await upVoteCollection.findOne(query);
      if (existingVote) {
        return res.send({
          message: "Your already voted this product",
          insertedId: null,
        });
      }
      const result = await upVoteCollection.insertOne(upVoteUserInfo);
      res.send(result);
    });

    // for downVote
    app.get("/downVote/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const result = await downVoteCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/product/downVote/:id", async (req, res) => {
      const id = req.params.id;
      const query = { product_id: id };
      const result = await downVoteCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/product/downVote", verifyToken, async (req, res) => {
      const downVoteUserInfo = req.body;
      // insert vote to check if user already vote or not
      const query = {
        user_email: downVoteUserInfo.user_email,
        product_id: downVoteUserInfo.product_id,
      };
      const existingVote = await downVoteCollection.findOne(query);
      if (existingVote) {
        return res.send({
          message: "Your already voted this product",
          insertedId: null,
        });
      }
      const result = await downVoteCollection.insertOne(downVoteUserInfo);
      res.send(result);
    });

    // for feature
    app.get("/features", async (req, res) => {
      const result = await featureCollection.find().toArray();
      res.send(result);
    });

    app.get("/features/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await featureCollection.findOne(query);
      res.send(result);
    });

    app.post(
      "/products/features",
      verifyToken,
      verifyModerator,
      async (req, res) => {
        const makeFeatured = req.body;
        const result = await featureCollection.insertOne(makeFeatured);
        res.send(result);
      }
    );

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
    app.get("/reports", verifyToken, verifyModerator, async (req, res) => {
      const result = await reportCollection.find().toArray();
      res.send(result);
    });

    app.post("/reports", async (req, res) => {
      const productReport = req.body;
      const result = await reportCollection.insertOne(productReport);
      res.send(result);
    });

    app.delete(
      "/reports/:id",
      verifyToken,
      verifyModerator,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await reportCollection.deleteOne(query);
        res.send(result);
      }
    );

    // for coupon code
    app.get("/coupon", async (req, res) => {
      const result = await couponCollection.find().toArray();
      res.send(result);
    });

    app.get("/coupon/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await couponCollection.findOne(query);
      res.send(result);
    });

    app.post("/coupon", verifyToken, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await couponCollection.insertOne(product);
      res.send(result);
    });

    app.patch("/coupon/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const item = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          coupon_code: item.coupon_code,
          discount_amount: item.discount_amount,
          expiry_date: item.expiry_date,
          description: item.description,
        },
      };
      const result = await couponCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/coupon/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await couponCollection.deleteOne(query);
      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params?.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      res.send(paymentResult);
    });

    // for admin stats
    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const products = await productCollection.estimatedDocumentCount();
      const reviews = await reviewsCollection.estimatedDocumentCount();

      res.send([
        { users: users },
        { products: products },
        { reviews: reviews },
      ]);
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
