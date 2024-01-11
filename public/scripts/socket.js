const Socket = (function() {
    // This stores the current Socket.IO socket
    let socket = null;

    // This function gets the socket from the module
    const getSocket = function() {
        return socket;
    };

    // This function connects the server and initializes the socket
    const connect = function() {
        socket = io();

        // Wait for the socket to connect successfully
        socket.on("connect", () => {
            // Get the online user list
            //when browser connect to server successfully then will send "get users" to server
            socket.emit("get users");

            // Get the chatroom messages
            socket.emit("get messages");
        });

        // Set up the users event
        socket.on("users", (onlineUsers) => {
            onlineUsers = JSON.parse(onlineUsers);

            //REMOVE TIHS PART
            // console.log("in browser now the onlineUsers is", onlineUsers);

            // Show the online users
            OnlineUsersPanel.update(onlineUsers);
        });

        // Set up the add user event
        socket.on("add user", (user) => {
            user = JSON.parse(user);

            // Add the online user
            OnlineUsersPanel.addUser(user);
        });

        // Set up the remove user event
        socket.on("remove user", (user) => {
            user = JSON.parse(user);

            // Remove the online user
            OnlineUsersPanel.removeUser(user);
        });

        // Set up the messages event
        socket.on("messages", (chatroom) => {
            chatroom = JSON.parse(chatroom);

            // Show the chatroom messages
            ChatPanel.update(chatroom);
        });

        // Set up the add message event
        socket.on("add message", (message) => {
            message = JSON.parse(message);

            // Add the message to the chatroom
            ChatPanel.addMessage(message);
        });

        socket.on("add type message", (message) => {
            message = JSON.parse(message);
            // message either contain new_username/""
            let return_message = "";
            let return_userName = "";
            if(message == ""){
                return_message = "";
            }
            else{
                return_userName = message;
                return_message = message + " is typing...";
            }

            // Add the message to the chatroom
            ChatPanel.updateTypeArea(return_userName, return_message);
        });
    };

    // This function disconnects the socket from the server
    const disconnect = function() {
        socket.disconnect();
        socket = null;
    };

    // This function sends a post message event to the server
    const postMessage = function(content) {
        if (socket && socket.connected) {
            socket.emit("post message", content);
        }
    };

    //IMPROVEMENT
    const postTypingMessage = function() {
        if (socket && socket.connected) {
            socket.emit("type message");
        }
    };

    const removeTypingMessage = function() {
        if (socket && socket.connected) {
            socket.emit("remove type message");
        }
    };

    return { getSocket, connect, disconnect, postMessage,removeTypingMessage, postTypingMessage };
})();
