const interval = (func: () => void, time: number) => {
  /** @type {number} */
  let intervalId: number;

  return {
    // eslint-disable-next-line no-return-assign
    start: () =>
      (intervalId = window.setInterval(() => {
        func();
      }, time)),
    clear: () => clearInterval(intervalId),
  };
};

export default interval;
