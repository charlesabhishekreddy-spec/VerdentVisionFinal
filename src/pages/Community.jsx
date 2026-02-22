import PostForm from "@/components/community/PostForm"
import CommunityStats from "@/components/community/CommunityStats"
import PostList from "@/components/community/PostList"

export default function Community() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Community Forum</h1>
      <CommunityStats />
      <PostForm />
      <PostList />
    </div>
  )
}
