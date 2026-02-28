import React, { useEffect, useState, useMemo } from "react";
import { FaWhatsapp, FaArrowLeft } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { useGetAllUsersQuery } from "../features/Users/userApi";
import { connectSocket } from "../socket";
import axios from "axios";

export default function Chat() {
  const { data: users = [], isLoading, error } = useGetAllUsersQuery();
  const { userId } = useParams();
  const navigate = useNavigate();

  const loggedUser = JSON.parse(localStorage.getItem("user") || "null");
  const loggedUserId = loggedUser?._id || loggedUser?.user?._id;
  const token = loggedUser?.token;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socketInstance, setSocketInstance] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!token) navigate("/");
  }, [token, navigate]);

  const activeUser = useMemo(() => {
    return users.find((u) => u._id === userId);
  }, [users, userId]);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    setSocketInstance(socket);

    return () => socket.disconnect();
  }, [token]);

  useEffect(() => {
    if (!activeUser || !token) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `https://chat-backend-abdz.onrender.com/api/messages/${activeUser._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages(res.data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();
  }, [activeUser, token]);

  useEffect(() => {
    if (!socketInstance || !activeUser) return;

    const handleReceiveMessage = (message) => {
      const senderId = message.sender?._id || message.sender;
      const receiverId = message.receiver?._id || message.receiver;

      const isMessageForThisChat =
        (senderId === loggedUserId && receiverId === activeUser._id) ||
        (senderId === activeUser._id && receiverId === loggedUserId);

      if (isMessageForThisChat) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    };
    console.log(activeUser._id);
    socketInstance.on("receiveMessage", handleReceiveMessage);

    return () => {
      socketInstance.off("receiveMessage", handleReceiveMessage);
    };
  }, [socketInstance, activeUser, loggedUserId]);

  useEffect(() => {
    if (!socketInstance || !activeUser) return;

    const handleTyping = ({ senderId }) => {
      if (senderId === activeUser._id) setIsTyping(true);
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === activeUser._id) setIsTyping(false);
    };

    socketInstance.on("typing", handleTyping);
    socketInstance.on("stopTyping", handleStopTyping);

    return () => {
      socketInstance.off("typing", handleTyping);
      socketInstance.off("stopTyping", handleStopTyping);
    };
  }, [socketInstance, activeUser]);

  useEffect(() => {
    if (!socketInstance) return;

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    socketInstance.on("onlineUsers", handleOnlineUsers);

    return () => {
      socketInstance.off("onlineUsers", handleOnlineUsers);
    };
  }, [socketInstance]);

  const sendMessage = () => {
    if (!newMessage.trim() || !activeUser || !socketInstance) return;

    socketInstance.emit("sendMessage", {
      receiverId: activeUser._id,
      message: newMessage,
    });

    setNewMessage("");
  };

  const handleLogout = () => {
    socketInstance?.disconnect();
    localStorage.removeItem("user");
    navigate("/");
  };

  const filteredUsers = users
    .filter((user) => user._id !== loggedUserId)
    .filter((user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-screen flex bg-[#0b141a] text-white">
      <div
        className={`flex flex-col bg-[#111b21] border-r border-gray-700
        w-full md:w-1/2 lg:w-1/3 xl:w-1/4
        ${activeUser ? "hidden md:flex" : "flex"}`}
      >
        <div className="p-4 bg-[#202c33] border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FaWhatsapp className="text-green-500 text-xl" />
            <h2 className="font-semibold">ChatApp</h2>
          </div>

          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-600 font-semibold">
            {loggedUser?.name?.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map((u) => {
            const isOnline = onlineUsers.includes(u._id);

            return (
              <div
                key={u._id}
                onClick={() => navigate(`/chat/${u._id}`)}
                className={`p-4 cursor-pointer border-b border-gray-800 hover:bg-[#202c33] transition flex items-center gap-3 ${userId === u._id ? "bg-[#202c33]" : ""
                  }`}
              >
                {/* Avatar with online dot */}
                <div className="relative">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 font-semibold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#111b21] rounded-full"></span>
                  )}
                </div>

                {/* Name + Status */}
                <div className="flex flex-col">
                  <span className="font-medium">{u.name}</span>
                  <span className={`text-xs ${isOnline ? "text-green-400" : "text-gray-400"}`}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`flex flex-col flex-1 ${!activeUser ? "hidden md:flex" : "flex"}`}>
        {activeUser ? (
          <>
            <div className="bg-[#202c33] p-4 flex items-center gap-3 border-b border-gray-700">
              <button className="md:hidden" onClick={() => navigate("/chat")}>
                <FaArrowLeft />
              </button>

              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 font-semibold">
                {activeUser.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h2 className="font-semibold text-lg">{activeUser.name}</h2>

                <p className="text-xs text-gray-400">
                  {onlineUsers.includes(activeUser._id) ? (
                    <span className="text-green-400">Online</span>
                  ) : (
                    "Offline"
                  )}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="ml-auto bg-red-600 hover:bg-red-700 px-4 py-1 rounded-full text-sm"
              >
                Logout
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">

              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                  <div className="text-5xl mb-4 wave-hand">👋</div>
                  <h2 className="text-xl font-semibold text-gray-300">
                    Start a conversation
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">
                    Send a message to {activeUser?.name}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const senderId = msg.sender?._id || msg.sender;
                    const isMe = senderId === loggedUserId;

                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`px-4 py-2 rounded-2xl max-w-[75%] ${isMe
                            ? "bg-green-600 rounded-br-none"
                            : "bg-[#202c33] rounded-bl-none"
                            }`}
                        >
                          <div>{msg.message}</div>
                          <div
                            className={`text-xs mt-1 text-right ${isMe ? "text-green-200" : "text-gray-400"
                              }`}
                          >
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-[#202c33] px-4 py-3 rounded-2xl rounded-bl-none">
                        <div className="flex items-center gap-1">
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            <div className="p-3 bg-[#202c33] flex gap-3 items-center">
              <input
                type="text"
                placeholder="Type a message"
                className="flex-1 bg-[#2a3942] px-4 py-2 rounded-full focus:outline-none"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);

                  if (!socketInstance || !activeUser) return;

                  socketInstance.emit("typing", {
                    receiverId: activeUser._id,
                  });

                  if (typingTimeout) {
                    clearTimeout(typingTimeout);
                  }

                  const timeout = setTimeout(() => {
                    socketInstance.emit("stopTyping", {
                      receiverId: activeUser._id,
                    });
                  }, 1000);

                  setTypingTimeout(timeout);
                }}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-full"
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