import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaMicrosoft } from "react-icons/fa";

export default function SocialButtons({
  onGoogle,
  onMicrosoft,
  onFacebook,
  loading,
}) {
  const base =
    "w-full h-11 rounded-xl border flex items-center justify-center gap-3 hover:bg-slate-50 transition";

  return (
    <div className="space-y-3">
      <button disabled={loading} onClick={onGoogle} className={base}>
        <FcGoogle size={20}/> Continue with Google
      </button>

      <button disabled={loading} onClick={onMicrosoft} className={base}>
        <FaMicrosoft /> Continue with Microsoft
      </button>

      <button disabled={loading} onClick={onFacebook} className={base}>
        <FaFacebook className="text-blue-600"/> Continue with Facebook
      </button>
    </div>
  );
}