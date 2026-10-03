import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";

let pw = process.argv[2];
if (!pw) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  pw = await rl.question("Password: ");
  rl.close();
}
if (!pw) {
  console.error("Password required");
  process.exit(1);
}
const salt = randomBytes(16);
console.log(`APP_PASSWORD_HASH=${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`);
