// tracing.js

"use strict";
import { cp } from "fs";
import logger from "../logger/logger";
const process = require("process");
const opentelemetry = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");

const { ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-base");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
const { trace, metrics, SpanStatusCode } = require("@opentelemetry/api");

const prometheusExporter = new PrometheusExporter(
  {
    port: 9464,
    endpoint: "/metrics",
    host: "0.0.0.0",
  },
  () => {
    console.log("Prometheus scrape endpoint: http://localhost:9464/metrics");
  },
);

// configure the SDK to export telemetry data to the console
// enable all auto-instrumentations from the meta package
const traceExporter = new ConsoleSpanExporter();

const sdk = new opentelemetry.NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "my-service",
  }),
  traceExporter,
  metricReader: prometheusExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry

// gracefully shut down the SDK on process exit

export async function initTracing() {
  logger.info("Tracing initialized");
  sdk.start();
}

export async function shutdownTracing() {
  if (sdk) {
    logger.info("Shutting down tracing...");
    return sdk
      .shutdown()
      .then(() => logger.info("Tracing terminated"))
      .catch((error) => logger.info("Error terminating tracing", error))
      .finally(() => process.exit(0));
  } else {
    logger.error("SDK not initialized, skipping shutdown.");
  }
}

export function createMetrics() {
  const meter = metrics.getMeter("system-pulse");

  // CPU
  const cpuGuage = meter.createObservableGauge("system_cpu_usage_percent", {
    description: "CPU usage percentage",
  });

  // RAM
  const ramGauge = meter.createObservableGauge("system_ram_usage_percent", {
    description: "RAM usage percentage",
  });

  return { cpuGuage, ramGauge };
}
