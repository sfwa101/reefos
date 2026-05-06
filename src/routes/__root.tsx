import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  ScriptOnce,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";

import appCss from "../styles.css?url";
import { ThemeProvider } from "@/context/ThemeContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { UIProvider } from "@/context/UIContext";
import { CartProvider } from "@/context/CartContext";
import { CompareProvider } from "@/context/CompareContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { AuthProvider } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { SharedCartProvider } from "@/context/SharedCartContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { registerPWA } from "@/lib/pwa";
import { LiveRulesBootstrap } from "@/components/LiveRulesBootstrap";
import { SubdomainGuard } from "@/components/SubdomainGuard";
import { CatalogBootstrap } from "@/components/system/CatalogBootstrap";
import { GlobalErrorBoundary } from "@/components/system/GlobalErrorBoundary";

function NotFoundComponent() {
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-extrabold text-primary">404</h1>
        <h2 className="mt-4 font-display text-2xl font-bold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-pill transition hover:opacity-90"
          >
            العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

// Router context shape — `queryClient` is injected from `getRouter()` and
// is what loaders use to call `ensureQueryData(...)` for parallel prefetch.
interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ريف المدينة — عبق الريف داخل المدينة" },
      { name: "description", content: "كل ماتحتاج اليه في مكان واحد" },
      { property: "og:title", content: "ريف المدينة — عبق الريف داخل المدينة" },
      { property: "og:description", content: "كل ماتحتاج اليه في مكان واحد" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#3b7a4d" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "ريف المدينة" },
      { name: "twitter:title", content: "ريف المدينة — عبق الريف داخل المدينة" },
      { name: "twitter:description", content: "كل ماتحتاج اليه في مكان واحد" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b043576f-09fc-4882-9b5e-46be7fffc5c5/id-preview-93b4aa28--40d2b8b1-07e5-422e-a4d5-9fc0d9e486cc.lovable.app-1777305072244.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b043576f-09fc-4882-9b5e-46be7fffc5c5/id-preview-93b4aa28--40d2b8b1-07e5-422e-a4d5-9fc0d9e486cc.lovable.app-1777305072244.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Cairo:wght@500;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      // Phase T-P3 — preconnect to the Supabase edge so the catalog
      // fetch fired by the home loader resolves DNS/TLS during HTML parse.
      ...(import.meta.env.VITE_SUPABASE_URL
        ? [
            { rel: "preconnect", href: import.meta.env.VITE_SUPABASE_URL as string, crossOrigin: "anonymous" as const },
            { rel: "dns-prefetch", href: import.meta.env.VITE_SUPABASE_URL as string },
          ]
        : []),
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  // Pre-hydration: read persisted theme and apply class/attribute BEFORE first
  // paint to eliminate the green-flash (FOUC) when a non-default theme is set.
  // Mirrors exactly what ThemeContext does inside its useEffect.
  const themeBootstrap = `(function(){try{var m=localStorage.getItem("reef-mode");var c=localStorage.getItem("reef-color");var l=localStorage.getItem("reef-locale")||"ar";var resolved=m==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):(m||"light");var r=document.documentElement;if(resolved==="dark")r.classList.add("dark");if(c&&c!=="sage")r.setAttribute("data-theme",c);r.setAttribute("lang",l);r.setAttribute("dir",l==="ar"?"rtl":"ltr");}catch(e){}})();`;
  return (
    <html suppressHydrationWarning>
      <head>
        <ScriptOnce>{themeBootstrap}</ScriptOnce>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // Pull the same QueryClient the router/loaders use, so cache is shared.
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerPWA();
    return undefined;
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
          <UIProvider>
            <TooltipProvider>
              <AuthProvider>
                <LocationProvider>
                  <CartProvider>
                    <SharedCartProvider>
                      <CompareProvider>
                        <FavoritesProvider>
                          <LiveRulesBootstrap />
                          <CatalogBootstrap />
                          <SubdomainGuard />
                          <Toaster />
                          <Outlet />
                        </FavoritesProvider>
                      </CompareProvider>
                    </SharedCartProvider>
                  </CartProvider>
                </LocationProvider>
              </AuthProvider>
            </TooltipProvider>
          </UIProvider>
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
