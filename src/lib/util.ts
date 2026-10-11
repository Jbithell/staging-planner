export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const metres = (cm: number, dp = 2) => `${(cm / 100).toFixed(dp).replace(/\.?0+$/, "")} m`;

export const gbp = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
