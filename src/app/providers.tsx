"use client";

import { RtrAuthProvider } from "@/lib/auth-gateway/client";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { SWRProvider } from "@/providers/swr-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RtrAuthProvider>
      <SWRProvider>
        <ThemeProvider defaultTheme="light">
          <SocketProvider>
            <LanguageProvider>{children}</LanguageProvider>
          </SocketProvider>
        </ThemeProvider>
      </SWRProvider>
    </RtrAuthProvider>
  );
}
