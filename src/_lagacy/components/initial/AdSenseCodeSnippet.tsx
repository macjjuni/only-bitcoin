import { useLayoutEffect } from "react";

const adsenseId = import.meta.env.VITE_ADSENSE_ID;

const AdsenseCodeSnippet = () => {
  useLayoutEffect(() => {
    const script = document.createElement("script");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`;
    script.crossOrigin = "anonymous";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return <></>;
};
export default AdsenseCodeSnippet;
