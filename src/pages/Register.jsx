import React, { useState } from "react";
import { useRegisterMutation } from "../features/auth/authApi";
import { useNavigate } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [register] = useRegisterMutation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form).unwrap();
      navigate("/");
    } catch (err) {
      console.log("Full error:", err);
      console.log("Error data:", err?.data);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0b141a]">

      {/* Left Section */}
      <div className="flex flex-col justify-center items-center md:w-1/2 bg-[#111b21] text-white p-8 md:p-10">

        {/* Mobile View → Only Name */}
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
            Connect with your friends and family instantly.
            Fast, secure, and reliable messaging just like WhatsApp.
          </p>
        </div>

      </div>

      {/* Right Section */}
      <div className="flex flex-1 justify-center items-center p-6 md:p-0">

        <form
          onSubmit={handleSubmit}
          className="bg-[#202c33] p-6 md:p-8 rounded-xl shadow-lg w-full max-w-md text-white"
        >

          {/* Form Header */}
          <div className="flex flex-col items-center mb-6">
            <FaWhatsapp className="text-green-500 text-3xl md:text-4xl mb-2" />
            <h2 className="text-xl md:text-2xl font-semibold">
              Create Account
            </h2>
          </div>

          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-3 mb-4 rounded bg-[#2a3942] border border-gray-600 focus:outline-none focus:border-green-500"
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-3 mb-4 rounded bg-[#2a3942] border border-gray-600 focus:outline-none focus:border-green-500"
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 mb-6 rounded bg-[#2a3942] border border-gray-600 focus:outline-none focus:border-green-500"
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />

          <button className="w-full bg-green-600 hover:bg-green-700 transition p-3 rounded font-semibold">
            Register
          </button>

          <p className="text-sm text-gray-400 mt-4 text-center">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/")}
              className="text-green-500 cursor-pointer hover:underline"
            >
              Login
            </span>
          </p>

        </form>
      </div>
    </div>
  );
}