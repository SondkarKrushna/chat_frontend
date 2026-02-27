import React, { useEffect, useState } from "react";
import { FaWhatsapp, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useGetAllUsersQuery } from "../features/Users/userApi";
import { getSocket, connectSocket } from "../socket";
import axios from "axios";

export default function Chat() {
  const { data: users = [], isLoading, error } = useGetAllUsersQuery();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeUser, setActiveUser] = useState(() => {
    const saved = localStorage.getItem("activeUser");
    return saved ? JSON.parse(saved) : null;
  });
  const [searchTerm, setSearchTerm] = useState("");

  /* ================= FILTER USERS ================= */
  const filteredUsers = users
    ?.filter((u) => u._id !== user?._id)
    ?.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  /* ================= FETCH MESSAGES ================= */
  const fetchMessages = async () => {
    if (!activeUser) return;

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

  useEffect(() => {
    fetchMessages();
  }, [activeUser]);

  /* ================= SOCKET CONNECT ================= */
  useEffect(() => {
    if (!user?.token) return;

    const socket = connectSocket(user.token);

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  /* ================= SOCKET LISTENER ================= */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceive = (message) => {
      if (
        activeUser &&
        (message.sender === activeUser._id ||
          message.receiver === activeUser._id ||
          message.sender?._id === activeUser._id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on("receiveMessage", handleReceive);

    return () => {
      socket.off("receiveMessage", handleReceive);
    };
  }, [activeUser]);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = () => {
    const socket = getSocket();

    if (!newMessage.trim() || !activeUser || !socket) return;

    socket.emit("sendMessage", {
      receiverId: activeUser._id,
      message: newMessage,
    });

    setNewMessage("");

    // Refresh from DB (ensures permanent sync)
    setTimeout(() => {
      fetchMessages();
    }, 200);
  };

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    const socket = getSocket();
    socket?.disconnect();
    localStorage.removeItem("user");
    localStorage.removeItem("activeUser");
    navigate("/");
  };

  /* ================= UI ================= */
  return (
    <div className="h-screen flex bg-[#0b141a] text-white">
      
      {/* ================= SIDEBAR ================= */}
      <div
        className={`flex flex-col bg-[#111b21] border-r border-gray-700
        w-full md:w-1/3 lg:w-1/4
        ${activeUser ? "hidden md:flex" : "flex"}`}
      >
        <div className="p-4 bg-[#202c33] flex items-center gap-3">
          <FaWhatsapp className="text-green-500 text-2xl" />
          <h2 className="font-semibold text-lg">ChatApp</h2>
        </div>

        <div className="p-3">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#2a3942] px-4 py-2 rounded-full focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers?.map((u) => (
            <div
              key={u._id}
              onClick={() => {
                setActiveUser(u);
                localStorage.setItem("activeUser", JSON.stringify(u));
              }}
              className="p-4 cursor-pointer border-b border-gray-800 hover:bg-[#202c33] transition flex items-center gap-3"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 font-semibold">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <span>{u.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= CHAT WINDOW ================= */}
      <div className={`flex flex-col flex-1 ${!activeUser ? "hidden md:flex" : "flex"}`}>
        {activeUser ? (
          <>
            <div className="bg-[#202c33] p-4 flex items-center gap-3">
              <button className="md:hidden" onClick={() => setActiveUser(null)}>
                <FaArrowLeft />
              </button>
              <h2 className="font-semibold text-lg">{activeUser.name}</h2>
              <button
                onClick={handleLogout}
                className="ml-auto bg-red-600 px-4 py-1 rounded-full text-sm"
              >
                Logout
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => {
                const isMe =
                  msg.sender?._id === user._id ||
                  msg.sender === user._id;

                return (
                  <div
                    key={msg._id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-[75%] ${
                        isMe
                          ? "bg-green-600 rounded-br-none"
                          : "bg-[#202c33] rounded-bl-none"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-[#202c33] flex gap-3">
              <input
                type="text"
                placeholder="Type a message"
                className="flex-1 bg-[#2a3942] px-4 py-2 rounded-full focus:outline-none"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 px-5 py-2 rounded-full"
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