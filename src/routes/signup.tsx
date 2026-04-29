import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Start free trial — NaijaClientr" },
      { name: "description", content: "Create your NaijaClientr account and start finding clients today." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background font-bold">N</div>
            <span className="text-lg font-semibold tracking-tight">NaijaClientr</span>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
            <h1 className="text-2xl font-semibold tracking-tight">Start your free trial</h1>
            <p className="mt-1 text-sm text-muted-foreground">7 days free. No credit card required.</p>
            <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" placeholder="you@agency.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="At least 8 characters" />
              </div>
              <Button type="submit" className="w-full">Create account</Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
