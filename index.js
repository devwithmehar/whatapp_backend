import express from 'express';
import mongoose from 'mongoose';
import Messages from './dbMessages.js'
import Pusher from 'pusher'
import dotenv from 'dotenv'
dotenv.config()
import cors from 'cors'



//app config
const app = express();

const port = process.env.PORT || 9000;


const pusher = new Pusher({
    appId: process.env.appId,
    key: process.env.pusher_key,
    secret: process.env.pusher_secret,
    cluster: process.env.pusher_cluster,
    useTLS: true
  });

//middleware
app.use(express.json());

app.use(cors())


//DB config
const connection_url = process.env.mongo_url;

mongoose.connect(connection_url , {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection

db.once('open', () =>{
    console.log(`The Database is Connected`);

    const msgCollection = db.collection("messagecontents");
    const changeStream = msgCollection.watch();

    changeStream.on('change',(change) =>{
        console.log(`A change occured` , change);

        if(change.operationType === 'insert') {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages','inserted',{
                name: messageDetails.name,
                message: messageDetails.message
                
            });
        
        }
        else{
            console.log(`Error triggering pusher`)
        }
    })
})

//api routes

app.get('/' , (req, res) => {
    res.status(200).send('Hello World')
})

app.get('/message/sync', (req, res) =>{
     Messages.find((err,data) =>{
         if(err){
             res.status(500).send(err)
         }else{
             res.status(200).send(data)
         }
     })
})

app.post('/messages/new' , (req,res) =>{
    const dbMessage = req.body

    Messages.create(dbMessage , (err, data) => {
        if(err){
            res.status(500).send(err)
        }
        else{
            res.status(201).send(data)
        }
    })
})

//listen
app.listen(port, () =>{
    console.log(`Server is listening at Port : ${port}`)
})