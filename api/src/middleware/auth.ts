import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config";
import { AuthUser, UserRole } from "../modules/event-booking/event-booking.types";
import { User } from "../modules/event-booking/event-booking.model";

type AuthedRequest = Request & { user?: AuthUser };

function hasValidApiKey(req: Request, res: Response): boolean {
  const apiKey = req.header("x-api-key");
  if (!apiKey || apiKey !== env.API_KEY) {
    res.status(401).json({ success: false, message: "Invalid x-api-key" });
    return false;
  }
  return true;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.header("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!hasValidApiKey(req, res)) return;

  if (!token) {
    res.status(401).json({ success: false, message: "Missing bearer token" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;

    const user = await User.findByPk(payload.id);
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid user" });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ success: false, message: "User is inactive" });
      return;
    }

    (req as AuthedRequest).user = {
      id: user.id,
      role: user.role as UserRole
    };

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
}

export function apiKeyOnly(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!hasValidApiKey(req, res)) return;
  next();
}

export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthedRequest).user;

    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (user.role !== role) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    next();
  };
}
