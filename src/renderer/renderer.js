const formatBytes = (bytes) => (bytes / 1024 ** 3).toFixed(2) + " GB";
const formatUptime = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
};

async function refreshStats() {
  try {
    const stats = await window.systemPulse.getStats();
    document.getElementById("cpu-value").textContent = stats.cpuUsage + "%";
    document.getElementById("mem-value").textContent = formatBytes(
      stats.usedMemory,
    );
    document.getElementById("uptime-value").textContent = formatUptime(
      stats.uptime,
    );
  } catch (err) {
    console.error("Failed to fetch stats:", err);
  }
}

refreshStats();
setInterval(refreshStats, 2000);
async function refreshLogs() {
  try {
    const logs = await window.systemPulse.getRecentLogs(30);
    const container = document.getElementById("log-entries");
    container.innerHTML = logs
      .map((log) => {
        const level = log.level || "info";
        const time = log.timestamp || "";
        const msg = log.message || JSON.stringify(log);
        return `<div class="log-entry ${level}">[${time}] ${level.toUpperCase()}: ${msg}</div>`;
      })
      .join("");
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error("Failed to load logs:", err);
  }
}

refreshLogs();
setInterval(refreshLogs, 3000);
// Telemetry toggle
document
  .getElementById("telemetry-toggle")
  .addEventListener("change", async (e) => {
    const enabled = e.target.checked;
    await window.systemPulse.setTelemetryEnabled(enabled);
    console.log(`Telemetry ${enabled ? "enabled" : "disabled"}`);
  });

// Add a test error button (for observability testing)
const footer = document.querySelector("footer");
const errBtn = document.createElement("button");
errBtn.textContent = "💥 Trigger Test Error";
errBtn.style.cssText =
  "margin-left:16px; padding:4px 12px; background:#d9534f; color:#fff; border:none; border-radius:4px; cursor:pointer;";
errBtn.addEventListener("click", async () => {
  try {
    await window.systemPulse.triggerTestError();
  } catch (err) {
    console.error("Test error caught in renderer:", err);
  }
  refreshLogs();
});
footer.appendChild(errBtn);
