import {
  LucideIcon,
  Music2,
  Zap,
  Flame,
  Heart,
  Waves,
  Coffee,
  Sun,
  Moon,
  Cloud,
  Sparkles,
  Wind,
  Droplets,
  Smile,
  PartyPopper,
} from "lucide-react";

export type IconOption = {
  value: string;
  label: string;
  icon: LucideIcon;
  badgeClass?: string;
  gradientClass?: string;
};

export const GENRE_ICON_OPTIONS: IconOption[] = [
  { value: "music", label: "Pop", icon: Music2, badgeClass: "bg-neon-pink" },
  { value: "zap", label: "Electronic", icon: Zap, badgeClass: "bg-neon-blue" },
  { value: "flame", label: "Hip Hop", icon: Flame, badgeClass: "bg-primary" },
  { value: "heart", label: "Indie / Rock", icon: Heart, badgeClass: "bg-neon-green" },
  { value: "waves", label: "Jazz", icon: Waves, badgeClass: "bg-accent" },
  { value: "coffee", label: "Lo-Fi / Chill", icon: Coffee, badgeClass: "bg-muted-foreground" },
];

export const MOOD_ICON_OPTIONS: IconOption[] = [
  { value: "sun", label: "Energetic", icon: Sun, gradientClass: "from-neon-pink to-primary" },
  { value: "moon", label: "Calm Night", icon: Moon, gradientClass: "from-neon-blue to-accent" },
  { value: "sparkles", label: "Focus", icon: Sparkles, gradientClass: "from-neon-green to-primary" },
  { value: "party", label: "Party", icon: PartyPopper, gradientClass: "from-primary to-neon-pink" },
  { value: "cloud", label: "Dreamy", icon: Cloud, gradientClass: "from-purple-400 to-indigo-500" },
  { value: "droplets", label: "Melancholy", icon: Droplets, gradientClass: "from-slate-500 to-blue-500" },
  { value: "smile", label: "Happy", icon: Smile, gradientClass: "from-amber-400 to-orange-500" },
  { value: "wind", label: "Fresh", icon: Wind, gradientClass: "from-emerald-400 to-cyan-500" },
];

export const findIconOption = (value: string | null | undefined, list: IconOption[]) =>
  value ? list.find((option) => option.value === value) : undefined;




