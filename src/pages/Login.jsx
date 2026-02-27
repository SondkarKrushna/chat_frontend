import React, { useState } from "react";
import { connectSocket } from "../socket";
import { useNavigate } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { useLoginMutation } from "../features/auth/authApi";

export default function Login() {
  const [login, { isLoading, error }] = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const userData = await login({ email, password }).unwrap();

      // Save full user (includes token)
      localStorage.setItem("user", JSON.stringify(userData));

      // Connect socket with JWT
      connectSocket(userData.token);

      navigate("/chat");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0b141a]">

      {/* Left Section */}
      <div className="flex flex-col justify-center items-center md:w-1/2 bg-[#111b21] text-white p-8 md:p-10">

        {/* Mobile → Only ChatApp */}
        <h1 className="text-3xl font-bold text-green-500 md:hidden">
          ChatApp
        </h1>

        {/* Desktop View */}
        <div className="hidden md:flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <FaWhatsapp className="text-green-500 text-5xl" />
            <h1 className="text-4xl font-bold text-green-500">
              ChatApp
            </h1>
          </div>

          <p className="text-gray-400 text-center max-w-md">
            Welcome back! Continue your conversations securely and instantly.
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-1 justify-center items-center p-6">

        <form
          onSubmit={handleLogin}
          className="bg-[#202c33] p-6 md:p-8 rounded-xl shadow-xl w-full max-w-md text-white"
        >
          {/* Logo inside form (Mobile friendly) */}
          <div className="flex flex-col items-center mb-6 md:hidden">
            <FaWhatsapp className="text-green-500 text-4xl mb-2" />
          </div>

          <h2 className="text-xl md:text-2xl font-semibold mb-6 text-center">
            Login to Chat
          </h2>

          <input
            type="email"
            placeholder="Enter Email"
            className="w-full p-3 mb-4 rounded bg-[#2a3942] border border-gray-600 focus:outline-none focus:border-green-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Enter Password"
            className="w-full p-3 mb-6 rounded bg-[#2a3942] border border-gray-600 focus:outline-none focus:border-green-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 transition p-3 rounded font-semibold"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <p className="text-sm text-gray-400 mt-4 text-center">
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/register")}
              className="text-green-500 cursor-pointer hover:underline"
            >
              Register
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}