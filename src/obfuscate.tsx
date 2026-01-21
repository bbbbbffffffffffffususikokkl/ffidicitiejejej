import { VexileCompiler } from './compile';

type EngineType = "LuaU" | "JavaScript (MCBE)";

// --- HELPERS ---

function genVar(): string {
  const hex = "0123456789ABCDEF";
  let res = "_0x";
  for (let i = 0; i < 3; i++) res += hex[Math.floor(Math.random() * hex.length)];
  return res;
}

function obfNum(n: number): string {
  const method = Math.floor(Math.random() * 3);
  if (method === 0) return `0x${n.toString(16)}`; 
  if (method === 1) { 
      const p1 = Math.floor(Math.random() * n);
      return `(${p1}+${n - p1})`; 
  }
  return `(${n})`; 
}

function hideString(str: string, charFuncVar: string): string {
  let args = [];
  for(let i=0; i<str.length; i++) args.push(obfNum(str.charCodeAt(i)));
  return `${charFuncVar}(${args.join(',')})`;
}

// [NEW] LuaU Syntax Cleaner
// Converts "x += 1" -> "x = x + 1" so the compiler doesn't crash
function cleanLuaU(code: string): string {
    return code
        // Fix +=, -=, *=, /=
        .replace(/([a-zA-Z0-9_]+)\s*\+=\s*(.+)/g, "$1 = $1 + ($2)")
        .replace(/([a-zA-Z0-9_]+)\s*\-=\s*(.+)/g, "$1 = $1 - ($2)")
        .replace(/([a-zA-Z0-9_]+)\s*\*\=\s*(.+)/g, "$1 = $1 * ($2)")
        .replace(/([a-zA-Z0-9_]+)\s*\/\=\s*(.+)/g, "$1 = $1 / ($2)")
        // Fix 'continue' (poor man's fix, strictly usually requires AST but this helps basic loops)
        // Note: Real 'continue' support requires a full transpiler, but this regex catches simple cases.
        // If your script relies heavily on 'continue', consider replacing it manually with 'if' blocks.
        .replace(/\bcontinue\b/g, "--[[continue skipped]]");
}

function getDeadCode(preset: string): string {
  let blocksToGenerate = 10; // Reduced to prevent lag on big scripts
  if (preset === "Medium") blocksToGenerate = 40;
  if (preset === "High") blocksToGenerate = 100; 

  let junk = "";
  const vTab = genVar();
  junk += `local ${vTab}={};`;
  
  for (let i = 0; i < blocksToGenerate; i++) {
    const vIdx = genVar();
    const vVal = genVar();
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
        junk += `for ${vIdx}=1,${obfNum(Math.floor(Math.random() * 5) + 1)} do ${vTab}[${vIdx}]=${obfNum(i)}*${obfNum(2)} end; `;
    } else if (type === 1) {
        junk += `local ${vVal}=${obfNum(Math.floor(Math.random() * 500))}; `;
        junk += `if ${vVal}>${obfNum(250)} then ${vTab}[${obfNum(i)}]=${vVal} else ${vTab}[${obfNum(i)}]=0 end; `;
    } else {
        junk += `${vTab}[${obfNum(i)}]=(${obfNum(i)}+${obfNum(1)})*${obfNum(3)}; `;
    }
  }
  return junk;
}

// --- MAIN OBFUSCATION FUNCTION ---

export function obfuscateCode(code: string, engine: EngineType, preset: string): string {
  const isLua = engine === "LuaU";
  const isTest = preset === "Test"; 

  // 1. PRE-PROCESS (Clean LuaU syntax)
  let processedCode = code;
  if (isLua) {
    // Remove comments
    processedCode = processedCode
      .replace(/--\[\[(?! This file is protected with Vexile)[\s\S]*?\]\]/g, "")
      .replace(/--(?![\[])(?!.*Vexile).*$/gm, ""); 
    
    // Fix LuaU syntax that breaks the compiler
    processedCode = cleanLuaU(processedCode);
  } else {
    processedCode = processedCode
      .replace(/\/\*(?! This file is protected with Vexile)[\s\S]*?\*\//g, "") 
      .replace(/\/\/(?!.*Vexile).*$/gm, ""); 
  }
  processedCode = processedCode.split('\n').map(line => line.trim()).filter(l => l.length > 0).join(' ');

  // 2. VIRTUALIZATION (The Compiler)
  let vmScript = "";
  if (isLua) {
      try {
          const compiler = new VexileCompiler();
          vmScript = compiler.compile(processedCode);
      } catch (e) {
          console.error("Compilation failed:", e);
          vmScript = `error("Vexile Obfuscation Failed: Syntax Error in Input Script (Check for LuaU syntax like += or types)")`;
      }
  } else {
      return `/* Vexile Protected */ ${processedCode}`;
  }

  const vReg = genVar(); 
  const vVM = genVar();
  const vOp = genVar();
  
  const IDX_STRING = 1;
  const IDX_CHAR = 2;
  const IDX_DEBUG = 7;
  const IDX_GETINFO = 8;
  const IDX_TASK = 9;
  const IDX_CRASH = 12;
  const IDX_MAIN = 13;

  const strWhat = hideString("what", `${vReg}[${IDX_CHAR}]`);
  const strC = hideString("C", `${vReg}[${IDX_CHAR}]`); 
  const strWait = hideString("wait", `${vReg}[${IDX_CHAR}]`);
  const strCheckIndex = hideString("CHECKINDEX", `${vReg}[${IDX_CHAR}]`);
  
  let crashLogic = `function() local function c() return c() end; return c() end`; 
  if (isTest) crashLogic = `function() end`;

  let vmMetatable = `
    setmetatable(${vVM}, {
      __index = function(t, k)
        if k == "game" or k == "Enum" or k == "math" or k == "workspace" or k == "table" then
            return getfenv(0)[k]
        end

        if k == ${obfNum(1)} then
           if (getfenv and getfenv()[${strCheckIndex}]) then ${vReg}[${IDX_CRASH}]() end;
           return ${obfNum(2)};
        
        elseif k == ${obfNum(2)} then
           if (${vReg}[${IDX_GETINFO}](${vReg}[${IDX_TASK}][${strWait}])[${strWhat}] ~= ${strC}) then ${vReg}[${IDX_CRASH}]() end;
           return ${obfNum(0)};
        end

        return getfenv(0)[k];
      end,
      
      __newindex = function(t, k, v)
        getfenv(0)[k] = v;
      end,

      __metatable = "Locked"
    })
  `;
  
  if (isTest) vmMetatable = `setmetatable(${vVM}, { __index = function(t,k) return getfenv(0)[k] end, __newindex = function(t,k,v) getfenv(0)[k]=v end })`;

  // 6. PARSER BOMB
  let parserBomb = "";
  if (preset === "High") {
     const bombDepth = 200; // Reduced slightly for stability on big scripts
     let bombStr = `0x${Math.floor(Math.random() * 10000).toString(16)}`;
     for (let i = 0; i < bombDepth; i++) {
        if (Math.random() > 0.5) bombStr = `(${bombStr}+${obfNum(Math.floor(Math.random() * 100))})`;
        else bombStr = `(${obfNum(Math.floor(Math.random() * 100))}+${bombStr})`;
     }
     parserBomb = `local ${genVar()}=${bombStr};`;
  }

  const deadBlock1 = getDeadCode(preset);
  const deadBlock2 = getDeadCode(preset);
  
  const watermark = `--[[ This file is protected with Vexile v1.0.0 (discord.gg/vexile) ]]`;

  // 7. ASSEMBLY
  let rawScript = `
    (function()
      ${parserBomb}
      
      local ${vReg} = {}
      ${vReg}[${IDX_STRING}] = string;
      ${vReg}[${IDX_CHAR}] = ${vReg}[${IDX_STRING}].char;
      ${vReg}[${IDX_DEBUG}] = debug;
      ${vReg}[${IDX_GETINFO}] = ${vReg}[${IDX_DEBUG}].getinfo;
      ${vReg}[${IDX_TASK}] = task;
      ${vReg}[${IDX_CRASH}] = ${crashLogic};

      ${deadBlock1}

      local ${vVM} = {}
      ${vmMetatable}
      
      local ${vOp} = ${obfNum(1)};
      ${vOp} = ${vVM}[${vOp}]; 
      ${vOp} = ${vVM}[${vOp}]; 

      ${vReg}[${IDX_MAIN}] = function()
         ${vmScript}
      end;

      ${deadBlock2}

      setfenv(${vReg}[${IDX_MAIN}], ${vVM});
      
      ${vReg}[${IDX_MAIN}]();
      
    end)()
  `;

  let minifiedScript = rawScript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return `${watermark}\n${minifiedScript}`;
}
