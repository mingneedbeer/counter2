import { useState, useEffect } from "react";

export default function CookieConsent({ gaId }: { gaId?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShow(true);
    } else if (consent === "accepted" && gaId) {
      loadGA(gaId);
    }
  }, [gaId]);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
    if (gaId) loadGA(gaId);
  };

  const reject = () => {
    localStorage.setItem("cookie-consent", "rejected");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
      <div className="mx-auto max-w-2xl bg-white border border-gray-200 rounded-xl shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-600 flex-1">
          我們使用第三方平台技術來改善您的體驗。接受後才會載入相關服務。
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={reject}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            拒絕
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-focus transition"
          >
            接受
          </button>
        </div>
      </div>
    </div>
  );
}

function loadGA(id: string) {
  if (document.querySelector(`script[data-ga="${id}"]`)) return;

  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  s.async = true;
  s.setAttribute("data-ga", id);
  document.head.appendChild(s);

  const inline = document.createElement("script");
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(inline);
}
