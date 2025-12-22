import { memo, ReactNode } from "react";
import "./FormRow.scss";

interface FormRowTypes {
  children: ReactNode;
  icon?: ReactNode;
  label?: ReactNode;
}

const FormRow = ({children, icon, label}: FormRowTypes) => {
  return (
    <div className="form-row__area">
      { icon && (<div className="form-row__area__icon">{icon}</div>) }
      <div className="form-row__area__content">
      <div className="form-row__area__content__label">{label}</div>
      <div className="form-row__area__content__children">{children}</div>
      </div>
    </div>
  );
};

export default memo(FormRow);
