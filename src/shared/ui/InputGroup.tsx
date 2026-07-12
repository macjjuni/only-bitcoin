"use client";

import { KInputGroup, KInputGroupAddon, KInputGroupInput } from "kku-ui";
import type { ComponentProps } from "react";

export type InputGroupProps = ComponentProps<typeof KInputGroup>;

const InputGroup = ({ className, ...restProps }: InputGroupProps) => (
  <KInputGroup
    className={[
      "glass-surface",
      "!border-[0.75px] !border-neutral-300 dark:!border-neutral-600",
      // glass-surface의 다크 규칙은 :where(.dark)라 specificity가 0이므로 kku-ui의 dark:bg-input/30에 밀린다.
      "dark:bg-neutral-900/30",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...restProps}
  />
);

export default InputGroup;
export { KInputGroupAddon as InputGroupAddon, KInputGroupInput as InputGroupInput };
