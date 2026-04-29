import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background font-bold">
            N
          </div>
          <span className="text-lg font-semibold tracking-tight">NaijaClientr</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link to="/" hash="features" className="text-muted-foreground transition-colors hover:text-foreground">Features</Link>
          <Link to="/pricing" className="text-muted-foreground transition-colors hover:text-foreground">Pricing</Link>
          <Link to="/" hash="faq" className="text-muted-foreground transition-colors hover:text-foreground">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">Start free trial</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
