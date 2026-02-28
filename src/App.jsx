import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { connectSocket } from "./socket";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import UserModel from "./pages/UserModel";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat/:userId?" element={<Chat />} />
        <Route path="/profile/:id" element={<UserModel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;