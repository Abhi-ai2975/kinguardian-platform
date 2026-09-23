/**
 * Minimal type stubs for Next.js middleware so the package can compile
 * without next installed as a hard dependency (it's a peer dependency).
 */
export interface NextRequest extends Request {
  nextUrl: URL;
}

export type NextMiddleware = (request: NextRequest) => Promise<Response | undefined> | Response | undefined;
