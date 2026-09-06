import jwt from "jsonwebtoken";
import { config } from "../config";

export interface TokenPayload extends jwt.JwtPayload {
  sub: string;
  ver?: number;
}

export function signAccessToken(userId: string, tokenVersion = 0): string {
  return jwt.sign({ sub: userId, ver: tokenVersion }, config.accessTokenSecret, {
    expiresIn: config.accessTokenTtl,
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string, tokenVersion = 0): string {
  return jwt.sign({ sub: userId, ver: tokenVersion }, config.refreshTokenSecret, {
    expiresIn: config.refreshTokenTtl,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.accessTokenSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.refreshTokenSecret) as TokenPayload;
}
