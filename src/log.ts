// Debug logging for the console. Filter the console by "[TSP]" to see only app logs.
const style = "background:#fd7e14;color:#fff;padding:1px 4px;border-radius:3px";

export function log(area: string, ...args: unknown[]) {
  console.log(`%c[TSP]%c ${area}`, style, "color:#d9480f;font-weight:bold", ...args);
}
