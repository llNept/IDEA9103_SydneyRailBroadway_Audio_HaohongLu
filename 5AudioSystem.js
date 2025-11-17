
// AudioSystem - Controls the audio-driven part of the project.

/*
  It:
  - loads a single music track in preload()
  - sets up an FFT analyser to read the spectrum
  - computes three bands (low / mid / high) as 0..1 values every frame
  - compares the current low band to the previous frame (diff)
  - converts this diff into a speed factor (audioSpeedFactor) that the cars use
*/


// Global audio variables
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
    return;
  }

  // If paused or not playing: keep last band values with original spped.
  if (audioPaused || !trackSound.isPlaying()) {
    audioSpeedFactor = 1.0;
    return;
  }

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

  // Smooth low band so the debug panel text is stable but still responsive
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


