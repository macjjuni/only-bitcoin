// data-processor.js (Web Worker 스레드에서 실행)

// 메인 스레드로부터 메시지를 받는 이벤트 리스너
self.onmessage = function(e) {
  const data = e.data; // 메인 스레드로부터 받은 원본 데이터

  // 데이터 가공을 위한 빈 배열 초기화
  const hashratesValue = [];
  const hashratesDate = [];
  const difficultyValue = [];
  const difficultyDate = [];

  const difficulty = data.difficulty;
  const hashrates = data.hashrates;

  // ⭐ 블로킹을 유발했던 대규모 연산
  hashrates.forEach(item => {
    hashratesValue.push(item.avgHashrate);
    hashratesDate.push(item.timestamp);
  });

  difficulty.forEach(item => {
    difficultyValue.push(item.difficulty);
    difficultyDate.push(item.time);
  });

  // 가공된 결과 객체
  const result = {
    currentHashrate: data.currentHashrate,
    currentDifficulty: data.currentDifficulty,
    hashrates: {
      value: hashratesValue,
      date: hashratesDate,
    },
    difficulty: {
      value: difficultyValue,
      date: difficultyDate,
    }
  };

  // 가공된 최종 결과를 메인 스레드로 다시 전송
  self.postMessage(result);
};
