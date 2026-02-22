import Sidebar from "./Sidebar"
import Navbar from "./Navbar"

export default function Layout({ children }) {
  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen">
        <Navbar />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}