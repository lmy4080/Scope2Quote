import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Scope2Quote",
  description: "AI-powered project estimation workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
