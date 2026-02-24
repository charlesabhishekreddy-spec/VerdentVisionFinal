import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Camera, MessageCircle, Calendar, Users, Sprout, User, BookOpen, CloudRain, Bug, Shield } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await appClient.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  const navItems = [
    { name: "Home", icon: Home, path: createPageUrl("Home") },
    { name: "Diagnose", icon: Camera, path: createPageUrl("Diagnose") },
    { name: "Chat", icon: MessageCircle, path: createPageUrl("Chat") },
    { name: "Tasks", icon: Calendar, path: createPageUrl("Schedule") },
    { name: "More", icon: Users, path: createPageUrl("Community") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100/30 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-400/90 to-blue-500/90 backdrop-blur-sm text-white sticky top-0 z-40 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Verdant Vision</h1>
                <p className="text-xs text-blue-100">Smart Farming Assistant</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
                <Link to={createPageUrl("Predictions")}>
                  <button className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors backdrop-blur-sm relative">
                    <CloudRain className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      !
                    </span>
                  </button>
                </Link>
                <Link to={createPageUrl("PestIdentifier")}>
                  <button className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors backdrop-blur-sm">
                    <Bug className="w-5 h-5" />
                  </button>
                </Link>
                <Link to={createPageUrl("Treatments")}>
                  <button className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors backdrop-blur-sm">
                    <BookOpen className="w-5 h-5" />
                  </button>
                </Link>
                {currentUser?.role === 'admin' && (
                  <Link to={createPageUrl("Admin")}>
                    <button className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors backdrop-blur-sm relative">
                      <Shield className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                        A
                      </span>
                    </button>
                  </Link>
                )}
                <Link to={createPageUrl("Profile")}>
                  <button className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors backdrop-blur-sm">
                    <User className="w-5 h-5" />
                  </button>
                </Link>
              </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-blue-100 shadow-lg z-50">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-3 px-4 transition-all duration-200 ${
                  isActive
                    ? "text-blue-500"
                    : "text-gray-500 hover:text-blue-400"
                }`}
              >
                <div className={`relative ${isActive ? "scale-110" : ""}`}>
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                  )}
                </div>
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}