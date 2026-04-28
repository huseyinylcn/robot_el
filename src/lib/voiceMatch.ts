import type { RobotPose } from "@/components/RobotHandPreview";

export type CmdDef = { key: string; label: string; pose: RobotPose };

/** Sesli tetikleyici kelimeler (Türkçe); uzun/özel ifadeler önce kontrol edilir */
const PHRASE_RULES: { aliases: string[]; key: string }[] = [
  { aliases: ["merhaba", "selam", "hey", "hey robot"], key: "1" },
  { aliases: ["bozkurt"], key: "2" },
  { aliases: ["yumruk"], key: "3" },
  { aliases: ["dört", "dort"], key: "7" },
  { aliases: ["üç", "uc"], key: "6" },
  { aliases: ["iki"], key: "5" },
  { aliases: ["bir"], key: "4" },
];

/**
 * Tarayıcı çoğu zaman «bir» yerine «1», «iki» yerine «2» metni döndürür.
 * Seri komut anahtarları: Bir=4, İki=5, Üç=6, Dört=7
 */
const SPOKEN_COUNT_TO_SERIAL_KEY: Record<string, string> = {
  "1": "4",
  "2": "5",
  "3": "6",
  "4": "7",
  one: "4",
  two: "5",
  three: "6",
  four: "7",
};

export function normalizeTr(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchVoiceToCommand(
  transcript: string,
  commands: CmdDef[],
): CmdDef | null {
  const n = normalizeTr(transcript);
  if (!n) return null;

  for (const rule of PHRASE_RULES) {
    for (const phrase of rule.aliases) {
      const p = normalizeTr(phrase);
      if (!p) continue;
      if (
        n === p ||
        n.includes(` ${p} `) ||
        n.startsWith(`${p} `) ||
        n.endsWith(` ${p}`)
      ) {
        const cmd = commands.find((c) => c.key === rule.key);
        if (cmd) return cmd;
      }
    }
  }

  const words = n.split(/\s+/).filter(Boolean);
  for (const rule of PHRASE_RULES) {
    for (const phrase of rule.aliases) {
      const pw = normalizeTr(phrase).split(/\s+/).filter(Boolean);
      if (pw.length === 1 && words.includes(pw[0])) {
        const cmd = commands.find((c) => c.key === rule.key);
        if (cmd) return cmd;
      }
    }
  }

  /* Tek kelime: rakam veya İngilizce sayı → bir/iki/üç/dört komutları */
  if (words.length === 1) {
    const token = words[0];
    const serialKey = SPOKEN_COUNT_TO_SERIAL_KEY[token];
    if (serialKey) {
      const cmd = commands.find((c) => c.key === serialKey);
      if (cmd) return cmd;
    }
  }

  return null;
}
