export default function Navbar() {
  return (
    <div className="h-16 border-b flex items-center justify-between px-6 bg-white">
      <h2 className="font-semibold text-lg">
        Smart Agriculture Dashboard
      </h2>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center">
          A
        </div>
      </div>
    </div>
  )
}