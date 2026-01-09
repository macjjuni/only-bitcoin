
export const THEME_INITIALIZATION_SCRIPT = `
  (function() {
    try {
      const storage = localStorage.getItem('only-bitcoin');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      let theme;
      if (storage) {
        const parsed = JSON.parse(storage);
        theme = parsed.state?.theme;
      }

      if (theme === 'dark' || (!theme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Theme initialization failed', e);
    }
  })();
`;