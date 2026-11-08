import { errors as joseErrors, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";

// Authenticator assurance level: aal2 once the user passed a second factor in
// this session. Supabase omits the claim at aal1.
export type Aal = "aal1" | "aal2";

export type VerifiedToken = { userId: string; aal: Aal };

// Resolves a bearer token to the Supabase user id (`sub`) and its `aal`, or
// null when the token is missing, malformed, expired or not signed by the
// configured issuer.
export type VerifyToken = (token: string) => Promise<VerifiedToken | null>;

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
      const userId = z.uuid().safeParse(payload.sub).data;
      if (!userId) return null;
      return { userId, aal: payload["aal"] === "aal2" ? "aal2" : "aal1" };
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
