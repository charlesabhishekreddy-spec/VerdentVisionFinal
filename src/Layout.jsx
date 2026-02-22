import { Link, Outlet } from "react-router-dom"

export default function Layout() {
  return (
    <div className="min-h-screen bg-muted/40">
      
      {/* Top Navbar */}
      <header className="border-b bg-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🌱 Verdant Vision</h1>

        <nav className="flex gap-6 text-sm font-medium">
          <Link to="/">Home</Link>
          <Link to="/diagnose">Diagnose</Link>
          <Link to="/schedule">Schedule</Link>
          <Link to="/community">Community</Link>
          <Link to="/profile">Profile</Link>
        </nav>
      </header>

      {/* Page Content */}
      <main className="p-6">
        <Outlet />
      </main>

    </div>
  )
}