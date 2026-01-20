// src/obfuscate.ts

type EngineType = "LuaU" | "JavaScript (MCBE)";

// --- Helper: Generate Random Hex Variable Names (e.g., _0x4F2, _0xA91) ---
function genVar(): string {
  const hex = "0123456789ABCDEF";
  let res = "_0x";
  // Generate 3 random hex characters
  for (let i = 0; i < 3; i++) {
    res += hex[Math.floor(Math.random() * hex.length)];
  }
  return res;
}

// --- Helper: Obfuscate Numbers (Math/Hex Mix) ---
// Turns 10 -> "0xA" or "(5+5)"
function obfNum(n: number): string {
  const method = Math.floor(Math.random() * 3);
  if (method === 0) return `0x${n.toString(16)}`; // Hex
  if (method === 1) { // Addition
      const part1 = Math.floor(Math.random() * n);
      const part2 = n - part1;
      return `(${part1}+${part2})`; 
  }
  return `(${n})`; // Standard wrapped
}

// --- Helper: Hide Logic Strings using Obfuscated Numbers ---
// Uses the local 'char' function variable, not string.char
function hideString(str: string, charFuncVar: string): string {
  let args = [];
  for(let i=0; i<str.length; i++) {
    args.push(obfNum(str.charCodeAt(i)));
  }
  return `${charFuncVar}(${args.join(',')})`;
}

// --- Helper: Dead Code Generator ---
function getDeadCode(preset: string): string {
  let intensity = 1; 
  if (preset === "Medium") intensity = 3;
  if (preset === "High") intensity = 10;

  let junk = "";
  // Fake Memory Table 
  const junkTableSize = intensity * 30; 
  let tableContent = "";
  for(let i=0; i<junkTableSize; i++) {
     tableContent += `"${Math.random().toString(36).substring(7)}",`;
  }
  junk += `local ${genVar()}={${tableContent}};`;

  // Fake Math Loop
  const v1 = genVar();
  const v2 = genVar();
  junk += `local ${v1}=${obfNum(Math.floor(Math.random()*999))};for ${v2}=${obfNum(1)},${obfNum(intensity*2)} do ${v1}=(${v1}*${v2})%${obfNum(9999)};end;`;
  return junk;
}

// --- Helper: String Encryption ---
function encryptString(str: string, key: number): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    // FIX: Added (i + 1) because Lua tables start at index 1, JS starts at 0.
    // This fixes the "print('s') -> 'r'" off-by-one bug.
    const encryptedByte = (charCode + key + (i + 1)) % 256;
    result += "\\" + encryptedByte;
  }
  return result;
}

export function obfuscateCode(code: string, engine: EngineType, preset: string): string {
  const isLua = engine === "LuaU";

  // --- Step 1: Strip Comments from User Code ---
  let processedCode = code;

  if (isLua) {
    // Remove comments, preserving Watermark
    processedCode = processedCode
      .replace(/--\[\[(?! This file is protected with Vexile)[\s\S]*?\]\]/g, "")
      .replace(/--(?![\[])(?!.*Vexile).*$/gm, ""); 
  } else {
    processedCode = processedCode
      .replace(/\/\*(?! This file is protected with Vexile)[\s\S]*?\*\//g, "") 
      .replace(/\/\/(?!.*Vexile).*$/gm, ""); 
  }
  
  // Basic pre-minification of user code
  processedCode = processedCode.split('\n').map(line => line.trim()).filter(l => l.length > 0).join(' ');

  if (!isLua) {
      return `/* This file is protected with Vexile v1.0.0 (discord.gg/vexile) */ ${processedCode}`;
  }

  // --- Step 2: Generate Obfuscation Logic ---

  // Variable Names (Now exclusively _0xHex style)
  const vDebug = genVar();
  const vGetInfo = genVar(); 
  const vString = genVar();
  const vChar = genVar();    
  const vByte = genVar();    
  const vConcat = genVar();
  const vTable = genVar();
  const vInsert = genVar();
  const vTask = genVar();
  
  // Crash Function (Recursive Stack Overflow)
  const vCrash = genVar();
  const crashLogic = `local function ${vCrash}()return ${vCrash}()end`; 
  
  // String Decryptor
  const vDecrypt = genVar();
  const vStrArg = genVar();
  const encryptKey = Math.floor(Math.random() * 100) + 1;
  const kKey = obfNum(encryptKey);
  const k256 = obfNum(256);

  // FIX: Decryptor logic matches (i+1) offset because Lua loops 1..#str automatically
  const decryptLogic = `local function ${vDecrypt}(${vStrArg})local _r={} for _i=1,#${vStrArg} do local _b=${vByte}(${vStrArg},_i) ${vInsert}(_r,${vChar}((_b-_i-${kKey})%${k256})) end return ${vConcat}(_r) end`;

  // Encrypt User Strings
  if (preset !== "Fast") {
      processedCode = processedCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1, p2) => {
          const raw = p1 || p2 || "";
          if (raw.length === 0) return match;
          return `${vDecrypt}("${encryptString(raw, encryptKey)}")`;
      });
  }

  // Anti-Tamper Logic Strings
  const vState = genVar();
  const deadCodeBlock = getDeadCode(preset);
  
  // Generate obfuscated strings for logic checks
  const strWhat = hideString("what", vChar);
  const strC = hideString("C", vChar); 
  const strWait = hideString("wait", vChar);
  const strCheckIndex = hideString("CHECKINDEX", vChar);

  // VM Loop
  const antiTamperLogic = `local ${vState}=${obfNum(1)};while ${vState}~=${obfNum(0)} do if ${vState}==${obfNum(1)} then ${deadCodeBlock} if(getfenv and getfenv()[${strCheckIndex}])then ${vCrash}() end; ${vState}=${obfNum(2)}; elseif ${vState}==${obfNum(2)} then if(${vGetInfo}(${vTask}[${strWait}])[${strWhat}]~=${strC})then ${vCrash}() end; ${vState}=${obfNum(3)}; elseif ${vState}==${obfNum(3)} then ${preset==="High"?getDeadCode("Medium"):""} ${vState}=${obfNum(0)}; end end`;

  // Parser Bomb (High Only)
  let parserBomb = "";
  if (preset === "High") {
     const bombDepth = 200;
     const innerValue = `0x${Math.floor(Math.random()*10000).toString(16)}`; 
     parserBomb = `local ${genVar()} = ${"{".repeat(bombDepth)}${innerValue}${"}".repeat(bombDepth)};`;
  }

  // --- Step 3: Final Assembly ---
  
  const headerStart = isLua ? "--[[" : "/*";
  const headerEnd = isLua ? "]]" : "*/";
  const watermark = `${headerStart} This file is protected with Vexile v1.0.0 (discord.gg/vexile) ${headerEnd}`;

  // We explicitly define the locals here.
  let rawScript = `
    (function()
      ${parserBomb}
      local ${vString}=string;
      local ${vChar}=${vString}.char;
      local ${vByte}=${vString}.byte;
      local ${vTable}=table;
      local ${vInsert}=${vTable}.insert;
      local ${vConcat}=${vTable}.concat;
      local ${vDebug}=debug;
      local ${vGetInfo}=${vDebug}.getinfo;
      local ${vTask}=task;
      ${crashLogic};
      ${decryptLogic};
      ${antiTamperLogic};
      ${processedCode};
    end)()
  `;

  // Minify the entire boilerplate
  let minifiedScript = rawScript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  return `${watermark}\n${minifiedScript}`;
}
