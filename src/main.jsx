import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import "./globals.css"
import Diagnose from "./pages/Diagnose"
import Schedule from "./pages/Schedule"

import Layout from "./Layout"
import Home from "./pages/Home"

function Placeholder({ title }) {
  return <h1 className="text-2xl font-bold">{title}</h1>
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/diagnose" element={<Diagnose />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/community" element={<Placeholder title="Community Page" />} />
          <Route path="/profile" element={<Placeholder title="Profile Page" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)