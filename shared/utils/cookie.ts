
export function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  // (일 * 24시간 * 60분 * 60초 * 1000밀리초)로 계산하여 현재 시간에 더함
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));

  document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}


export function getCookie(name: string): string | null {
  const cookies = document.cookie.split('; ');
  // eslint-disable-next-line no-restricted-syntax
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) return value;
  }
  return null;
}

export function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
}
