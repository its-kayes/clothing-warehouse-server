const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
let app = express();

app.use(cors());
app.use(express.json());

function confirmJWT(req, res, next) {
    let authheader = req.headers.authorization;
    if (!authheader) {
        return res.status(401).send({ massage: "Unauthorized Access" })
    }
    let token = authheader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ massage: " Forbidden Access " })
        }
        console.log("Decoded", decoded)
        req.decoded = decoded;
    })
    next();
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.s5lkv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const inventoryItems = client.db("clothing").collection("inventory");
        let emailsForAlert = client.db("clothing").collection("emails");

        // Load db
        app.get('/items', async (req, res) => {
            const query = {};
            const cursor = inventoryItems.find(query);
            const items = await cursor.toArray();
            res.send(items);
        });

        // Get Item by id
        app.get('/items/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const item = await inventoryItems.findOne(query);
            res.send(item);
        });

        // Add to db 
        app.post('/additemtodb', async (req, res) => {
            let newItem = req.body;
            let addData = await inventoryItems.insertOne(newItem)
            res.send(addData);
        });

        // Delete Part
        app.delete('/items/:id', async (req, res) => {
            let id = req.params.id;
            let query = { _id: ObjectId(id) };
            let item = await inventoryItems.deleteOne(query);
            res.send(item);
        });

        // Update Quantity Part 
        app.put('/items/:id', async (req, res) => {
            let id = req.params.id;
            let newObject = req.body;
            let query = { _id: ObjectId(id) };
            let options = { upsert: true };
            let updatedProduct = {
                $set: {
                    quantity: newObject.quantity
                }
            }
            let result = await inventoryItems.updateOne(query, updatedProduct, options);
            res.send(result);
        })

        // My Item Part 
        app.get('/myitems', confirmJWT, async (req, res) => {
            let decodedEmail = req.decoded.email;
            let email = req.query.email;
            if (email === decodedEmail) {
                let query = { email: email };
                let cursor = inventoryItems.find(query);
                let items = await cursor.toArray();
                res.send(items);
            }
            else(
                res.status(403).send({massage: "Forbidden Access"})
            )
        })

        // Emails For Alert
        app.post('/emails', async(req, res)=> {
            let getEmails = req.body;
            let emails = await emailsForAlert.insertOne(getEmails);
            res.send(emails);
        })

        // Authencation
        app.post('/login', async (req, res) => {
            let user = req.body;
            let accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '20d'
            })
            res.send({ accessToken });
        })


    }
    finally {

    }
}


run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Clothing Warehouse Server Is On Fire ');
});

app.listen(port, () => {
    console.log('Run Server to port', port);
})


