// Step data for Paper Fold. Each step is a flat SVG scene (viewBox 0 0 100 100)
// drawn in the classic origami-diagram convention: the paper's current state
// plus the fold to make - dashed blue = valley, dash-dot orange = mountain,
// curved arrows show where the paper moves, faint outlines show the target.

export type Pt = readonly [number, number]

export type El =
  | { k: 'paper'; pts: readonly Pt[]; tone?: 'top' | 'flap' | 'back' }
  | { k: 'edge'; pts: readonly Pt[] } // a visible layer edge
  | { k: 'crease'; pts: readonly Pt[] } // an existing crease, faint
  | { k: 'fold'; pts: readonly Pt[]; dir: 'v' | 'm' } // this step's fold line
  | { k: 'arrow'; pts: readonly Pt[] } // path, head at last point (3 pts = quadratic)
  | { k: 'ghost'; pts: readonly Pt[] } // where the flap lands, dashed
  | { k: 'mark'; at: Pt; sym: 'flip' | 'open' | 'blow' } // action badge

export interface Step {
  t: string
  text: string
  els: El[]
}

export interface Model {
  id: string
  name: string
  blurb: string
  level: 1 | 2 | 3
  steps: Step[]
  result: El[]
}

const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h]
]

const paper = (pts: readonly Pt[], tone?: 'top' | 'flap' | 'back'): El => ({ k: 'paper', pts, tone })
const edge = (...pts: Pt[]): El => ({ k: 'edge', pts })
const crease = (...pts: Pt[]): El => ({ k: 'crease', pts })
const valley = (...pts: Pt[]): El => ({ k: 'fold', pts, dir: 'v' })
const mount = (...pts: Pt[]): El => ({ k: 'fold', pts, dir: 'm' })
const arrow = (...pts: Pt[]): El => ({ k: 'arrow', pts })
const ghost = (...pts: Pt[]): El => ({ k: 'ghost', pts })
const mark = (at: Pt, sym: 'flip' | 'open' | 'blow'): El => ({ k: 'mark', at, sym })

// ---------------------------------------------------------------- dart

const dart: Model = {
  id: 'dart',
  name: 'Dart',
  blurb: 'The classic paper plane',
  level: 1,
  steps: [
    {
      t: 'Centre crease',
      text: 'Fold the sheet in half lengthwise, then open it flat again. This line is your centre guide.',
      els: [paper(rect(14, 8, 72, 84)), valley([50, 10], [50, 90]), arrow([74, 46], [50, 30], [30, 46])]
    },
    {
      t: 'Corners to centre',
      text: 'Fold both top corners down so their edges lie along the centre crease.',
      els: [
        paper(rect(14, 8, 72, 84)),
        crease([50, 10], [50, 90]),
        valley([50, 10], [14, 46]),
        valley([50, 10], [86, 46]),
        ghost([50, 10], [50, 46], [14, 46]),
        ghost([50, 10], [50, 46], [86, 46]),
        arrow([20, 14], [28, 22], [44, 30]),
        arrow([80, 14], [72, 22], [56, 30])
      ]
    },
    {
      t: 'Edges to centre',
      text: 'Fold the new slanted edges into the centre line as well. The point stays sharp.',
      els: [
        paper([
          [50, 8],
          [14, 44],
          [14, 92],
          [86, 92],
          [86, 44]
        ]),
        paper(
          [
            [50, 8],
            [50, 44],
            [14, 44]
          ],
          'flap'
        ),
        paper(
          [
            [50, 8],
            [50, 44],
            [86, 44]
          ],
          'flap'
        ),
        edge([50, 8], [50, 44]),
        valley([50, 8], [18, 92]),
        valley([50, 8], [82, 92]),
        ghost([50, 8], [50, 62], [18, 92]),
        ghost([50, 8], [50, 62], [82, 92]),
        arrow([22, 50], [28, 58], [40, 66]),
        arrow([78, 50], [72, 58], [60, 66])
      ]
    },
    {
      t: 'Fold in half',
      text: 'Fold the whole plane in half along the centre, with all the flaps on the outside.',
      els: [
        paper([
          [50, 8],
          [14, 44],
          [14, 92],
          [86, 92],
          [86, 44]
        ]),
        edge([50, 8], [50, 44]),
        edge([50, 8], [18, 92]),
        edge([50, 8], [82, 92]),
        mount([50, 10], [50, 90]),
        arrow([82, 58], [96, 70], [82, 84])
      ]
    },
    {
      t: 'First wing',
      text: 'Fold the top layer down so the slanted edge meets the bottom edge - that is one wing.',
      els: [
        paper([
          [50, 8],
          [14, 44],
          [14, 92],
          [50, 92]
        ]),
        edge([50, 8], [50, 92]),
        valley([50, 24], [20, 92]),
        ghost([50, 24], [20, 92], [50, 92]),
        arrow([22, 50], [28, 66], [40, 78])
      ]
    },
    {
      t: 'Second wing',
      text: 'Turn the plane over and fold the second wing down to match the first.',
      els: [
        paper([
          [50, 8],
          [14, 44],
          [14, 92],
          [50, 92]
        ]),
        paper(
          [
            [50, 24],
            [20, 92],
            [50, 92]
          ],
          'flap'
        ),
        edge([50, 8], [50, 92]),
        mark([82, 30], 'flip'),
        valley([50, 24], [20, 92]),
        arrow([22, 50], [28, 66], [40, 78])
      ]
    }
  ],
  result: [
    paper([
      [20, 74],
      [78, 22],
      [46, 64]
    ]),
    paper(
      [
        [46, 64],
        [78, 22],
        [62, 74]
      ],
      'flap'
    ),
    edge([20, 74], [78, 22]),
    edge([46, 64], [62, 74]),
    edge([30, 80], [44, 80]),
    edge([36, 86], [46, 86])
  ]
}

// ---------------------------------------------------------------- boat

const boat: Model = {
  id: 'boat',
  name: 'Boat',
  blurb: 'It really floats',
  level: 1,
  steps: [
    {
      t: 'Fold in half',
      text: 'Start with a half sheet (2:1 rectangle). Fold the top edge down to the bottom edge.',
      els: [paper(rect(6, 28, 88, 46)), valley([8, 51], [92, 51]), arrow([50, 34], [56, 44], [50, 66])]
    },
    {
      t: 'Corners to centre',
      text: 'Fold both top corners down so their tips meet on the centre line. The folded edge is at the top.',
      els: [
        paper(rect(6, 51, 88, 23)),
        crease([50, 51], [50, 58]),
        valley([50, 51], [22, 74]),
        valley([50, 51], [78, 74]),
        ghost([50, 51], [50, 74], [22, 74]),
        ghost([50, 51], [50, 74], [78, 74]),
        arrow([16, 57], [24, 62], [42, 66]),
        arrow([84, 57], [76, 62], [58, 66])
      ]
    },
    {
      t: 'Band up',
      text: 'Fold the front layer of the bottom band up over the triangle.',
      els: [
        paper([
          [50, 51],
          [94, 66],
          [94, 74],
          [6, 74],
          [6, 66]
        ]),
        edge([6, 66], [94, 66]),
        edge([50, 51], [50, 66]),
        valley([6, 66], [94, 66]),
        arrow([30, 82], [40, 72], [46, 62])
      ]
    },
    {
      t: 'Band behind',
      text: 'Turn it over and fold the other band up the same way. You have made a hat.',
      els: [
        paper([
          [50, 51],
          [94, 66],
          [94, 74],
          [6, 74],
          [6, 66]
        ]),
        paper(rect(6, 58, 88, 8), 'flap'),
        edge([6, 58], [94, 58]),
        mark([84, 44], 'flip'),
        valley([6, 66], [94, 66]),
        arrow([70, 80], [64, 72], [56, 62])
      ]
    },
    {
      t: 'Open to square',
      text: 'Gently pull the two sides apart and squash the hat flat into a square.',
      els: [
        paper([
          [50, 51],
          [94, 66],
          [94, 74],
          [6, 74],
          [6, 66]
        ]),
        edge([6, 66], [94, 66]),
        edge([6, 58], [94, 58]),
        mark([78, 46], 'open'),
        arrow([10, 68], [4, 70], [0, 74]),
        arrow([90, 68], [96, 70], [100, 74]),
        ghost([50, 58], [80, 84], [50, 94], [20, 84])
      ]
    },
    {
      t: 'Point to top',
      text: 'Fold the bottom point up to the top point - the front layer only.',
      els: [
        paper([
          [50, 26],
          [82, 58],
          [50, 90],
          [18, 58]
        ]),
        valley([18, 58], [82, 58]),
        ghost([50, 26], [82, 58], [18, 58]),
        arrow([50, 86], [56, 72], [50, 32])
      ]
    },
    {
      t: 'Repeat behind',
      text: 'Flip over and fold the other bottom point up too. You have a triangle.',
      els: [
        paper([
          [50, 26],
          [82, 58],
          [18, 58]
        ]),
        edge([18, 58], [82, 58]),
        mark([84, 30], 'flip'),
        valley([18, 58], [82, 58]),
        arrow([50, 80], [56, 68], [50, 34])
      ]
    },
    {
      t: 'Pull apart',
      text: 'Pull the two side points apart and let the sides open up into your boat.',
      els: [
        paper([
          [50, 26],
          [82, 58],
          [18, 58]
        ]),
        edge([18, 58], [82, 58]),
        mark([50, 74], 'open'),
        arrow([20, 56], [12, 62], [8, 70]),
        arrow([80, 56], [88, 62], [92, 70]),
        ghost([22, 70], [78, 70], [70, 82], [30, 82])
      ]
    }
  ],
  result: [
    paper([
      [18, 56],
      [82, 56],
      [72, 72],
      [28, 72]
    ]),
    paper(
      [
        [18, 56],
        [82, 56],
        [82, 52],
        [18, 52]
      ],
      'flap'
    ),
    paper(
      [
        [42, 52],
        [50, 40],
        [58, 52]
      ],
      'flap'
    ),
    edge([18, 52], [82, 52]),
    edge([28, 72], [72, 72])
  ]
}

// ---------------------------------------------------------------- cup

const cup: Model = {
  id: 'cup',
  name: 'Cup',
  blurb: 'Holds a small snack',
  level: 1,
  steps: [
    {
      t: 'Fold diagonally',
      text: 'Fold the square corner to corner to make a triangle, long edge at the bottom.',
      els: [paper(rect(22, 22, 56, 56)), valley([22, 78], [78, 22]), arrow([72, 72], [60, 60], [30, 30])]
    },
    {
      t: 'Left corner up',
      text: 'Fold the left corner up and across so its tip pokes just past the right edge.',
      els: [
        paper([
          [50, 22],
          [20, 78],
          [80, 78]
        ]),
        valley([40, 40], [58, 78]),
        ghost([40, 40], [58, 78], [84, 48]),
        arrow([26, 74], [40, 62], [64, 52])
      ]
    },
    {
      t: 'Right corner up',
      text: 'Repeat on the other side: fold the right corner so its tip pokes past the left edge.',
      els: [
        paper([
          [50, 22],
          [20, 78],
          [80, 78]
        ]),
        paper(
          [
            [40, 40],
            [58, 78],
            [84, 48]
          ],
          'flap'
        ),
        edge([40, 40], [84, 48]),
        valley([60, 40], [42, 78]),
        ghost([60, 40], [42, 78], [16, 48]),
        arrow([74, 74], [60, 62], [36, 52])
      ]
    },
    {
      t: 'Front flap down',
      text: 'Fold the front top point down to make the cup rim.',
      els: [
        paper([
          [50, 22],
          [16, 48],
          [20, 78],
          [80, 78],
          [84, 48]
        ]),
        edge([40, 40], [84, 48]),
        edge([60, 40], [16, 48]),
        valley([34, 38], [66, 38]),
        arrow([50, 26], [46, 32], [50, 42])
      ]
    },
    {
      t: 'Flap behind',
      text: 'Turn it over and fold the other top point down. Open the cup to finish.',
      els: [
        paper([
          [34, 38],
          [16, 48],
          [20, 78],
          [80, 78],
          [84, 48],
          [66, 38]
        ]),
        edge([34, 38], [66, 38]),
        mark([86, 30], 'flip'),
        valley([34, 38], [66, 38]),
        arrow([50, 30], [54, 34], [50, 44])
      ]
    }
  ],
  result: [
    paper([
      [28, 40],
      [72, 40],
      [62, 74],
      [38, 74]
    ]),
    paper(
      [
        [28, 40],
        [72, 40],
        [68, 46],
        [32, 46]
      ],
      'flap'
    ),
    edge([32, 46], [68, 46]),
    edge([38, 74], [62, 74])
  ]
}

// ---------------------------------------------------------------- helmet

const helmet: Model = {
  id: 'helmet',
  name: 'Helmet',
  blurb: 'A samurai kabuto',
  level: 2,
  steps: [
    {
      t: 'Fold diagonally',
      text: 'Fold the square corner to corner into a triangle, point facing up.',
      els: [paper(rect(22, 20, 56, 56)), valley([22, 76], [78, 20]), arrow([72, 70], [60, 58], [30, 28])]
    },
    {
      t: 'Corners to top',
      text: 'Fold both bottom corners up so their tips meet at the top point.',
      els: [
        paper([
          [50, 18],
          [14, 80],
          [86, 80]
        ]),
        valley([31, 49], [50, 80]),
        valley([69, 49], [50, 80]),
        ghost([31, 49], [50, 80], [50, 18]),
        ghost([69, 49], [50, 80], [50, 18]),
        arrow([20, 76], [28, 62], [42, 30]),
        arrow([80, 76], [72, 62], [58, 30])
      ]
    },
    {
      t: 'Horns down',
      text: 'Fold each top flap back down at an angle so its tip sticks out sideways - the helmet horns.',
      els: [
        paper([
          [50, 18],
          [74, 62],
          [50, 82],
          [26, 62]
        ]),
        edge([50, 18], [50, 82]),
        valley([32, 56], [44, 70]),
        valley([68, 56], [56, 70]),
        ghost([32, 56], [44, 70], [22, 68]),
        ghost([68, 56], [56, 70], [78, 68]),
        arrow([46, 26], [40, 40], [30, 56]),
        arrow([54, 26], [60, 40], [70, 56])
      ]
    },
    {
      t: 'Flap up',
      text: 'Fold the loose front point up over the horns to start the headband.',
      els: [
        paper([
          [50, 18],
          [32, 56],
          [22, 68],
          [50, 82],
          [78, 68],
          [68, 56]
        ]),
        edge([32, 56], [22, 68]),
        edge([68, 56], [78, 68]),
        valley([34, 62], [66, 62]),
        ghost([34, 62], [66, 62], [66, 48], [34, 48]),
        arrow([50, 78], [56, 72], [50, 58])
      ]
    },
    {
      t: 'Band up',
      text: 'Fold the same flap up once more along the top edge to lock the band.',
      els: [
        paper([
          [50, 18],
          [32, 56],
          [22, 68],
          [50, 82],
          [78, 68],
          [68, 56]
        ]),
        paper(
          [
            [34, 48],
            [66, 48],
            [66, 62],
            [34, 62]
          ],
          'flap'
        ),
        edge([34, 48], [66, 48]),
        valley([36, 56], [64, 56]),
        ghost([36, 56], [64, 56], [64, 44], [36, 44]),
        arrow([50, 68], [56, 62], [50, 50])
      ]
    },
    {
      t: 'Open it up',
      text: 'Gently open the helmet from underneath and shape the dome with your fingers.',
      els: [
        paper([
          [50, 18],
          [32, 56],
          [22, 68],
          [50, 82],
          [78, 68],
          [68, 56]
        ]),
        paper(
          [
            [34, 48],
            [66, 48],
            [66, 62],
            [34, 62]
          ],
          'flap'
        ),
        edge([34, 48], [66, 48]),
        edge([36, 56], [64, 56]),
        mark([80, 30], 'open'),
        arrow([50, 82], [50, 74], [50, 66])
      ]
    }
  ],
  result: [
    paper([
      [32, 62],
      [36, 40],
      [50, 24],
      [64, 40],
      [68, 62]
    ]),
    paper(
      [
        [34, 46],
        [22, 58],
        [36, 56]
      ],
      'flap'
    ),
    paper(
      [
        [66, 46],
        [78, 58],
        [64, 56]
      ],
      'flap'
    ),
    paper(rect(36, 62, 28, 9), 'flap'),
    edge([36, 62], [64, 62]),
    edge([36, 71], [64, 71]),
    edge([50, 24], [50, 62])
  ]
}

// ---------------------------------------------------------------- tulip

const tulip: Model = {
  id: 'tulip',
  name: 'Tulip',
  blurb: 'A spring flower',
  level: 1,
  steps: [
    {
      t: 'Fold diagonally',
      text: 'Fold the square corner to corner into a triangle, point facing up.',
      els: [paper(rect(22, 20, 56, 56)), valley([22, 76], [78, 20]), arrow([72, 70], [60, 58], [30, 28])]
    },
    {
      t: 'First petal',
      text: 'Fold the left corner up and out so its tip pokes above the middle of the bloom.',
      els: [
        paper([
          [50, 18],
          [16, 80],
          [84, 80]
        ]),
        valley([36, 50], [54, 80]),
        ghost([36, 50], [54, 80], [42, 12]),
        arrow([24, 74], [30, 56], [38, 26])
      ]
    },
    {
      t: 'Second petal',
      text: 'Fold the right corner up the same way. The two petal tips cross slightly.',
      els: [
        paper([
          [50, 18],
          [16, 80],
          [84, 80]
        ]),
        paper(
          [
            [36, 50],
            [54, 80],
            [42, 12]
          ],
          'flap'
        ),
        valley([64, 50], [46, 80]),
        ghost([64, 50], [46, 80], [58, 12]),
        arrow([76, 74], [70, 56], [62, 26])
      ]
    },
    {
      t: 'Middle down',
      text: 'Fold the middle top point down behind to round off the bloom.',
      els: [
        paper([
          [44, 34],
          [30, 80],
          [70, 80],
          [56, 34]
        ]),
        paper(
          [
            [36, 50],
            [54, 80],
            [42, 12]
          ],
          'flap'
        ),
        paper(
          [
            [64, 50],
            [46, 80],
            [58, 12]
          ],
          'flap'
        ),
        edge([44, 34], [56, 34]),
        mount([40, 36], [60, 36]),
        arrow([50, 32], [54, 30], [50, 22]),
        mark([80, 24], 'flip')
      ]
    }
  ],
  result: [
    paper([
      [32, 52],
      [32, 34],
      [44, 42],
      [50, 24],
      [56, 42],
      [68, 34],
      [68, 52]
    ]),
    edge([44, 42], [44, 52]),
    edge([56, 42], [56, 52]),
    edge([32, 52], [68, 52]),
    edge([50, 24], [50, 34])
  ]
}

// ---------------------------------------------------------------- balloon

const balloon: Model = {
  id: 'balloon',
  name: 'Balloon',
  blurb: 'Inflates with a puff',
  level: 2,
  steps: [
    {
      t: 'Both diagonals',
      text: 'Fold corner to corner both ways, opening the sheet flat after each fold.',
      els: [
        paper(rect(20, 20, 60, 60)),
        crease([20, 20], [80, 80]),
        valley([20, 80], [80, 20]),
        arrow([74, 74], [60, 60], [28, 28])
      ]
    },
    {
      t: 'Mountain fold',
      text: 'Turn the sheet over and fold the top edge down to the bottom edge.',
      els: [
        paper(rect(20, 20, 60, 60), 'back'),
        crease([20, 20], [80, 80]),
        crease([20, 80], [80, 20]),
        mount([22, 50], [78, 50]),
        arrow([50, 26], [56, 36], [50, 46])
      ]
    },
    {
      t: 'Push sides in',
      text: 'Push the left and right edges inward and flatten everything into a triangle.',
      els: [
        paper(rect(20, 20, 60, 60)),
        crease([20, 20], [80, 80]),
        crease([20, 80], [80, 20]),
        crease([20, 50], [80, 50]),
        mark([86, 24], 'open'),
        arrow([18, 50], [30, 50], [40, 50]),
        arrow([82, 50], [70, 50], [60, 50]),
        ghost([50, 22], [78, 78], [22, 78])
      ]
    },
    {
      t: 'Corners to top',
      text: 'Fold the two bottom corners of the front layer up to the top point.',
      els: [
        paper([
          [50, 24],
          [14, 80],
          [86, 80]
        ]),
        edge([50, 24], [50, 80]),
        edge([32, 52], [50, 80]),
        edge([68, 52], [50, 80]),
        valley([32, 51], [50, 80]),
        valley([68, 51], [50, 80]),
        ghost([32, 51], [50, 80], [50, 24]),
        ghost([68, 51], [50, 80], [50, 24]),
        arrow([20, 76], [28, 60], [42, 32]),
        arrow([80, 76], [72, 60], [58, 32])
      ]
    },
    {
      t: 'Sides to centre',
      text: 'Fold the left and right points of the diamond into the centre line.',
      els: [
        paper([
          [50, 24],
          [74, 60],
          [50, 82],
          [26, 60]
        ]),
        paper(
          [
            [50, 24],
            [26, 60],
            [50, 82]
          ],
          'flap'
        ),
        paper(
          [
            [50, 24],
            [74, 60],
            [50, 82]
          ],
          'flap'
        ),
        edge([50, 24], [50, 82]),
        valley([42, 44], [36, 72]),
        valley([58, 44], [64, 72]),
        ghost([42, 44], [36, 72], [50, 66]),
        ghost([58, 44], [64, 72], [50, 66]),
        arrow([28, 58], [34, 60], [44, 62]),
        arrow([72, 58], [66, 60], [56, 62])
      ]
    },
    {
      t: 'Tuck the tips',
      text: 'Fold the two small top tips down and slide them into the pockets.',
      els: [
        paper([
          [50, 24],
          [64, 48],
          [50, 82],
          [36, 48]
        ]),
        edge([42, 44], [36, 72]),
        edge([58, 44], [64, 72]),
        edge([50, 24], [50, 82]),
        valley([42, 42], [50, 50]),
        valley([58, 42], [50, 50]),
        arrow([38, 42], [42, 46], [48, 52]),
        arrow([62, 42], [58, 46], [52, 52])
      ]
    },
    {
      t: 'Repeat behind',
      text: 'Turn it over and repeat the last three folds on the back.',
      els: [
        paper([
          [50, 24],
          [64, 48],
          [50, 82],
          [36, 48]
        ]),
        edge([42, 44], [36, 72]),
        edge([58, 44], [64, 72]),
        edge([50, 24], [50, 82]),
        mark([80, 26], 'flip'),
        arrow([50, 60], [50, 54], [50, 48])
      ]
    },
    {
      t: 'Inflate',
      text: 'Find the little hole at the bottom and blow a sharp puff - the balloon pops open.',
      els: [
        paper([
          [50, 24],
          [66, 46],
          [50, 72],
          [34, 46]
        ]),
        edge([50, 24], [50, 72]),
        mark([76, 66], 'blow'),
        arrow([72, 78], [64, 74], [54, 70])
      ]
    }
  ],
  result: [
    paper([
      [34, 34],
      [66, 34],
      [70, 60],
      [30, 60]
    ]),
    paper(
      [
        [46, 60],
        [54, 60],
        [53, 70],
        [47, 70]
      ],
      'flap'
    ),
    crease([34, 34], [50, 44]),
    crease([66, 34], [50, 44]),
    crease([30, 60], [50, 50]),
    crease([70, 60], [50, 50]),
    edge([46, 60], [46, 66]),
    edge([54, 60], [54, 66])
  ]
}

export const MODELS: readonly Model[] = [dart, boat, cup, helmet, tulip, balloon]

export const modelById = (id: string | null | undefined): Model | undefined => MODELS.find((m) => m.id === id)
