import { combineCharacter } from 'es-hangul';

// SEE https://www.unicode.org/charts/PDF/U1100.pdf

/**
 * 초성으로 올 수 있는 한글 글자
 */
export const CHOSEONGS = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

export const DISASSEMBLED_VOWELS_BY_VOWEL = {
  ㅏ: 'ㅏ',
  ㅐ: 'ㅐ',
  ㅑ: 'ㅑ',
  ㅒ: 'ㅒ',
  ㅓ: 'ㅓ',
  ㅔ: 'ㅔ',
  ㅕ: 'ㅕ',
  ㅖ: 'ㅖ',
  ㅗ: 'ㅗ',
  ㅘ: 'ㅗㅏ',
  ㅙ: 'ㅗㅐ',
  ㅚ: 'ㅗㅣ',
  ㅛ: 'ㅛ',
  ㅜ: 'ㅜ',
  ㅝ: 'ㅜㅓ',
  ㅞ: 'ㅜㅔ',
  ㅟ: 'ㅜㅣ',
  ㅠ: 'ㅠ',
  ㅡ: 'ㅡ',
  ㅢ: 'ㅡㅣ',
  ㅣ: 'ㅣ',
} as const;

const ASSEMBLED_JONGSUNG = [
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

// // [3 Fl.+Pf.] 하울의 움직이는 성_인생의 회전목마 - Flute I.pdf
const a = decodeURI(
  '%5B3%20Fl.+Pf.%5D%20%E1%84%92%E1%85%A1%E1%84%8B%E1%85%AE%E1%86%AF%E1%84%8B%E1%85%B4%20%E1%84%8B%E1%85%AE%E1%86%B7%E1%84%8C%E1%85%B5%E1%86%A8%E1%84%8B%E1%85%B5%E1%84%82%E1%85%B3%E1%86%AB%20%E1%84%89%E1%85%A5%E1%86%BC_%E1%84%8B%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A2%E1%86%BC%E1%84%8B%E1%85%B4%20%E1%84%92%E1%85%AC%E1%84%8C%E1%85%A5%E1%86%AB%E1%84%86%E1%85%A9%E1%86%A8%E1%84%86%E1%85%A1%20-%20Flute%20I.pdf',
);

/**
 * str 에 NFD(조합형) 한글이 포함되어 있는가?
 */
export function includeNFDHangul(str: string) {
  return /[\u1100-\u11FF]/.test(String(str));
}

/**
 * str 에 현대에는 사용하지 않는 한글이 포함되어 있는가?
 */
export function includeOldHangul(str: string) {
  // \u1176-\u11A7 : 현대에는 사용하지 않는 한글의 초성
  // \u1113-\u115F : 현대에는 사용하지 않는 한글의 중성
  // \u11C3-\u11FF : 현대에는 사용하지 않는 한글의 종성
  return /[\u1113-\u115F\u1176-\u11A7\u11C3-\u11FF]/.test(String(str));
}

export class IrreplaceableOldHangulError extends Error {
  constructor(char: string) {
    super(`Irreplaceable old hangul character found: ${char}`);
  }
}

const nfdChoseongMap = Object.fromEntries(
  CHOSEONGS.map((choseong, index) => [4352 + index, choseong]),
);

const nfdVowelMap = Object.fromEntries(
  Object.keys(DISASSEMBLED_VOWELS_BY_VOWEL).map((vowel, index) => [
    4449 + index,
    DISASSEMBLED_VOWELS_BY_VOWEL[
      vowel as keyof typeof DISASSEMBLED_VOWELS_BY_VOWEL
    ],
  ]),
);

const nfdJongseongMap = Object.fromEntries(
  ASSEMBLED_JONGSUNG.map((jongseong, index) => [4520 + index, jongseong]),
);

export function replaceNFDHangulToNFCHangul(str: string): string {
  if (!includeNFDHangul(str)) {
    return str;
  }

  if (includeOldHangul(str)) {
    throw new IrreplaceableOldHangulError(str);
  }

  const nfdChars = Array.from(str);
  const charComponents: string[] = [];

  let chosung = '';
  let jungsung = '';
  let jongsung = '';

  for (const char of nfdChars) {
    const charCode = char.charCodeAt(0);

    if (Object.keys(nfdChoseongMap).includes(charCode.toString())) {
      if (chosung || jungsung) {
        // 이전에 입력한 초성이 이미 있다면
        if (chosung && jungsung) {
          // 종성이 없는 경우.
          charComponents.push(combineCharacter(chosung, jungsung, ''));
        } else {
          // 초성이 연속으로 입력된 경우.
          charComponents.push(chosung);
        }
      }

      // 이전에 입력한 초성이 없다면
      chosung = nfdChoseongMap[charCode];
      jungsung = '';
      jongsung = '';

      continue;
    }

    if (Object.keys(nfdVowelMap).includes(charCode.toString())) {
      if (jungsung) {
        // 이전에 입력한 중성이 이미 있다면
        if (chosung) {
          // 종성이 없는 경우.
          charComponents.push(
            combineCharacter(chosung, nfdVowelMap[charCode], ''),
          );
        } else {
          // 중성이 연속으로 입력된 경우.
          charComponents.push(nfdVowelMap[charCode]);
        }

        chosung = '';
        jungsung = '';
        jongsung = '';
      }

      // 이전에 입력한 중성이 없다면
      jungsung = nfdVowelMap[charCode];
      continue;
    }

    if (Object.keys(nfdJongseongMap).includes(charCode.toString())) {
      jongsung = nfdJongseongMap[charCode];

      if (chosung && jungsung) {
        charComponents.push(combineCharacter(chosung, jungsung, jongsung));
      } else if (chosung && !jungsung) {
        charComponents.push(chosung);
        charComponents.push(jongsung);
      } else {
        charComponents.push(jongsung);
      }

      chosung = '';
      jungsung = '';
      jongsung = '';

      continue;
    }

    if (chosung || jungsung) {
      if (chosung && jungsung) {
        charComponents.push(combineCharacter(chosung, jungsung, ''));
      } else {
        charComponents.push(chosung || jungsung);
      }
    }

    charComponents.push(char);
    chosung = '';
    jungsung = '';
    jongsung = '';
  }

  if (chosung && jungsung && !jongsung) {
    charComponents.push(combineCharacter(chosung, jungsung, ''));
  } else if (chosung && jungsung && jongsung) {
    charComponents.push(combineCharacter(chosung, jungsung, jongsung));
  } else {
    [chosung, jungsung, jongsung].forEach((char) => {
      if (char) {
        charComponents.push(char);
      }
    });
  }

  return charComponents.join('');
}

console.log(replaceNFDHangulToNFCHangul(a));
