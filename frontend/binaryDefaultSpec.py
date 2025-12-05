import re
from datetime import datetime

def commafmt(value, precision=2):
    v = str(round(float(value), 2))
    parts = v.split('.')
    parts[0] = re.sub(r'\B(?=(\d{3})+(?!\d))', ',', parts[0])
    return ".".join(parts)

def datefmt(value):
    if value is None:
        return value
    month = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"]
    date_time = datetime.fromtimestamp(value)
    dd = int(date_time.strftime("%d"))
    mm = int(date_time.strftime("%m"))
    yyyy = int(date_time.strftime("%Y"))
    time = date_time.strftime("%H:%M:%S %p")
    if dd < 10:
        dd = '0' + str(dd)
    fullDate = str(dd) + ' ' + month[mm-1] + ' ' + str(yyyy) + ', ' + time
    return fullDate

QUOTE = "quote"
QUOTE_2 = "quote2"
QUOTE_3 = "quote3"

PKT_TYPE = {
    49: "quote",
    50: "quote2",
    52: "quote3"
}

DEFAULT_PKT_INFO = {
    "PKT_SPEC": {
        49: {
            65: {"type": "string", "key": "symbol", "len": 20},
            66: {"type": "uint8", "key": "precision", "len": 1},
            67: {"type": "float", "key": "ltp", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            68: {"type": "float", "key": "open", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            69: {"type": "float", "key": "high", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            70: {"type": "float", "key": "low", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            71: {"type": "float", "key": "close", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            72: {"type": "float", "key": "chng", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            73: {"type": "float", "key": "chngPer", "len": 8, "fmt": lambda v, p: commafmt(v, 2)},
            74: {"type": "float", "key": "atp", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            75: {"type": "float", "key": "yHigh", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            76: {"type": "float", "key": "yLow", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            77: {"type": "int32", "key": "ltq", "len": 4, "fmt": lambda v, p: commafmt(v, 0)},
            78: {"type": "int32", "key": "vol", "len": 4, "fmt": lambda v, p: commafmt(v, 0)},
            79: {"type": "float", "key": "ttv", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            80: {"type": "float", "key": "ucl", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            81: {"type": "float", "key": "lcl", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            82: {"type": "int32", "key": "OI", "len": 4, "fmt": lambda v, p: commafmt(v, 0)},
            83: {"type": "float", "key": "OIChngPer", "len": 8, "fmt": lambda v, p: commafmt(v, 2)},
            84: {"type": "int32", "key": "ltt", "len": 4, "fmt": lambda v, p: datefmt(v)},
            87: {"type": "float", "key": "bidprice", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            90: {"type": "float", "key": "askprice", "len": 8, "fmt": lambda v, p: commafmt(v, p)}
        },
        50: {
            65: {"type": "string", "key": "symbol", "len": 20},
            66: {"type": "uint8", "key": "precision", "len": 1},
            85: {"type": "int32", "key": "totBuyQty", "len": 4, "fmt": lambda v, p: commafmt(v, 0)},
            86: {"type": "int32", "key": "totSellQty", "len": 4, "fmt": lambda v, p: commafmt(v, 0)},
            87: {"type": "float", "key": "price", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            88: {"type": "int32", "key": "qty", "len": 4, "fmt": lambda v, p: commafmt(v, 0)},
            89: {"type": "int32", "key": "no", "len": 4, "fmt": lambda v, p: commafmt(v, 0)},
            90: {"type": "float", "key": "price", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            91: {"type": "int32", "key": "qty", "len": 4, "fmt": lambda v, p: commafmt(v, 0)},
            92: {"type": "int32", "key": "no", "len": 4, "fmt": lambda v, p: commafmt(v, 0)},
            93: {"type": "uint8", "key": "nDepth", "len": 1},
        },
        52: {
            65: {"type": "string", "key": "symbol", "len": 20},
            99: {"type": "float", "key": "iv", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            100: {"type": "float", "key": "atmiv", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            101: {"type": "float", "key": "delta", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            102: {"type": "float", "key": "theta", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            103: {"type": "float", "key": "vega", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
            104: {"type": "float", "key": "gamma", "len": 8, "fmt": lambda v, p: commafmt(v, p)},
        }
    },
    "BID_ASK_OBJ_LEN": 3
}

