import { useMemo, useState } from "react";
import { FiUser, FiMail, FiHome, FiMapPin } from "react-icons/fi";
import { getUser } from "../../lib/auth";

export default function Profile() {
  const baseUser = useMemo(() => getUser());
  const [user] = useState(baseUser);

  return (
    <div>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <FiUser className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-600">
              View your account information
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                <FiUser className="w-10 h-10 text-indigo-600" />
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{user.name || "User"}</h2>
                <p className="text-indigo-100 text-sm">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="p-4 px-6">
            <div className="flex items-center gap-2 mb-6">
              <FiUser className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Personal Information
              </h3>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <FiMail className="w-4 h-4" />
                    Email Address
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user.email}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                      Read-only
                    </span>
                  </div>
                </div>
              </div>

              {/* Community */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <FiMapPin className="w-4 h-4" />
                    Community
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={user.communityName}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                      Read-only
                    </span>
                  </div>
                </div>
              </div>

              {/* Block and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <FiHome className="w-4 h-4" />
                      Block/Building
                    </div>
                  </label>
                  <input
                    type="text"
                    value={user.unit?.block?.name || user.blockName || ""}
                    readOnly
                    placeholder="Block/Building"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <FiHome className="w-4 h-4" />
                      Unit/Flat
                    </div>
                  </label>
                  <input
                    type="text"
                    value={user.unit?.number || user.unitNumber || ""}
                    readOnly
                    placeholder="Unit/Flat"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Info Footer */}
          <div className="bg-blue-50 border-t border-blue-100 px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiUser className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Profile Information
                </h4>
                <p className="text-sm text-blue-700">
                  Your profile information is managed by your community
                  administrator. If you need to update any details, please
                  contact your community management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
