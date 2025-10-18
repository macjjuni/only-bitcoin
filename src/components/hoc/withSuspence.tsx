import React, { Suspense, ComponentType, ReactNode } from "react";

export default function withSuspensePromise<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback: ReactNode = <></>
): (props: P) => React.JSX.Element {
  // eslint-disable-next-line react/display-name
  return (props: P) => (
    <Suspense fallback={fallback}>
      <WrappedComponent {...props} />
    </Suspense>
  );
}
