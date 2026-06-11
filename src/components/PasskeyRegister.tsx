import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

export default function PasskeyRegister() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/passkey/register-begin", {
        method: "POST",
        credentials: "include",
      });
      if (!resp.ok) return showToast("error", "Please log in first");

      const { requestId, ...options } = await resp.json();
      const regResp = await startRegistration({ optionsJSON: options });

      const verifyResp = await fetch("/api/auth/passkey/register-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...regResp, requestId }),
      });

      if (verifyResp.ok) {
        showToast("success", "Passkey registered successfully!");
      } else {
        const text = await verifyResp.text();
        showToast("error", text || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Passkey registration error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleRegister}
        disabled={loading}
        className="btn btn-secondary w-full"
      >
        {loading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        )}
        {loading ? "Registering..." : "Register Passkey"}
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
