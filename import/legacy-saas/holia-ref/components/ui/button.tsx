import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-sauge text-white hover:bg-sauge-dark",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline:
          "border border-sauge bg-transparent text-sauge hover:bg-sauge/10",
        secondary: "bg-sable text-anthracite hover:bg-sable-dark",
        ghost: "hover:bg-sable/50 text-anthracite",
        link: "text-sauge underline-offset-4 hover:underline",
        // Fond sauge, texte blanc, remplissage au survol (sur fond blanc de page)
        saugeFill:
          "group relative overflow-hidden rounded-full bg-sauge text-white px-8 py-4 text-base font-semibold transition-colors duration-300 hover:text-white before:content-[''] before:absolute before:inset-0 before:z-0 before:h-full before:w-0 before:bg-white/15 before:transition-[width] before:duration-500 before:ease-out hover:before:w-full",
        // Fond blanc, texte sauge, remplissage au survol (sur fond sauge, ex. Teasing Pro)
        saugeFillInverse:
          "group relative overflow-hidden rounded-full bg-white px-8 py-4 text-base font-semibold text-sauge transition-colors duration-300 hover:text-sauge-dark before:content-[''] before:absolute before:inset-0 before:z-0 before:h-full before:w-0 before:bg-[#9bb49b]/10 before:transition-[width] before:duration-500 before:ease-out hover:before:w-full",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-2xl px-3",
        lg: "h-11 rounded-2xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// Pour les boutons fill : padding + hauteur auto pour ne pas être écrasé par size (h-10 etc.)
const FILL_SIZE = { padding: "1rem 2rem", height: "auto", minHeight: "3rem" };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isFill = variant === "saugeFill" || variant === "saugeFillInverse";
    const needsFillWrapper = isFill && !asChild;
    const content =
      needsFillWrapper ? (
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      ) : (
        children
      );
    const mergedStyle =
      isFill && style ? { ...FILL_SIZE, ...style } : isFill ? FILL_SIZE : style;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={mergedStyle}
        ref={ref}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

