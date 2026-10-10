export interface Label {
  en: string;
  zh: string;
}

const l = (en: string, zh: string): Label => ({ en, zh });

// Keyed by the Chinese strings used in the source CSV.
export const POS: Record<string, Label> = {
  名词: l("noun", "名词"),
  动词: l("verb", "动词"),
  形容词: l("adjective", "形容词"),
  副词: l("adverb", "副词"),
  连词: l("conjunction", "连词"),
  介词: l("preposition", "介词"),
  代词: l("pronoun", "代词"),
};

export const DETAIL: Record<string, Label> = {
  第一变格法: l("1st declension", "第一变格法"),
  第二变格法: l("2nd declension", "第二变格法"),
  第三变格法: l("3rd declension", "第三变格法"),
  第四变格法: l("4th declension", "第四变格法"),
  第五变格法: l("5th declension", "第五变格法"),
  第一和第二变格法: l("1st/2nd declension", "第一和第二变格法"),
  第一变位法: l("1st conjugation", "第一变位法"),
  第二变位法: l("2nd conjugation", "第二变位法"),
  "第三变位法，以-ō结尾": l("3rd conjugation (-ō)", "第三变位法，以-ō结尾"),
  "第三变位法，以-iō结尾": l("3rd conjugation (-iō)", "第三变位法，以-iō结尾"),
  第四变位法: l("4th conjugation", "第四变位法"),
  不规则: l("irregular", "不规则"),
  异相: l("deponent", "异相"),
  数词: l("numeral", "数词"),
  无人称: l("impersonal", "无人称"),
  无词形变化: l("indeclinable", "无词形变化"),
};

export const GROUP: Record<string, Label> = {
  度量: l("Measure", "度量"),
  "连词/副词": l("Conjunctions & adverbs", "连词/副词"),
  战争与和平: l("War & peace", "战争与和平"),
  时间: l("Time", "时间"),
  "个性/特征": l("Character & traits", "个性/特征"),
  "代词/疑问": l("Pronouns & questions", "代词/疑问"),
  情感: l("Emotions", "情感"),
  地方: l("Place", "地方"),
  社会生活: l("Social life", "社会生活"),
  "教育/知识": l("Education & knowledge", "教育/知识"),
  "演讲/修辞": l("Speech & rhetoric", "演讲/修辞"),
  城市: l("City", "城市"),
  生命与存在: l("Life & being", "生命与存在"),
  正义: l("Justice", "正义"),
  运动: l("Motion", "运动"),
  旅行: l("Travel", "旅行"),
  暴力: l("Violence", "暴力"),
  "商务/金钱": l("Business & money", "商务/金钱"),
  土与火: l("Earth & fire", "土与火"),
  "表示强迫/指导的动词": l("Verbs of compelling & directing", "表示强迫/指导的动词"),
  身体: l("Body", "身体"),
  "动物/植物": l("Animals & plants", "动物/植物"),
  宗教: l("Religion", "宗教"),
  视觉: l("Sight", "视觉"),
  家庭: l("Family", "家庭"),
  "制作/做": l("Making & doing", "制作/做"),
  其它感知: l("Other senses", "其它感知"),
  气与火: l("Air & fire", "气与火"),
  地理: l("Geography", "地理"),
  "表示运输的动词": l("Verbs of carrying", "表示运输的动词"),
  时间长度: l("Duration", "时间长度"),
  房屋: l("House", "房屋"),
  "写作/诗歌": l("Writing & poetry", "写作/诗歌"),
  人物: l("People", "人物"),
  爱: l("Love", "爱"),
  欺骗: l("Deception", "欺骗"),
  体育: l("Sport", "体育"),
  非方位介词: l("Non-spatial prepositions", "非方位介词"),
};
