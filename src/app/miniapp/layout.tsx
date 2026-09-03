import type { ReactNode } from "react";
import Script from "next/script";

// Mini App shell (docs/architecture.md §11). Mobile-first, narrow, and loads the Telegram
// Web App SDK so the client can read initData.
export default function MiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <div className="mx-auto min-h-screen w-full max-w-md">{children}</div>
    </>
  );
}
