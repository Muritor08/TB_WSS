export type FieldSpec = {
  key: string;
  type: "string" | "int32" | "int64" | "float" | "uint8";
  len: number;
  fmt?: (value: any, precision: number) => string;
};

export type PacketSpec = {
  [fieldId: number]: FieldSpec;
};

export type PktSpecMap = {
  [pktType: number]: PacketSpec;
};

export const QUOTE = "quote";
export const QUOTE_2 = "quote2";
export const QUOTE_3 = "quote3";

export const PKT_TYPE: Record<number, string> = {
  49: "quote",
  50: "quote2",
  52: "quote3",
};

// Formatting functions
function commafmt(value: number, precision: number = 2): string {
  const v = Number(value).toFixed(precision);
  const parts = v.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function datefmt(value: number): string {
  if (value == null) return String(value);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const date = new Date(value * 1000);
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = month[date.getMonth()];
  const yyyy = date.getFullYear();
  const time = date.toLocaleTimeString("en-US", { hour12: true });
  return `${dd} ${mm} ${yyyy}, ${time}`;
}

export const DEFAULT_PKT_INFO: {
  PKT_SPEC: PktSpecMap;
} = {
  PKT_SPEC: {
    49: {
      65: { key: "symbol", type: "string", len: 20 },
      66: { key: "precision", type: "uint8", len: 1 },
      67: { key: "ltp", type: "float", len: 8, fmt: commafmt },
      68: { key: "open", type: "float", len: 8, fmt: commafmt },
      69: { key: "high", type: "float", len: 8, fmt: commafmt },
      70: { key: "low", type: "float", len: 8, fmt: commafmt },
      71: { key: "close", type: "float", len: 8, fmt: commafmt },
      72: { key: "chng", type: "float", len: 8, fmt: commafmt },
      73: { key: "chngPer", type: "float", len: 8, fmt: (v) => commafmt(v, 2) },
      74: { key: "atp", type: "float", len: 8, fmt: commafmt },
      75: { key: "yHigh", type: "float", len: 8, fmt: commafmt },
      76: { key: "yLow", type: "float", len: 8, fmt: commafmt },
      77: { key: "ltq", type: "int32", len: 4, fmt: (v) => commafmt(v, 0) },
      78: { key: "vol", type: "int32", len: 4, fmt: (v) => commafmt(v, 0) },
      79: { key: "ttv", type: "float", len: 8, fmt: commafmt },
      80: { key: "ucl", type: "float", len: 8, fmt: commafmt },
      81: { key: "lcl", type: "float", len: 8, fmt: commafmt },
      82: { key: "OI", type: "int32", len: 4, fmt: (v) => commafmt(v, 0) },
      83: { key: "OIChngPer", type: "float", len: 8, fmt: (v) => commafmt(v, 2) },
      84: { key: "ltt", type: "int32", len: 4, fmt: datefmt },
      87: { key: "bidprice", type: "float", len: 8, fmt: commafmt },
      90: { key: "askprice", type: "float", len: 8, fmt: commafmt },
    },
    50: {
      65: { key: "symbol", type: "string", len: 20 },
      66: { key: "precision", type: "uint8", len: 1 },
      85: { key: "totBuyQty", type: "int32", len: 4, fmt: (v) => commafmt(v, 0) },
      86: { key: "totSellQty", type: "int32", len: 4, fmt: (v) => commafmt(v, 0) },
      87: { key: "price", type: "float", len: 8, fmt: commafmt },
      88: { key: "qty", type: "int32", len: 4, fmt: (v) => commafmt(v, 0) },
      89: { key: "no", type: "int32", len: 4, fmt: (v) => commafmt(v, 0) },
      90: { key: "price", type: "float", len: 8, fmt: commafmt },
      91: { key: "qty", type: "int32", len: 4, fmt: (v) => commafmt(v, 0) },
      92: { key: "no", type: "int32", len: 4, fmt: (v) => commafmt(v, 0) },
      93: { key: "nDepth", type: "uint8", len: 1 },
    },
    52: {
      65: { key: "symbol", type: "string", len: 20 },
      99: { key: "iv", type: "float", len: 8, fmt: commafmt },
      100: { key: "atmiv", type: "float", len: 8, fmt: commafmt },
      101: { key: "delta", type: "float", len: 8, fmt: commafmt },
      102: { key: "theta", type: "float", len: 8, fmt: commafmt },
      103: { key: "vega", type: "float", len: 8, fmt: commafmt },
      104: { key: "gamma", type: "float", len: 8, fmt: commafmt },
    },
  },
};
