// src/socket.js
import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (token) => {
  socket = io("https://chat-backend-abdz.onrender.com", {
    auth: { token },
  });

  return socket;
};

export const getSocket = () => socket;