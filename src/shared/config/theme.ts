import { STORE_PERSIST_KEY } from "@/shared/stores/persistKeys";

/**
 * 첫 페인트 전에 실행되는 블로킹 스크립트. 번들러를 거치지 않고 HTML에 인라인된다.
 * 저장된 테마가 dark면 <html>에 클래스를 붙여 화면 깜빡임(FOUC)을 막는다.
 * `STORE_PERSIST_KEY` 최상위의 `theme` 을 읽으므로, 스토어를 나눌 때도 이 위치는 유지해야 한다.
 */
export const THEME_INITIALIZATION_SCRIPT = `
  (function() {
    try {
      const storage = localStorage.getItem('${STORE_PERSIST_KEY}');
      let theme;
      
      if (storage) {
        const parsed = JSON.parse(storage);
        theme = parsed.state?.theme;
      }
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Theme initialization failed', e);
    }
  })();
`;
