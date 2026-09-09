import { Counter, Histogram } from "prom-client";

export const httpRequestCounter = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests handled, labeled by route, method and status",
  labelNames: ["route", "method", "status"],
});

export const httpRequestErrorCounter = new Counter({
  name: "http_request_errors_total",
  help: "Total number of HTTP requests that resulted in an error, labeled by route and method",
  labelNames: ["route", "method"],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds, labeled by route and method",
  labelNames: ["route", "method"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});
