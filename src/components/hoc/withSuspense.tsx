import React, { Suspense, ComponentType, ReactNode } from "react";

export default function withSuspense<P extends JSX.IntrinsicAttributes>(WrappedComponent: ComponentType<P>, fallback: ReactNode = <div>Loading...</div>) {
  const ComponentWithSuspense = (props: P) => (
    <Suspense fallback={fallback}>
      <WrappedComponent {...props} />
    </Suspense>
  );

  return React.memo(ComponentWithSuspense);
}
