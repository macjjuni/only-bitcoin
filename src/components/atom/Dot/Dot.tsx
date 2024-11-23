import { memo, useMemo } from "react";
import "./Dot.scss";


interface DotProps {
  status: boolean;
}

function Dot({ status }: DotProps) {

  const className = useMemo(() => {

    const clazz = ["network__dot"];
    const statusClassName = status ? "success" : "error";
    clazz.push(`network__dot--${statusClassName}`);

    return clazz.join(" ");
  }, [status]);

  return (<div className={className} />);
}

export default memo(Dot);