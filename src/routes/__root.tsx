import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Import trực tiếp (không @import trong CSS) để Vite xử lý và phát hành file woff2.
// index.css có unicode-range theo subset (latin / latin-ext / vietnamese); các file *-400.css thì không.
import "@fontsource/vt323/index.css";
import "@fontsource/press-start-2p/index.css";

import appCss from "../styles/globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0b1240" },
      { title: "Ai Là Triệu Phú 8-bit" },
      {
        name: "description",
        content:
          "Trò chơi Ai Là Triệu Phú phong cách 8-bit: 15 câu hỏi, 500 triệu đồng, luật chơi 2026, câu hỏi từ bộ dữ liệu công khai hoặc do AI tạo.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <TooltipProvider>
        <Outlet />
      </TooltipProvider>
      <Toaster theme="dark" position="top-center" />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
