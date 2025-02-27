

export function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}`;
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
