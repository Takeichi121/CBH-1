import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card text-center py-12">
        <CardContent className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The page you are looking for does not exist or has been moved.
          </p>

          <Link href="/">
            <Button className="rounded-full px-8">Return Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
