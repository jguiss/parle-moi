"use client";

export const BADGE_INFO: Record<string, { name: string; description: string }> = {
  newcomer_welcome: { name: "Newcomer Welcome", description: "Completed your first call" },
  globe_trotter: { name: "Globe-trotter", description: "Talked to people from 20 different countries" },
  polyglot: { name: "Polyglot", description: "Connected with 3 different languages" },
  regular: { name: "Regular", description: "Completed 100 calls" },
  social_butterfly: { name: "Social Butterfly", description: "Made 10 friends" },
  streak_7: { name: "Week Warrior", description: "7-day streak" },
  streak_30: { name: "Monthly Master", description: "30-day streak" },
  top_rated: { name: "Top Rated", description: "High reputation with 50+ ratings" },
};

interface BadgeDisplayProps {
  badges: string[];
  compact?: boolean;
}

export function BadgeDisplay({ badges, compact = false }: BadgeDisplayProps) {
  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "gap-2"}`}>
      {badges.map((type) => {
        const info = BADGE_INFO[type];
        if (!info) return null;
        return (
          <span
            key={type}
            title={info.description}
            className={`bg-accent/10 text-accent rounded-full font-body font-medium ${
              compact ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"
            }`}
          >
            {info.name}
          </span>
        );
      })}
    </div>
  );
}
