const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middlle Ware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.sxvrkdg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Verify JSON WEB TOKEN
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function powerHack() {
  try {
    await client.connect();

    const userCollection = client
      .db("powerHackCollecction")
      .collection("registerCollection");

    const userDataCollection = client
      .db("powerHackCollecction")
      .collection("dataCollection");

    app.put("/registration/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.JWT_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ result, token });
    });

    app.post("/login/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const userEmail = req.body.email;
      const userPass = req.body.password;
      const dataInfo = await userCollection.findOne(filter);
      const dataEmail = dataInfo?.email;
      const dataPass = dataInfo?.password;
      if (userEmail === dataEmail && userPass === dataPass) {
        res.send({
          success: true,
        });
      } else {
        res.send({ success: false });
      }
    });

    app.post("/add-billing", async (req, res) => {
      const data = req.body;
      const result = await userDataCollection.insertOne(data);
      res.send(result);
    });

    app.get("/billing-list", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = {};
      const dataSort = { name: -1}
      const cursor = userDataCollection.find(query).sort(dataSort);
      let data;
      if (page || size) {
        data = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        data = await (await cursor.toArray());
      }

      res.send(data);
    });

    app.get('/data-list', async (req, res) =>{
      const result = await userDataCollection.find().toArray()
      res.send(result)
    })


    app.get('/billing-list-count', async(req, res) =>{
      const count = await userDataCollection.estimatedDocumentCount();
      res.send({count});
  });

  app.get("/update-billing/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await userDataCollection.findOne(query);
    res.send(result);
  });

  app.put("/update-billing/:id", async (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const filter = {_id: ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = {
      $set: data,
    };
    const result = await userDataCollection.updateOne(filter, updateDoc, options);
    res.send(result);
  });

  app.delete("/delete-billing/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await userDataCollection.deleteOne(query);
    res.send(result);
  });

  app.get('/billing-list-search-email', async (req, res) => {
    const value = req.query.value;
    const search = req.query.search;
    const cursor = {}
    const result =  userDataCollection.find(cursor)
    if( value === search){
      await result.toArray()
      res.send(result)
    }else{
      return res.send({ success: false });
    }
})


  } finally {
  }
}
powerHack().catch(console.dir());

app.get("/", (req, res) => {
  res.send("Hello, Welcome PowerHack World!");
});

app.listen(port);
