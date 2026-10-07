// Adventure map graph: node = 0-based level index.
// x,y are node centres in 640x480 screen space over mapbg (drawn at 0,0).

export interface MapNode {
  level: number;
  x: number;
  y: number;
  description: string;
  next: number[];
  secret: boolean;
}

export const MAP_NODES: MapNode[] = [
  { level: 0, x: 115, y: 42, description: "Calm shallows where young sharks roam.", next: [1], secret: false },
  { level: 1, x: 178, y: 82, description: "A piranha school and drifting jellyfish.", next: [2, 6, 7], secret: false },
  { level: 2, x: 277, y: 81, description: "Stealth sharks hide their words here.", next: [3], secret: false },
  { level: 3, x: 336, y: 86, description: "Hammerheads guard a pirate sub's lair!", next: [8, 4], secret: false },
  { level: 4, x: 464, y: 64, description: "Toxic sharks with shifting letters!", next: [5, 14], secret: false },
  { level: 5, x: 574, y: 81, description: "A secret cove hides a sunken clam garden!", next: [], secret: true },
  { level: 6, x: 91, y: 158, description: "Strong piranhas need two letters each.", next: [9, 10], secret: false },
  { level: 7, x: 259, y: 164, description: "Hammerheads cruise the kelp forest.", next: [12], secret: false },
  { level: 8, x: 401, y: 139, description: "Ghost sharks drift through the gloom.", next: [14, 13], secret: false },
  { level: 9, x: 67, y: 246, description: "Stealth piranhas, and a pirate sub lurks!", next: [21], secret: false },
  { level: 10, x: 168, y: 215, description: "Hammerheads, strong piranhas and a pirate sub!", next: [21, 11], secret: false },
  { level: 11, x: 248, y: 227, description: "The striped tiger shark hunts here!", next: [15, 16], secret: false },
  { level: 12, x: 297, y: 209, description: "Stealth sharks shadow a pirate sub!", next: [13, 11], secret: false },
  { level: 13, x: 383, y: 180, description: "Toxic sharks and hammerheads mingle.", next: [17], secret: false },
  { level: 14, x: 471, y: 180, description: "Ghosts and toxic sharks haunt the trench.", next: [19], secret: false },
  { level: 15, x: 230, y: 263, description: "Tiger sharks with piranhas of all stripes.", next: [23], secret: false },
  { level: 16, x: 286, y: 278, description: "Stealth hammerheads lie in wait.", next: [23], secret: false },
  { level: 17, x: 399, y: 244, description: "Stealth hammerheads in poisoned water.", next: [24, 18], secret: false },
  { level: 18, x: 444, y: 252, description: "A secret clam bed by a volcanic vent!", next: [], secret: true },
  { level: 19, x: 529, y: 238, description: "Ghosts and toxic sharks guard a mecha-shark!", next: [25], secret: false },
  { level: 20, x: 46, y: 365, description: "A secret lagoon full of pearly clams!", next: [], secret: true },
  { level: 21, x: 86, y: 340, description: "Strong stealth piranhas swarm the reef.", next: [26, 20], secret: false },
  { level: 22, x: 196, y: 328, description: "A secret clam bed in the reef caves!", next: [], secret: true },
  { level: 23, x: 249, y: 320, description: "Tigers lead the way to a mecha-shark!", next: [22, 28], secret: false },
  { level: 24, x: 363, y: 308, description: "Toxic waters hide a mecha-shark!", next: [28], secret: false },
  { level: 25, x: 542, y: 284, description: "Stealthy tiger sharks prowl the deep.", next: [30], secret: false },
  { level: 26, x: 168, y: 381, description: "Tigers, ghosts and stealthy piranhas.", next: [27], secret: false },
  { level: 27, x: 236, y: 406, description: "Piranha swarms and a mecha-shark!", next: [31, 32], secret: false },
  { level: 28, x: 294, y: 342, description: "Stealth tigers and hammerheads collide.", next: [29], secret: false },
  { level: 29, x: 387, y: 347, description: "Every shark in the sea gathers here!", next: [34], secret: false },
  { level: 30, x: 526, y: 338, description: "Stealth tigers in toxic currents.", next: [34], secret: false },
  { level: 31, x: 303, y: 375, description: "Stealth tigers and endless piranhas.", next: [33], secret: false },
  { level: 32, x: 292, y: 425, description: "Toxic, ghostly and stealthy sharks.", next: [33], secret: false },
  { level: 33, x: 350, y: 420, description: "A bit of everything. Stay sharp!", next: [34], secret: false },
  { level: 34, x: 448, y: 372, description: "Stealth hunters, then a robo-squid rises!", next: [35], secret: false },
  { level: 35, x: 496, y: 425, description: "The whirlpool! A ghost ship awaits...", next: [], secret: false },
];

/** Trail dots between two nodes (trail waypoints): one per ~8 px, ends left bare. */
export function trailBetween(a: MapNode, b: MapNode): [number, number][] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const n = Math.trunc(Math.sqrt(dx * dx + dy * dy) * 0.125);
  const out: [number, number][] = [];
  for (let i = 2; i <= n - 2; i++) out.push([a.x + Math.trunc((dx * i) / n), a.y + Math.trunc((dy * i) / n)]);
  return out;
}
