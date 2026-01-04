import { KToasterProps } from 'kku-ui'

export const getToastProps = (): KToasterProps => {

  const isClient = typeof window !== 'undefined';
  const isDesktop = isClient && window.innerWidth > 524;

  return {
    position: "bottom-center",
    closeButton: true,
    duration: 2000,
    size: isDesktop ? 'md' : 'sm',
    mobileOffset: 88,
    style: { zIndex: 999 }
  };
};