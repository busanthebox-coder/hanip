// Modern Hangul jamo tables (Unicode order for the syllable block algorithm).
export const LEADS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
export const VOWELS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
export const TAILS = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// Display romaji for each jamo (for the alphabet trainer).
export const LEAD_ROMAJI = ['g','kk','n','d','tt','r','m','b','pp','s','ss','silent','j','jj','ch','k','t','p','h'];
export const VOWEL_ROMAJI = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];

const BASE = 0xac00;

export function compose(leadIdx, vowelIdx, tailIdx = 0) {
  return String.fromCharCode(BASE + (leadIdx * 21 + vowelIdx) * 28 + tailIdx);
}

export function decompose(syllable) {
  const code = syllable.charCodeAt(0) - BASE;
  if (code < 0 || code > 11171) return { lead: syllable, vowel: '', tail: '' };
  const tailIdx = code % 28;
  const vowelIdx = Math.floor((code % 588) / 28);
  const leadIdx = Math.floor(code / 588);
  return { lead: LEADS[leadIdx], vowel: VOWELS[vowelIdx], tail: TAILS[tailIdx] };
}
