import jwt from "jsonwebtoken";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../../src/services/tokenService";
import { config } from "../../src/config";

describe("tokenService", () => {
  it("signs an access token with a short expiry (AC21)", () => {
    const token = signAccessToken("user-1");
    const decoded = jwt.verify(token, config.accessTokenSecret) as jwt.JwtPayload;
    expect(decoded.sub).toBe("user-1");
    const ttlSeconds = decoded.exp! - decoded.iat!;
    expect(ttlSeconds).toBeLessThanOrEqual(15 * 60);
  });

  it("signs a refresh token with a longer expiry (AC22)", () => {
    const token = signRefreshToken("user-1");
    const decoded = jwt.verify(token, config.refreshTokenSecret) as jwt.JwtPayload;
    expect(decoded.sub).toBe("user-1");
    const ttlSeconds = decoded.exp! - decoded.iat!;
    expect(ttlSeconds).toBeGreaterThan(15 * 60);
  });

  it("verifyAccessToken returns the payload for a valid token", () => {
    const token = signAccessToken("user-1");
    expect(verifyAccessToken(token).sub).toBe("user-1");
  });

  it("verifyAccessToken throws for an expired token", () => {
    const expired = jwt.sign({ sub: "user-1" }, config.accessTokenSecret, { expiresIn: -10 });
    expect(() => verifyAccessToken(expired)).toThrow();
  });

  it("verifyRefreshToken throws for an expired token", () => {
    const expired = jwt.sign({ sub: "user-1" }, config.refreshTokenSecret, { expiresIn: -10 });
    expect(() => verifyRefreshToken(expired)).toThrow();
  });
});
