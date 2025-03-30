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

function process() {
  let windowSize = parseInt(arguments[0]);
  let inputBuffer = new Buffer("input");

  //@ts-ignore
  let channelCount = inputBuffer.channelcount();
  //@ts-ignore
  let frameCount = inputBuffer.framecount();


  let input: number[][]  = [];
  for (let i = 0; i < channelCount; i++) {
    input[i] = inputBuffer.peek(i+1, 0, frameCount);
  }

  // Handle mono input by duplicating the channel
  if (channelCount === 1) {
    input[1] = [...input[0]];
    channelCount = 2;
  }
  
  
  try {
    let puriFIR = new PuriFIR(windowSize);
    let processed = puriFIR.process({...input});

    let wet = new Buffer("output");
    wet.send("clear");
    wet.send("sizeinsamps", processed[0].length);
    
    // If input was mono, only output one channel
    if (inputBuffer.channelcount() === 1) {
      wet.poke(1, 0, processed[0]);
    } else {
      for (let i = 0; i < channelCount; i++) {
        wet.poke(i+1, 0, processed[i]);
      }
    }
    post("Done processing, window: ", windowSize, "\n");
  } catch (error: any) {
    post("Error: " + (error?.message || String(error)) + "\n");
  }
}

// .ts files with this at the end become a script usable in a [js] or [jsui] object
// If you are going to require your module instead of import it then you should comment
// these two lines out of this script
let module = {};
export = {};
