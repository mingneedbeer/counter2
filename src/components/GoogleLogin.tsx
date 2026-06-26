import { useEffect, useRef, useState } from "react";

interface GoogleLoginProps {
  mode?: "login" | "register";
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
          }) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, options: {
            type?: "standard" | "icon";
            shape?: "rectangular" | "pill" | "circle" | "square";
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "large" | "medium" | "small";
            text?: "signin_with" | "signup_with" | "continue_with" | "signin";
            logo_alignment?: "left" | "center";
            width?: number;
          }) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

export default function GoogleLogin({ mode = "login" }: GoogleLoginProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCredential = async (response: { credential: string }) => {
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await resp.json();

      if (data.ok) {
        window.location.href = "/dashboard";
      } else {
        showToast("error", data.error || "Google sign-in failed");
      }
    } catch {
      showToast("error", "Google authentication error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !GOOGLE_CLIENT_ID) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: true,
        cancel_on_tap_outside: false,
      });

      window.google.accounts.id.prompt();

      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          type: "standard",
          shape: "rectangular",
          theme: "outline",
          size: "large",
          text: mode === "register" ? "signup_with" : "signin_with",
          logo_alignment: "left",
          width: btnRef.current.offsetWidth || 448,
        });
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      {GOOGLE_CLIENT_ID ? (
        <div className="flex flex-col gap-2 pb-4">
          <div id="gButton" ref={btnRef} className="w-full [&>iframe]:!w-full [&>iframe]:!min-w-0 [&>iframe]:rounded-xl"></div>
          {loading && (
            <div className="text-center text-sm text-gray-500">Signing in...</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-2">
          Google sign-in not configured (set PUBLIC_GOOGLE_CLIENT_ID)
        </div>
      )}

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