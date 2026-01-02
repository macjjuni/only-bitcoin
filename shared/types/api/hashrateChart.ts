

export interface DifficultyVO {
  adjustment: number;
  difficulty: number;
  height: number;
  time: number;
}

export interface HashrateVO {
  avgHashrate: number;
  timestamp: number;
}

export interface HashrateChartResponseData {
  currentDifficulty: number;
  currentHashrate: number;
  difficulty: DifficultyVO[];
  hashrates: HashrateVO[];
}

export interface HashrateChartFormattedData {
  currentDifficulty: number;
  currentHashrate: number;
  hashrates: {
    value: number[];
    date: number[];
  }
  difficulty: {
    value: number[];
    date: number[];
  }
}
