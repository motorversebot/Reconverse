import { Card, CardContent } from "@/components/ui/card";

interface Props {
  title: string;
  description: string;
}

export default function PlaceholderSection({ title, description }: Props) {
  return (
    <Card className="glass-panel border-border">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-foreground mb-1">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
