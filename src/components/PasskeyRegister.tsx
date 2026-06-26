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
        className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        )}
        {loading ? "Registering..." : "Register with Passkey"}
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