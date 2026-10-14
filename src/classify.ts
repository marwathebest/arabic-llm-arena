export const CATEGORIES = ['dialect', 'msa', 'code', 'culture', 'translation', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

// Words that are common in Saudi / Gulf speech and rare in Modern Standard Arabic.
const DIALECT = new Set([
  'وش', 'ايش', 'وشو', 'شلون', 'ابغى', 'ابغي', 'ابي', 'تبي', 'يبي', 'نبي', 'ودي', 'وده', 'كذا', 'زين',
  'مره', 'حيل', 'الحين', 'عشان', 'علشان', 'ليش', 'وين', 'مب', 'مو', 'هالشي', 'ذا', 'ذي', 'يعني', 'خلاص',
  'تكفى', 'تكفون', 'يالله', 'هلا', 'ياخي', 'اشوف', 'شفت', 'وشلون', 'كيفك', 'ايوه', 'ايه', 'لا', 'بس',
  'ياكوكو', 'اسوي', 'تسوي', 'يسوي', 'سويت', 'ابغاك', 'حق', 'دحين', 'اللحين',
]);
// Ambiguous words above ('لا', 'بس', 'يعني', 'حق', 'ذا') only count alongside a stronger marker.
const WEAK_DIALECT = new Set(['لا', 'بس', 'يعني', 'حق', 'ذا', 'ذي', 'مو', 'ايه']);

const CULTURE = [
  'الحج', 'العمره', 'رمضان', 'العيد', 'القران', 'حديث', 'الصلاه', 'المملكه', 'السعوديه', 'سعودي',
  'الملك', 'تاريخ', 'التاريخ', 'تراث', 'التراث', 'اليوم الوطني', 'يوم التاسيس', 'الدرعيه', 'نجد', 'الحجاز',
  'قصيده', 'شعر', 'الشعر', 'مثل شعبي', 'الامثال', 'رؤيه 2030', 'العلا', 'القهوه السعوديه',
];
const TRANSLATION = ['ترجم', 'ترجمه', 'ترجمة', 'translate', 'translation', 'بالانجليزي', 'بالعربي', 'in english', 'in arabic'];
// English keywords match whole words only ("api" must not match "capital").
const CODE_WORDS = /\b(function|def|class|const|select|import|python|javascript|typescript|sql|html|css|react|node(js)?|api|regex|bug|error|json)\b/;
const CODE_SNIPPETS = ['```', 'console.log', 'print(', '=>', 'كود', 'برمجه', 'برمج', 'داله', 'خطا برمجي'];

/** Strip diacritics and tatweel and unify alef/yaa/taa marbuta so matching is spelling-tolerant. */
export function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function arabicRatio(text: string): number {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 0;
  const arabic = letters.filter((ch) => /[؀-ۿ]/.test(ch)).length;
  return arabic / letters.length;
}

/** Cheap keyword classifier. Good enough to bucket votes; the user can always override it. */
export function classify(prompt: string): Category {
  const norm = normalizeArabic(prompt);
  const words = norm.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  if (TRANSLATION.some((w) => norm.includes(normalizeArabic(w)))) return 'translation';
  if (CODE_WORDS.test(norm) || CODE_SNIPPETS.some((w) => norm.includes(w))) return 'code';

  if (arabicRatio(prompt) < 0.5) return 'other';

  const strong = words.filter((w) => DIALECT.has(w) && !WEAK_DIALECT.has(w)).length;
  const weak = words.filter((w) => WEAK_DIALECT.has(w)).length;
  const isDialect = strong >= 2 || (strong >= 1 && weak >= 1);

  if (CULTURE.some((w) => norm.includes(normalizeArabic(w)))) return isDialect && strong >= 3 ? 'dialect' : 'culture';
  if (isDialect) return 'dialect';
  return 'msa';
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
