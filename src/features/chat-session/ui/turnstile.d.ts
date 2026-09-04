interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  theme: "auto";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
}

interface Window {
  turnstile?: {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
    remove: (widgetId: string) => void;
    reset: (widgetId: string) => void;
  };
}
