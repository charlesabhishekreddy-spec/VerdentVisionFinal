// src/api/communityApi.js
const BASE_URL = "http://localhost:5000/api"; // your Node backend

export async function fetchPosts() {
  const res = await fetch(`${BASE_URL}/posts`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export async function createPost(postData) {
  const res = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData)
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json();
}