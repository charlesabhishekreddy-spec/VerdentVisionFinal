import AdminStats from "@/components/admin/AdminStats"
import UserList from "@/components/admin/UserList"
import InviteUserForm from "@/components/admin/InviteUserForm"

export default function Admin() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      <AdminStats />
      <InviteUserForm />
      <UserList />
    </div>
  )
}
