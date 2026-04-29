import logo from "@/assets/agsell-logo.png";
import { cn } from "@/lib/utils";

interface AGSellLogoProps {
  className?: string;
  alt?: string;
}

export function AGSellLogo({ className, alt = "AG Sell" }: AGSellLogoProps) {
  return (
    <img
      src={logo}
      alt={alt}
      className={cn("h-6 w-6 rounded-md object-contain", className)}
      loading="lazy"
    />
  );
}

export default AGSellLogo;
