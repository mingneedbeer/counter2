import { startRegistration } from "@simplewebauthn/browser";

export default function PasskeyRegister() {
  const handleRegister = async () => {
    try {
      const resp = await fetch("/api/auth/passkey/register-begin", {
        method: "POST",
        credentials: "include",
      });
      if (!resp.ok) return alert("Please log in first");

      const { requestId, ...options } = await resp.json();
      const regResp = await startRegistration({ optionsJSON: options });

      const verifyResp = await fetch("/api/auth/passkey/register-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...regResp, requestId }),
      });

      if (verifyResp.ok) {
        alert("Passkey registered!");
      } else {
        alert("Registration failed");
      }
    } catch (err) {
      console.error(err);
      alert("Passkey registration error");
    }
  };

  return (
    <button onClick={handleRegister} className="btn btn-outline btn-sm">
      Register Passkey
    </button>
  );
}
