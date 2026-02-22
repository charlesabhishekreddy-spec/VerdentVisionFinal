import { Link, Outlet } from "react-router-dom"

export default function Layout() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🌱 Verdant Vision</h1>

        <nav className="flex flex-wrap gap-4 text-sm font-medium">
          <Link to="/">Home</Link>
          <Link to="/diagnose">Diagnose</Link>
          <Link to="/schedule">Schedule</Link>
          <Link to="/weather">Weather</Link>
          <Link to="/predictions">Predictions</Link>
          <Link to="/community">Community</Link>
          <Link to="/planner">Planner</Link>
          <Link to="/chat">Chat</Link>
          <Link to="/treatments">Treatments</Link>
          <Link to="/pest-identifier">Pest ID</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
