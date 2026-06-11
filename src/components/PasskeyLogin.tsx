import { startAuthentication } from "@simplewebauthn/browser";

export default function PasskeyLogin() {
  const handlePasskeyLogin = async () => {
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
        alert("Passkey login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Passkey login error");
    }
  };

  return (
    <button onClick={handlePasskeyLogin} className="btn btn-outline w-full">
      Login with Passkey
    </button>
  );
}
