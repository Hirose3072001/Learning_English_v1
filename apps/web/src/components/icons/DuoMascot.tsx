import { motion } from "framer-motion";

interface DuoMascotProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}

const sizeMap = {
  sm: 60,
  md: 100,
  lg: 150,
  xl: 200,
};

export const DuoMascot = ({ className = "", size = "md", animated = true }: DuoMascotProps) => {
  const pixelSize = sizeMap[size];
  
  const OwlSvg = (
    <svg
      viewBox="0 0 100 100"
      width={pixelSize}
      height={pixelSize}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Body */}
      <ellipse cx="50" cy="58" rx="35" ry="38" className="fill-primary" />
      
      {/* Belly */}
      <ellipse cx="50" cy="65" rx="22" ry="25" className="fill-primary-foreground" />
      
      {/* Left Wing */}
      <ellipse cx="20" cy="55" rx="12" ry="20" className="fill-primary" style={{ filter: "brightness(0.9)" }} />
      
      {/* Right Wing */}
      <ellipse cx="80" cy="55" rx="12" ry="20" className="fill-primary" style={{ filter: "brightness(0.9)" }} />
      
      {/* Head feathers */}
      <ellipse cx="35" cy="18" rx="6" ry="12" className="fill-primary" transform="rotate(-15 35 18)" />
      <ellipse cx="65" cy="18" rx="6" ry="12" className="fill-primary" transform="rotate(15 65 18)" />
      
      {/* Left Eye White */}
      <circle cx="38" cy="42" r="14" className="fill-primary-foreground" />
      
      {/* Right Eye White */}
      <circle cx="62" cy="42" r="14" className="fill-primary-foreground" />
      
      {/* Left Eye Pupil */}
      <circle cx="40" cy="44" r="7" className="fill-foreground" />
      <circle cx="42" cy="42" r="2" className="fill-primary-foreground" />
      
      {/* Right Eye Pupil */}
      <circle cx="64" cy="44" r="7" className="fill-foreground" />
      <circle cx="66" cy="42" r="2" className="fill-primary-foreground" />
      
      {/* Beak */}
      <path d="M45 52 L50 60 L55 52 Q50 54 45 52" className="fill-warning" />
      
      {/* Feet */}
      <ellipse cx="40" cy="94" rx="8" ry="4" className="fill-warning" />
      <ellipse cx="60" cy="94" rx="8" ry="4" className="fill-warning" />
      
      {/* Eyebrows for expression */}
      <path d="M28 32 Q38 28 46 34" stroke="hsl(var(--primary))" strokeWidth="3" fill="none" style={{ filter: "brightness(0.7)" }} />
      <path d="M72 32 Q62 28 54 34" stroke="hsl(var(--primary))" strokeWidth="3" fill="none" style={{ filter: "brightness(0.7)" }} />
    </svg>
  );

  if (animated) {
    return (
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {OwlSvg}
      </motion.div>
    );
  }

  return OwlSvg;
};
