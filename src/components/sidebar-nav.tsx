"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HomeIcon, User, Smile, Brain, Settings, LogOut, Wind } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/components/session-context-provider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Admin email - only this user should see the admin link
const ADMIN_EMAIL = 'sendhil@clickworthy.in';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: HomeIcon,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "Stress Tracker",
    href: "/stress-tracker",
    icon: Smile,
  },
  {
    title: "AI Insights",
    href: "/ai-insights",
    icon: Brain,
  },
  {
    title: "Admin",
    href: "/admin",
    icon: Settings,
    adminOnly: true,
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (session?.user) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [session]);

  const checkAdminStatus = () => {
    if (session?.user?.email === ADMIN_EMAIL) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out: " + error.message);
    }
    // The SessionContextProvider will handle the redirect and success toast.
    setIsLoggingOut(false);
  };

  // Filter nav items based on admin status
  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <nav className="flex flex-col gap-2 p-4 h-full">
      <div className="flex items-center gap-2 px-2 mb-4">
        <Wind className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-primary font-heading">
          Clarity & Peace
        </h1>
      </div>
      <Separator className="mb-4 bg-sidebar-border" />
      
      {/* Navigation Items */}
      <div className="flex-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mb-1 w-full",
                isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              )}
            >
              <Link href={item.href}>
                <Icon className="mr-2 h-4 w-4" />
                {item.title}
                {item.adminOnly && (
                  <span className="ml-auto text-xs bg-red-100 text-red-800 px-1 rounded">
                    Admin
                  </span>
                )}
              </Link>
            </Button>
          );
        })}
      </div>

      {/* User Info and Logout Section */}
      {session?.user && (
        <>
          <Separator className="my-4 bg-sidebar-border" />
          <div className="space-y-2">
            {/* User Email Display */}
            <div className="px-2 py-1">
              <p className="text-xs text-sidebar-foreground/70 truncate">
                Signed in as:
              </p>
              <p className="text-sm text-sidebar-foreground font-medium truncate">
                {session.user.email}
              </p>
              {isAdmin && (
                <p className="text-xs text-red-600 font-medium mt-1">
                  Admin Access Enabled
                </p>
              )}
            </div>
            
            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="ghost"
              className="justify-start text-sidebar-foreground hover:bg-red-50 hover:text-red-700 w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </>
      )}
    </nav>
  );
}