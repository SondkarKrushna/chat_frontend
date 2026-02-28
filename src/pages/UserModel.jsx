import React from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { useGetUserByIdQuery } from "../features/Users/userApi";

export default function UserModel() {
    const navigate = useNavigate();
    const { id } = useParams();

    const { data: user, isLoading, error } = useGetUserByIdQuery(id);


    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0b141a] text-white">
                Loading...
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0b141a] text-white">
                User not found
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#0b141a] text-white flex justify-center items-center">
            <div className="w-full max-w-md bg-[#111b21] rounded-2xl shadow-lg overflow-hidden">

                {/* Header */}
                <div className="bg-[#202c33] p-4 flex items-center gap-3 border-b border-gray-700">
                    <button onClick={() => navigate(-1)}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="text-lg font-semibold">User Profile</h2>
                </div>

                {/* Profile Section */}
                <div className="flex flex-col items-center p-6">

                    {/* Avatar */}
                    <div className="w-20 h-20 flex items-center justify-center rounded-full bg-green-600 text-3xl font-bold mb-4">
                        {user.name?.charAt(0).toUpperCase()}
                    </div>

                    {/* Name */}
                    <div className="w-full bg-[#202c33] p-4 rounded-xl mb-3">
                        <p className="text-xs text-gray-400">Name</p>
                        <p className="text-lg font-medium">{user.name}</p>
                    </div>

                    {/* Email */}
                    <div className="w-full bg-[#202c33] p-4 rounded-xl mb-3">
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="text-lg font-medium">{user.email}</p>
                    </div>

                </div>
            </div>
        </div>
    );
}