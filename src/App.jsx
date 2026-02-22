import { BrowserRouter, Routes, Route } from "react-router-dom"

import Layout from "@/components/layout/Layout"

import Home from "@/pages/Home"
import Weather from "@/pages/Weather"
import Diagnose from "@/pages/Diagnose"
import Predictions from "@/pages/Predictions"
import Community from "@/pages/Community"
import Profile from "@/pages/Profile"
import Admin from "@/pages/Admin"

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/diagnose" element={<Diagnose />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/community" element={<Community />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App