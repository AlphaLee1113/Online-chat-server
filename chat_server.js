const express = require("express");

const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");

// Create the Express app
const app = express();

// Use the 'public' folder to serve static files
app.use(express.static("public"));

// Use the json middleware to parse JSON data
app.use(express.json());

// Use the session middleware to maintain sessions
const chatSession = session({
    secret: "game",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 300000 }
});
app.use(chatSession);

// This helper function checks whether the text only contains word characters
function containWordCharsOnly(text) {
    return /^\w+$/.test(text);
}

// Handle the /register endpoint
app.post("/register", (req, res) => {
    // Get the JSON data from the body
    const { username, avatar, name, password } = req.body;

    //
    // D. Reading the users.json file
    //
    const users = JSON.parse(fs.readFileSync("data/users.json"));

    //
    // E. Checking for the user data correctness

    //1. check username && avatar && name && password not empty
    if(!username){
        res.json({status: "error", error: "The username are empty value"});
        return;
    }
    if(!avatar){
        res.json({status: "error", error: "The avatar are empty value"});
        return;
    }
    if(!name){
        res.json({status: "error", error: "The name are empty value"});
        return;
    }
    if(!password){
        res.json({status: "error", error: "The password are empty value"});
        return;
    }
    //2. usernmae only contaitn underscores, letters or numbers
    if(!containWordCharsOnly(username)){
        res.json({status: "error", error: "Your user name is invalid as it not only contains underscores, letters or numbers"});
        return;
    }
    //3. check username exist in current list of users
    if(username in users){
        res.json({status: "error", error: "This username already exist"});
        return;
    }

    //
    // G. Adding the new user account
    //
    const hash = bcrypt.hashSync(password,10);


    //
    // H. Saving the users.json file
    //
    // users[username] = {avatar: avatar,name: name, password: hash};
    const new_user = {avatar: avatar,name: name, password: hash};
    users[username] = new_user;
    const new_data = JSON.stringify(users, null, " ")
    fs.writeFileSync("data/users.json", new_data);

    //
    // I. Sending a success response to the browser
    //
    res.json({ status: "success" });
    // Delete when appropriate
    
});

// Handle the /signin endpoint
app.post("/signin", (req, res) => {
    // Get the JSON data from the body
    const { username, password } = req.body;

    //
    // D. Reading the users.json file
    //
    const users = JSON.parse(fs.readFileSync("data/users.json"));

    //
    // E. Checking for username/password
    //
    if(!(username in users)){
        res.json({status: "error", error: "This username is not registered yet"});
        return;
    }

    const hashpsw = users[username].password;
    if(!bcrypt.compareSync(password, hashpsw)){
        res.json({status: "error", error: "This password is wrong"});
        return;
    }

    //
    // G. Sending a success response with the user account
    //

    const avatar = users[username].avatar;
    const name = users[username].name;

    req.session.user= {username, avatar, name}; //set the username and avata

    res.json({ status: "success", user: {username, avatar, name} });
 
});

// Handle the /validate endpoint
app.get("/validate", (req, res) => {

    //
    // B. Getting req.session.user
    //
    if(!req.session.user){
        res.json({status: "error", error: "No user has signed-in"});
        return;
    }
    const username = req.session.user.username;
    const avatar = req.session.user.avatar;
    const name = req.session.user.name;

    res.json({ status: "success", user: {username, avatar, name} });
 

    //
    // D. Sending a success response with the user account
    //
});

// Handle the /signout endpoint
app.get("/signout", (req, res) => {

    //
    // Deleting req.session.user
    //
    delete req.session.user;
    //req.session.destroy()

    //
    // Sending a success response
    //
    res.json({ status: "success"});
 

});


//
// ***** Please insert your Lab 6 code here *****
//

// Task 1 create io server
const { createServer } = require("http");
const { Server } = require("socket.io");
const httpServer = createServer( app );
const io = new Server(httpServer);


// task 1.2 using session to stoere iser info in session data
// and need explicitly tell the server to use the server
// ask io to use the seession object for each socket
// then later can use socket.request.session.user to accesss socket ioserver
io.use((socket, next) => {
    chatSession(socket.request, {}, next);
});

//3. the online user list
// JS object to store the online users
const onlineUsers = {};


// 3.manag/ show/ broadcast online user list 
//wait for and handle the socket connection
//connection evnet is take place at the Socket IO server
io.on("connection", (socket) => {
    
    if(socket.request.session.user){ // check if the session is valid
        //3.1 3.3 add a new user 
        //update the online user list 
        const new_username = socket.request.session.user.username;
        const new_avatar = socket.request.session.user.avatar;
        const new_name = socket.request.session.user.name;
        onlineUsers[new_username] = {avatar: new_avatar, name: new_name};
        const user_to_retrun = JSON.stringify({username: new_username, avatar: new_avatar, name: new_name});
        io.emit("add user", user_to_retrun);
        console.log("onlineUsers is", onlineUsers);
    }

    if(socket.request.session.user){
        const new_username = socket.request.session.user.username;
        const new_avatar = socket.request.session.user.avatar;
        const new_name = socket.request.session.user.name;
        //3.3 remove a new user 
        //remove the connection on the browsers socket
        socket.on("disconnect", ()=>{
            delete onlineUsers[new_username];
            const user_to_retrun = JSON.stringify({username: new_username, avatar: new_avatar, name: new_name});
            io.emit("remove user", user_to_retrun);
            console.log("onlineUsers is", onlineUsers);
        });
        socket.on("get users", ()=>{
            const userList = JSON.stringify(onlineUsers);
            socket.emit("users", userList);
        });

        socket.on("get messages", ()=>{
            const chatroom  = JSON.parse(fs.readFileSync("data/chatroom.json"));
            const chatroom_mesages = JSON.stringify(chatroom);
            socket.emit("messages", chatroom_mesages);
        });

        socket.on("post message", (content)=>{
            const new_mesages ={
                user: {username: new_username, avatar: new_avatar, name: new_name},
                datetime: new Date(),
                content: content
            };
            //read chatroom message
            const chatroom  = JSON.parse(fs.readFileSync("data/chatroom.json"));
            //add new message to the chatroom
            chatroom.push(new_mesages);
            const new_chatroom = JSON.stringify(chatroom, null, " ");
            fs.writeFileSync("data/chatroom.json", new_chatroom);
            io.emit("add message", JSON.stringify(new_mesages));
        });

        //IMPROVEMENT
        socket.on("type message", ()=>{
            //read chatroom message
            const typeMessage = new_username;
            // console.log("typeMessage is", typeMessage);
            io.emit("add type message", JSON.stringify(typeMessage));
        });
        socket.on("remove type message", ()=>{
            //read chatroom message
            const typeMessage = "";
            // console.log("typeMessage is", typeMessage);
            io.emit("add type message", JSON.stringify(typeMessage));
        });
    }
})

// Use a web server to listen at port 8000
httpServer.listen(8000, () => {
    console.log("The chat server has started...");
});
