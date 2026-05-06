// Fun taunts shown on honeypot surfaces. Visible to anyone poking around
// fake admin / WordPress / API endpoints. The goal: make it crystal clear
// they walked into a Sentinel AI trap, while still being entertaining.

export const HONEYPOT_TAUNTS: readonly string[] = [
  "👀 Smile! You're on camera, IMDb credit pending.",
  "Wrong password. Also wrong life choices. Try therapy instead. 🛋️",
  "We logged your IP, your user-agent, AND your browser history's vibe. 🍿",
  "This door was glued shut in 2019. Stop pulling. — Sentinel AI",
  "You are the bee. This is the honeypot. The honey is glue. 🐝",
  "admin / admin? Bold. 1995 called, it wants its exploit back. ☎️",
  "Plot twist: the real admin is making popcorn and watching you type.",
  "Achievement unlocked: 'Rang the doorbell at the police station' 🚓",
  "Server says: 401 Unbothered, Moisturized, In My Lane. ✨",
  "Your packets are being read out loud at our standup meeting. 📞",
  "Hi mom! 👋 — your kid (logged from this IP at " + "an embarrassing hour)",
  "We tried to ban your IP but it begged us not to. We did it anyway. 🔨",
  "Fun fact: you're the 47th person today. Top 10 if we're being generous.",
  "Error: Hacker.exe has stopped responding. Have you tried a real job?",
  "This honeypot has Wi-Fi, snacks, and 4 cameras. Make yourself at home. 🍪",
  "We'd say 'nice try' but legal won't let us lie like that.",
  "Roses are red, your TTL is small, this is a honeypot, you fell for it all. 🌹",
];

export function pickTaunt(seed?: string | null): string {
  const s = seed ?? Math.random().toString();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % HONEYPOT_TAUNTS.length;
  return HONEYPOT_TAUNTS[idx]!;
}
