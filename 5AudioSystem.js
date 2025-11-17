
// AudioSystem - Controls the audio-driven part of the project.

/*
  AudioSystem manages all sound-related behaviors in the project and links
  both music playback and live microphone input to real-time visual responses.

  (1) Music Analysis
      Loads the music track, handles playback control, and performs ongoing
      FFT analysis. The extracted low, mid, and high frequency bands feed into
      other parts of the system—for example, the low-band difference is used
      to calculate the car speed factor.

  (2) Microphone Input
      Activates the microphone after user interaction and continually tracks
      incoming volume. When the system detects a sudden rise above the
      background level, a new ripple is triggered at the center of the 
      City Circle.

  (3) Ripple Generation
      Creates expanding circular waves using Mondrian colors. Each ripple
      increases in radius, slowly fades out, and is removed once it becomes
      fully transparent or exceeds a defined maximum size.

  Overall Logic
      updateAudioSystem() runs every frame. It processes FFT data when music
      is playing, evaluates microphone activity, generates new ripples when
      necessary, and updates all existing waves. drawMicRipples() is then
      called by the main sketch to render these effects. As a whole, the
      system converts audio—from both the music and the microphone—into
      continuous motion and visual variation, keeping the scene reactive
      and closely tied to real-time sound.
*/


// Global Audio Variables
let trackSound = null;
let trackFFT   = null;

// Band Energies
let audioLevel = 0;
let audioLow   = 0;
let audioMid   = 0;
let audioHigh  = 0; 

// Used by the car system in 4CarAnimation.js
let audioSpeedFactor = 1.0;

// Playback State
let audioStarted = false;
let audioPaused  = false;

// Microphone Input
let micIn = null;
let micLevel = 0;
let micFollow = 0;
let micStarted = false;

// Ripple data
let micRipples = [];
let cityCircleCenterX = 404;
let cityCircleCenterY = 245;

// Mondrian color palette for microphone waves
let mondrianWaveColors = [
  mondrianRed,
  mondrianBlue,
  mondrianYellow,
  mondrianWhite
];


// Called in global preload()
function preloadAudioSystem() {
  console.log("preloadAudioSystem: Loading assets/Resurgence.wav");

  trackSound = loadSound(
    "assets/Resurgence.wav",
    () => {
      console.log("preloadAudioSystem: Sound loaded");
    },
    (err) => {
      console.log("preloadAudioSystem: Failed to load sound", err);
    }
  );
}

// Called in setup()
function initAudioSystem() {
  trackFFT = new p5.FFT(0.9, 1024);

  // Prepare microphone input (start later on user interaction)
  micIn = new p5.AudioIn();

  // Compute approximate center of City Circle for ripples
  initCityCircleCenter();
}

// Get center of City Circle polygon (from 2RailMap.js)
function initCityCircleCenter() {
  if (typeof p_CityCircle === "undefined" || p_CityCircle.length === 0) {
    cityCircleCenterX = 0;
    cityCircleCenterY = 0;
    return;
  }

  let sumX = 0;
  let sumY = 0;
  for (let pt of p_CityCircle) {
    sumX += pt.x;
    sumY += pt.y;
  }

  cityCircleCenterX = sumX / p_CityCircle.length;
  cityCircleCenterY = sumY / p_CityCircle.length;
}

// First-time start, called from mousePressed()
function startAudioSystem() {
  console.log("startAudioSystem Called");

  userStartAudio();

  if (!trackSound || !trackSound.isLoaded()) {
    console.log("startAudioSystem: Track not loaded yet");
    return;
  }

  if (!trackSound.isPlaying()) {
    // Start looping the track and connect it to the FFT
    trackSound.loop();
    trackFFT.setInput(trackSound);
    audioStarted = true;
    audioPaused  = false;
    console.log("startAudioSystem: Music started");
  } else {
    audioStarted = true;
    audioPaused  = false;
    console.log("startAudioSystem: Already playing");
  }

  // Start microphone after a user interaction
  if (micIn && !micStarted) {
    micIn.start(() => {
      console.log("Microphone started");
      micStarted = true;
    });
  }
}

// Play/pause without resetting progress
function togglePlayPause() {
  if (!audioStarted) {
    startAudioSystem();
    return;
  }

  if (!trackSound || !trackSound.isLoaded()) {
    console.log("togglePlayPause: Track not ready");
    return;
  }

  // If currently playing, pause and keep position
  if (trackSound.isPlaying() && !audioPaused) {
    trackSound.pause();
    audioPaused = true;
    console.log("togglePlayPause: Paused");
  } else {
    // If paused, resume from current position
    trackSound.play();
    trackFFT.setInput(trackSound);
    audioPaused = false;
    audioStarted = true;
    console.log("togglePlayPause: Resumed");
  }
}

// Called once per frame in draw()
function updateAudioSystem() {
  // If track is not ready at all, reset values and keep neutral speed.
  if (!trackSound || !trackSound.isLoaded()) {
    audioLow = audioMid = audioHigh = audioLevel = 0;
    audioSpeedFactor = 1.0;
  } else if (audioPaused || !trackSound.isPlaying()) {
    // If paused or not playing, keep last band values with original speed.
    audioSpeedFactor = 1.0;
  } else {
    trackFFT.analyze();

    /*
       Three custom bands:
       Low:   20–250 Hz     (kick + bass)
       Mid:   250–2000 Hz   (body of instruments)
       High:  2000–10000 Hz (brightness and details)
    */

    let rawLow  = map(trackFFT.getEnergy(20,   250),   0, 255, 0, 1);
    let rawMid  = map(trackFFT.getEnergy(250,  2000),  0, 255, 0, 1);
    let rawHigh = map(trackFFT.getEnergy(2000, 10000), 0, 255, 0, 1);

    // Difference between current low and last smoothed low.
    let diff = abs(rawLow - audioLow);

    // 3 Bands
    audioLow = lerp(audioLow, rawLow, 0.5);

    audioMid  = rawMid;

    audioHigh = rawHigh;

    audioLow  = constrain(audioLow,  0, 1);
    audioMid  = constrain(audioMid,  0, 1);
    audioHigh = constrain(audioHigh, 0, 1);

    audioLevel = (audioLow + audioMid + audioHigh) / 3;

    // Here we treat small changes in low energy between frames.
    let diffNorm = map(diff, 0.0, 0.05, 0, 1);
    diffNorm = constrain(diffNorm, 0, 1);

    // Makes small changes more noticeable
    diffNorm = pow(diffNorm, 0.9);

    // Map diffNorm to a speed range.
    let minSpeed = 1.0;
    let maxSpeed = 5.0;

    audioSpeedFactor = minSpeed + diffNorm * (maxSpeed - minSpeed);
  }

  // Microphone input used for ripple waves
  if (micIn && micStarted) {
    let rawMic = micIn.getLevel();

    // Follow background level
    micFollow = lerp(micFollow, rawMic, 0.2);
    micLevel = rawMic;

    // Detect sudden volume spikes
    let micDiff = rawMic - micFollow;
    let micThreshold = 0.02;

    if (micDiff > micThreshold) {
      let strength = map(micDiff, micThreshold, micThreshold + 0.1, 0.3, 1.0);
      strength = constrain(strength, 0.3, 1.0);
      spawnMicRipple(strength);
    }
  }

  // Always update existing ripples so they can expand and fade
  updateMicRipples();
}

// Add a ripple at the City Circle center
function spawnMicRipple(strength) {
  if (!audioStarted) return;

  // Choose one Mondrian color for this ripple from the wave palette
  let chosenColor = random(mondrianWaveColors);

  micRipples.push({
    x: cityCircleCenterX,
    y: cityCircleCenterY,
    radius: 0,
    alpha: 120,
    thickness: 3 + strength * 3,
    growth: 3 + strength * 15,
    baseColor: chosenColor
  });
}

// Update ripple expansion and fade
function updateMicRipples() {
  for (let i = micRipples.length - 1; i >= 0; i--) {
    let ripple = micRipples[i];
    ripple.radius += ripple.growth;
    ripple.alpha -= 2;

    if (ripple.alpha <= 0 || ripple.radius > 600) {
      micRipples.splice(i, 1);
    }
  }
}

// Draw all ripple circles (called from sketch.js while map is drawn)
function drawMicRipples() {
  if (micRipples.length === 0) return;

  noFill();
  for (let ripple of micRipples) {
    // Use the stored Mondrian color and apply transparency
    let c = color(ripple.baseColor || "#FBFAF8");
    c.setAlpha(ripple.alpha);

    stroke(c);
    strokeWeight(ripple.thickness);
    circle(ripple.x, ripple.y, ripple.radius * 2);
  }
}
