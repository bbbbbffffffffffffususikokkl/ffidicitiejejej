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

// --- Helper: Dead Code Generator (Junk Data) ---
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

  // --- Step 1: Minification (Preserving Watermark Logic) ---
  let processedCode = code;

  if (isLua) {
    processedCode = processedCode
      .replace(/--\[\[(?! This file is protected with Vexile)[\s\S]*?\]\]/g, "") 
      .replace(/--(?![\[])(?!.*Vexile).*$/gm, ""); 
  } else {
    processedCode = processedCode
      .replace(/\/\*(?! This file is protected with Vexile)[\s\S]*?\*\//g, "") 
      .replace(/\/\/(?!.*Vexile).*$/gm, ""); 
  }

  processedCode = processedCode
    .split('\n').map(line => line.trim()).filter(l => l.length > 0).join(' ');


  if (!isLua) {
      return `/* Protected by Vexile */ ${processedCode}`;
  }

  // --- Step 2: Advanced LuaU Obfuscation ---

  // A. Generate Variable Names
  const vDebug = genVar();
  const vGetInfo = genVar();
  const vString = genVar();
  const vChar = genVar();
  const vByte = genVar();
  const vSub = genVar();
  const vConcat = genVar();
  const vTable = genVar();
  const vInsert = genVar();
  const vMath = genVar();
  const vTask = genVar();
  
  // B. The "Crash" Function (Recursive Stack Overflow)
  const vCrash = genVar();
  const crashLogic = `local function ${vCrash}() return ${vCrash}() end`; 
  
  // C. String Decryption Routine
  const vDecrypt = genVar();
  const vKeyArg = genVar();
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

  // D. Process User Strings
  if (preset !== "Fast") {
      processedCode = processedCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1, p2) => {
          const raw = p1 || p2 || "";
          if (raw.length === 0) return match;
          return `${vDecrypt}("${encryptString(raw, encryptKey)}")`;
      });
  }

  // E. Control Flow Flattening (The "VM" State Machine)
  const vState = genVar();
  
  const deadCodeBlock = getDeadCode(preset);

  const antiTamperLogic = `
    local ${vState} = 1;
    while ${vState} ~= 0 do
       if ${vState} == 1 then
          ${deadCodeBlock}
          if (getfenv and getfenv().CHECKINDEX) then ${vCrash}() end;
          ${vState} = 2;
       elseif ${vState} == 2 then
          local _db = ${vDebug}.${vGetInfo};
          if (_db(${vTask}.wait).what ~= "C") then ${vCrash}() end;
          ${vState} = 3;
       elseif ${vState} == 3 then
          ${preset === "High" ? getDeadCode("Medium") : ""} 
          ${vState} = 0;
       end
    end
  `;

  // F. Parser Bomb (High Only)
  let parserBomb = "";
  if (preset === "High" || preset == "Medium") {
     const bombDepth = 150;
     parserBomb = `local ${genVar()} = ${"{".repeat(bombDepth)} "Vexile" ${"}".repeat(bombDepth)};`;
  }

  // --- Step 3: Final Assembly (Watermark + Logic) ---
  
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
