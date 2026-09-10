import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nest",
  description: "Reparte las tareas del hogar entre todos, semana a semana.",
};

// Truly shared across every route, signed in or not: the "(app)" route
// group's own layout owns the household-scoped shell (member fetch,
// bottom nav), and "(auth)" owns the signed-out sign-in/sign-up shell.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
