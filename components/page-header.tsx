import {
  CheckSquare,
  Film,
  type LucideIcon,
  Settings,
  ShoppingCart,
} from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon: "CheckSquare" | "ShoppingCart" | "Film" | "Settings";
}

export function PageHeader({ title, description, icon }: PageHeaderProps) {
  const Icon = getIcon(icon);

  return (
    <div className="flex flex-col gap-1">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Icon className="h-6 w-6" />
        {title}
      </h1>
      {description ? (
        <p className="text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function getIcon(icon: string): LucideIcon {
  switch (icon) {
    case "CheckSquare":
      return CheckSquare;
    case "ShoppingCart":
      return ShoppingCart;
    case "Film":
      return Film;
    case "Settings":
      return Settings;
    default:
      return CheckSquare;
  }
}
