import React, { memo, ReactNode } from "react";
import { KAccordion } from "kku-ui";
import "./FormRowAccordion.scss";
import { ComponentBaseTypes } from "@/shared/types/base.interface";


interface FormRowAccordionTypes extends ComponentBaseTypes {
  icon: ReactNode;
  label: string
  children: ReactNode;
}


const FormRowAccordion = ({className ,icon, label, children}: FormRowAccordionTypes) => {
  return (
    <KAccordion className={`form-row__accordion ${className || ''}`} summary={
      <div className="form-row__accordion__label__area">
        {icon}
        <div className="form-row__accordion__label__area__text">{label}</div>
      </div>
    }>
      {children}
    </KAccordion>
  );
};

export default memo(FormRowAccordion);
