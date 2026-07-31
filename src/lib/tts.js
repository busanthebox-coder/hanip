let koVoice = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  koVoice = voices.find((v) => v.lang === 'ko-KR') || voices.find((v) => v.lang?.startsWith('ko')) || null;
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  if (koVoice) u.voice = koVoice;
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}
