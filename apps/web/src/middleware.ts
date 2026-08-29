import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // API routes and Next internals are unlocalized. Everything else without a
  // file extension goes through next-intl's locale routing.
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|.*\\..*).*)"],
};
