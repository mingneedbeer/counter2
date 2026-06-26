import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

export default function PasskeyLogin() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/passkey/login-begin", { method: "POST" });
      const { requestId, ...options } = await resp.json();

      const authResp = await startAuthentication({ optionsJSON: options });

      const verifyResp = await fetch("/api/auth/passkey/login-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...authResp, requestId }),
      });

      if (verifyResp.ok) {
        window.location.href = "/dashboard";
      } else {
        const text = await verifyResp.text();
        showToast("error", text || "Passkey login failed");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Passkey login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="w-full py-3 px-4 bg-white text-gray-900 border-2 border-gray-900 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        )}
        {loading ? "Authenticating..." : "Sign in with Passkey"}
      </button>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-max max-w-[94%] sm:max-w-lg z-[9999]">
          <div className={`${toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"} border text-sm rounded-lg px-4 py-3 shadow-lg`}>
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}