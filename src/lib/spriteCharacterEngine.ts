// Dedicated 2D pixel-art sprite + blooming flora engine for character-video layers.
import { getCachedGif, getGifFrameAtTime } from "./gifFrameCache";
// All shapes use uniform nearest-neighbour sampling and hard alpha quantization for crisp LEDs.

export type BuiltIn2DPresetId =
  | 'sacred-swastik'
  | 'sacred-om'
  | 'butterfly'
  | 'wedding-kalash'
  | 'diya-lamp'
  | 'temple-bell'
  | 'anar-fountain'
  | 'firework-burst'
  | 'royal-elephant'
  | 'bhangra-dancer'
  | 'garba-dancer'
  | 'dhol-player'
  | 'dancing-peacock'
  | 'double-hearts'
  | 'beating-heart'
  | 'royal-crown'
  | 'jumping-dolphin'
  | 'blooming-rose'
  | 'blooming-lotus'
  | 'blooming-marigold'
  | 'spinning-rangoli';

export type CharacterXMovement = 'static' | 'scroll-right' | 'scroll-left' | 'bounce-x';
export type CharacterSwitchMode = 'single' | 'cycle-on-pass' | 'cycle-timed';

export interface SpriteCharacterConfig {
  presetId: BuiltIn2DPresetId;
  switchMode: CharacterSwitchMode;
  playlist: BuiltIn2DPresetId[];
  switchIntervalSec: number;
  xMovement: CharacterXMovement;
  xSpeed: number;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  usePresetColors: boolean;
  scale: number;
  xOffset: number;
  yOffset: number;
  animSpeed: number;
  flipX: boolean;
  tileRepeat: boolean;
  tileGap: number;
}

const DEFAULT_PALETTE: Record<string, string> = {
  '.': 'transparent',
  W: '#FFFFFF',
  Y: '#FFD700',
  O: '#FF6F00',
  R: '#FF1744',
  P: '#FF4081',
  G: '#00E676',
  C: '#00E5FF',
  B: '#2979FF',
  S: '#FFCC80',
};

// Grids use uniform strokes; the peacock is the only 20x20 sprite.
export const PIXEL_SPRITES: Record<string, string[][]> = {
  'sacred-swastik': [
    [
      '................',
      '.......RRRRRRR..',
      '.......RRRRRRR..',
      '..RR...RR.......',
      '..RR...RR..YY...',
      '..RR...RR..YY...',
      '..RR...RR.......',
      '..RRRRRRRRRRRR..',
      '..RRRRRRRRRRRR..',
      '.......RR...RR..',
      '...YY..RR...RR..',
      '...YY..RR...RR..',
      '.......RR...RR..',
      '..RRRRRRR.......',
      '..RRRRRRR.......',
      '................',
    ],
    [
      '................',
      '.......RRRRRRR..',
      '.......RRRRRRR..',
      '..RR...RR.......',
      '..RR...RR..WW...',
      '..RR...RR..WW...',
      '..RR...RR.......',
      '..RRRRRRRRRRRR..',
      '..RRRRRRRRRRRR..',
      '.......RR...RR..',
      '...WW..RR...RR..',
      '...WW..RR...RR..',
      '.......RR...RR..',
      '..RRRRRRR.......',
      '..RRRRRRR.......',
      '................',
    ],
    [
      '................',
      '.......OOOOOOO..',
      '.......OOOOOOO..',
      '..OO...OO.......',
      '..OO...OO..YY...',
      '..OO...OO..YY...',
      '..OO...OO.......',
      '..OOOOOOOOOOOO..',
      '..OOOOOOOOOOOO..',
      '.......OO...OO..',
      '...YY..OO...OO..',
      '...YY..OO...OO..',
      '.......OO...OO..',
      '..OOOOOOO.......',
      '..OOOOOOO.......',
      '................',
    ],
  ],

  butterfly: [
    [
      '....Y......Y....',
      '.....Y....Y.....',
      '.OOOO..WW..OOOO.',
      'OYYYYO.YY.OYYYYO',
      'OYWWYO.YY.OYWWYO',
      'OYYYYOOYYOOYYYYO',
      '.OOOOO.YY.OOOOO.',
      '...PPPPYYPPPP...',
      '..PYYYYYYYYYYP..',
      '..PYYYYYY.YYYP..',
      '...PPPPYYPPPP...',
      '.......YY.......',
      '.......WW.......',
      '................',
      '................',
      '................',
    ],
    [
      '.....Y....Y.....',
      '......Y..Y......',
      '......WWWW......',
      '...OOOOYYOOOO...',
      '..OYYYYYYYYYYO..',
      '..OYWWYYYYWWYO..',
      '...OOOOYYOOOO...',
      '....PPPYYPPP....',
      '...PYYYYYYYYP...',
      '....PPPYYPPP....',
      '.......YY.......',
      '.......WW.......',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '.....Y....Y.....',
      '......WWWW......',
      '.....OOYYOO.....',
      '....OYYYYYYO....',
      '....OYWYYWYO....',
      '.....OOYYOO.....',
      '.....PPYYPP.....',
      '....PYYYYYYP....',
      '.....PPYYPP.....',
      '.......YY.......',
      '.......WW.......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  ],

  'sacred-om': [
    [
      '.......YY.......',
      '.....Y.WW.Y.....',
      '......YYYY......',
      '................',
      '..RRRRR.........',
      '.RRRRRRR....RR..',
      '......RR...RRRR.',
      '...RRRRR..RR..RR',
      '...RRRRRRRR...RR',
      '......RRRR....RR',
      '.......RRR...RR.',
      '.RR....RRRRRRR..',
      '.RRRRRRRRRRRR...',
      '..RRRRRRRRR.....',
      '................',
      '................',
    ],
    [
      '......WWWW......',
      '....YYWWWWYY....',
      '.....YYYYYY.....',
      '................',
      '..OOOOO.........',
      '.OOOOOOO....OO..',
      '......OO...OOOO.',
      '...OOOOO..OO..OO',
      '...OOOOOOOO...OO',
      '......OOOO....OO',
      '.......OOO...OO.',
      '.OO....OOOOOOO..',
      '.OOOOOOOOOOOO...',
      '..OOOOOOOOO.....',
      '................',
      '................',
    ],
  ],

  'anar-fountain': [
    [
      '.......W........',
      '.....Y.W.Y......',
      '....W..Y..W.....',
      '......YYY.......',
      '.....OYYYO......',
      '......YYY.......',
      '......OOO.......',
      '.....RRRRR......',
      '.....RYYYR......',
      '....RRRRRRR.....',
      '....RYYYYYR.....',
      '...RRRRRRRRR....',
      '...OOOOOOOOO....',
      '..YYYYYYYYYYY...',
      '................',
      '................',
    ],
    [
      '...W.......W....',
      '....Y..W..Y.....',
      '..W...YYY...W...',
      '.....OYYYO......',
      '....W.YYY.W.....',
      '......OOO.......',
      '......YYY.......',
      '.....RRRRR......',
      '.....RYYYR......',
      '....RRRRRRR.....',
      '....RYYYYYR.....',
      '...RRRRRRRRR....',
      '...OOOOOOOOO....',
      '..YYYYYYYYYYY...',
      '................',
      '................',
    ],
    [
      '.W.....W.....W..',
      '..Y...Y.Y...Y...',
      '...W.OYYYO.W....',
      '....W.YYY.W.....',
      '......YYY.......',
      '......OOO.......',
      '......YYY.......',
      '.....RRRRR......',
      '.....RYYYR......',
      '....RRRRRRR.....',
      '....RYYYYYR.....',
      '...RRRRRRRRR....',
      '...OOOOOOOOO....',
      '..YYYYYYYYYYY...',
      '................',
      '................',
    ],
  ],

  'firework-burst': [
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.......YY.......',
      '......YWWY......',
      '......YWWY......',
      '.......YY.......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '................',
      '................',
      '.......YY.......',
      '....R..YY..R....',
      '.....R.WW.R.....',
      '...YYYYWWYYYY...',
      '...YYYYWWYYYY...',
      '.....R.WW.R.....',
      '....R..YY..R....',
      '.......YY.......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '.......CC.......',
      '..RR...CC...RR..',
      '...RR..YY..RR...',
      '....R.YWWY.R....',
      '.CC..Y.WW.Y..CC.',
      '.CC.Y......Y.CC.',
      '....Y......Y....',
      '.CC.Y......Y.CC.',
      '.CC..Y.WW.Y..CC.',
      '....R.YWWY.R....',
      '...RR..YY..RR...',
      '..RR...CC...RR..',
      '.......CC.......',
      '................',
      '................',
      '................',
    ],
    [
      '.W.....CC.....W.',
      '..R....CC....R..',
      '...G........G...',
      '................',
      'C..............C',
      'C..............C',
      '................',
      '................',
      'C..............C',
      'C..............C',
      '................',
      '...G........G...',
      '..R....CC....R..',
      '.W.....CC.....W.',
      '................',
      '................',
    ],
  ],

  'temple-bell': [
    [
      '.......YY.......',
      '......YYYY......',
      '.....OOOOOO.....',
      '....OOOOOOOO....',
      '....OYYYYYYO....',
      '...OOOOOOOOOO...',
      '...OYYYYYYYYO...',
      '..OOOOOOOOOOOO..',
      '..OYYYYYYYYYYO..',
      '.OOOOOOOOOOOOOO.',
      'YYYYYYYYYYYYYYYY',
      '.......RR.......',
      '......RRRR......',
      '.......RR.......',
      '................',
      '................',
    ],
    [
      '.......YY.......',
      '......YYYY......',
      '.....OOOOOO.....',
      '....OOOOOOOO....',
      '....OYYYYYYO....',
      '...OOOOOOOOOO...',
      '...OYYYYYYYYO...',
      '..OOOOOOOOOOOO..',
      '..OYYYYYYYYYYO..',
      '.OOOOOOOOOOOOOO.',
      'YYYYYYYYYYYYYYYY',
      '.....RR.........',
      '....RRRR........',
      '.....RR.........',
      '................',
      '................',
    ],
    [
      '.......YY.......',
      '......YYYY......',
      '.....OOOOOO.....',
      '....OOOOOOOO....',
      '....OYYYYYYO....',
      '...OOOOOOOOOO...',
      '...OYYYYYYYYO...',
      '..OOOOOOOOOOOO..',
      '..OYYYYYYYYYYO..',
      '.OOOOOOOOOOOOOO.',
      'YYYYYYYYYYYYYYYY',
      '.........RR.....',
      '........RRRR....',
      '.........RR.....',
      '................',
      '................',
    ],
  ],

  'royal-elephant': [
    [
      '..............WW',
      '............WWWW',
      '...CCCCCC...WW..',
      '..CCCCCCCC.WW...',
      '.CCCCCCCCCCCC...',
      '.CCWCCCCCCCC....',
      '.CCRRRRRRRRCC...',
      '.CCRYYYYYYRCC...',
      '.CCRYYYYYYRCC...',
      '.CCRRRRRRRRCC...',
      '..CCCCCCCCCC....',
      '..CCC....CCC....',
      '..CCC....CCC....',
      '..YYY....YYY....',
      '................',
      '................',
    ],
    [
      '................',
      '.............WW.',
      '...CCCCCC...WWWW',
      '..CCCCCCCC.WWWW.',
      '.CCCCCCCCCCCC...',
      '.CCWCCCCCCCC....',
      '.CCRRRRRRRRCC...',
      '.CCRYYYYYYRCC...',
      '.CCRYYYYYYRCC...',
      '.CCRRRRRRRRCC...',
      '..CCCCCCCCCC....',
      '...CCC..CCC.....',
      '...CCC..CCC.....',
      '...YYY..YYY.....',
      '................',
      '................',
    ],
  ],

  'double-hearts': [
    [
      '................',
      '..RRR..RRR......',
      '.RRRRRRRRRR.....',
      '.RRWRRRRRRR.....',
      '.RRRRRPPPP..PPP.',
      '..RRRRPPPPPPPPPP',
      '...RRRPPPPPPPPPP',
      '....RRPPPPPPPPPP',
      '.....R.PPPPPPPP.',
      '........PPPPPP..',
      '.........PPPP...',
      '..........PP....',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '.RRRR..RRRR.....',
      'RRRRRRRRRRRR....',
      'RRWWRRRRRRRR....',
      'RRRRRRPPPPP.PPPP',
      'RRRRRRPPPPPPPPPP',
      '.RRRRRPPPPPPPPPP',
      '..RRRRPPPPPPPPPP',
      '...RRR.PPPPPPPP.',
      '....RR..PPPPPP..',
      '.........PPPP...',
      '..........PP....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  ],

  'royal-crown': [
    [
      '................',
      '.......WW.......',
      '..YY...YY...YY..',
      '..YY..YYYY..YY..',
      '..YYY.YYYY.YYY..',
      '..YYYYYYYYYYYY..',
      '..YYRYYCYYRYYY..',
      '..YYYYYYYYYYYY..',
      '..OOOOOOOOOOOO..',
      '..YYYYYYYYYYYY..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '.......W........',
      '..W....YY....W..',
      '..YY..YYYY..YY..',
      '..YY..YYYY..YY..',
      '..YYY.YYYY.YYY..',
      '..YYYYYYYYYYYY..',
      '..YYWYYWYYWYYY..',
      '..YYYYYYYYYYYY..',
      '..OOOOOOOOOOOO..',
      '..YYYYYYYYYYYY..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  ],

  'jumping-dolphin': [
    [
      '................',
      '................',
      '......BBBB......',
      '....BBBBBBBB....',
      '...BBBBBBBBBB...',
      '..BBBBWBBBBBBB..',
      '.BBBBBBBBBBBBBB.',
      'BB..BBBBBBBB..BB',
      '....CCCCCCCC....',
      '...CC..CC..CC...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '......BBBB......',
      '....BBBBBBBB....',
      '...BBBBBBBBBB...',
      '..BBBBWBBBBBBB..',
      '.BBBBBBBBBBBBBB.',
      'BB..BBBBBBBB..BB',
      '................',
      '.....CCCCCC.....',
      '..CC...CC...CC..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  ],

  'wedding-kalash': [
    [
      '.......OO.......',
      '......OOOO......',
      '..GG..OOOO..GG..',
      '.GGGG.YYYY.GGGG.',
      'GGGG..YYYY..GGGG',
      '.GG..RRRRRR..GG.',
      '....RRRRRRRR....',
      '...RRRRYYRRRR...',
      '..RRRRYYYYRRRR..',
      '..RRRRWYYWRRRR..',
      '..RRRRYYYYRRRR..',
      '...RRRRYYRRRR...',
      '....RRRRRRRR....',
      '.....YYYYYY.....',
      '....OOOOOOOO....',
      '................',
    ],
    [
      '.W.....OO.....W.',
      '......OOOO......',
      '..GG..OOOO..GG..',
      '.GGGG.YYYY.GGGG.',
      'GGGG..YYYY..GGGG',
      '.GG..RRRRRR..GG.',
      '....RRRRRRRR....',
      '...RRRRWWWRRR...',
      '..RRRRWWWWWRRR..',
      '..RRRRWWYWWWRR..',
      '..RRRRWWWWWRRR..',
      '...RRRRWWWRRR...',
      '....RRRRRRRR....',
      '.....YYYYYY.....',
      '....OOOOOOOO....',
      '................',
    ],
  ],

  'dhol-player': [
    [
      '.....YYYY.......',
      '....YYYYYY......',
      '.....SSSS.......',
      '....RRRRRR..W...',
      '...RRRRRRRR.W...',
      '..SS.RRRR..SS...',
      '..W.YYYYYYYY....',
      '..W.YOOYYOOY....',
      '....YOOYYOOY....',
      '....YYYYYYYY....',
      '.....CCCCCC.....',
      '....CCC..CCC....',
      '....CCC..CCC....',
      '...CCC....CCC...',
      '...YYY....YYY...',
      '................',
    ],
    [
      '................',
      '.....YYYY.......',
      '....YYYYYY......',
      '..W..SSSS.......',
      '..W.RRRRRR......',
      '..SSRRRRRRRRSS..',
      '....YYYYYYYY.W..',
      '....YOOYYOOY.W..',
      '....YOOYYOOY....',
      '....YYYYYYYY....',
      '....CCCCCCCC....',
      '...CCC....CCC...',
      '...CCC....CCC...',
      '..YYY......YYY..',
      '................',
      '................',
    ],
  ],

  'dancing-peacock': [
    [
      '.....Y...YY...Y.....',
      '...Y.G..GGGG..G.Y...',
      '..YG.GGGGGGGGGG.GY..',
      '.YGG.YBGGGGGGBY.GGY.',
      'YGGGGGGGGGGGGGGGGGGY',
      'GG.YBGGGGYYGGGGBY.GG',
      'GG.GGGG.BBBB.GGGG.GG',
      'GGGGGGG.BBWBBYY.GGGG',
      'GG.YBGG.BBBB.GGBY.GG',
      '.GGGGGG..BB..GGGGGG.',
      '.GG.YB...BB...BY.GG.',
      '..GGGG..BBBB..GGGG..',
      '...GGG.BBBBBB.GGG...',
      '....GG.BBCCBB.GG....',
      '.......BBBBBB.......',
      '........BBBB........',
      '........Y..Y........',
      '........Y..Y........',
      '.......YY..YY.......',
      '....................',
    ],
    [
      '....W....YY....W....',
      '..W..G..GGGG..G..W..',
      '.WG..GGGGGGGGGG..GW.',
      'WGG..YWGGGGGGWY..GGW',
      'GGGGGGGGGGGGGGGGGGGG',
      'GG.YWGGGGYYGGGGWY.GG',
      'GG.GGGG.BBBB.GGGG.GG',
      'GGGGGGG.BBWBBYY.GGGG',
      'GG.YWGG.BBBB.GGWY.GG',
      '.GGGGGG..BB..GGGGGG.',
      '.GG.YW...BB...WY.GG.',
      '..GGGG..BBBB..GGGG..',
      '...GGG.BBBBBB.GGG...',
      '....GG.BBCCBB.GG....',
      '.......BBBBBB.......',
      '........BBBB........',
      '.......Y....Y.......',
      '.......Y....Y.......',
      '......YY....YY......',
      '....................',
    ],
    [
      '.....Y..YYYY..Y.....',
      '...Y.G.GGGGGG.G.Y...',
      '..YG.GGGGGGGGGG.GY..',
      '.YGG.YCGGGGGGCY.GGY.',
      'YGGGGGGGGGGGGGGGGGGY',
      'GG.YCGGGGYYGGGGCY.GG',
      'GG.GGGG.BBBB.GGGG.GG',
      'GGGGGGG.BBWBBYY.GGGG',
      'GG.YCGG.BBBB.GGCY.GG',
      '.GGGGGG..BB..GGGGGG.',
      '.GG.YC...BB...CY.GG.',
      '..GGGG..BBBB..GGGG..',
      '...GGG.BBBBBB.GGG...',
      '....GG.BBCCBB.GG....',
      '.......BBBBBB.......',
      '........BBBB........',
      '........Y..Y........',
      '........Y..Y........',
      '.......YY..YY.......',
      '....................',
    ],
  ],

  'bhangra-dancer': [
    [
      '......YYYY......',
      '.....YYYYYY.....',
      '.....YYSSYY.....',
      '......SSSS......',
      '.SS..CCCCCC..SS.',
      '.SSS.CCCCCC.SSS.',
      '..CCCCCCCCCCCC..',
      '....CCCCCCCC....',
      '....CCCCCCCC....',
      '....YYYYYYYY....',
      '....CCCCCCCC....',
      '....CCC..CCC....',
      '...CCC....CCC...',
      '...CCC.....CCC..',
      '..YYY.......YYY.',
      '................',
    ],
    [
      '................',
      '......YYYY......',
      '.....YYYYYY.....',
      '.....YYSSYY.....',
      '......SSSS......',
      '..SS.CCCCCC.SS..',
      '.SSS.CCCCCC.SSS.',
      '.CCCCCCCCCCCCCC.',
      '....CCCCCCCC....',
      '....YYYYYYYY....',
      '...CCCCCCCCCC...',
      '..CCC......CCC..',
      '..CCC......CCC..',
      '.YYY........YYY.',
      '................',
      '................',
    ],
    [
      '......YYYY......',
      '.....YYYYYY.....',
      '.....YYSSYY.....',
      '......SSSS......',
      'SS...CCCCCC...SS',
      'SSS..CCCCCC..SSS',
      '.CCCCCCCCCCCCCC.',
      '....CCCCCCCC....',
      '....CCCCCCCC....',
      '....YYYYYYYY....',
      '....CCCCCCCC....',
      '...CCC....CCC...',
      '..CCC......CCC..',
      '.CCC........CCC.',
      'YYY..........YYY',
      '................',
    ],
  ],

  'garba-dancer': [
    [
      '...W........W...',
      '....W.YYYY.W....',
      '.....YYYYYY.....',
      '......SSSS......',
      '...SS.RRRR.SS...',
      '....RRRRRRRR....',
      '.....RRRRRR.....',
      '.....YYYYYY.....',
      '....RRRRRRRR....',
      '...RRRRRRRRRR...',
      '..RRRRRRRRRRRR..',
      '.YYYYYYYYYYYYYY.',
      '....CCC..CCC....',
      '....YYY..YYY....',
      '................',
      '................',
    ],
    [
      '......YYYY......',
      '.....YYYYYY.....',
      '......SSSS......',
      '..WW..RRRR..WW..',
      '.W..RRRRRRRR..W.',
      '.....RRRRRR.....',
      '.....YYYYYY.....',
      '...RRRRRRRRRR...',
      '..RRRRRRRRRRRR..',
      '.RRRRRRRRRRRRRR.',
      'RRRRRRRRRRRRRRRR',
      'YYYYYYYYYYYYYYYY',
      '.....CCC.CCC....',
      '.....YYY.YYY....',
      '................',
      '................',
    ],
  ],

  'diya-lamp': [
    [
      '.......W........',
      '......YWY.......',
      '.....YYYYY......',
      '.....YWWWY......',
      '......YYY.......',
      '.......O........',
      '................',
      '..OOOOOOOOOOOO..',
      '.RRRRRRRRRRRRRR.',
      '.RRYYYYYYYYYYRR.',
      '..RRRRRRRRRRRR..',
      '...OOOOOOOOOO...',
      '....YYYYYYYY....',
      '................',
      '................',
      '................',
    ],
    [
      '......W.........',
      '.....YWY........',
      '.....YYYY.......',
      '.....YWWYY......',
      '......YYY.......',
      '.......O........',
      '................',
      '..OOOOOOOOOOOO..',
      '.RRRRRRRRRRRRRR.',
      '.RRYYYYYYYYYYRR.',
      '..RRRRRRRRRRRR..',
      '...OOOOOOOOOO...',
      '....YYYYYYYY....',
      '................',
      '................',
      '................',
    ],
  ],

  'beating-heart': [
    [
      '................',
      '................',
      '...RRR....RRR...',
      '..RRRRR..RRRRR..',
      '.RRRRRRRRRRRRRR.',
      '.RRWWRRRRRRRRRR.',
      '.RRWRRRRRRRRRRR.',
      '..RRRRRRRRRRRR..',
      '...RRRRRRRRRR...',
      '....RRRRRRRR....',
      '.....RRRRRR.....',
      '......RRRR......',
      '.......RR.......',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '..RRRR....RRRR..',
      '.RRRRRR..RRRRRR.',
      'RRRRRRRRRRRRRRRR',
      'RRWWWRRRRRRRRRRR',
      'RRWWRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRR',
      '.RRRRRRRRRRRRRR.',
      '..RRRRRRRRRRRR..',
      '...RRRRRRRRRR...',
      '....RRRRRRRR....',
      '.....RRRRRR.....',
      '......RRRR......',
      '.......RR.......',
      '................',
      '................',
    ],
  ],
};

export const SPRITE_CHARACTER_PRESETS: { id: BuiltIn2DPresetId; name: string; category: string }[] = [
  { id: 'sacred-swastik', name: 'Sacred Swastik', category: 'Sacred & Wedding' },
  { id: 'sacred-om', name: 'Sacred Om', category: 'Sacred & Wedding' },
  { id: 'wedding-kalash', name: 'Wedding Kalash', category: 'Sacred & Wedding' },
  { id: 'diya-lamp', name: 'Diya Lamp', category: 'Sacred & Wedding' },
  { id: 'temple-bell', name: 'Temple Bell', category: 'Sacred & Wedding' },
  { id: 'royal-elephant', name: 'Royal Elephant', category: 'Sacred & Wedding' },
  { id: 'double-hearts', name: 'Double Hearts', category: 'Sacred & Wedding' },
  { id: 'beating-heart', name: 'Beating Heart', category: 'Sacred & Wedding' },
  { id: 'royal-crown', name: 'Royal Crown', category: 'Sacred & Wedding' },
  { id: 'anar-fountain', name: 'Anar Fountain', category: 'Fireworks & Celebrations' },
  { id: 'firework-burst', name: 'Firework Burst', category: 'Fireworks & Celebrations' },
  { id: 'bhangra-dancer', name: 'Bhangra Dancer', category: 'Dancers & Nature' },
  { id: 'garba-dancer', name: 'Garba Dancer', category: 'Dancers & Nature' },
  { id: 'dhol-player', name: 'Dhol Player', category: 'Dancers & Nature' },
  { id: 'dancing-peacock', name: 'Dancing Peacock', category: 'Dancers & Nature' },
  { id: 'butterfly', name: 'Butterfly', category: 'Dancers & Nature' },
  { id: 'jumping-dolphin', name: 'Jumping Dolphin', category: 'Dancers & Nature' },
  { id: 'blooming-rose', name: 'Blooming Rose', category: 'Blooming Flowers' },
  { id: 'blooming-lotus', name: 'Blooming Lotus', category: 'Blooming Flowers' },
  { id: 'blooming-marigold', name: 'Blooming Marigold', category: 'Blooming Flowers' },
  { id: 'spinning-rangoli', name: 'Spinning Rangoli', category: 'Blooming Flowers' },
];

const PRESET_COLORS: Record<BuiltIn2DPresetId, [string, string, string]> = {
  'sacred-swastik': ['#FF1744', '#FFD700', '#FFFFFF'],
  'sacred-om': ['#FF1744', '#FFD700', '#FFFFFF'],
  butterfly: ['#FF6F00', '#FFD700', '#FFFFFF'],
  'wedding-kalash': ['#FF1744', '#00E676', '#FFD700'],
  'diya-lamp': ['#FF6F00', '#FFD700', '#FFFFFF'],
  'temple-bell': ['#FF6F00', '#FFD700', '#FFFFFF'],
  'anar-fountain': ['#FF1744', '#FFD700', '#FFFFFF'],
  'firework-burst': ['#00E5FF', '#FF1744', '#FFFFFF'],
  'royal-elephant': ['#2979FF', '#FFD700', '#FFFFFF'],
  'bhangra-dancer': ['#00E5FF', '#FFD700', '#FFFFFF'],
  'garba-dancer': ['#FF1744', '#FFD700', '#FFFFFF'],
  'dhol-player': ['#00E5FF', '#FFD700', '#FFFFFF'],
  'dancing-peacock': ['#00E676', '#2979FF', '#FFD700'],
  'double-hearts': ['#FF1744', '#FF4081', '#FFFFFF'],
  'beating-heart': ['#FF1744', '#FF4081', '#FFFFFF'],
  'royal-crown': ['#FFD700', '#2979FF', '#FFFFFF'],
  'jumping-dolphin': ['#2979FF', '#00E5FF', '#FFFFFF'],
  'blooming-rose': ['#D50000', '#FF1744', '#FF80AB'],
  'blooming-lotus': ['#FF2A85', '#FF94C2', '#FFF59D'],
  'blooming-marigold': ['#FF6F00', '#FFD600', '#FFF59D'],
  'spinning-rangoli': ['#FF2A85', '#FF94C2', '#FFF59D'],
};

const LEGACY_PRESET_IDS: Record<string, BuiltIn2DPresetId> = {
  'bhangra-silhouette': 'bhangra-dancer',
  'dandiya-couple': 'garba-dancer',
  'kalash-swastik': 'wedding-kalash',
  heart: 'beating-heart',
};

export function normalizeSpriteCharacterPresetId(id: string | undefined): BuiltIn2DPresetId {
  const mapped = LEGACY_PRESET_IDS[id ?? ''] ?? (id as BuiltIn2DPresetId);
  return SPRITE_CHARACTER_PRESETS.some((p) => p.id === mapped) ? mapped : 'bhangra-dancer';
}

export function createDefaultSpriteCharacterConfig(
  presetId: BuiltIn2DPresetId = 'bhangra-dancer',
): SpriteCharacterConfig {
  const id = normalizeSpriteCharacterPresetId(presetId);
  const [primaryColor, secondaryColor, glowColor] = PRESET_COLORS[id];
  return {
    presetId: id,
    switchMode: 'single',
    playlist: [id],
    switchIntervalSec: 4,
    xMovement: 'static',
    xSpeed: 0,
    primaryColor,
    secondaryColor,
    glowColor,
    usePresetColors: true,
    scale: 1,
    xOffset: 0,
    yOffset: 0,
    animSpeed: 1,
    flipX: false,
    tileRepeat: false,
    tileGap: 2,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const finite = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;

export function normalizeSpriteCharacterConfig(
  input: Partial<SpriteCharacterConfig> & { presetId?: string },
): SpriteCharacterConfig {
  const presetId = normalizeSpriteCharacterPresetId(input.presetId);
  const base = createDefaultSpriteCharacterConfig(presetId);
  const playlist = Array.isArray(input.playlist)
    ? Array.from(new Set(input.playlist.map((id) => normalizeSpriteCharacterPresetId(id))))
    : base.playlist;
  const switchMode = input.switchMode === 'cycle-on-pass' || input.switchMode === 'cycle-timed'
    ? input.switchMode : 'single';
  const xMovement = input.xMovement === 'scroll-right' || input.xMovement === 'scroll-left' || input.xMovement === 'bounce-x'
    ? input.xMovement : 'static';

  return {
    ...base,
    ...input,
    presetId,
    switchMode,
    playlist: playlist.length ? playlist : [presetId],
    switchIntervalSec: clamp(finite(input.switchIntervalSec, base.switchIntervalSec), 2, 15),
    xMovement,
    xSpeed: clamp(finite(input.xSpeed, 0), 0, 100),
    primaryColor: typeof input.primaryColor === 'string' ? input.primaryColor : base.primaryColor,
    secondaryColor: typeof input.secondaryColor === 'string' ? input.secondaryColor : base.secondaryColor,
    glowColor: typeof input.glowColor === 'string' ? input.glowColor : base.glowColor,
    usePresetColors: input.usePresetColors !== false,
    scale: clamp(finite(input.scale, 1), 0.5, 4),
    xOffset: Math.round(finite(input.xOffset, 0)),
    yOffset: Math.round(finite(input.yOffset, 0)),
    animSpeed: clamp(finite(input.animSpeed, 1), 0.25, 3),
    flipX: input.flipX === true,
    tileRepeat: input.tileRepeat === true,
    tileGap: clamp(Math.round(finite(input.tileGap, 2)), 0, 32),
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const raw = (hex || '').replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const channel = (at: number) => {
    const value = parseInt(full.slice(at, at + 2), 16);
    return Number.isFinite(value) ? clamp(value, 0, 255) : 255;
  };
  return [channel(0), channel(2), channel(4)];
}

function spriteColor(code: string, config: SpriteCharacterConfig): [number, number, number] | null {
  if (code === '.' || !code) return null;
  if (config.usePresetColors) {
    const hex = DEFAULT_PALETTE[code] || '#FFFFFF';
    return hex === 'transparent' ? null : hexToRgb(hex);
  }
  if (code === 'R' || code === 'C' || code === 'P' || code === 'B' || code === 'S') return hexToRgb(config.primaryColor);
  if (code === 'Y' || code === 'O' || code === 'G') return hexToRgb(config.secondaryColor);
  if (code === 'W') return hexToRgb(config.glowColor);
  return hexToRgb(DEFAULT_PALETTE[code] || '#FFFFFF');
}

function setPixel(data: Uint8ClampedArray, size: number, x: number, y: number, rgb: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const p = (y * size + x) * 4;
  data[p] = rgb[0];
  data[p + 1] = rgb[1];
  data[p + 2] = rgb[2];
  data[p + 3] = 255;
}

function fillCircle(data: Uint8ClampedArray, size: number, cx: number, cy: number, r: number,
  rgb: [number, number, number]): void {
  if (r <= 0) return;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) setPixel(data, size, x, y, rgb);
    }
  }
}

function drawPixelSpriteRGBA(data: Uint8ClampedArray, size: number, t: number,
  presetId: BuiltIn2DPresetId, config: SpriteCharacterConfig): void {
  const frames = PIXEL_SPRITES[presetId] || PIXEL_SPRITES['sacred-swastik'];
  const grid = frames[Math.floor(t * 5) % frames.length];
  const rows = grid.length;
  const cols = grid[0].length;
  for (let py = 0; py < size; py++) {
    const r = Math.min(rows - 1, Math.floor((py * rows) / size));
    for (let px = 0; px < size; px++) {
      const c = Math.min(cols - 1, Math.floor((px * cols) / size));
      const rgb = spriteColor(grid[r][c], config);
      if (rgb) setPixel(data, size, px, py, rgb);
    }
  }
}

function drawRoseRing(data: Uint8ClampedArray, size: number, cx: number, cy: number, radius: number,
  count: number, rot: number, fillColor: [number, number, number], edgeColor: [number, number, number]): void {
  if (radius <= 1.5) return;
  for (let i = 0; i < count; i++) {
    const a = rot + (i * Math.PI * 2) / count;
    const px = cx + Math.cos(a) * radius * 0.42;
    const py = cy + Math.sin(a) * radius * 0.42;
    const petalR = radius * 0.58;
    fillCircle(data, size, px, py, petalR + 0.8, edgeColor);
    fillCircle(data, size, px, py, petalR, fillColor);
  }
}

function drawBloomingRoseRGBA(data: Uint8ClampedArray, size: number, t: number,
  config: SpriteCharacterConfig): void {
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.44;
  const rawCycle = (t * 0.42) % 1.45;
  const bloom = rawCycle <= 1.0
    ? 0.25 + 0.75 * Math.sin((rawCycle * Math.PI) / 2)
    : 1.0 - 0.06 * Math.sin(((rawCycle - 1.0) / 0.45) * Math.PI);

  const deepCrimson = hexToRgb(config.usePresetColors ? '#7A0010' : '#330000');
  const outerRed = hexToRgb(config.usePresetColors ? '#D50000' : config.primaryColor);
  const innerRed = hexToRgb(config.usePresetColors ? '#FF1744' : config.secondaryColor);
  const highlightPink = hexToRgb(config.usePresetColors ? '#FF80AB' : config.glowColor);
  const leafGreen = hexToRgb('#00C853');

  const leafR = maxR * (0.65 + 0.35 * bloom);
  for (const angle of [-Math.PI * 0.78, -Math.PI * 0.22, Math.PI * 0.5]) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    for (let y = Math.floor(cy - leafR); y <= Math.ceil(cy + leafR); y++) {
      for (let x = Math.floor(cx - leafR); x <= Math.ceil(cx + leafR); x++) {
        const dx = x - cx, dy = y - cy;
        const u = dx * cos + dy * sin;
        const v = -dx * sin + dy * cos;
        if (u >= 0 && u <= leafR * 1.08 && Math.abs(v) <= leafR * 0.34 * (1 - u / (leafR * 1.08))) {
          setPixel(data, size, x, y, leafGreen);
        }
      }
    }
  }

  const outerR = maxR * bloom;
  drawRoseRing(data, size, cx, cy, outerR, 5, t * 0.2, outerRed, deepCrimson);
  const midBloom = Math.max(0.2, (bloom - 0.12) / 0.88);
  drawRoseRing(data, size, cx, cy, outerR * 0.72 * midBloom, 4, -t * 0.3 + 0.6, innerRed, deepCrimson);

  const coreR = Math.max(1.8, outerR * 0.42 * midBloom);
  fillCircle(data, size, cx, cy, coreR, deepCrimson);
  fillCircle(data, size, cx - coreR * 0.2, cy - coreR * 0.2, coreR * 0.65, highlightPink);
}

function drawPetalRing(data: Uint8ClampedArray, size: number, cx: number, cy: number, radius: number,
  count: number, widthRatio: number, rotation: number, color: [number, number, number]): void {
  if (radius <= 1) return;
  const pw = radius * widthRatio;
  for (let i = 0; i < count; i++) {
    const angle = rotation + (i * Math.PI * 2) / count;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        const dx = x - cx, dy = y - cy;
        const u = dx * cos + dy * sin;
        const v = -dx * sin + dy * cos;
        if (u < 0 || u > radius) continue;
        if (Math.abs(v) <= pw * 0.72 * Math.sin((Math.PI * u) / radius)) setPixel(data, size, x, y, color);
      }
    }
  }
}

function drawBloomingFloraRGBA(data: Uint8ClampedArray, size: number, t: number,
  presetId: BuiltIn2DPresetId, config: SpriteCharacterConfig): void {
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.46;
  const rawCycle = (t * 0.45) % 1.4;
  const bloom = rawCycle <= 1.0
    ? 0.22 + 0.78 * Math.sin((rawCycle * Math.PI) / 2)
    : 1.0 - 0.08 * Math.sin(((rawCycle - 1.0) / 0.4) * Math.PI);

  const primary = hexToRgb(config.usePresetColors
    ? presetId === 'blooming-marigold' ? '#FF6F00' : '#FF2A85'
    : config.primaryColor);
  const secondary = hexToRgb(config.usePresetColors
    ? presetId === 'blooming-marigold' ? '#FFD600' : '#FF94C2'
    : config.secondaryColor);
  const centerGlow = hexToRgb(config.usePresetColors ? '#FFF59D' : config.glowColor);

  if (presetId === 'spinning-rangoli') {
    const rot = t * 1.4;
    drawPetalRing(data, size, cx, cy, maxR * 0.95, 8, 0.42, rot, primary);
    drawPetalRing(data, size, cx, cy, maxR * 0.65, 8, 0.45, -rot + Math.PI / 8, secondary);
    drawPetalRing(data, size, cx, cy, maxR * 0.35, 4, 0.5, rot, centerGlow);
    return;
  }

  const outerPetals = presetId === 'blooming-marigold' ? 12 : 8;
  drawPetalRing(data, size, cx, cy, maxR * bloom, outerPetals, 0.25 + 0.22 * bloom, t * 0.25, primary);
  const innerBloom = Math.max(0.15, (bloom - 0.15) / 0.85);
  drawPetalRing(data, size, cx, cy, maxR * 0.68 * innerBloom, outerPetals, 0.32,
    Math.PI / outerPetals - t * 0.2, secondary);
  fillCircle(data, size, cx, cy, Math.max(1.5, maxR * 0.22 * innerBloom), centerGlow);
}

function buildSpriteRGBA(spriteSize: number, frameIndex: number, fps: number,
  config: SpriteCharacterConfig): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(spriteSize * spriteSize * 4);
  const t = (frameIndex / Math.max(1, fps)) * config.animSpeed;

  if (config.presetId === 'blooming-rose') drawBloomingRoseRGBA(rgba, spriteSize, t, config);
  else if (config.presetId === 'blooming-lotus' || config.presetId === 'blooming-marigold'
    || config.presetId === 'spinning-rangoli') drawBloomingFloraRGBA(rgba, spriteSize, t, config.presetId, config);
  else drawPixelSpriteRGBA(rgba, spriteSize, t, config.presetId, config);

  for (let i = 3; i < rgba.length; i += 4) rgba[i] = rgba[i] < 115 ? 0 : 255;
  return rgba;
}

interface MotionResult {
  x: number;
  passIndex: number;
  autoFlip: boolean;
  activePreset: BuiltIn2DPresetId;
}

function resolveMotion(matrixWidth: number, spriteSize: number, frameIndex: number, fps: number,
  config: SpriteCharacterConfig): MotionResult {
  const elapsedSec = frameIndex / Math.max(1, fps);
  let x = Math.round((matrixWidth - spriteSize) / 2 + config.xOffset);
  let autoFlip = config.flipX;
  let passIndex = 0;
  const pxPerSec = (config.xSpeed / 100) * Math.max(24, matrixWidth * 0.9);
  const travelSpan = matrixWidth + spriteSize;

  if (config.xMovement === 'scroll-right' && pxPerSec > 0) {
    const raw = elapsedSec * pxPerSec;
    passIndex = Math.floor(raw / travelSpan);
    x = Math.round((raw % travelSpan) - spriteSize + config.xOffset);
  } else if (config.xMovement === 'scroll-left' && pxPerSec > 0) {
    const raw = elapsedSec * pxPerSec;
    passIndex = Math.floor(raw / travelSpan);
    x = Math.round(matrixWidth - (raw % travelSpan) + config.xOffset);
  } else if (config.xMovement === 'bounce-x' && pxPerSec > 0) {
    const bounceSpan = Math.max(1, matrixWidth - spriteSize);
    const raw = elapsedSec * pxPerSec;
    passIndex = Math.floor(raw / bounceSpan);
    const mod = raw % bounceSpan;
    const goingLeft = passIndex % 2 === 1;
    x = Math.round((goingLeft ? bounceSpan - mod : mod) + config.xOffset);
    if (goingLeft) autoFlip = !config.flipX;
  }

  const list = config.playlist.length ? config.playlist : [config.presetId];
  let activePreset = config.presetId;
  if (config.switchMode === 'cycle-on-pass') activePreset = list[passIndex % list.length];
  else if (config.switchMode === 'cycle-timed') {
    const slot = Math.floor(elapsedSec / Math.max(1, config.switchIntervalSec));
    activePreset = list[slot % list.length];
  }
  return { x, passIndex, autoFlip, activePreset };
}

/** Deterministic RGBA matrix frame shared by preview and all exporters. */
export function render2DCharacterRGBA(matrixWidth: number, matrixHeight: number, frameIndex: number,
  fps: number, rawConfig: SpriteCharacterConfig): Uint8ClampedArray {
  const out = new Uint8ClampedArray(Math.max(0, matrixWidth) * Math.max(0, matrixHeight) * 4);
  if (matrixWidth <= 0 || matrixHeight <= 0) return out;

  const config = normalizeSpriteCharacterConfig(rawConfig);
  const baseSize = Math.max(16, Math.min(matrixWidth, matrixHeight));
  const spriteSize = Math.max(16, Math.round(baseSize * config.scale));
  const motion = resolveMotion(matrixWidth, spriteSize, frameIndex, fps, config);
  const sprite = buildSpriteRGBA(spriteSize, frameIndex, fps, { ...config, presetId: motion.activePreset });
  const startY = Math.round((matrixHeight - spriteSize) / 2 + config.yOffset);
  const stepX = spriteSize + Math.max(0, config.tileGap);
  const firstBase = ((motion.x % stepX) + stepX) % stepX - stepX;
  const bases: number[] = [];
  if (config.tileRepeat) {
    for (let base = firstBase; base < matrixWidth; base += stepX) bases.push(base);
  } else {
    bases.push(motion.x);
  }

  for (const base of bases) {
    for (let sy = 0; sy < spriteSize; sy++) {
      const py = startY + sy;
      if (py < 0 || py >= matrixHeight) continue;
      for (let sx = 0; sx < spriteSize; sx++) {
        const px = base + sx;
        if (px < 0 || px >= matrixWidth) continue;
        const srcX = motion.autoFlip ? spriteSize - 1 - sx : sx;
        const q = (sy * spriteSize + srcX) * 4;
        if (sprite[q + 3] === 0) continue;
        const p = (py * matrixWidth + px) * 4;
        out[p] = sprite[q];
        out[p + 1] = sprite[q + 1];
        out[p + 2] = sprite[q + 2];
        out[p + 3] = sprite[q + 3];
      }
    }
  }
  return out;
}

/** Canvas entry point kept for external callers; smoothing stays off and alpha stays quantized. */
export function render2DCharacterLayer(ctx: CanvasRenderingContext2D, matrixWidth: number, matrixHeight: number,
  frameIndex: number, fps: number, config: SpriteCharacterConfig): void {
  if (matrixWidth <= 0 || matrixHeight <= 0) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const image = ctx.createImageData(matrixWidth, matrixHeight);
  image.data.set(render2DCharacterRGBA(matrixWidth, matrixHeight, frameIndex, fps, config));
  for (let i = 3; i < image.data.length; i += 4) image.data[i] = image.data[i] < 115 ? 0 : 255;
  ctx.putImageData(image, 0, 0);
  ctx.restore();
}

/** Names used by the compositor and older callers. */
export const renderSpriteCharacterRGBA = render2DCharacterRGBA;
export const renderSpriteCharacter = render2DCharacterLayer;

const EMOJI_FONTS = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function seededRand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bounceRange(val: number, max: number): number {
  if (max <= 0) return 0;
  const period = max * 2;
  const mod = ((val % period) + period) % period;
  return mod <= max ? mod : period - mod;
}


function bounceCoord(raw: number, maxTravel: number): number {
  if (maxTravel <= 0) return 0;
  const period = maxTravel * 2;
  const mod = ((raw % period) + period) % period;
  return mod <= maxTravel ? mod : period - mod;
}

function hexToRgbEmoji(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function renderEmojiCharacterLayer(
  targetCtx: CanvasRenderingContext2D,
  matrixWidth: number,
  matrixHeight: number,
  frameIndex: number,
  fps: number,
  cfg: import("@/types/layers").EmojiLayerConfig,
): void {
  if (!cfg || !cfg.items || cfg.items.length === 0) return;
  if (matrixWidth <= 0 || matrixHeight <= 0) return;

  const baseSize = Math.max(10, Math.min(matrixWidth, matrixHeight));
  const elapsedSec = frameIndex / Math.max(1, fps);

  cfg.items.forEach((item, idx) => {
    const effectiveScale = item.scale * (cfg.globalScaleMult || 1);
    const size = Math.max(6, Math.round(baseSize * effectiveScale));
    const effectiveSpeed = item.speed * (cfg.globalSpeedMult || 1);
    const pxPerSec = (effectiveSpeed / 100) * Math.max(18, Math.max(matrixWidth, matrixHeight) * 0.85);
    const dist = elapsedSec * pxPerSec;

    let flickerAlpha = item.opacity ?? 1;
    const fRate = Math.max(0.5, (item.flickerSpeed / 100) * 14);
    const minAlpha = Math.max(0, 1 - item.flickerIntensity / 100);

    if (item.flickerMode === "blink") {
      flickerAlpha *= Math.sin(elapsedSec * fRate * Math.PI * 2 + idx) >= 0 ? 1 : minAlpha;
    } else if (item.flickerMode === "strobe") {
      flickerAlpha *= Math.floor(elapsedSec * fRate * 3 + idx) % 2 === 0 ? 1 : minAlpha;
    } else if (item.flickerMode === "pulse") {
      const wave = 0.5 + 0.5 * Math.sin(elapsedSec * fRate * Math.PI * 2 + idx);
      flickerAlpha *= minAlpha + (1 - minAlpha) * wave;
    } else if (item.flickerMode === "candle-flicker") {
      const tick = Math.floor(elapsedSec * fRate * 2.5);
      const r = seededRand(cfg.seed + idx * 977 + tick * 7919)();
      flickerAlpha *= r > 0.28 ? 0.75 + 0.25 * r : minAlpha;
    }

    if (flickerAlpha <= 0.02) return;

    let x = item.x;
    let y = item.y;
    const spanX = matrixWidth + size;
    const spanY = matrixHeight + size;

    switch (item.direction) {
      case "fixed-spot":
        break;
      case "bounce-xy":
        x = bounceCoord(item.x + dist, Math.max(1, matrixWidth - size));
        y = bounceCoord(item.y + dist * 0.78, Math.max(1, matrixHeight - size));
        break;
      case "bounce-x":
        x = bounceCoord(item.x + dist, Math.max(1, matrixWidth - size));
        break;
      case "bounce-y":
        y = bounceCoord(item.y + dist, Math.max(1, matrixHeight - size));
        break;
      case "bounce-local": {
        const r = Math.max(2, item.bounceRadius || 6);
        x = item.x + Math.sin(elapsedSec * (pxPerSec / Math.max(4, r))) * r;
        y = item.y + Math.cos(elapsedSec * (pxPerSec / Math.max(4, r)) * 0.85) * r;
        break;
      }
      case "right":
        x = (((item.x + dist + size) % spanX) + spanX) % spanX - size;
        break;
      case "left":
        x = (((item.x - dist + size) % spanX) + spanX) % spanX - size;
        break;
      case "down":
        y = (((item.y + dist + size) % spanY) + spanY) % spanY - size;
        break;
      case "up":
        y = (((item.y - dist + size) % spanY) + spanY) % spanY - size;
        break;
      case "diag-dr":
        x = (((item.x + dist + size) % spanX) + spanX) % spanX - size;
        y = (((item.y + dist + size) % spanY) + spanY) % spanY - size;
        break;
      case "diag-dl":
        x = (((item.x - dist + size) % spanX) + spanX) % spanX - size;
        y = (((item.y + dist + size) % spanY) + spanY) % spanY - size;
        break;
      case "diag-ur":
        x = (((item.x + dist + size) % spanX) + spanX) % spanX - size;
        y = (((item.y - dist + size) % spanY) + spanY) % spanY - size;
        break;
      case "diag-ul":
        x = (((item.x - dist + size) % spanX) + spanX) % spanX - size;
        y = (((item.y - dist + size) % spanY) + spanY) % spanY - size;
        break;
      case "float-drift":
        x = item.x + Math.sin(elapsedSec * 1.8 + idx) * Math.max(2, size * 0.35);
        y = item.y + Math.cos(elapsedSec * 1.4 + idx) * Math.max(2, size * 0.35);
        break;
    }

    const tmp = document.createElement("canvas");
    tmp.width = size;
    tmp.height = size;
    const tCtx = tmp.getContext("2d")!;
    tCtx.imageSmoothingEnabled = false;

    if (item.sourceType === "gif" && item.gifUrl) {
      const gif = getCachedGif(item.gifUrl);
      if (gif) {
        const speedRatio = (item.gifFps || 12) / 12;
        const frameCanvas = getGifFrameAtTime(gif, elapsedSec * 1000 * speedRatio);
        tCtx.drawImage(frameCanvas, 0, 0, size, size);
      }
    } else {
      tCtx.font = `${Math.round(size * 0.85)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      tCtx.textAlign = "center";
      tCtx.textBaseline = "middle";
      tCtx.fillText(item.emoji, size / 2, size / 2 + 1);
    }

    const img = tCtx.getImageData(0, 0, size, size);
    const d = img.data;
    const keyRgb = hexToRgbEmoji(item.chromaKeyColor || "#000000");
    const tol = ((item.chromaTolerance ?? 25) / 100) * 255;

    for (let p = 0; p < d.length; p += 4) {
      if (item.sourceType === "gif" && item.chromaKeyEnabled && keyRgb) {
        const distColor = Math.hypot(d[p] - keyRgb.r, d[p + 1] - keyRgb.g, d[p + 2] - keyRgb.b);
        if (distColor <= tol) {
          d[p + 3] = 0;
          continue;
        }
      }
      d[p + 3] = d[p + 3] < 100 ? 0 : 255;
    }
    tCtx.putImageData(img, 0, 0);

    targetCtx.save();
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.globalAlpha = flickerAlpha;
    const cx = Math.round(x) + size / 2;
    const cy = Math.round(y) + size / 2;
    targetCtx.translate(cx, cy);
    if (item.rotationDeg) targetCtx.rotate((item.rotationDeg * Math.PI) / 180);
    if (item.flipX) targetCtx.scale(-1, 1);
    targetCtx.drawImage(tmp, -size / 2, -size / 2);
    targetCtx.restore();
  });
}

export function renderEmojiCharacterLayerRGBA(
  matrixWidth: number,
  matrixHeight: number,
  frameIndex: number,
  fps: number,
  cfg: import("@/types/layers").EmojiLayerConfig,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(Math.max(0, matrixWidth * matrixHeight * 4));
  if (typeof document === "undefined" || matrixWidth <= 0 || matrixHeight <= 0) return out;
  const canvas = document.createElement('canvas');
  canvas.width = matrixWidth;
  canvas.height = matrixHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return out;
  ctx.imageSmoothingEnabled = false;
  renderEmojiCharacterLayer(ctx, matrixWidth, matrixHeight, frameIndex, fps, cfg);
  const data = ctx.getImageData(0, 0, matrixWidth, matrixHeight).data;
  out.set(data);
  return out;
}
