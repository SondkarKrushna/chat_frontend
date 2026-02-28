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
  const [lastMessages, setLastMessages] = useState({});

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
    if (!users.length || !token) return;

    const fetchLastMessages = async () => {
      try {
        const results = await Promise.all(
          users.map(async (user) => {
            if (user._id === loggedUserId) return null;

            const res = await axios.get(
              `https://chat-backend-abdz.onrender.com/api/messages/${user._id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            const messages = res.data;
            if (!messages.length) return null;

            const lastMessage = messages[messages.length - 1];

            return {
              userId: user._id,
              lastMessage,
            };
          })
        );

        const mapped = {};
        results.forEach((item) => {
          if (item) {
            mapped[item.userId] = item.lastMessage;
          }
        });

        setLastMessages(mapped);
      } catch (err) {
        console.error("Failed to fetch last messages", err);
      }
    };

    fetchLastMessages();
  }, [users, token, loggedUserId]);

  useEffect(() => {
    if (!socketInstance) return;

    const handleReceiveMessage = (message) => {
      const senderId = message.sender?._id || message.sender;
      const receiverId = message.receiver?._id || message.receiver;

      const otherUserId =
        senderId === loggedUserId ? receiverId : senderId;

      // ✅ Update last message for sidebar
      setLastMessages((prev) => ({
        ...prev,
        [otherUserId]: message,
      }));

      // ✅ Update active chat messages
      if (activeUser) {
        const isMessageForThisChat =
          (senderId === loggedUserId &&
            receiverId === activeUser._id) ||
          (senderId === activeUser._id &&
            receiverId === loggedUserId);

        if (isMessageForThisChat) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === message._id))
              return prev;
            return [...prev, message];
          });
        }
      }
    };

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

    const messageData = {
      receiverId: activeUser._id,
      message: newMessage,
    };

    socketInstance.emit("sendMessage", messageData);

    // Optimistic update for sidebar
    const tempMessage = {
      message: newMessage,
      createdAt: new Date().toISOString(),
    };

    setLastMessages((prev) => ({
      ...prev,
      [activeUser._id]: tempMessage,
    }));

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
    )
    .sort((a, b) => {
      const aLast = lastMessages[a._id]?.createdAt;
      const bLast = lastMessages[b._id]?.createdAt;

      if (!aLast) return 1;
      if (!bLast) return -1;

      return new Date(bLast) - new Date(aLast);
    });

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatMessageDate = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday =
      messageDate.toDateString() === today.toDateString();

    const isYesterday =
      messageDate.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    return messageDate.toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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

          <div
            onClick={() => navigate(`/profile/${loggedUserId}`)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-green-600 font-semibold cursor-pointer"
          >
            {loggedUser?.user?.name?.charAt(0)?.toUpperCase() ||
              loggedUser?.name?.charAt(0)?.toUpperCase()}
          </div>
        </div>

        <div className="flex flex-col h-full">

          {/* Scrollable Users List */}
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
                  {/* Avatar */}
                  <div className="relative">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${u._id}`);
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 font-semibold cursor-pointer hover:scale-105 transition"
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>

                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#111b21] rounded-full"></span>
                    )}
                  </div>

                  {/* Name + Message + Time */}
                  <div className="flex flex-1 justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium">{u.name}</span>

                      <span className="text-xs text-gray-400 truncate max-w-[160px]">
                        {lastMessages[u._id]?.message
                          ? lastMessages[u._id].message
                          : isOnline
                            ? "Online"
                            : "Offline"}
                      </span>
                    </div>

                    {lastMessages[u._id]?.createdAt && (
                      <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                        {formatTime(lastMessages[u._id].createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logout Section */}
          <div className="p-4 border-t border-gray-800 bg-[#111b21]">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg text-sm font-medium transition">
              Logout
            </button>
          </div>

        </div>
      </div>

      <div className={`flex flex-col flex-1 relative ${!activeUser ? "hidden md:flex" : "flex"}`}>
        {activeUser ? (
          <>
            <div className="bg-[#202c33] p-4 flex items-center gap-3 border-b border-gray-700">
              <button className="md:hidden" onClick={() => navigate("/chat")}>
                <FaArrowLeft />
              </button>

              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 font-semibold">
                {activeUser.name.charAt(0).toUpperCase()}
              </div>

              <div
                className="cursor-pointer"
                onClick={() => navigate(`/profile/${activeUser._id}`)}
              >
                <h2 className="font-semibold text-lg hover:underline">
                  {activeUser.name}
                </h2>

                <p className="text-xs text-gray-400">
                  {onlineUsers.includes(activeUser._id) ? (
                    <span className="text-green-400">Online</span>
                  ) : (
                    "Offline"
                  )}
                </p>
              </div>
            </div>

            <div className="flex-1 p-4 pb-24 overflow-y-auto space-y-3">

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
                  {messages.map((msg, index) => {
                    const senderId = msg.sender?._id || msg.sender;
                    const isMe = senderId === loggedUserId;

                    const currentDate = new Date(msg.createdAt).toDateString();
                    const prevDate =
                      index > 0
                        ? new Date(messages[index - 1].createdAt).toDateString()
                        : null;

                    const showDateSeparator = currentDate !== prevDate;

                    return (
                      <React.Fragment key={msg._id}>
                        {/* ✅ Date Separator */}
                        {showDateSeparator && (
                          <div className="flex justify-center my-4">
                            <div className="bg-[#1f2c34] text-gray-300 text-xs px-3 py-1 rounded-full shadow">
                              {formatMessageDate(msg.createdAt)}
                            </div>
                          </div>
                        )}

                        {/* ✅ Message Bubble */}
                        <div
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`
                                px-3 py-1.5 md:px-4 md:py-2
                                rounded-2xl
                                max-w-[85%] md:max-w-[75%]
                                text-sm md:text-base
                                break-words
                                ${isMe
                                ? "bg-green-600 rounded-br-none"
                                : "bg-[#202c33] rounded-bl-none"
                              }
                            `}
                          >
                            <div>{msg.message}</div>
                            <div
                              className={`text-[10px] md:text-xs mt-1 text-right ${isMe ? "text-green-200" : "text-gray-400"
                                }`}
                            >
                              {formatTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-[#202c33] px-3 py-2 md:px-4 md:py-3 rounded-2xl rounded-bl-none">
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

            <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-[#202c33] flex gap-2 md:gap-3 items-center">
              <input
                type="text"
                placeholder="Type a message"
                className="flex-1 bg-[#2a3942] px-3 py-1.5 md:px-4 md:py-2 rounded-full focus:outline-none text-sm md:text-base"
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
                className="bg-green-600 hover:bg-green-700 px-4 py-1.5 md:px-5 md:py-2 rounded-full text-sm md:text-base"
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