import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "./globals.css"

import Layout from "./Layout"
import Home from "./pages/Home"
import Diagnose from "./pages/Diagnose"
import Schedule from "./pages/Schedule"
import Community from "./pages/Community"
import Profile from "./pages/Profile"
import Weather from "./pages/Weather"
import Predictions from "./pages/Predictions"
import Admin from "./pages/Admin"
import Planner from "./pages/Planner"
import Chat from "./pages/Chat"
import Treatments from "./pages/Treatments"
import PestIdentifier from "./pages/PestIdentifier"
import Dashboard from "./pages/Dashboard"
import PageNotFound from "./lib/PageNotFound"

// Create a single QueryClient instance
const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Wrap the app in QueryClientProvider */}
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/diagnose" element={<Diagnose />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/community" element={<Community />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/treatments" element={<Treatments />} />
            <Route path="/pest-identifier" element={<PestIdentifier />} />
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)