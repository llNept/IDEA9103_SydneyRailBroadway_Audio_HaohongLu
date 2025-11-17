
// CarAnimation — Cars moving along rail lines using p5.Vector.

/*
  Uses p5.Vector for interpolation and distance calculation.

 (1) Car Color Palette — Uses Mondrian-style colors without white.
 (2) Car Class —
     Converts a polyline of x/y points into vector segments.
     Calculates each segment’s length and total path distance.
     Moves forward every frame, updating its position by distance.
     Two motion modes:
     loop: Continuously loops around City Circle.
     pingpong: Travels to the end and reverses direction.
 (3) Vehicles Management — Randomizes color, speed, and motion mode.
     City Circle loops forever; others bounce back and forth.
 (4) Animation Control —
     advanceCars() updates movement each frame;
     drawCars() draws every car at its interpolated position.
*/


// 1) Palette for car colors: In case Mondrian color globals are not defined.
let car_Palette = [
  (typeof mondrianRed    !== "undefined" ? mondrianRed    : "#C43B31"),
  (typeof mondrianBlue   !== "undefined" ? mondrianBlue   : "#2E66B3"),
  (typeof mondrianYellow !== "undefined" ? mondrianYellow : "#F2D10D"),
];

function randomCarColor() {
  return random(car_Palette);
}


// 2) Car Class: Represents one car moving along a given polyline path.
class Car {
  
  /**
   @param {Array<{x:number,y:number}>} polyline - Path Points (p_* Arrays)
   @param {Object} option -  { Mode: loop | pingpong, color, r, speed }
  **/

  constructor(polyline, option = {}) {
    // Visual
    this.color = option.color || randomCarColor();
    this.r     = option.r     ?? 7;

    // Motion
    this.mode  = option.mode  || "pingpong";
    this.speed = option.speed ?? 1.0;
    this.direction = 1;

    // Convert polyline to vectors
    this.path = polyline.map(p => createVector(p.x, p.y));

    // Compute length of each segment and total distance
    this.segLens = [];
    this.totalLenth = 0;
    for (let i = 0; i < this.path.length - 1; i++) {
      let d = p5.Vector.dist(this.path[i], this.path[i + 1]);
      this.segLens.push(d);
      this.totalLenth += d;
    }

    // Start at a random position along the path
    this.dist = (this.totalLenth > 0) ? random(0, this.totalLenth) : 0;
  }

  // Move forward or backward along the path
  advance() {
  if (this.totalLenth <= 0) return;

  // Read speed factor from audio system (low frequencies)
  let factor = (typeof audioSpeedFactor !== "undefined")
    ? audioSpeedFactor
    : 1.0;

  let step = this.speed * factor; // Distance to move this frame by audio factors.

  if (this.mode === "loop") {
    // Loop Mode: Restart after finishing one round.
    this.dist += step;
    if (this.dist >= this.totalLenth) this.dist -= this.totalLenth;
  } else {
    // Pingpong Mode: Reverse direction at both ends.
    this.dist += step * this.direction;
    if (this.dist > this.totalLenth) {
      this.dist = this.totalLenth - (this.dist - this.totalLenth);
      this.direction = -1;
    } else if (this.dist < 0) {
      this.dist = -this.dist;
      this.direction = 1;
    }
  }
}

  // Find current position between two points
  getPos() {
    if (this.path.length < 2 || this.totalLenth <= 0) {
      return this.path[0] ? this.path[0].copy() : createVector(0, 0);
    }

    let d = this.dist;
    let i = 0;

    // Determine which segment the car is on
    for (; i < this.segLens.length; i++) {
      if (d <= this.segLens[i]) break;
      d -= this.segLens[i];
    }

    i = constrain(i, 0, this.segLens.length - 1);

    // Interpolate position between points a and b
    let a = this.path[i], b = this.path[i + 1];
    let seg = max(this.segLens[i], 0.0001);
    let t = d / seg;
    
    t = lerp(t, t * t * (3 - 2 * t), 0.1); // Add just a bit easing.
    return p5.Vector.lerp(a, b, t); // When t = 0 → position = a, when t = 1 → position = b.
  }

  // Draw the car as a circle
  draw() {
    let p = this.getPos();
    noStroke();
    fill(this.color);
    circle(p.x, p.y, this.r);
  }
}


// 3) Vehicle Management: Creates and stores one car per line.

/*
 Build one car for each line.
 CityCircle => "loop", Others => "pingpong".
*/

let lineCars = [];

function initCars() {
  lineCars = [];

  let pool = [
    p_M1,
    p_T1, p_T2, p_T3,
    p_T4_South, p_T4_East,
    p_T5, p_T7, p_T8, p_T9,
    p_Gray, p_WSA,
    p_PinkWithT6,
    p_CityCircle
  ];

  for (let poly of pool) {
    let isCircle = (poly === p_CityCircle);
    lineCars.push(new Car(poly, {
      mode:  isCircle ? "loop" : "pingpong",
      color: randomCarColor(),
      r:     7,
      speed: isCircle ? random(0.25, 0.5) : random(0.2, 0.4)
    }));
  }
}


// 4) Animation Control: Update all cars and draw them every frame.
function advanceCars() {
  for (let c of lineCars) c.advance();
}

function drawCars() {
  for (let c of lineCars) c.draw();
}
