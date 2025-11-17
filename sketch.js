
// Sketch — Main scene setup and rendering everything.

/*
 Canvas scaling from original 600×500 to 1000x800 with 960+20px margin both sides.
 Handles overall intergration including background, railmap, Mondrian town, and car animation.
*/


// Setup
const BASE_W = 1000;
const BASE_H = 800;

function preload() {
  preloadAudioSystem(); 
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);

  initAudioSystem();

  initTownGrid();
  initOutlineBlocks();
  initGridBlocks();
  initMondrianTown();

  initCars();
}

function mousePressed() {
  startAudioSystem();
}

function keyPressed() {
  if (key === ' ') {
    togglePlayPause();
  }
}

// Draw
function draw() {
  background(255);
  
  // 0) Update audio every frame
  updateAudioSystem();

  let s = min(width / BASE_W, height / BASE_H);
  let ox = (width  - BASE_W * s) * 0.5;
  let oy = (height - BASE_H * s) * 0.5;

  push();
  translate(ox, oy);
  scale(s);

  push();
  translate(20, 0);
  scale(960 / original_W, 800 / original_H);

  // 1) Background
  drawSea();

  // 2) Mondrian Town
  drawMondrianTown();
  drawTownGrid();
  drawGridBlocks();
  drawTownOutline();
  drawOutlineBlocks();

  // 3) Rails & Stations
  drawRails();
  drawStations();

  // 4) Car Animation
  advanceCars();
  drawCars();

  pop();

  // 5) UI Overlays
  drawInstructionOverlay();
  drawAudioDebugPanel();

  pop();
}

function drawInstructionOverlay() {
  push();
  noStroke();
  fill(0, 150);

  let panelW = 300;
  let panelH = 60;

  rect(0, 0, panelW, panelH);

  fill(255);
  textSize(15);
  textAlign(CENTER, CENTER);

  text("Click anywhere to start music\nPress SPACE to Pause / Play", 
       panelW / 2, panelH / 2);

  pop();
}

function drawAudioDebugPanel() {
  push();
  noStroke();

  let panelW = 220;
  let panelH = 100;
  let x0 = BASE_W - panelW - 50;
  let y0 = 5;

  fill(0, 150);
  rect(x0, y0, panelW, panelH);

  fill(255);
  textSize(12);
  textAlign(LEFT, CENTER);

   // Low (Rred)
  text("LOW", x0 + 10, y0 + 22);
  fill(255, 80, 80);
  rect(x0 + 55, y0 + 16, audioLow * 120, 10);
  fill(255);
  text(nf(audioLow, 1, 2), x0 + 180, y0 + 22);

  // Mid (Yellow)
  text("MID", x0 + 10, y0 + 42);
  fill(255, 214, 74);
  rect(x0 + 55, y0 + 36, audioMid * 120, 10);
  fill(255);
  text(nf(audioMid, 1, 2), x0 + 180, y0 + 42);

  // High (Blue)
  text("HIGH", x0 + 10, y0 + 62);
  fill(80, 160, 255);
  rect(x0 + 55, y0 + 56, audioHigh * 120, 10);
  fill(255);
  text(nf(audioHigh, 1, 2), x0 + 180, y0 + 62);

  // Speed (White)
  text("SPEED", x0 + 10, y0 + 82);
  fill(255);
  rect(x0 + 55, y0 + 76, (audioSpeedFactor / 2.0) * 120, 10);
  fill(255);
  text(nf(audioSpeedFactor, 1, 2), x0 + 180, y0 + 82);

  pop();
}

// Adjustment
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

