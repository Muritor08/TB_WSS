export const QUOTE = 1;

export const PKT_TYPE: Record<number, number> = {
  1: QUOTE,
};

export const DEFAULT_PKT_INFO = {
  PKT_SPEC: {
    1: {
      1: { key: "symbol", type: "string", len: 20 },
      2: { key: "ltp", type: "int32", len: 4 },
      3: { key: "open", type: "int32", len: 4 },
      4: { key: "high", type: "int32", len: 4 },
      5: { key: "low", type: "int32", len: 4 },
      6: { key: "close", type: "int32", len: 4 },
      7: { key: "vol", type: "int64", len: 8 },
      8: { key: "ltq", type: "int32", len: 4 },
      9: { key: "chng", type: "int32", len: 4 },
      10: { key: "chngPer", type: "int32", len: 4 },
    },
  },
};
