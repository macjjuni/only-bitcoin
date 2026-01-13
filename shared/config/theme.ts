import { persistKey } from "@/shared/stores/store";

export const THEME_INITIALIZATION_SCRIPT = `
  (function() {
    try {
      const storage = localStorage.getItem('${persistKey}');
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