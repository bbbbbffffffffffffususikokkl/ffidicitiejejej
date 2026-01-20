// src/obfuscate.ts

type EngineType = "LuaU" | "JavaScript (MCBE)";

// --- Helper: Generate Random Mangled Variable Names ---
function genVar(length: number = 4): string {
  const chars = "Il1O0"; 
  const hex = "0123456789ABCDEF";
  
  if (Math.random() > 0.5) {
     let res = "_0x";
     for(let i=0; i<3; i++) res += hex[Math.floor(Math.random() * hex.length)];
     return res;
  } else {
     let res = "";
     for(let i=0; i<length; i++) res += chars[Math.floor(Math.random() * chars.length)];
     return "_" + res; 
  }
}

// --- Helper: Hide Logic Strings (e.g. "what" -> "\119\104\97\116") ---
function hideString(str: string): string {
  let res = "";
  for(let i=0; i<str.length; i++) {
    res += "\\" + str.charCodeAt(i);
  }
  return res;
}

// --- Helper: Dead Code Generator ---
function getDeadCode(preset: string): string {
  let intensity = 1; 
  if (preset === "Medium") intensity = 3;
  if (preset === "High") intensity = 10;

  let junk = "";
  // Fake Memory Table 
  const junkTableSize = intensity * 50; 
  let tableContent = "";
  for(let i=0; i<junkTableSize; i++) {
     tableContent += `"${Math.random().toString(36).substring(7)}", `;
  }
  junk += `local ${genVar()} = {${tableContent}}; `;

  // Fake Math Loop
  const v1 = genVar();
  const v2 = genVar();
  junk += `local ${v1} = ${Math.floor(Math.random()*999)}; for ${v2}=1, ${intensity*2} do ${v1}=(${v1}*${v2})%9999; end; `;
  return junk;
}

// --- Helper: String Encryption ---
function encryptString(str: string, key: number): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const encryptedByte = (charCode + key + i) % 256;
    result += "\\" + encryptedByte;
  }
  return result;
}

export function obfuscateCode(code: string, engine: EngineType, preset: string): string {
  const isLua = engine === "LuaU";

  // --- Step 1: Strict Minification (Preserving Watermark) ---
  let processedCode = code;

  if (isLua) {
    // 1. Remove block comments NOT containing "Vexile"
    processedCode = processedCode.replace(/--\[\[(?! This file is protected with Vexile)[\s\S]*?\]\]/g, "");
    // 2. Remove single line comments NOT containing "Vexile"
    processedCode = processedCode.replace(/--(?![\[])(?!.*Vexile).*$/gm, ""); 
  } else {
    processedCode = processedCode.replace(/\/\*(?! This file is protected with Vexile)[\s\S]*?\*\//g, "") 
      .replace(/\/\/(?!.*Vexile).*$/gm, ""); 
  }

  // 3. Collapse whitespace (The aggressive minifier)
  processedCode = processedCode
    .split('\n').map(line => line.trim()).filter(l => l.length > 0).join(' ');


  if (!isLua) {
      return `/* Protected by Vexile */ ${processedCode}`;
  }

  // --- Step 2: Advanced LuaU Obfuscation ---

  // A. Generate Mappings
  const vDebug = genVar();
  const vGetInfo = genVar();
  const vString = genVar();
  const vChar = genVar();
  const vByte = genVar();
  const vConcat = genVar();
  const vTable = genVar();
  const vInsert = genVar();
  const vTask = genVar();
  const vMath = genVar(); // Used for random math
  
  // B. Crash Function (Recursive Stack Overflow)
  const vCrash = genVar();
  const crashLogic = `local function ${vCrash}() return ${vCrash}() end`; 
  
  // C. String Decryptor
  const vDecrypt = genVar();
  const vStrArg = genVar();
  const encryptKey = Math.floor(Math.random() * 100) + 1;
  
  const decryptLogic = `
    local function ${vDecrypt}(${vStrArg})
      local _r = {}
      for _i = 1, #${vStrArg} do
         local _b = ${vString}.${vByte}(${vStrArg}, _i)
         ${vTable}.${vInsert}(_r, ${vString}.${vChar}((_b - _i - ${encryptKey}) % 256))
      end
      return ${vTable}.${vConcat}(_r)
    end
  `;

  // D. Encrypt User Strings
  if (preset !== "Fast") {
      processedCode = processedCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1, p2) => {
          const raw = p1 || p2 || "";
          if (raw.length === 0) return match;
          return `${vDecrypt}("${encryptString(raw, encryptKey)}")`;
      });
  }

  // E. Obfuscated Anti-Tamper Logic (Hidden VM Steps)
  const vState = genVar();
  const deadCodeBlock = getDeadCode(preset);
  
  // Dynamic Keys:
  // .what -> ["\119\104\97\116"]
  const kWhat = `["${hideString("what")}"]`;
  // "C" -> string.char(60+7)
  const vCharC = `${vString}.${vChar}(60+7)`; 
  // task.wait -> task["\119\97\105\116"]
  const kWait = `["${hideString("wait")}"]`;
  // Global Check Strings
  const kCheckIndex = `["${hideString("CHECKINDEX")}"]`;

  const antiTamperLogic = `
    local ${vState} = 1;
    while ${vState} ~= 0 do
       if ${vState} == 1 then
          ${deadCodeBlock}
          -- Check: if getfenv().CHECKINDEX then crash
          if (getfenv and getfenv()${kCheckIndex}) then ${vCrash}() end;
          ${vState} = 2;
       elseif ${vState} == 2 then
          -- Check: if debug.getinfo(task.wait).what ~= "C" then crash
          local _db = ${vDebug}.${vGetInfo};
          if (_db(${vTask}${kWait})${kWhat} ~= ${vCharC}) then ${vCrash}() end;
          ${vState} = 3;
       elseif ${vState} == 3 then
          ${preset === "High" ? getDeadCode("Medium") : ""} 
          ${vState} = 0;
       end
    end
  `;

  // F. Obfuscated Parser Bomb (High Only)
  // Replaced "Vexile" with a random hex variable or 0 to hide intent
  let parserBomb = "";
  if (preset === "High" || preset == "Medium") {
     const bombDepth = 200;
     const innerValue = `0x${Math.floor(Math.random()*10000).toString(16)}`; // Random Hex e.g. 0xA4F2
     parserBomb = `local ${genVar()} = ${"{".repeat(bombDepth)} ${innerValue} ${"}".repeat(bombDepth)};`;
  }

  // --- Step 3: Final Assembly ---
  
  const headerStart = isLua ? "--[[" : "/*";
  const headerEnd = isLua ? "]]" : "*/";
  const watermark = `${headerStart} This file is protected with Vexile v1.0.0 (discord.gg/vexile) ${headerEnd}`;

  const finalScript = `
(function()
  ${parserBomb}
  local ${vString} = string;
  local ${vChar} = ${vString}.char;
  local ${vByte} = ${vString}.byte;
  local ${vTable} = table;
  local ${vInsert} = ${vTable}.insert;
  local ${vConcat} = ${vTable}.concat;
  local ${vDebug} = debug;
  local ${vTask} = task;
  
  ${crashLogic}
  ${decryptLogic}
  
  ${antiTamperLogic}

  ${processedCode}
end)()
  `;

  return `${watermark}\n${finalScript}`;
}
