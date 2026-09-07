import jwt from "jsonwebtoken";
import { config } from "../config";

export interface TokenPayload extends jwt.JwtPayload {
  sub: string;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.accessTokenSecret, {
    expiresIn: config.accessTokenTtl,
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.refreshTokenSecret, {
    expiresIn: config.refreshTokenTtl,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.accessTokenSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.refreshTokenSecret) as TokenPayload;
}
