/**
 * Typescript porting of Kallyn - puriFIR (Minimum Phase Impulse Response Converter)
 * Creates the "perfect" impulse response from sample selection using minimum phase filter techniques
 * 
 * Created by Patrick "Kallyn" Kallenbach, 2025, ported to typescript by aptrn
 * HUGE thanks to mystran, Z1202, and AnalogGuy1 from https://www.kvraudio.com/forum/viewtopic.php?p=8849427#p8849427
 */

import { PuriFIR } from "./PuriFIR";

inlets = 1;
outlets = 1;
autowatch = 1;

// Random name generator arrays
const adjectives = [
  "Crystal", "Golden", "Silver", "Diamond", "Emerald", "Ruby", "Sapphire",
  "Cosmic", "Ethereal", "Mystic", "Celestial", "Lunar", "Solar", "Stellar",
  "Oceanic", "Mountain", "Forest", "Desert", "Arctic", "Tropical", "Alpine"
];

const nouns = [
  "Echo", "Reverb", "Space", "Cave", "Hall", "Room", "Chamber",
  "Wave", "Pulse", "Beam", "Field", "Sphere", "Orb", "Core",
  "Sound", "Tone", "Note", "Chord", "Scale", "Harmony", "Melody"
];

function generateRandomName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = ("0000" + Math.floor(Math.random() * 9999)).slice(-4);
  return `${adjective}${noun}${randomNum}`;
}

function process() {
  let windowSize = parseInt(arguments[0]);
  let inputBuffer = new Buffer("input");
  let inputFilename = patcher.getnamed("theinput").getattr("file");

  //@ts-ignore
  let channelCount = inputBuffer.channelcount();
  //@ts-ignore
  let frameCount = inputBuffer.framecount();

  let input: number[][] = [];
  for (let i = 0; i < channelCount; i++) {
    input[i] = inputBuffer.peek(i+1, 0, frameCount);
  }

  // Handle mono input by duplicating the channel for processing
  if (channelCount === 1) {
    input[1] = [...input[0]];
  }
  
  try {
    let puriFIR = new PuriFIR(windowSize);
    let processed = puriFIR.process(input);

    let wet = new Buffer("output");
    wet.send("clear");
    wet.send("sizeinsamps", processed[0].length);
    
    // Output only the channels that were in the input
    for (let i = 0; i < channelCount; i++) {
      wet.poke(i+1, 0, processed[i]);
    }
    const randomName = generateRandomName();
    //messnamed("save4drag", String("Desktop/IR_" + String(windowSize) + "_" + inputFilename + "_" + randomName + ".wav"));
    messnamed("save4drag", String(patcher.filepath + "/IR_" + String(windowSize) + "_" + inputFilename + "_" + randomName + ".wav"));
    post("Done processing \n");
  } catch (error: any) {
    post("Error: " + (error?.message || String(error)) + "\n");
  }
}

// .ts files with this at the end become a script usable in a [js] or [jsui] object
// If you are going to require your module instead of import it then you should comment
// these two lines out of this script
let module = {};
export = {};
