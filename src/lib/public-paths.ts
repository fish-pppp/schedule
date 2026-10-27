const PUBLIC_PREFIXES = ["/login", "/register", "/join", "/forgot-password", "/api/auth"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
