function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export { isSafari };
