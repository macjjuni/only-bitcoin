import type { ReactNode } from "react";
import { Card } from "@/shared/ui";

/**
 * 표시할 데이터가 없을 때 안내 문구를 보여주는 카드.
 */
const EmptyMessageCard = ({ children }: { children: ReactNode }) => (
  <Card>
    <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
  </Card>
);

export default EmptyMessageCard;
