require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');

const app = express();
const port = 4000;

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
  }));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(`mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@cluster0.hchlt1o.mongodb.net/keeperAppDB`, { useNewUrlParser: true });

const usersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Enter name to register']
    },
    username:{
        type: String,
        required: [true, 'username cannot be blank']
    },
    password: {
        type: String
    }
})

const notesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title cant be blank']
    },
    content:{
        type: String,
        required: [true, 'Content cannot be blank.']
    },
    user_id: {
        type: String,
        required: [true]
    },
    created_at: String
})

usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);

const User = new mongoose.model("User", usersSchema);
const Note = new mongoose.model("Note", notesSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


const corsOptions = {
  origin: 'http://localhost:3000', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, 
};
  
app.use(cors(corsOptions));
app.use(bodyParser.json());

app.get("/", (req, res)=>{
    res.send("<h1>Server Running</h1>")
})

app.post("/createUser", async(req, res)=>{
  const { name, username, password } = req.body;
  const existingUser = await User.findOne({username: username});

  if(existingUser){
      res.status(404).send({ err: "User already registered. Please login." });
  } else{
      User.register({username: username, name: name}, password, function(err, user){
        if (err) {
          console.log(err);
          res.sendStatus(500);
        } else {
          passport.authenticate("local")(req, res, function(){
            res.status(200).send({userId: user._id});
          });
        }
      });
  }
});

app.post("/login", async (req, res)=>{
  const existingUser = await User.findOne({username: req.body.username});

  if(existingUser){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    req.login(user, function(err){
      if (err) {
        console.log(err);
        res.status(401).send({ err: err });
      } else {
        passport.authenticate("local")(req, res, function(){
          res.status(200).send({userId: existingUser._id});
        });
      }
    });
  } else{
      res.status(401).send({ err: "User is not registered. Please Sign Up." });
  }
})

app.get("/getUser/:id", async(req, res)=>{
  const user_id = req.params.id;

  try{
      const user = await User.findOne({_id: user_id});
      res.status(200).send(user);
  } catch(err){
      console.log(err);
      res.sendStatus(500);
  }
})

app.get("/notes/:id", async (req, res)=>{
  try{
    const user_id = req.params.id;

    const notes = await Note.find({user_id: user_id});
    res.status(200).send(notes);
  } catch(err){
    console.log(err);
  }
})

app.post("/note", (req, res)=>{
    const { title, content, user_id } = req.body;

    const note = new Note({
      title: title,
      content: content,
      user_id: user_id,
      created_at: new Date()
    })

    note.save();
    res.status(200).send(note);
})

app.get("/getNote/:id", async(req, res)=>{
  try{
    const id = req.params.id;
    const note = await Note.findOne({_id: id});

    res.status(200).send(note);
  } catch(err){
    console.log(err);
    res.sendStatus(500);
  }
})

app.post("/editNote", async(req, res)=>{
  try{
    const {id, title, content} = req.body;

    const note = await Note.findOne({_id: id});
    note.title = title;
    note.content = content;
    note.save();

    res.status(200).send({user_id: note.user_id})
  } catch(err){
    console.log(err);
    res.sendStatus(500);
  }
})

app.post("/deleteNote/:id", async (req, res)=>{
    const note_id = req.params.id;

    try{
      await Note.findByIdAndRemove(note_id);
      res.status(200).send({isDeleted: true});
    } catch(err){
        console.log(err);
        res.sendStatus(500);
    }
})

app.listen(port, function(){
    console.log(`Server started at localhost ${port}`);
})
