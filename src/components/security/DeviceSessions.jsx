import { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function DeviceSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user?.email) return;
    const data = await appClient.enterprise.listSessions(user.email);
    setSessions(data);
  };

  useEffect(() => {
    load();
     
  }, [user?.email]);

  const logoutOthers = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      await appClient.enterprise.logoutOtherDevices(user.email);
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/75 bg-white/65 p-6 space-y-4 backdrop-blur-xl shadow-[0_10px_30px_rgba(124,58,237,0.12)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Active Devices</h3>
        <Button
          variant="outline"
          onClick={logoutOthers}
          disabled={loading || sessions.length <= 1}
        >
          {loading ? "Working..." : "Log out other devices"}
        </Button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-500">No session data yet.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border p-4 text-sm ${
                s.is_current_device ? "border-violet-200 bg-violet-50/60" : "border-white/70 bg-white/60"
              }`}
            >
              <div className="font-medium text-slate-900 flex items-center justify-between">
                <span>{s.device_info?.platform || "Device"}</span>
                {s.is_current_session ? (
                  <span className="text-xs text-emerald-700 font-semibold">Current session</span>
                ) : s.is_current_device ? (
                  <span className="text-xs text-emerald-700 font-semibold">This device</span>
                ) : (
                  <span className="text-xs text-slate-500">Other</span>
                )}
              </div>
              <div className="text-slate-500 mt-1 break-words">
                {s.device_info?.userAgent || "Unknown user agent"}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Last active: {s.last_active}
              </div>
              {s.expires_at ? (
                <div className="text-xs text-slate-400 mt-1">
                  Expires: {s.expires_at}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
