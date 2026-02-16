"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { SWRProvider } from "@/providers/swr-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRProvider>
        <ThemeProvider>
          <SocketProvider>
            <LanguageProvider>{children}</LanguageProvider>
          </SocketProvider>
        </ThemeProvider>
      </SWRProvider>
    </SessionProvider>
  );
}
