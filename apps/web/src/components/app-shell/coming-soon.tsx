import { Card, CardContent } from "@expense/ui/components/card";
import type { ReactNode } from "react";

// Placeholder body for screens not built yet.
export function ComingSoon({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
