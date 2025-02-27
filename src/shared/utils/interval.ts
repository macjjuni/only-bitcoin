const interval = (func: () => void, intervalTime: number) => {
  /** @type {number} */
  let intervalId: number;

  return {
    // eslint-disable-next-line no-return-assign
    start: () =>
      (intervalId = window.setInterval(() => {
        func();
      }, intervalTime)),
    clear: () => clearInterval(intervalId),
  };
};

export default interval;
