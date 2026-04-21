import {
  Square, Circle, Triangle, Diamond, Pentagon, Hexagon, Star, Heart,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import type { ShapeType } from "@/lib/shapeRasterizer";

export default function ShapeIcon({ type, size = 14 }: { type: ShapeType; size?: number }) {
  switch (type) {
    case "line": return <Minus size={size} />;
    case "rectangle": return <Square size={size} />;
    case "roundedRect": return <Square size={size} className="rounded-sm" />;
    case "ellipse": return <Circle size={size} />;
    case "triangle": return <Triangle size={size} />;
    case "rightTriangle": return <Triangle size={size} style={{ transform: "rotate(90deg)" }} />;
    case "diamond": return <Diamond size={size} />;
    case "pentagon": return <Pentagon size={size} />;
    case "hexagon": return <Hexagon size={size} />;
    case "arrowRight": return <ArrowRight size={size} />;
    case "arrowLeft": return <ArrowLeft size={size} />;
    case "arrowUp": return <ArrowUp size={size} />;
    case "arrowDown": return <ArrowDown size={size} />;
    case "star5": return <Star size={size} />;
    case "star6": return <Star size={size} className="rotate-[30deg]" />;
    case "heart": return <Heart size={size} />;
    default: return <Square size={size} />;
  }
}
