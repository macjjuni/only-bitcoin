

export interface FearGreedIndexResponseTypes {
  name: string;
  data: [
    {
      value: string;
      value_classification: string;
      timestamp: string;
      time_until_update: string;
    }
  ];
  metadata: {
    error: null | string;
  };
}
