import * as not251 from "@not251/not251";
import { Chain } from "@aptrn/markovchain-ts";

inlets = 1;
outlets = 1;
autowatch = 1;

function bang() {
  let test = new not251.intervalVector([2], 12, 12);
  let chain = new Chain(test);
  post("It works! " + test.modulo + "\n");
}

bang();

// .ts files with this at the end become a script usable in a [js] or [jsui] object
// If you are going to require your module instead of import it then you should comment
// these two lines out of this script
let module = {};
export = {};
