import { memo, useCallback, useEffect, useRef, useState } from "react";
import { KSkeleton } from "kku-ui";

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
}

const MAX_RETRY_COUNT = 3;

const LazyImage = ({ src, alt = "", className = "" }: LazyImageProps) => {
  // region [Hooks]
  const containerRef = useRef<HTMLDivElement | null>(null);
  const retryCountRef = useRef(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  // endregion


  // region [Events]
  const onLoadedImage = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const onErrorImage = useCallback(() => {
    if (retryCountRef.current < MAX_RETRY_COUNT) {
      retryCountRef.current += 1;
      // key를 변경하여 img 태그를 강제 리마운트 (재시도)
      setTimeout(() => setRetryKey((prev) => prev + 1), 800);
    } else {
      setError(true);
    }
  }, []);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);
  // endregion

  const classNames = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");


  return (
    <div ref={containerRef}
         className={classNames(
           "relative overflow-hidden bg-neutral-200 dark:bg-neutral-900 border-border border-[0.5px] rounded-md isolate w-full",
           !isLoaded && "min-h-[150px]",
           className
         )}>

      {/* 1. Loading State (Skeleton) */}
      {!isLoaded && !isError && (
        <KSkeleton className="absolute inset-0 z-0 h-full w-full opacity-50" />
      )}

      {/* 2. Image Render */}
      {isVisible && !isError && (
        <img key={`${src}-${retryKey}`} src={src} alt={alt} onLoad={onLoadedImage}
             onError={onErrorImage} className={classNames(
          "w-full h-auto block transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0"
        )} />
      )}

      {/* 3. Error State (Developer Look) */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black font-mono">
          <div className="text-danger text-sm mb-1 font-bold">✖ LOAD_FAILED</div>
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest italic">
            {alt || "Not Found"}
          </span>
        </div>
      )}
    </div>
  );
};


const MemoizedLazyImage = memo(LazyImage);
MemoizedLazyImage.displayName = "LazyImage";

export default MemoizedLazyImage;