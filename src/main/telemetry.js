const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const {
  OTLPMetricExporter,
} = require("@opentelemetry/exporter-metrics-otlp-http");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} = require("@opentelemetry/semantic-conventions");
const { trace, metrics, SpanStatusCode } = require("@opentelemetry/api");
const { app } = require("electron");
const { logger } = require("./logger");
const { resourceFromAttributes } = require("@opentelemetry/resources");

let sdk;
let isEnabled = true;

// --- Sampling config (production pattern) ---
// In production, you'd sample only a percentage of traces
const SAMPLE_RATE = parseFloat(process.env.OTEL_SAMPLE_RATE || "1.0");

function initTelemetry() {
  const traceExporter = new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces", // direct to Jaeger
  });

  const metricExporter = new OTLPMetricExporter({
    url: "http://localhost:4319/v1/metrics", // via OTel Collector → Prometheus
  });
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000, // every 10s
  });

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "system-pulse",
      [ATTR_SERVICE_VERSION]: app.getVersion() || "1.0.0",
      "deployment.environment": process.env.NODE_ENV || "development",
      "os.type": process.platform,
    }),
    traceExporter,
    metricReader,
  });

  try {
    sdk.start();
    logger.info("OpenTelemetry initialized", { sampleRate: SAMPLE_RATE });
  } catch (err) {
    logger.error("Failed to initialize OpenTelemetry", { error: err.message });
  }
}

function shutdownTelemetry() {
  if (sdk) {
    return sdk
      .shutdown()
      .then(() => logger.info("Telemetry shut down"))
      .catch((err) =>
        logger.error("Telemetry shutdown error", { error: err.message }),
      );
  }
}

// --- Helper: Create traced IPC handler ---
function tracedHandler(channel, handler) {
  const tracer = trace.getTracer("system-pulse");

  return async (event, ...args) => {
    if (!isEnabled) return handler(event, ...args);

    // Sampling
    if (Math.random() > SAMPLE_RATE) return handler(event, ...args);

    return tracer.startActiveSpan(`ipc.${channel}`, async (span) => {
      span.setAttribute("ipc.channel", channel);
      span.setAttribute("electron.process", "main");
      try {
        const result = await handler(event, ...args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  };
}

// --- Custom Metrics ---
function createMetrics() {
  const meter = metrics.getMeter("system-pulse");

  return {
    ipcCallCounter: meter.createCounter("ipc.calls.total", {
      description: "Total IPC calls by channel",
    }),
    ipcDurationHistogram: meter.createHistogram("ipc.duration.ms", {
      description: "IPC call duration in milliseconds",
      unit: "ms",
    }),
    cpuGauge: meter.createObservableGauge("system.cpu.usage", {
      description: "Current CPU usage percentage",
      unit: "%",
    }),
    memGauge: meter.createObservableGauge("system.memory.used_percent", {
      description: "Memory usage percentage",
      unit: "%",
    }),
    errorCounter: meter.createCounter("app.errors.total", {
      description: "Total application errors",
    }),
    statsCollectionCounter: meter.createCounter("stats.collections.total", {
      description: "Number of stats collection cycles",
    }),
  };
}

function setEnabled(enabled) {
  isEnabled = enabled;
  logger.info("Telemetry toggled", { enabled });
}

module.exports = {
  initTelemetry,
  shutdownTelemetry,
  tracedHandler,
  createMetrics,
  setEnabled,
};
