import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnitNotesCard({ notes }: { notes: string | null }) {
  return (
    <Card className="glass-panel border-border">
      <CardHeader>
        <CardTitle className="text-lg">Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {notes || <span className="text-muted-foreground">No notes added yet.</span>}
        </p>
      </CardContent>
    </Card>
  );
}
