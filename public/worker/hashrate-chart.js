// data-processor.js (Web Worker)

self.onmessage = function (e) {
  const { hashrates, difficulty, currentHashrate, currentDifficulty } = e.data;

  // 입력 데이터 기본 검사
  if (!hashrates || !Array.isArray(hashrates) || hashrates.length === 0) {
    self.postMessage({ error: 'No valid hashrate data', hashrates: { value: [], date: [] } });
    return;
  }

  // 이진 탐색으로 가까운 포인트 찾기
  function findClosestPoint(points, targetTime) {
    let left = 0, right = points.length - 1, closest = points[0];
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (Math.abs(points[mid].timestamp - targetTime) < Math.abs(closest.timestamp - targetTime)) {
        closest = points[mid];
      }
      if (points[mid].timestamp < targetTime) left = mid + 1;
      else right = mid - 1;
    }
    return closest;
  }

  // 균일 샘플링 (ATH 보존)
  function uniformSampleByTime(points, targetCount) {
    if (points.length <= targetCount) return points;

    // 중복 제거 (정렬은 서버에서 처리)
    const uniquePoints = [...new Map(points.map(p => [p.timestamp, p])).values()];

    // ATH 포인트 찾기
    const athPoint = uniquePoints.reduce((prev, curr) =>
      curr.avgHashrate > prev.avgHashrate ? curr : prev
    );

    // 타임스탬프 범위 및 간격 계산
    const minTime = uniquePoints[0].timestamp;
    const maxTime = uniquePoints[uniquePoints.length - 1].timestamp;
    const interval = (maxTime - minTime) / (targetCount - 1);

    // 균일 샘플링
    const sampled = [];
    let currentTime = minTime;
    for (let i = 0; i < targetCount; i++) {
      sampled.push(findClosestPoint(uniquePoints, currentTime));
      currentTime += interval;
    }

    // ATH 추가 및 중복 제거
    const seen = new Set();
    return [...sampled, athPoint].filter(p => {
      if (seen.has(p.timestamp)) return false;
      seen.add(p.timestamp);
      return true;
    });
  }

  // 샘플링 적용 (60% 감소, 약 2400개 목표)
  let simplifiedHashrates = hashrates;
  if (hashrates.length > 2000) {
    const targetCount = Math.floor(hashrates.length * 0.4);
    simplifiedHashrates = uniformSampleByTime(hashrates, targetCount);
  }

  // hashrates 배열 분리
  const hashratesValue = simplifiedHashrates.map(i => i.avgHashrate);
  const hashratesDate = simplifiedHashrates.map(i => i.timestamp);

  // difficulty 배열 분리
  const difficultyValue = (difficulty || []).map(i => i?.difficulty || 0);
  const difficultyDate = (difficulty || []).map(i => i?.time || 0);

  // 결과 객체 생성
  const result = {
    currentHashrate: currentHashrate || 0,
    currentDifficulty: currentDifficulty || 0,
    hashrates: { value: hashratesValue, date: hashratesDate },
    difficulty: { value: difficultyValue, date: difficultyDate },
  };

  self.postMessage(result);
};
