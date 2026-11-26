// Coral Sky Run — world constants, mission layout and flight tuning.
// One clear job: every number the rest of the game agrees on lives here.
export const WORLD = {
  size: 5200, // playable square, metres, centred on origin
  seaLevel: 0,
  skyTop: 900,
  fogNear: 900,
  fogFar: 4200,
};

export const RUNWAY = {
  // Home strip on Pulau Luma (the big island, south-west of centre).
  x: -1150,
  z: 950,
  headingDeg: 35, // runway direction, degrees clockwise from north (-Z)
  length: 780,
  width: 46,
  elevation: 26,
};

export const RINGS = [
  { name: "CORAL GATE", x: -820, y: 150, z: 430, r: 26 },
  { name: "PALM PASS", x: -420, y: 185, z: -120, r: 26 },
  { name: "TURTLE ARCH", x: 120, y: 170, z: -560, r: 26 },
  { name: "VOLCANO LOOP", x: 780, y: 330, z: -720, r: 30 },
  { name: "LAGOON TURN", x: 1180, y: 160, z: -60, r: 26 },
  { name: "REEF SLALOM", x: 900, y: 140, z: 620, r: 24 },
  { name: "MONKEY BAY", x: 240, y: 175, z: 980, r: 26 },
  { name: "HOME STRAIGHT", x: -760, y: 165, z: 1080, r: 28 },
];

export const FLIGHT = {
  minSpeed: 26, // m/s — below this the wing stops flying
  maxSpeed: 95,
  cruiseSpeed: 58,
  accelPerThrottle: 26,
  drag: 0.16,
  gravity: 9.8,
  liftFactor: 0.62,
  rollRate: 1.9, // rad/s at full input
  pitchRate: 1.15,
  turnFromRoll: 0.55, // heading change per second per radian of bank
  fuelCapacity: 100,
  fuelBurnCruise: 0.42, // units per second at full throttle
  startFuel: 100,
  ringFuelBonus: 6,
  ringScore: 100,
  landingScore: 400,
  smoothLandingBonus: 250,
};

export const SPAWN = {
  // Parked on the Luma runway, facing down its heading, ready to roll.
  x: RUNWAY.x,
  z: RUNWAY.z,
  y: RUNWAY.elevation + 2.2,
  headingDeg: RUNWAY.headingDeg,
  speed: 0,
};

export const COLORS = {
  skyTop: 0x2f7fc9,
  skyHorizon: 0xbfe6f7,
  seaDeep: 0x0b5e8a,
  seaShallow: 0x2ec4b6,
  sand: 0xf2ddab,
  grass: 0x5da24a,
  forest: 0x2f6b33,
  rock: 0x8a7f72,
  volcanoTop: 0x6b5d54,
  lava: 0xff6b35,
  runway: 0x3a3f46,
  ringNext: 0xffc93c,
  ringDone: 0x35e0a1,
  ringTodo: 0x2fb7ff,
  planeCream: 0xfff3d6,
  planeTeal: 0x0f766e,
  planeOrange: 0xff7a2e,
};

export const SHOT_PRESETS = {
  // Deterministic camera/plane setups for the maker's screenshots (?shot=name).
  chase: { cam: "chase", ring: 0, distBehindRing: 260, alt: 165, speed: 55 },
  cockpit: { cam: "cockpit", ring: 7, distBehindRing: 420, alt: 175, speed: 52 },
  rings: { cam: "chase", ring: 3, distBehindRing: 200, alt: 330, speed: 58 },
  landing: { cam: "chase", ring: 7, distBehindRing: 380, alt: 120, speed: 46 },
};
