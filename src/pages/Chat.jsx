import React, { useEffect, useState } from "react";
import { FaWhatsapp, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useGetAllUsersQuery } from "../features/Users/userApi";
import { getSocket, connectSocket } from "../socket";
import axios from "axios";

export default function Chat() {
  const { data: users = [], isLoading, error } = useGetAllUsersQuery();
  const [socketInstance, setSocketInstance] = useState(null);
const [isConnected, setIsConnected] = useState(false);

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeUser, setActiveUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  /* ================= FILTER USERS ================= */
  const filteredUsers = users
    ?.filter((u) => u._id !== user?._id)
    ?.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  /* ================= FETCH MESSAGES ================= */
  useEffect(() => {
    if (!activeUser) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `https://chat-backend-abdz.onrender.com/api/messages/${activeUser._id}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        setMessages(res.data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();
  }, [activeUser]);

  useEffect(() => {
    if (!user?.token) return;

    const socketInstance = connectSocket(user.token);

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  /* ================= SOCKET LISTENER ================= */

  useEffect(() => {
    const socketInstance = getSocket();
    if (!socketInstance) return;

    socketInstance.on("receiveMessage", (message) => {
      console.log("Received:", message);
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketInstance.off("receiveMessage");
    };
  }, []);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = () => {
    const socketInstance = getSocket();

    if (!newMessage.trim() || !activeUser || !socketInstance) return;

    socketInstance.emit("sendMessage", {
      receiverId: activeUser._id,
      message: newMessage,
    });

    setNewMessage("");
  };

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    const socketInstance = getSocket();
    socketInstance?.disconnect();
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="h-screen flex bg-[#0b141a] text-white">

      {/* ================= SIDEBAR ================= */}
      <div
        className={`flex flex-col bg-[#111b21] border-r border-gray-700
        w-full md:w-1/3 lg:w-1/4
        ${activeUser ? "hidden md:flex" : "flex"}`}
      >
        {/* Header */}
        <div className="p-4 bg-[#202c33] flex items-center gap-3">
          <FaWhatsapp className="text-green-500 text-2xl" />
          <h2 className="font-semibold text-lg">ChatApp</h2>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#2a3942] text-white px-4 py-2 rounded-full focus:outline-none placeholder-gray-400"
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <p className="text-center mt-4 text-gray-400">
              Loading users...
            </p>
          )}

          {error && (
            <p className="text-center mt-4 text-red-500">
              Failed to load users
            </p>
          )}

          {filteredUsers?.length === 0 && (
            <p className="text-center mt-4 text-gray-500">
              No users found
            </p>
          )}

          {filteredUsers?.map((u) => (
            <div
              key={u._id}
              onClick={() => setActiveUser(u)}
              className="p-4 cursor-pointer border-b border-gray-800 hover:bg-[#202c33] transition flex items-center gap-3"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 font-semibold text-white">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{u.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= CHAT WINDOW ================= */}
      <div
        className={`flex flex-col flex-1
        ${!activeUser ? "hidden md:flex" : "flex"}`}
      >
        {activeUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-[#202c33] p-4 flex items-center gap-3 border-b border-gray-700">
              <button
                className="md:hidden"
                onClick={() => setActiveUser(null)}
              >
                <FaArrowLeft />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 font-semibold text-white">
                  {activeUser.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-semibold text-lg">
                  {activeUser.name}
                </h2>
              </div>

              <button
                onClick={handleLogout}
                className="ml-auto bg-red-600 hover:bg-red-700 px-4 py-1 rounded-full text-sm transition"
              >
                Logout
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${msg.sender === user._id
                    ? "justify-end"
                    : "justify-start"
                    }`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-[75%] ${msg.sender === user._id
                      ? "bg-green-600 rounded-br-none"
                      : "bg-[#202c33] rounded-bl-none"
                      }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 bg-[#202c33] flex gap-3 items-center">
              <input
                type="text"
                placeholder="Type a message"
                className="flex-1 bg-[#2a3942] px-4 py-2 rounded-full focus:outline-none"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && sendMessage()
                }
              />

              <button
                onClick={sendMessage}
                className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-full transition"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}