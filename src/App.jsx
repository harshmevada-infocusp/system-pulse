import moment from "moment";
import { useEffect, useState } from "react";

export default function App() {
  const [cpu, setCpu] = useState(0);
  const [ram, setRam] = useState(0);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    window.api.onSystemStats((data) => {
      setCpu(data.cpu);
      setRam(data.ram);
    });
    window.api.log("info", "System monitor mounted");

    window.api.onSystemLogs((data) => {
      setLogs(data);
    });
  }, []);
  return (
    <div style={{ padding: 20 }}>
      <h1>Hello from React + Electron ⚡</h1>
      <div style={{ padding: 30, fontFamily: "sans-serif" }}>
        <h1>System Monitor</h1>

        <div style={{ marginTop: 20 }}>
          <h2>CPU Usage: {cpu}%</h2>
          <progress value={cpu} max="100" style={{ width: 300 }} />
        </div>

        <div style={{ marginTop: 20 }}>
          <h2>RAM Usage: {ram}%</h2>
          <progress value={ram} max="100" style={{ width: 300 }} />
        </div>
      </div>
      <div>
        <h2>Recent Logs</h2>
        <ul>
          {logs.map((log, index) => (
            <li key={index}>
              {log.level}: {log.message}{" "}
              {moment(log.timestamp).format("DD-MM-YYYY HH:mm:ss")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
