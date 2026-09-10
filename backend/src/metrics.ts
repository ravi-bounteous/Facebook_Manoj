import { Request, Response, NextFunction } from "express";
import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry],
});

export const httpRequestErrorsTotal = new Counter({
  name: "http_request_errors_total",
  help: "Total number of HTTP requests that resulted in an error status code",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry],
});

export function requestMetrics(req: Request, res: Response, next: NextFunction): void {
  const stopTimer = httpRequestDurationSeconds.startTimer();
  res.on("finish", () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : "unknown";
    const labels = { method: req.method, route, status_code: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    if (res.statusCode >= 400) {
      httpRequestErrorsTotal.inc(labels);
    }
    stopTimer(labels);
  });
  next();
}
