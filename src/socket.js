import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (token) => {
  socket = io("https://chat-backend-abdz.onrender.com", {
    auth: { token: JSON.parse(localStorage.getItem("user"))?.token },
    autoConnect: false, // ← often people forget this line
  });

return socket;
};

export const getSocket = () => socket;