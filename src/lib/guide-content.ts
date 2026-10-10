// Pure guide text so build scripts can import it (and generate Traditional Chinese).
import type { Lang } from "./types";

export interface Block {
  h: string;
  p?: string;
  rows?: [string, string][];
}

export const CONTENT: Record<Lang, { title: string; back: string; blocks: Block[] }> = {
  en: {
    title: "Pronunciation & reading guide",
    back: "Settings",
    blocks: [
      {
        h: "Macrons (ā ē ī ō ū)",
        p: "A bar over a vowel marks a long vowel: hold it about twice as long as a short one. Macrons appear in dictionaries and textbooks; ordinary Latin texts don't print them. They also tell you where the stress falls.",
      },
      {
        h: "Which pronunciation should I pick?",
        p: "Classical is how Romans spoke in Cicero's day and is the standard in most school and university courses. Ecclesiastical is the Italian-flavoured Latin of the Church and of much choral music. Either is fine; choose the one that fits your goal and stay with it. You can switch any time in Settings.",
      },
      {
        h: "Classical",
        rows: [
          ["c, g", "always hard: cēna = KAY-na, gentēs = GEN-tays"],
          ["v", "like English w: vīta = WEE-ta"],
          ["i (before a vowel)", "like English y: iam = YAHM"],
          ["ae / oe / au", "eye / oy / ow: caelum = KYE-lum"],
          ["ph, th, ch", "p, t, k with a puff of air"],
        ],
      },
      {
        h: "Ecclesiastical",
        rows: [
          ["c before e, i, ae, oe", "ch: cēna = CHAY-na"],
          ["g before e, i", "j: gentēs = JEN-tays"],
          ["v", "like English v: vīta = VEE-ta"],
          ["ae / oe", "like e in “bet”: caelum = CHAY-lum"],
          ["ti + vowel", "tsee: gratia = GRAH-tsee-ah"],
          ["sc before e, i", "sh: scientia = shee-EN-tsee-ah"],
          ["h", "silent (except mihi, nihil = MEE-kee, NEE-keel)"],
        ],
      },
      {
        h: "Where the stress falls",
        p: "Two-syllable words are stressed on the first syllable. Longer words are stressed on the second-to-last syllable if it is “heavy” (it has a long vowel, a diphthong, or is followed by two consonants); otherwise on the third-to-last. Example: amīcitia is a-mi-CI-ti-a.",
      },
      {
        h: "Reading a dictionary entry",
        rows: [
          ["aqua -ae f.", "noun: nominative, genitive ending, gender (m., f., n.)"],
          ["amō -āre -āvī -ātum", "verb: I love; infinitive; perfect; supine (the four principal parts)"],
          ["bonus -a -um", "adjective: masculine, feminine, neuter endings"],
          ["sum esse fuī", "irregular verbs list their parts in full"],
        ],
      },
    ],
  },
  zh: {
    title: "发音与阅读指南",
    back: "设置",
    blocks: [
      {
        h: "长音符号（ā ē ī ō ū）",
        p: "元音上的横线表示长元音，约为短元音的两倍长。词典和教材会标注长音符号，普通拉丁文本不标。它也能帮你判断重音位置。",
      },
      {
        h: "该选哪种发音？",
        p: "古典发音是西塞罗时代罗马人的读法，也是多数学校和大学课程采用的标准。教会发音带有意大利语色彩，用于教会和许多合唱作品。两种都可以，选适合你目标的一种并坚持即可，也可随时在设置中切换。",
      },
      {
        h: "古典发音",
        rows: [
          ["c, g", "始终发硬音：cēna = KAY-na，gentēs = GEN-tays"],
          ["v", "像英语 w：vīta = WEE-ta"],
          ["i（在元音前）", "像英语 y：iam = YAHM"],
          ["ae / oe / au", "读作 eye / oy / ow：caelum = KYE-lum"],
          ["ph, th, ch", "分别是送气的 p、t、k"],
        ],
      },
      {
        h: "教会发音",
        rows: [
          ["c（在 e、i、ae、oe 前）", "读 ch：cēna = CHAY-na"],
          ["g（在 e、i 前）", "读 j：gentēs = JEN-tays"],
          ["v", "像英语 v：vīta = VEE-ta"],
          ["ae / oe", "像 “bet” 中的 e：caelum = CHAY-lum"],
          ["ti + 元音", "读 tsee：gratia = GRAH-tsee-ah"],
          ["sc（在 e、i 前）", "读 sh：scientia = shee-EN-tsee-ah"],
          ["h", "不发音（mihi、nihil 例外：MEE-kee、NEE-keel）"],
        ],
      },
      {
        h: "重音规则",
        p: "两个音节的词重音在第一个音节。更长的词：如果倒数第二个音节是“重音节”（含长元音、双元音，或后面跟两个辅音），重音落在它上面；否则落在倒数第三个音节。例如 amīcitia 读作 a-mi-CI-ti-a。",
      },
      {
        h: "如何读词典条目",
        rows: [
          ["aqua -ae f.", "名词：主格、属格词尾、性（m. 阳、f. 阴、n. 中）"],
          ["amō -āre -āvī -ātum", "动词：我爱；不定式；完成时；目的分词（四个主要形式）"],
          ["bonus -a -um", "形容词：阳性、阴性、中性词尾"],
          ["sum esse fuī", "不规则动词会完整列出各个形式"],
        ],
      },
    ],
  },
};
