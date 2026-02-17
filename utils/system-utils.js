import * as os from "os";

export function getCpuUsage() {
  const cpus = os.cpus();

  let idle = 0;
  let total = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  });

  return { idle, total };
}

let previousCpu = getCpuUsage();

function calculateCpuPercentage() {
  const currentCpu = getCpuUsage();

  const idleDiff = currentCpu.idle - previousCpu.idle;
  const totalDiff = currentCpu.total - previousCpu.total;

  previousCpu = currentCpu;

  const usage = 100 - Math.floor((idleDiff / totalDiff) * 100);
  return usage;
}

export function getSystemStats() {
  const cpu = calculateCpuPercentage();

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ram = Math.round((usedMem / totalMem) * 100);
  return { cpu, ram };
}
