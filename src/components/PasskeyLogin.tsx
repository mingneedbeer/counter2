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
        className="btn btn-outline w-full"
      >
        {loading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        )}
        {loading ? "Authenticating..." : "Login with Passkey"}
      </button>

      {toast && (
        <div className="toast toast-end toast-bottom z-50">
          <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-error"} text-sm`}>
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
