export default function PasswordStrength({ password }) {
  const score =
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (password.length > 7 ? 1 : 0);

  const levels = ["Weak", "Medium", "Strong"];

  return (
    <div className="text-xs mt-1">
      Strength: {levels[score - 1] || "Too short"}
      <div className="h-1 bg-slate-200 rounded mt-1">
        <div
          className="h-1 bg-green-500 rounded transition-all"
          style={{ width: `${score * 33}%` }}
        />
      </div>
    </div>
  );
}