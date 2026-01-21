import { VexileCompiler } from './compile';

type EngineType = "LuaU" | "JavaScript (MCBE)";

// --- HELPERS (Keep these exactly as they were) ---

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

// Dead code generator (Updated loop version)
function getDeadCode(preset: string): string {
  let blocksToGenerate = 20; 
  if (preset === "Medium") blocksToGenerate = 100;
  if (preset === "High") blocksToGenerate = 300; 

  let junk = "";
  const vTab = genVar();
  junk += `local ${vTab}={};`;
  
  for (let i = 0; i < blocksToGenerate; i++) {
    const vIdx = genVar();
    const vVal = genVar();
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
        junk += `for ${vIdx}=1,${obfNum(Math.floor(Math.random() * 10) + 1)} do ${vTab}[${vIdx}]=${obfNum(i)}*${obfNum(2)} end; `;
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

  // 1. CLEANUP
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
  processedCode = processedCode.split('\n').map(line => line.trim()).filter(l => l.length > 0).join(' ');

  // 2. VIRTUALIZATION (The Compiler)
  // We compile the user code into a VM script.
  let vmScript = "";
  if (isLua) {
      try {
          const compiler = new VexileCompiler();
          vmScript = compiler.compile(processedCode);
      } catch (e) {
          console.error("Compilation failed, using raw fallback", e);
          vmScript = processedCode;
      }
  } else {
      return `/* Vexile Protected */ ${processedCode}`;
  }

  // 3. GENERATE WRAPPER VARIABLES
  const vReg = genVar(); 
  const vVM = genVar();
  const vOp = genVar();
  
  // Indices for our local wrapper table (Anti-Constant Collection logic)
  const IDX_STRING = 1;
  const IDX_CHAR = 2;
  const IDX_DEBUG = 7;
  const IDX_GETINFO = 8;
  const IDX_TASK = 9;
  const IDX_CRASH = 12;
  const IDX_MAIN = 13; // The VM function

  // 4. ANTI-TAMPER STRINGS (Encrypted)
  // We need these strings to perform the checks ("what", "C", etc.)
  // We hide them using character code generation so they aren't plain text.
  const strWhat = hideString("what", `${vReg}[${IDX_CHAR}]`);
  const strC = hideString("C", `${vReg}[${IDX_CHAR}]`); 
  const strWait = hideString("wait", `${vReg}[${IDX_CHAR}]`);
  const strCheckIndex = hideString("CHECKINDEX", `${vReg}[${IDX_CHAR}]`);
  
  // 5. CRASH LOGIC
  let crashLogic = `function() while true do end end`; 
  if (isTest) crashLogic = `function() end`;

  // 6. ANTI-TAMPER METATABLE (Prometheus Style)
  // This wraps the environment. When the VM tries to call 'print' or 'game',
  // it goes through this __index function first.
  let vmMetatable = `
    setmetatable(${vVM}, {
      __index = function(t, k)
        -- [Anti-Tamper 1] Check if someone tried to hook/replace the environment
        if k == ${obfNum(1)} then
           if (getfenv and getfenv()[${strCheckIndex}]) then ${vReg}[${IDX_CRASH}]() end;
           return ${obfNum(2)};
        
        -- [Anti-Tamper 2] Anti-Hook (Task Wait Check)
        -- Checks if critical functions are C closures (native) and not Lua hooks
        elseif k == ${obfNum(2)} then
           if (${vReg}[${IDX_GETINFO}](${vReg}[${IDX_TASK}][${strWait}])[${strWhat}] ~= ${strC}) then ${vReg}[${IDX_CRASH}]() end;
           return ${obfNum(0)};
        end

        -- [Passthrough] If safe, give the VM the real global it asked for
        return getfenv(0)[k];
      end,
      
      __newindex = function(t, k, v)
        getfenv(0)[k] = v;
      end,
      
      -- [Anti-Tamper 3] Lock the metatable so they can't inspect it
      __metatable = "Locked"
    })
  `;
  
  if (isTest) vmMetatable = `setmetatable(${vVM}, { __index = function(t,k) return getfenv(0)[k] end, __newindex = function(t,k,v) getfenv(0)[k]=v end })`;

  // 7. PARSER BOMB (Math Stack Overflow)
  let parserBomb = "";
  if (preset === "High") {
     const bombDepth = 300; 
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

  // 8. FINAL ASSEMBLY
  let rawScript = `
    (function()
      ${parserBomb}
      
      -- [Setup Wrapper Variables]
      local ${vReg} = {}
      ${vReg}[${IDX_STRING}] = string;
      ${vReg}[${IDX_CHAR}] = ${vReg}[${IDX_STRING}].char;
      ${vReg}[${IDX_DEBUG}] = debug;
      ${vReg}[${IDX_GETINFO}] = ${vReg}[${IDX_DEBUG}].getinfo;
      ${vReg}[${IDX_TASK}] = task;
      ${vReg}[${IDX_CRASH}] = ${crashLogic};

      ${deadBlock1}

      -- [Setup Security Environment]
      local ${vVM} = {}
      ${vmMetatable}
      
      -- [Trigger Security Check 1 Time]
      local ${vOp} = ${obfNum(1)};
      ${vOp} = ${vVM}[${vOp}]; 
      ${vOp} = ${vVM}[${vOp}]; 

      -- [The Payload: Virtualized Code]
      -- We wrap the VM script in a function so we can apply the environment to it
      ${vReg}[${IDX_MAIN}] = function()
         ${vmScript}
      end;

      ${deadBlock2}

      -- [Apply Protection]
      -- The VM will now run INSIDE our trap
      setfenv(${vReg}[${IDX_MAIN}], ${vVM});
      
      -- [Execute]
      ${vReg}[${IDX_MAIN}]();
      
    end)()
  `;

  let minifiedScript = rawScript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return `${watermark}\n${minifiedScript}`;
}