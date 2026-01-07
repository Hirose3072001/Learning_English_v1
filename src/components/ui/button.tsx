import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-bold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-1 active:shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-duo-button hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_4px_0_0_hsl(0_62%_45%)] hover:brightness-110",
        outline:
          "border-2 border-border bg-background text-foreground shadow-duo hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground shadow-duo-secondary hover:brightness-110",
        accent:
          "bg-accent text-accent-foreground shadow-duo-accent hover:brightness-110",
        ghost: 
          "hover:bg-muted hover:text-foreground",
        link: 
          "text-primary underline-offset-4 hover:underline",
        hero:
          "bg-card text-primary border-2 border-border shadow-duo-card hover:bg-muted text-lg px-8 py-6",
        heroFilled:
          "bg-primary text-primary-foreground shadow-duo-button hover:brightness-110 text-lg px-8 py-6",
        gold:
          "bg-gold text-gold-foreground shadow-[0_4px_0_0_hsl(35_93%_40%)] hover:brightness-110",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-lg px-4 text-sm",
        lg: "h-14 rounded-xl px-8 text-lg",
        xl: "h-16 rounded-2xl px-10 text-xl",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
