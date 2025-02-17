import { memo, ReactNode } from "react";
import "./FormRow.scss";

interface FormRowTypes {
  children: ReactNode;
  icon?: ReactNode;
}

export const FormRow = ({children, icon}: FormRowTypes) => {
  return (
    <div className="form-row__area">
      {icon && icon}
      <div className="form-row__area__content">
        {children}
      </div>
    </div>
  );
};

export default memo(FormRow);
