import { Router, Request, Response } from "express";
import * as authService from "../services/authService";
import { AccountLockedError, DuplicateEmailError, InvalidCredentialsError, ValidationError } from "../services/errors";

export const authRouter = Router();

authRouter.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  try {
    const result = await authService.register(email, password);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof DuplicateEmailError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  try {
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof AccountLockedError) {
      res.status(423).json({ error: err.message });
      return;
    }
    if (err instanceof InvalidCredentialsError) {
      res.status(401).json({ error: err.message });
      return;
    }
    throw err;
  }
});

authRouter.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};
  try {
    const result = await authService.refresh(refreshToken);
    res.status(200).json(result);
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});
