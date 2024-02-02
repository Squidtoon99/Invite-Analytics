import Link from "next/link";
import { cn } from "@/lib/utils";

export function MainNav({
    className,
    ...props
}: React.HTMLAttributes<HTMLElement>) {
    return (
        <nav
            className={cn("flex items-center space-x-4 lg:space-x-6 [&>*]:animate-fade-in-up", className)}
            {...props}
        >
            <Link
                href="/dashboard"
                className="text-sm font-medium transition-colors hover:text-primary"
            >
                Overview
            </Link>
            <Link
                href="/docs"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
                Documentation
            </Link>
            <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
                Support Server
            </Link>
            <Link
                href="/premium"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
                Premium 💖
            </Link>
        </nav>
    );
}