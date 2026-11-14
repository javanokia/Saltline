// @ts-check
/**
 * @file src/weapons/pac9_model.js
 * @description 几猫九式突击步枪 (PAC-9 Longshore) 全程序化 3D 几何体装配中心
 */

import { createTubeFromPoints, mergeGeometriesClean } from "../geo.js";
import {
  applyVertexSurfaceColor,
  createPositionedBeveledBox,
  extrudeProfileAlongX,
  extrudeProfileAlongZ,
  createRevolvedProfile,
  createConnectingTube,
  createSlotOvalPoints,
  createRoundedRectPoints,
  countGeometryTris,
} from "./pac9_geo.js";
import {
  applyPac9ShaderDetails,
  createPac9MarkingsMesh,
  createPac9SightDotMesh,
  createPac9MuzzleFlashMesh,
  pac9RainUniform,
} from "./pac9_effects.js";
import { buildPac9HandsMesh } from "./pac9_hands.js";

export const PAC9_MODEL_PARAMS = {
  name: "PAC-9 Longshore",
  muzzle: [0, 0, -0.531],
  eject: [0.023, 0.004, -0.028],
  sightY: 0.069,
  lensF: 0.0285,
  window: [
    [-0.016, 0.057],
    [0.016, 0.057],
    [0.016, 0.0772],
    [0.0122, 0.081],
    [-0.0122, 0.081],
    [-0.016, 0.0772],
  ],
  magPos: [0, -0.02, -0.0665],
  boltTravel: 0.062,
  railTop: 0.0435,
  grip: [0, -0.1, 0.073],
  handguard: [0, 0, -0.255],
  handguardR: 0.021,
  handlePos: [-0.026, 0.007, -0.078],
  squeeze: 0.86,
};

const PAC9_TOP_RAIL_PROFILE = [
  [-0.0102, 0.0398],
  [0.0102, 0.0398],
  [0.0106, 0.0408],
  [0.0084, 0.0435],
  [-0.0084, 0.0435],
  [-0.0106, 0.0408],
];

/**
 * Sub-assembly 1: Receiver & Pistol Grip
 * Constructs upper/lower receiver frame, Picatinny top rail section, pistol grip,
 * trigger guard, fire selector, bolt catch, ejection port deflector, and stippling.
 */
function buildReceiverAndGrip(parts, palette, topRailProfile) {
  const { ano: r, gun: a, poly: l, plain: f } = parts;
  const {
    anoTint: i,
    gunmetalTint: e,
    pinTint: t,
    steelTint: n,
    polyTint: s,
    anoSurf: p,
    gunSurf: d,
    polySurf: v,
  } = palette;
  const g = [
    [-0.1, -0.02],
    [0.1, -0.02],
    [0.1, 0.027],
    [0.093, 0.034],
    [-0.088, 0.034],
    [-0.1, 0.024],
  ];
  const x = topRailProfile;
  (r.push(
    extrudeProfileAlongX(g, 0, 0.0205, 0.0014, i, p, [
      createRoundedRectPoints(-0.012, -0.01, 0.06, 0.012, 0.003),
    ]),
  ),
    r.push(
      extrudeProfileAlongX(g, -0.0205, 0, 0.0014, i, p, [
        createSlotOvalPoints(0.032, 0.007, 0.112, 0.0075, 4),
      ]),
    ),
    a.push(createPositionedBeveledBox(0.004, 0.036, 0.19, 5e-4, -0.0135, 0.006, 0, n)),
    a.push(createPositionedBeveledBox(0.004, 0.012, 0.19, 5e-4, 0.0145, 0.022, 0, n)),
    a.push(createPositionedBeveledBox(0.004, 0.008, 0.19, 5e-4, 0.0145, -0.014, 0, n)),
    a.push(
      createRevolvedProfile(
        [
          [0, 0.058],
          [0.0128, 0.058],
          [0.0128, 0.099],
          [0, 0.099],
        ],
        16,
        [0.8, 0.8, 0.82],
      ),
    ),
    r.push(
      createPositionedBeveledBox(
        0.009,
        0.02,
        0.018,
        0.003,
        0.0225,
        0.004,
        -0.026,
        i,
        p,
        [0, -0.35, 0],
      ),
    ),
    r.push(
      createRevolvedProfile(
        [
          [0, -0.086],
          [0.0062, -0.086],
          [0.0072, -0.084],
          [0.0072, -0.06],
          [0.0045, -0.057],
          [0, -0.057],
        ],
        12,
        i,
        p,
        0.0215,
        0.012,
      ),
    ),
    a.push(
      createRevolvedProfile(
        [
          [0, -0.094],
          [0.0048, -0.094],
          [0.0055, -0.092],
          [0.0055, -0.086],
          [0, -0.086],
        ],
        12,
        t,
        0,
        0.0215,
        0.012,
      ),
    ),
    r.push(createPositionedBeveledBox(0.004, 0.012, 0.05, 0.0015, -0.0212, -0.006, -0.055, i, p)),
    r.push(createPositionedBeveledBox(0.004, 0.006, 0.15, 0.0015, -0.0212, 0.0215, 0.012, i, p)),
    r.push(createPositionedBeveledBox(0.003, 0.01, 0.03, 0.001, 0.0212, 0.022, 0.075, i, p)),
    r.push(
      extrudeProfileAlongZ(
        [
          [-0.0078, 0.0335],
          [0.0078, 0.0335],
          [0.0106, 0.0402],
          [-0.0106, 0.0402],
        ],
        -0.096,
        0.397,
        5e-4,
        i,
        0,
      ),
    ));
  for (let F = 0; F < 49; F++) {
    let X = -0.094 + F * 0.01;
    r.push(extrudeProfileAlongZ(x, X, X + 0.0048, 8e-4, i, p));
  }
  let y = [
    [-0.1, -0.021],
    [0.099, -0.021],
    [0.101, -0.03],
    [0.098, -0.088],
    [0.036, -0.082],
    [0.031, -0.058],
    [-0.03, -0.058],
    [-0.04, -0.066],
    [-0.078, -0.055],
    [-0.1, -0.044],
  ];
  (l.push(extrudeProfileAlongX(y, -0.019, 0.019, 0.0014, s, v)),
    l.push(
      createPositionedBeveledBox(
        0.043,
        0.01,
        0.066,
        0.002,
        0,
        -0.0835,
        0.0668,
        s,
        v,
        [-0.095, 0, 0],
      ),
    ),
    l.push(createPositionedBeveledBox(0.0405, 0.052, 0.005, 8e-4, 0, -0.052, 0.0975, s, v)),
    l.push(createPositionedBeveledBox(0.0405, 0.04, 0.005, 8e-4, 0, -0.048, 0.0345, s, v)),
    a.push(createConnectingTube(0.0038, 0.0396, 0, -0.031, -0.086, t, 12)),
    a.push(createConnectingTube(0.0038, 0.0396, 0, -0.029, 0.087, t, 12)),
    a.push(createConnectingTube(0.0022, 0.0392, 0, -0.04, -0.012, t, 8)),
    a.push(createConnectingTube(0.0022, 0.0392, 0, -0.032, -0.032, t, 8)));
  for (let F of [-1, 1])
    (a.push(createConnectingTube(0.0068, 0.004, F * 0.0205, -0.036, -0.048, e, 14, d)),
      a.push(
        createPositionedBeveledBox(
          0.004,
          0.006,
          0.024,
          0.0015,
          F * 0.0228,
          -0.036,
          -0.036,
          e,
          d,
          [0.5, 0, 0],
        ),
      ));
  a.push(createPositionedBeveledBox(0.0045, 0.024, 0.013, 0.0015, -0.0212, -0.03, 0.022, e, d));
  for (let F = 0; F < 4; F++)
    a.push(
      createPositionedBeveledBox(
        0.0012,
        0.002,
        0.012,
        5e-4,
        -0.0238,
        -0.021 - F * 0.0045,
        0.022,
        e,
        d,
      ),
    );
  (a.push(createConnectingTube(0.0058, 0.005, 0.0205, -0.042, 0.016, e, 12, d)),
    l.push(createPositionedBeveledBox(0.004, 0.004, 0.026, 8e-4, 0.0205, -0.051, 0.016, s, v)),
    l.push(createPositionedBeveledBox(0.004, 0.02, 0.004, 8e-4, 0.0205, -0.043, 0.027, s, v)),
    l.push(
      extrudeProfileAlongX(
        [
          [0.033, -0.056],
          [0.033, -0.093],
          [0.024, -0.1005],
          [-0.031, -0.1005],
          [-0.041, -0.09],
          [-0.041, -0.06],
        ],
        -0.0085,
        0.0085,
        8e-4,
        s,
        v,
        [
          [
            [0.028, -0.059],
            [0.028, -0.091],
            [0.022, -0.096],
            [-0.029, -0.096],
            [-0.036, -0.088],
            [-0.036, -0.061],
          ],
        ],
      ),
    ),
    a.push(
      extrudeProfileAlongX(
        [
          [-0.006, -0.057],
          [0.004, -0.057],
          [0.003, -0.069],
          [0.0065, -0.079],
          [0.01, -0.086],
          [0.0065, -0.088],
          [0.001, -0.081],
          [-0.004, -0.07],
        ],
        -0.0032,
        0.0032,
        8e-4,
        t,
        0,
      ),
    ),
    l.push(
      extrudeProfileAlongX(
        [
          [-0.038, -0.05],
          [-0.045, -0.074],
          [-0.049, -0.086],
          [-0.049, -0.1],
          [-0.054, -0.112],
          [-0.057, -0.13],
          [-0.064, -0.158],
          [-0.11, -0.152],
          [-0.102, -0.112],
          [-0.096, -0.082],
          [-0.095, -0.064],
          [-0.103, -0.046],
          [-0.08, -0.044],
        ],
        -0.0165,
        0.0165,
        0.005,
        s,
        v,
      ),
    ));
  for (let F = 0; F < 9; F++) {
    let X = -0.078 - F * 0.0082,
      ne = -0.073 + (X + 0.078) * 0.26;
    l.push(createPositionedBeveledBox(0.0345, 0.0028, 0.03, 0.001, 0, X, ne, s, v, [-0.25, 0, 0]));
  }
  for (let F = 0; F < 7; F++) {
    let X = -0.078 - F * 0.01,
      ne = -0.098 + (X + 0.078) * 0.14;
    l.push(createPositionedBeveledBox(0.022, 0.0045, 0.006, 0.0015, 0, X, ne, s, v, [-0.14, 0, 0]));
  }
  (l.push(
    createPositionedBeveledBox(0.035, 0.006, 0.05, 0.002, 0, -0.157, -0.087, s, v, [0.13, 0, 0]),
  ),
    a.push(createConnectingTube(0.003, 0.034, 0, -0.15, -0.085, t, 8)));
}

/**
 * Sub-assembly 2: Handguard & Accessory Rails
 * Constructs free-float M-LOK handguard extrusion, forward Picatinny top rail continuation,
 * mounting collar/screws, handstop, and angled vertical foregrip core.
 */
function buildHandguardAndRails(parts, palette, topRailProfile) {
  const { ano: r, gun: a, poly: l } = parts;
  const {
    anoTint: i,
    gunmetalTint: e,
    pinTint: t,
    polyTint: s,
    anoSurf: p,
    gunSurf: d,
    polySurf: v,
  } = palette;
  const x = topRailProfile;
  let b = PAC9_MODEL_PARAMS.handguardR,
    m = 0.00885,
    A = 0.0028,
    _ = 0.101,
    M = 0.398,
    E = [
      [_, -m],
      [M, -m],
      [M, m],
      [_, m],
    ];
  for (let F = 0; F < 8; F++) {
    let X = [];
    if (F === 0 || F === 4 || F === 6)
      for (let $ = 0; $ < 6; $++)
        X.push(createSlotOvalPoints(0.13 + $ * 0.047, 0, 0.032, 0.007, 4));
    else if (F !== 2)
      for (let $ = 0; $ < 10; $++) {
        let ue = 0.124 + $ * 0.027;
        (F === 3 && ue > 0.3) || X.push(createSlotOvalPoints(ue, 0, 0.013, 0.0052, 3));
      }
    let ne = extrudeProfileAlongX(E, b - A, b, 9e-4, i, p, X);
    (ne.rotateZ((F * Math.PI) / 4), r.push(ne));
    let re = ((F + 0.5) * Math.PI) / 4;
    r.push(
      createRevolvedProfile(
        [
          [0, _],
          [0.003, _],
          [0.003, M],
          [0, M],
        ],
        8,
        i,
        0,
        Math.cos(re) * 0.0197,
        Math.sin(re) * 0.0197,
      ),
    );
  }
  (r.push(
    extrudeProfileAlongZ(
      [
        [-0.0088, 0.02],
        [0.0088, 0.02],
        [0.0106, 0.029],
        [0.0082, 0.0338],
        [-0.0082, 0.0338],
        [-0.0106, 0.029],
      ],
      0.1012,
      0.3978,
      0.0012,
      i,
      p,
    ),
  ),
    r.push(
      createRevolvedProfile(
        [
          [0.016, 0.096],
          [0.0238, 0.096],
          [0.0243, 0.0966],
          [0.0243, 0.106],
          [0.0232, 0.1075],
          [0.016, 0.1075],
        ],
        24,
        i,
        p,
      ),
    ),
    r.push(
      createRevolvedProfile(
        [
          [0.018, 0.3985],
          [0.0224, 0.3985],
          [0.0224, 0.4003],
          [0.0218, 0.401],
          [0.018, 0.401],
          [0.018, 0.3985],
        ],
        8,
        i,
        p,
      ),
    ));
  for (let F of [-1, 1])
    for (let X of [0.112, 0.126])
      a.push(createConnectingTube(0.0024, 0.0024, F * 0.0212, -0.004, X, t, 10));
  for (let F of [0.115, 0.215, 0.3, 0.385])
    for (let X of [-1, 1])
      a.push(
        createRevolvedProfile(
          [
            [0, -8e-4],
            [0.0017, -8e-4],
            [0.002, -4e-4],
            [0.002, 6e-4],
            [0, 6e-4],
          ],
          8,
          t,
          0,
          0,
          0,
        )
          .rotateX(Math.PI / 2)
          .translate(X * 0.0098, 0.0312, -F),
      );
  {
    let X = [
      extrudeProfileAlongZ(
        [
          [-0.0078, 0.0206],
          [0.0078, 0.0206],
          [0.0106, 0.0242],
          [-0.0106, 0.0242],
        ],
        0.318,
        0.396,
        5e-4,
        i,
        0,
      ),
    ];
    for (let ne = 0; ne < 8; ne++) {
      let re = 0.319 + ne * 0.01;
      X.push(
        extrudeProfileAlongZ(
          x.map(($) => [$[0], $[1] - 0.016]),
          re,
          re + 0.0048,
          5e-4,
          i,
          p,
        ),
      );
    }
    for (let ne of X) (ne.rotateZ(Math.PI / 4), r.push(ne));
  }
  {
    let F = [];
    for (let X = 0; X < 4; X++) {
      let ne = 0.352 + X * 0.01;
      F.push(
        extrudeProfileAlongZ(
          x.map((re) => [re[0], re[1] - 0.016]),
          ne,
          ne + 0.0048,
          5e-4,
          i,
          p,
        ),
      );
    }
    F.push(
      extrudeProfileAlongZ(
        [
          [-0.0078, 0.0206],
          [0.0078, 0.0206],
          [0.0106, 0.0242],
          [-0.0106, 0.0242],
        ],
        0.35,
        0.392,
        5e-4,
        i,
        0,
      ),
    );
    for (let X of F) (X.rotateZ(Math.PI), r.push(X));
  }
  (l.push(
    extrudeProfileAlongX(
      [
        [0.35, -0.026],
        [0.392, -0.026],
        [0.388, -0.036],
        [0.372, -0.05],
        [0.362, -0.05],
        [0.354, -0.036],
      ],
      -0.011,
      0.011,
      0.003,
      s,
      v,
    ),
  ),
    l.push(
      extrudeProfileAlongX(
        [
          [0.2395, -0.0215],
          [0.2725, -0.0215],
          [0.2725, -0.03],
          [0.27, -0.092],
          [0.2665, -0.0965],
          [0.2455, -0.0975],
          [0.242, -0.093],
          [0.2395, -0.03],
        ],
        -0.014,
        0.014,
        0.0045,
        s,
        v,
      ),
    ));
}

/**
 * Sub-assembly 3: Barrel & Muzzle Assembly
 * Constructs foregrip grip ribs/hardware, cold-hammer match barrel profile,
 * low-profile gas block, gas tube, and multi-port muzzle brake / flash hider.
 */
function buildBarrelAndMuzzle(parts, palette) {
  const { ano: r, gun: a, poly: l } = parts;
  const {
    gunmetalTint: e,
    pinTint: t,
    steelTint: n,
    polyTint: s,
    gunSurf: d,
    polySurf: v,
  } = palette;
  for (let F = 0; F < 6; F++)
    l.push(
      createPositionedBeveledBox(
        0.0292,
        0.0022,
        0.0315,
        8e-4,
        0,
        -0.04 - F * 0.0085,
        0.256 - F * 3e-4,
        s,
        v,
      ),
    );
  (l.push(createPositionedBeveledBox(0.03, 0.005, 0.04, 0.0015, 0, -0.024, 0.256, s, v)),
    a.push(createConnectingTube(0.003, 0.031, 0, -0.025, 0.256, t, 10)),
    a.push(
      createRevolvedProfile(
        [
          [0.0115, 0.095],
          [0.0115, 0.15],
          [0.0095, 0.153],
          [0.0095, 0.285],
          [0.009, 0.288],
          [0.009, 0.322],
          [0.0086, 0.326],
          [0.0086, 0.435],
          [0.0092, 0.437],
          [0.0092, 0.453],
          [0.0075, 0.455],
          [0.0075, 0.461],
        ],
        20,
        e,
        d,
      ),
    ),
    a.push(
      createRevolvedProfile(
        [
          [0.0092, 0.286],
          [0.0135, 0.286],
          [0.0142, 0.2875],
          [0.0142, 0.3165],
          [0.0135, 0.318],
          [0.0092, 0.318],
        ],
        16,
        e,
        d,
      ),
    ),
    a.push(createPositionedBeveledBox(0.014, 0.009, 0.03, 0.002, 0, 0.0145, 0.302, e, d)),
    a.push(
      createRevolvedProfile(
        [
          [0, 0.1],
          [0.0026, 0.1],
          [0.0026, 0.3],
          [0, 0.3],
        ],
        8,
        t,
        0,
        0,
        0.0172,
      ),
    ),
    a.push(createConnectingTube(0.002, 0.0145, 0, 0.012, 0.308, t, 6)),
    a.push(
      createRevolvedProfile(
        [
          [0.0075, 0.459],
          [0.0108, 0.459],
          [0.0116, 0.4605],
          [0.0116, 0.477],
          [0.011, 0.478],
          [0.0052, 0.478],
        ],
        20,
        e,
        d,
      ),
    ),
    a.push(
      createRevolvedProfile(
        [
          [0.0052, 0.477],
          [0.0052, 0.517],
        ],
        12,
        n,
      ),
    ));
  for (let F of [0.4865, 0.4965, 0.5065])
    a.push(
      createRevolvedProfile(
        [
          [0.0052, F - 0.0019],
          [0.011, F - 0.0019],
          [0.0116, F - 0.0012],
          [0.0116, F + 0.0012],
          [0.011, F + 0.0019],
          [0.0052, F + 0.0019],
        ],
        20,
        e,
        d,
      ),
    );
  a.push(
    createRevolvedProfile(
      [
        [0.0052, 0.5145],
        [0.011, 0.5145],
        [0.0116, 0.5155],
        [0.0116, 0.527],
        [0.0102, 0.5305],
        [0.0048, 0.5305],
        [0.0036, 0.526],
        [0.0036, 0.495],
      ],
      20,
      e,
      d,
      0,
      0,
      (F, X, ne) => (F < 0.0047 ? [0.25, 0.25, 0.25] : ne),
    ),
  );
  for (let F of [-1, 1])
    a.push(createPositionedBeveledBox(0.0125, 0.0042, 0.042, 0.0012, 0, F * 0.0096, 0.496, e, d));
  for (let F = 0; F < 3; F++)
    a.push(createConnectingTube(0.0016, 0.0236, 0, 0, 0.4675 + F * 0.0035, n, 6));
}

/**
 * Sub-assembly 4: Buttstock & Buffer Tube
 * Constructs mil-spec receiver extension / buffer tube, castle nut, receiver endplate,
 * 6-position collapsible buttstock body, cheek riser, and ribbed rubber buttpad.
 */
function buildButtstockAndTube(parts, palette) {
  const { ano: r, gun: a, poly: l, plain: f } = parts;
  const {
    anoTint: i,
    gunmetalTint: e,
    pinTint: t,
    polyTint: s,
    rubberTint: o,
    anoSurf: p,
    gunSurf: d,
    polySurf: v,
  } = palette;
  (r.push(
    createRevolvedProfile(
      [
        [0, -0.292],
        [0.0142, -0.292],
        [0.0148, -0.2905],
        [0.0148, -0.1],
      ],
      20,
      i,
      p,
    ),
  ),
    r.push(
      createRevolvedProfile(
        [
          [0.0148, -0.122],
          [0.0185, -0.122],
          [0.0195, -0.1205],
          [0.0195, -0.1115],
          [0.0185, -0.11],
          [0.0148, -0.11],
        ],
        12,
        i,
        p * 1.5,
      ),
    ));
  {
    let F = [
        [-0.019, -0.024],
        [0.019, -0.024],
        [0.021, -0.018],
        [0.021, 0.018],
        [0.016, 0.024],
        [-0.016, 0.024],
        [-0.021, 0.018],
        [-0.021, 0.006],
        [-0.036, 0.004],
        [-0.04, -0.002],
        [-0.04, -0.014],
        [-0.034, -0.02],
        [-0.021, -0.02],
      ],
      X = [
        [-0.025, -0.014],
        [-0.025, -0.002],
        [-0.033, -5e-4],
        [-0.036, -0.004],
        [-0.036, -0.012],
        [-0.032, -0.016],
      ];
    a.push(extrudeProfileAlongZ(F, -0.1095, -0.1045, 8e-4, [1.6, 1.6, 1.65], d, [X]));
  }
  (l.push(
    extrudeProfileAlongX(
      [
        [-0.146, 0.024],
        [-0.3, 0.024],
        [-0.331, 0.014],
        [-0.334, -0.086],
        [-0.318, -0.101],
        [-0.29, -0.096],
        [-0.232, -0.04],
        [-0.146, -0.024],
      ],
      -0.019,
      0.019,
      0.004,
      s,
      v,
      [
        [
          [-0.262, -0.036],
          [-0.306, -0.036],
          [-0.306, -0.074],
          [-0.292, -0.074],
        ],
      ],
    ),
  ),
    l.push(createPositionedBeveledBox(0.033, 0.016, 0.118, 0.006, 0, 0.031, -0.232, s, v)));
  for (let F of [-0.196, -0.268]) a.push(createConnectingTube(0.0032, 0.035, 0, 0.03, F, t, 8));
  (l.push(
    createPositionedBeveledBox(0.012, 0.012, 0.04, 0.003, 0, -0.033, -0.19, s, v, [0.2, 0, 0]),
  ),
    f.push(createPositionedBeveledBox(0.037, 0.12, 0.011, 0.004, 0, -0.04, -0.3395, o, 0)));
  for (let F = 0; F < 9; F++)
    f.push(
      createPositionedBeveledBox(0.031, 0.004, 0.003, 0.001, 0, 0.004 - F * 0.011, -0.3455, o, 0),
    );
  for (let F of [-1, 1])
    a.push(createConnectingTube(0.0065, 0.003, F * 0.0195, -0.06, -0.318, t, 12));
}

/**
 * Sub-assembly 5: Optic Reflex Sight & BUIS
 * Constructs holographic/reflex red dot sight housing, anti-reflective hood, elevation/windage
 * adjustment turrets, battery cap, emitter diode module, BUIS backup iron sights, and pressure cable.
 */
function buildOpticReflexSight(parts, palette) {
  const { ano: r, gun: a, plain: f } = parts;
  const {
    anoTint: i,
    gunmetalTint: e,
    pinTint: t,
    rubberTint: o,
    anoSurf: p,
    gunSurf: d,
  } = palette;
  let w = PAC9_MODEL_PARAMS.sightY,
    S = PAC9_MODEL_PARAMS.window,
    z = [0.012, 0.012, 0.013];
  (r.push(createPositionedBeveledBox(0.03, 0.0092, 0.04, 0.0016, 0, 0.048, 0.021, i, p)),
    r.push(createPositionedBeveledBox(0.0045, 0.0085, 0.034, 0.001, -0.0162, 0.0452, 0.021, i, p)));
  for (let F of [0.009, 0.033])
    (a.push(createConnectingTube(0.004, 0.0042, -0.02, 0.0452, F, t, 6)),
      a.push(createConnectingTube(0.003, 0.0022, 0.016, 0.0452, F, t, 10)));
  let H = [
    [-0.0192, 0.0525],
    [0.0192, 0.0525],
    [0.0192, 0.0788],
    [0.0138, 0.0842],
    [-0.0138, 0.0842],
    [-0.0192, 0.0788],
  ];
  (r.push(extrudeProfileAlongZ(H, 0.008, 0.034, 0.001, i, p, [S])),
    f.push(
      extrudeProfileAlongZ(
        S.map((F) => [F[0] * 1.004, (F[1] - w) * 1.004 + w]),
        0.0078,
        0.0342,
        0,
        z,
        0,
        [S.map((F) => [F[0] * 0.982, (F[1] - w) * 0.982 + w])],
      ),
    ));
  let O = [
    [-0.0204, 0.06],
    [-0.0204, 0.0792],
    [-0.0143, 0.0854],
    [0.0143, 0.0854],
    [0.0204, 0.0792],
    [0.0204, 0.06],
    [0.0193, 0.06],
    [0.0193, 0.0788],
    [0.0138, 0.0843],
    [-0.0138, 0.0843],
    [-0.0193, 0.0788],
    [-0.0193, 0.06],
  ];
  (r.push(extrudeProfileAlongZ(O, 0.029, 0.038, 3e-4, i, p)),
    a.push(
      createRevolvedProfile(
        [
          [0, -0.006],
          [0.0052, -0.006],
          [0.0058, -0.0054],
          [0.0058, 0.0036],
          [0.0052, 0.0042],
          [0, 0.0042],
        ],
        14,
        e,
        d,
        0,
        0,
      )
        .rotateY(Math.PI / 2)
        .translate(0.0222, 0.0625, -0.021),
    ));
  for (let F of [0.0165, 0.0245])
    f.push(createPositionedBeveledBox(0.0022, 0.0055, 0.0055, 9e-4, -0.0196, 0.064, F, o, 0));
  for (let F of [0.012, 0.03])
    for (let X of [-1, 1])
      a.push(createConnectingTube(0.0016, 0.0012, X * 0.0195, 0.0555, F, t, 8));
  f.push(createPositionedBeveledBox(0.009, 0.0026, 0.006, 6e-4, 0, 0.058, 0.0115, z));
  for (let [F, X] of [
    [0.0128, 0.0548],
    [-0.0128, 0.0548],
  ])
    a.push(
      createRevolvedProfile(
        [
          [0, -6e-4],
          [0.0019, -6e-4],
          [0.0022, -2e-4],
          [0.0022, 7e-4],
          [0, 7e-4],
        ],
        10,
        t,
        0,
        F,
        X,
      )
        .translate(0, 0, -0.008 + 1e-4)
        .rotateY(0),
    );
  (a.push(
    createRevolvedProfile(
      [
        [0, -0.001],
        [0.0026, -0.001],
        [0.003, -5e-4],
        [0.003, 0.0012],
        [0, 0.0012],
      ],
      12,
      t,
      0,
      0,
      0,
    )
      .rotateX(Math.PI / 2)
      .translate(0.009, 0.0842, -0.014),
  ),
    f.push(createPositionedBeveledBox(0.0012, 2e-4, 0.0044, 5e-5, 0.009, 0.0855, 0.014, z)),
    f.push(
      extrudeProfileAlongZ(S, 0.0304, 0.0318, 0, z, 0, [
        S.map((F) => [F[0] * 0.955, (F[1] - w) * 0.955 + w]),
      ]),
    ));
  for (let [F, X] of [
    [-0.03, 1],
    [0.372, -1],
  ])
    (a.push(createPositionedBeveledBox(0.021, 0.0075, 0.03, 0.0015, 0, 0.0472, F, e, d)),
      a.push(
        createPositionedBeveledBox(0.0125, 0.004, 0.036, 0.001, 0, 0.0527, F + X * 0.004, e, d),
      ),
      a.push(createConnectingTube(0.0028, 0.024, 0, 0.0505, F - X * 0.013, e, 8)),
      a.push(createPositionedBeveledBox(0.004, 0.006, 0.006, 0.001, X * 0.0125, 0.0475, F, e, d)),
      a.push(createConnectingTube(0.0042, 0.0045, -0.0125, 0.0475, F + 0.006, t, 8)));
  (a.push(
    createRevolvedProfile(
      [
        [0.0016, -0.0012],
        [0.0034, -0.0012],
        [0.0038, -8e-4],
        [0.0038, 8e-4],
        [0.0034, 0.0012],
        [0.0016, 0.0012],
        [0.0016, -0.0012],
      ],
      12,
      e,
      d,
      0,
      0,
    )
      .rotateX(Math.PI / 2)
      .translate(0, 0.0553, 0.016),
  ),
    a.push(createConnectingTube(0.0048, 0.005, 0.015, 0.049, -0.036, e, 12, d)));
  for (let F = 0; F < 6; F++)
    a.push(
      createPositionedBeveledBox(
        0.0044,
        0.001,
        0.001,
        3e-4,
        0.015,
        0.049 + Math.sin(F * 1.047) * 0.0046,
        -0.036 + Math.cos(F * 1.047) * 0.0046,
        e,
        d,
      ),
    );
  (r.push(createPositionedBeveledBox(0.016, 0.005, 0.02, 0.0012, 0, 0.0355, -0.098, i, p)),
    a.push(createPositionedBeveledBox(0.01, 0.003, 0.008, 8e-4, 0, 0.0392, -0.0985, e, d)));
  for (let F = 0; F < 4; F++)
    a.push(
      createPositionedBeveledBox(0.0092, 8e-4, 0.001, 3e-4, 0, 0.0409, -0.0958 - F * 0.0018, e, d),
    );
  let q = -0.0267,
    U = 0.0267;
  (a.push(
    createRevolvedProfile(
      [
        [0, 0.308],
        [0.0095, 0.308],
        [0.0108, 0.3095],
        [0.0108, 0.322],
        [0.0118, 0.323],
        [0.0118, 0.378],
        [0.0128, 0.38],
        [0.0142, 0.382],
        [0.0142, 0.404],
        [0.0136, 0.406],
        [0.0142, 0.408],
        [0.0142, 0.412],
        [0.0128, 0.4135],
        [0.0118, 0.4135],
        [0.0112, 0.409],
      ],
      18,
      e,
      d,
      q,
      U,
    ),
  ),
    a.push(
      createRevolvedProfile(
        [
          [0.0112, 0.409],
          [0, 0.409],
        ],
        18,
        [0.35, 0.4, 0.45],
        0,
        q,
        U,
      ),
    ));
  for (let F = 0; F < 5; F++)
    a.push(
      createRevolvedProfile(
        [
          [0.0118, 0.33 + F * 0.008],
          [0.0124, 0.3305 + F * 0.008],
          [0.0124, 0.3335 + F * 0.008],
          [0.0118, 0.334 + F * 0.008],
        ],
        18,
        e,
        d,
        q,
        U,
      ),
    );
  {
    let F = createPositionedBeveledBox(0.02, 0.008, 0.04, 0.0012, 0, 0.028, 0.352, e, d);
    (F.rotateZ(Math.PI / 4), a.push(F));
  }
  {
    let F = createConnectingTube(0.004, 0.006, 0.0135, 0.028, 0.352, t, 8);
    (F.rotateZ(Math.PI / 4), a.push(F));
  }
  f.push(createPositionedBeveledBox(0.0185, 0.0065, 0.07, 0.0025, 0, 0.0468, 0.214, o, 0));
  for (let F = 0; F < 6; F++)
    f.push(
      createPositionedBeveledBox(0.014, 0.0012, 0.004, 5e-4, 0, 0.0503, 0.192 + F * 0.009, o, 0),
    );
  let T = createTubeFromPoints(
    [
      [q, U, -0.308],
      [q - 0.001, U + 0.002, -0.296],
      [-0.0265, 0.0235, -0.284],
      [-0.0255, 0.0215, -0.272],
      [-0.0235, 0.027, -0.262],
      [-0.016, 0.04, -0.256],
      [-0.007, 0.0465, -0.252],
      [-0.002, 0.047, -0.247],
    ],
    0.0018,
    6,
  );
  (applyVertexSurfaceColor(T, o, 0), f.push(T));
  for (let F of [
    [-0.0262, 0.0228, 0.28],
    [-0.0242, 0.0255, 0.265],
  ]) {
    let X = createPositionedBeveledBox(
      0.0065,
      0.0026,
      0.0035,
      8e-4,
      0,
      0,
      0,
      [0.03, 0.03, 0.03],
      0,
    );
    (X.rotateZ(Math.PI / 4), X.translate(F[0], F[1], -F[2]), f.push(X));
  }
}

/**
 * Sub-assembly 6: Bolt Carrier Group & Charging Handle
 * Constructs reciprocating bolt carrier group (BCG), gas key, locking lugs,
 * and ambidextrous rear charging handle with lock latch.
 */
function buildBoltCarrier(parts, palette) {
  const { bolt: c } = parts;
  const { gunmetalTint: e, gunSurf: d } = palette;
  c.push(
    createRevolvedProfile(
      [
        [0, -0.058],
        [0.0118, -0.058],
        [0.0124, -0.057],
        [0.0124, -0.01],
        [0.0116, -0.008],
        [0.0116, -0.002],
        [0.0124, 0],
        [0.0124, 0.046],
        [0.0105, 0.048],
        [0.0105, 0.056],
        [0.0062, 0.056],
        [0.0062, 0.06],
        [0, 0.06],
      ],
      16,
      [7, 7, 7.2],
      0,
      0,
      0.001,
    ),
  );
  for (let F = 0; F < 5; F++)
    c.push(
      createPositionedBeveledBox(
        0.0015,
        0.008,
        0.003,
        5e-4,
        0.0122,
        0.001,
        0.01 + F * 0.007,
        [1.2, 1.2, 1.2],
        0,
      ),
    );
  c.push(createPositionedBeveledBox(0.012, 0.0055, 0.014, 0.0015, -0.0165, 0.007, 0.078, e, d));
  {
    let F = createRevolvedProfile(
      [
        [0, -0.009],
        [0.0045, -0.009],
        [0.0056, -0.0078],
        [0.0056, -0.003],
        [0.0048, -0.002],
        [0.0048, 0.002],
        [0.0056, 0.003],
        [0.0056, 0.0078],
        [0.0045, 0.009],
        [0, 0.009],
      ],
      12,
      e,
      d,
    );
    (F.rotateY(Math.PI / 2), F.translate(-0.031, 0.007, -0.078), c.push(F));
  }
}

/**
 * Sub-assembly 7: Magazine & Cartridges
 * Constructs curved 9x19mm magazine body, feed lips, witness windows/ribs, baseplate,
 * follower, and detailed visible brass casing 9mm Luger cartridges.
 */
function buildMagazineAndAmmo(parts, palette) {
  const { mag: u, round: h } = parts;
  let D = (F) => 1.5 * Math.pow(Math.max(0, F - 0.07), 2),
    C = (F) => 3 * Math.max(0, F - 0.07),
    G = [1, 1, 1],
    j = [],
    N = 0.212,
    Q = 12;
  for (let F = 0; F <= Q; F++) {
    let X = -0.004 + ((N + 0.004) * F) / Q;
    j.push([D(X) + 0.0298, -X]);
  }
  for (let F = Q; F >= 0; F--) {
    let X = -0.004 + ((N + 0.004) * F) / Q;
    j.push([D(X) - 0.0298, -X]);
  }
  u.push(extrudeProfileAlongX(j, -0.0113, 0.0113, 0.002, G, 0.25));
  for (let F = 0; F < 8; F++) {
    let X = 0.082 + F * 0.0155;
    u.push(
      createPositionedBeveledBox(0.0246, 0.0058, 0.05, 0.0016, 0, -X, D(X), G, 0.3, [
        Math.atan(C(X)),
        0,
        0,
      ]),
    );
  }
  for (let F = 0; F < 10; F++) {
    let X = 0.078 + F * 0.013;
    u.push(
      createPositionedBeveledBox(0.012, 0.011, 0.004, 0.001, 0, -X, D(X) + 0.0302, G, 0.3, [
        Math.atan(C(X)),
        0,
        0,
      ]),
    );
  }
  (u.push(
    createPositionedBeveledBox(0.027, 0.009, 0.068, 0.003, 0, -N - 0.003, D(N) + 0.001, G, 0.3, [
      Math.atan(C(N)),
      0,
      0,
    ]),
  ),
    u.push(
      createPositionedBeveledBox(
        0.01,
        0.004,
        0.012,
        0.001,
        0,
        -N - 0.008,
        D(N) - 0.01,
        [0.6, 0.6, 0.6],
        0,
        [Math.atan(C(N)), 0, 0],
      ),
    ),
    u.push(createPositionedBeveledBox(0.003, 0.006, 0.04, 0.001, -0.0085, 0.0045, 0.004, G, 0.3)),
    u.push(createPositionedBeveledBox(0.003, 0.006, 0.04, 0.001, 0.0085, 0.0045, 0.004, G, 0.3)));
  let K = [1.25, 0.72, 0.5];
  (h.push(
    createRevolvedProfile(
      [
        [0, -0.02],
        [0.004, -0.02],
        [0.0047, -0.019],
        [0.0047, 0.01],
        [0.0034, 0.014],
        [0.0034, 0.018],
      ],
      12,
      [1, 1, 1],
      0,
      0.002,
      0.0062,
    ),
  ),
    h.push(
      createRevolvedProfile(
        [
          [0.003, 0.018],
          [0.0029, 0.024],
          [0.0022, 0.03],
          [0.001, 0.0345],
          [0, 0.0352],
        ],
        12,
        K,
        0,
        0.002,
        0.0062,
      ),
    ),
    h.push(
      createRevolvedProfile(
        [
          [0, -0.02],
          [0.004, -0.02],
          [0.0047, -0.019],
          [0.0047, 0.01],
        ],
        10,
        [0.8, 0.8, 0.8],
        0,
        -0.003,
        5e-4,
      ),
    ));
}

/**
 * Master PAC-9 Weapon Model Geometry Generator.
 * Coordinates the procedural creation of 7 modular weapon sub-assemblies,
 * applies unified squeeze matrix transformations, and computes bounding spheres.
 * @returns {Record<string, import("three").BufferGeometry>} Map of material slot geometries.
 */
function buildPac9Geometries() {
  const palette = {
    anoTint: [1, 1, 1],
    gunmetalTint: [1, 1, 1],
    pinTint: [5.5, 5.5, 5.7],
    steelTint: [0.4, 0.4, 0.42],
    polyTint: [1, 1, 1],
    rubberTint: [0.022, 0.022, 0.023],
    anoSurf: 9,
    gunSurf: 5,
    polySurf: 0.6,
  };

  const parts = {
    ano: [],
    gun: [],
    poly: [],
    plain: [],
    bolt: [],
    mag: [],
    round: [],
  };

  // Modular assembly sequence across 7 weapon sub-assemblies
  buildReceiverAndGrip(parts, palette, PAC9_TOP_RAIL_PROFILE);
  buildHandguardAndRails(parts, palette, PAC9_TOP_RAIL_PROFILE);
  buildBarrelAndMuzzle(parts, palette);
  buildButtstockAndTube(parts, palette);
  buildOpticReflexSight(parts, palette);
  buildBoltCarrier(parts, palette);
  buildMagazineAndAmmo(parts, palette);

  const { ano: r, gun: a, poly: l, plain: f, bolt: c, mag: u, round: h } = parts;
  let ie = {
    ano: mergeGeometriesClean(r),
    gun: mergeGeometriesClean(a),
    poly: mergeGeometriesClean(l),
    plain: mergeGeometriesClean(f),
    bolt: mergeGeometriesClean(c),
    mag: mergeGeometriesClean(u),
    round: mergeGeometriesClean(h),
  };
  for (let F of ["ano", "gun", "poly", "plain", "bolt"]) {
    let X = ie[F].attributes.position;
    for (let ne = 0; ne < X.count; ne++)
      X.getZ(ne) > -0.1002 &&
        X.getY(ne) < 0.0341 &&
        X.setX(ne, X.getX(ne) * PAC9_MODEL_PARAMS.squeeze);
  }
  for (let F in ie) ie[F].computeBoundingSphere();
  return ie;
}

export {
  buildPac9Geometries,
  applyPac9ShaderDetails,
  createPac9MarkingsMesh,
  createPac9SightDotMesh,
  createPac9MuzzleFlashMesh,
  buildPac9HandsMesh,
  countGeometryTris,
  pac9RainUniform,
};

export const PAC9_HELPERS = {
  roundedBox: createPositionedBeveledBox,
  chamferBox: extrudeProfileAlongX,
  wedgeBox: extrudeProfileAlongZ,
  plate: createRevolvedProfile,
  vertexNoise: applyVertexSurfaceColor,
};
