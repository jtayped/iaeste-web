import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Keystatic owns unlocalized UI and API routes. Everything else without a
  // file extension goes through next-intl's locale routing.
  matcher: ["/((?!api(?:/|$)|keystatic(?:/|$)|_next(?:/|$)|.*\\..*).*)"],
};
