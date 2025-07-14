"use client";

import { Playfair_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SessionContextProvider } from "@/components/session-context-provider";
import { Toaster } from "sonner";
import { SidebarNav } from "@/components/sidebar-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSession } from "@/components/session-context-provider";
import { usePathname } from "next/navigation";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: 'swap',
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  // Don't show sidebar on login page or when not authenticated
  const showSidebar = session && pathname !== '/login';

  if (!showSidebar) {
    return (
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r border-sidebar-border">
            <SidebarNav />
          </SheetContent>
        </Sheet>
      ) : (
        <aside className="w-64 border-r bg-sidebar border-sidebar-border hidden md:block">
          <SidebarNav />
        </aside>
      )}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Clarity & Peace</title>
        <meta name="description" content="Track your stress, get AI insights, and improve your well-being with Clarity & Peace." />
      </head>
      <body
        className={`${playfair.variable} ${spaceGrotesk.variable} font-body antialiased`}
      >
        <SessionContextProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
        </SessionContextProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}