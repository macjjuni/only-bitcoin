"use client";

import {
  KListGroup,
  type KListGroupProps,
  KListRow,
  KListRowAccordion,
  type KListRowAccordionProps,
  type KListRowProps,
} from "kku-ui";

export type {
  KListGroupProps as ListGroupProps,
  KListRowAccordionProps as ListRowAccordionProps,
  KListRowProps as ListRowProps,
};

/**
 * 리스트의 표면(배경·보더)은 KListGroup이 아니라 각 Row 루트에 있다.
 * Group에 glass를 얹으면 header 영역까지 유리판이 깔리므로 Row 단위로 적용한다.
 * 보더는 Row 간 이중선을 피하려고 kku-ui가 x축 + first/last로만 그리므로 그 구조를 유지한 채 두께·색만 덮는다.
 */
const ROW_SURFACE_CLASS_NAME = [
  "glass-surface",
  "!border-x-[0.75px] first:!border-t-[0.75px] last:!border-b-[0.75px]",
  "!border-neutral-300 dark:!border-neutral-600",
  // Row 내부 구분선은 prop으로 노출되지 않아 셀렉터로 보더와 두께·색을 맞춘다.
  "[&_[role=separator]]:!h-[0.75px]",
  "[&_[role=separator]]:!bg-neutral-300 dark:[&_[role=separator]]:!bg-neutral-600",
].join(" ");

const withRowSurface = (className?: string) =>
  [ROW_SURFACE_CLASS_NAME, className].filter(Boolean).join(" ");

const ListGroup = (props: KListGroupProps) => <KListGroup {...props} />;

const ListRow = ({ className, ...restProps }: KListRowProps) => (
  <KListRow className={withRowSurface(className)} {...restProps} />
);

const ListRowAccordion = ({ className, ...restProps }: KListRowAccordionProps) => (
  <KListRowAccordion className={withRowSurface(className)} {...restProps} />
);

export default ListGroup;
export { ListRow, ListRowAccordion };
