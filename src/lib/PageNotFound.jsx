import { Link } from "react-router-dom"

export default function PageNotFound() {
  return (
    <div className="min-h-[50vh] grid place-items-center text-center">
      <div className="space-y-3">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="text-muted-foreground">Page not found.</p>
        <Link className="underline" to="/">Back to home</Link>
      </div>
    </div>
  )
}
