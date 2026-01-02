
// TODO. 반감기 날짜를 멤풀에 조회해서 뿌려주기.
// - 현재 블록 높이 가져와서 지난 지난 반감기 블록 높이 조회 후 날짜를 보여주기
// - 단점: 멤풀에 의존적이므로 네트워크 오류 시 데이터 표시 못 함.
// - 장점: 계속 업데이트 안해줘도 됨.

export interface BlockHalvingDataTypes {
  date: string;
  blockHeight: number;
  blockReward: number | string;
}

export const GENESIS_BLOCK = {
  height: 0,
  size: 285,
  poolName: "Unknown",
  timestamp: 1231006505,
} as const;

export const blockHalvingData: BlockHalvingDataTypes[] = [
  { date: "2009.01.03", blockHeight: 0, blockReward: '50.0' },
  { date: "2012.11.29", blockHeight: 210000, blockReward: '25.0' },
  { date: "2016.07.10", blockHeight: 420000, blockReward: '12.5' },
  { date: "2020.05.12", blockHeight: 630000, blockReward: '6.25' },
  { date: "2024.04.20", blockHeight: 840000, blockReward: '3.125' },
  { date: "2028", blockHeight: 1050000, blockReward: '1.5625' },
  { date: "2032", blockHeight: 1260000, blockReward: '0.78125' },
  { date: "2036", blockHeight: 1470000, blockReward: '0.390625' },
  { date: "2040", blockHeight: 1680000, blockReward: '0.1953125' },
  { date: "2044", blockHeight: 1890000, blockReward: '0.09765625' },
  { date: "2048", blockHeight: 2100000, blockReward: '0.048828125' },
  { date: "2052", blockHeight: 2310000, blockReward: '0.0244140625' },
  { date: "2056", blockHeight: 2520000, blockReward: '0.01220703125' },
  { date: "2060", blockHeight: 2730000, blockReward: '0.006103515625' },
  { date: "2064", blockHeight: 2940000, blockReward: '0.0030517578125' },
  { date: "2068", blockHeight: 3150000, blockReward: '0.00152587890625' },
  { date: "2072", blockHeight: 3360000, blockReward: '0.000762939453125' },
  { date: "2076", blockHeight: 3570000, blockReward: '0.0003814697265625' },
  { date: "2080", blockHeight: 3780000, blockReward: '0.00019073486328125' },
  { date: "2084", blockHeight: 3990000, blockReward: '0.000095367431640625' },
  { date: "2088", blockHeight: 4200000, blockReward: '0.0000476837158203125' },
  { date: "2092", blockHeight: 4410000, blockReward: '0.00002384185791015625' },
  { date: "2096", blockHeight: 4620000, blockReward: '0.000011920928955078125' },
  { date: "2100", blockHeight: 4830000, blockReward: '0.0000059604644775390625' },
  { date: "2104", blockHeight: 5040000, blockReward: '0.00000298023223876953125' },
  { date: "2108", blockHeight: 5250000, blockReward: '0.000001490116119384765625' },
  { date: "2112", blockHeight: 5460000, blockReward: '0.0000007450580596923828125' },
  { date: "2116", blockHeight: 5670000, blockReward: '0.00000037252902984619140625' },
  { date: "2120", blockHeight: 5880000, blockReward: '0.000000186264514923095703125' },
  { date: "2124", blockHeight: 6090000, blockReward: '0.0000000931322574615478515625' },
  { date: "2128", blockHeight: 6300000, blockReward: '0.00000004656612873077392578125' },
  { date: "2132", blockHeight: 6510000, blockReward: '0.000000023283064365386962890625' },
  { date: "2136", blockHeight: 6720000, blockReward: '0.0000000116415321826934814453125' },
  { date: "2140", blockHeight: 6930000, blockReward: '0.00000000582076609134674072265625' }
];

export const GENESIS_BLOCK_RAW_DATA = `
    00000000   01 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00   ................
    00000010   00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00   ................
    00000020   00 00 00 00 3B A3 ED FD  7A 7B 12 B2 7A C7 2C 3E   ....;£íýz{.²zÇ,>
    00000030   67 76 8F 61 7F C8 1B C3  88 8A 51 32 3A 9F B8 AA   gv.a.È.ÃˆŠQ2:Ÿ¸ª
    00000040   4B 1E 5E 4A 29 AB 5F 49  FF FF 00 1D 1D AC 2B 7C   K.^J)«_Iÿÿ...¬+|
    00000050   01 01 00 00 00 01 00 00  00 00 00 00 00 00 00 00   ................
    00000060   00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00   ................
    00000070   00 00 00 00 00 00 FF FF  FF FF 4D 04 FF FF 00 1D   ......ÿÿÿÿM.ÿÿ..
    00000080   01 04 45 54 68 65 20 54  69 6D 65 73 20 30 33 2F   ..EThe Times 03/
    00000090   4A 61 6E 2F 32 30 30 39  20 43 68 61 6E 63 65 6C   Jan/2009 Chancel
    000000A0   6C 6F 72 20 6F 6E 20 62  72 69 6E 6B 20 6F 66 20   lor on brink of 
    000000B0   73 65 63 6F 6E 64 20 62  61 69 6C 6F 75 74 20 66   second bailout f
    000000C0   6F 72 20 62 61 6E 6B 73  FF FF FF FF 01 00 F2 05   or banksÿÿÿÿ..ò.
    000000D0   2A 01 00 00 00 43 41 04  67 8A FD B0 FE 55 48 27   *....CA.gŠý°þUH'
    000000E0   19 67 F1 A6 71 30 B7 10  5C D6 A8 28 E0 39 09 A6   .gñ¦q0·.\\Ö¨(à9.¦
    000000F0   79 62 E0 EA 1F 61 DE B6  49 F6 BC 3F 4C EF 38 C4   ybàê.aÞ¶Iö¼?Lï8Ä
    00000100   F3 55 04 E5 1E C1 12 DE  5C 38 4D F7 BA 0B 8D 57   óU.å.Á.Þ\\8M÷º..W
    00000110   8A 4C 70 2B 6B F1 1D 5F  AC 00 00 00 00            ŠLp+kñ._¬....
` as const;