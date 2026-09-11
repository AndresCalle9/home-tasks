import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { HubFooter, HubHeader } from "@andrescalle9/ui";
import { JsonLd } from "@/components/json-ld";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { ToastProvider } from "@/components/toast-provider";
import { HUB_APPS, HUB_URL } from "@/lib/hub";
import { SITE_URL } from "@/lib/site";
// Order matters: globals.css must register Tailwind's cascade-layer order
// before the package's styles.css gets a chance to (see hub-theme.css for
// why), and hub-theme.css must come after both — see that file's header.
import "./globals.css";
import "@andrescalle9/ui/styles.css";
import "./hub-theme.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nest",
    template: "%s · Nest",
  },
  description: "Reparte las tareas del hogar entre todos, semana a semana.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nest",
  },
  openGraph: {
    siteName: "Nest",
    locale: "es",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
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
        <JsonLd />
        <ServiceWorkerRegistration />
        <HubHeader hubUrl={HUB_URL} appName="Nest" />
        <ToastProvider>{children}</ToastProvider>
        <HubFooter apps={HUB_APPS} />
      </body>
    </html>
  );
}
