import { Card, CardContent } from "@/components/ui/card";

export function SocialInlineCard(props: { type: 'not-found'; message: string }) {
  return (
    <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted" />
        <div>
          <div className="font-semibold">Không tìm thấy profile</div>
          <div className="text-sm text-muted-foreground">{props.message}</div>
        </div>
      </CardContent>
    </Card>
  );
}

