import { errors as joseErrors, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";

// Resolves a bearer token to the Supabase user id (`sub`), or null when the
// token is missing, malformed, expired or not signed by the configured issuer.
export type VerifyToken = (token: string) => Promise<string | null>;

export function createTokenVerifier(options: {
  keys: JWTVerifyGetKey;
  issuer: string;
  audience: string;
}): VerifyToken {
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, options.keys, {
        issuer: options.issuer,
        audience: options.audience,
        // Supabase's asymmetric signing keys; HS256 shared secrets are refused.
        algorithms: ["ES256", "RS256"],
      });
      return z.uuid().safeParse(payload.sub).data ?? null;
    } catch (error) {
      if (error instanceof joseErrors.JOSEError) return null;
      throw error;
    }
  };
}

export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return match?.[1] ?? null;
}
