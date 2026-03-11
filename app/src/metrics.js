const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duracion de solicitudes HTTP en segundos",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total de solicitudes HTTP",
  labelNames: ["method", "route", "status_code"]
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const routePath = req.route ? `${req.baseUrl || ""}${req.route.path}` : req.path;
    const labels = {
      method: req.method,
      route: routePath || "unknown",
      status_code: String(res.statusCode)
    };

    end(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
}

async function metricsHandler(_req, res) {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
}

module.exports = { metricsMiddleware, metricsHandler };

