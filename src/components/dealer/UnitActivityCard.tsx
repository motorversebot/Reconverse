import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface Props {
  createdAt: string;
  updatedAt: string;
}

export default function UnitActivityCard({ createdAt, updatedAt }: Props) {
  return (
    <Card className="glass-panel border-border">
      <CardHeader>
        <CardTitle className="text-lg">Activity Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{format(new Date(createdAt), "MMM d, yyyy h:mm a")}</span>
          <span className="text-foreground">Unit created</span>
        </div>
        {updatedAt !== createdAt && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{format(new Date(updatedAt), "MMM d, yyyy h:mm a")}</span>
            <span className="text-foreground">Last updated</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
