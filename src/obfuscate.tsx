type EngineType = "LuaU" | "JavaScript (MCBE)";

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

function getDeadCode(preset: string): string {
  let intensity = 50;
  if (preset === "Medium") intensity = 100;
  if (preset === "High") intensity = 200;

  let junk = "";
  
  const vTab = genVar();
  const vIdx = genVar();
  const vVal = genVar();
  
  junk += `local ${vTab}={};`;
  
  junk += `for ${vIdx}=${obfNum(1)},${obfNum(intensity)} do `;
  
  junk += `local ${vVal}=${obfNum(Math.floor(Math.random() * 1000))};`;
  
  junk += `if ${vIdx}%${obfNum(2)}==${obfNum(0)} then `;
  junk += `${vTab}[${vIdx}]=${vVal}*${obfNum(2)};`;
  junk += `else `;
  junk += `${vTab}[${vIdx}]=${vVal}+${obfNum(1)};`;
  junk += `end;`;
  
  junk += `end;`;
  
  return junk;
}

function encryptString(str: string, key: number): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const encryptedByte = (charCode + key + (i + 1)) % 256;
    result += "\\" + encryptedByte;
  }
  return result;
}

export function obfuscateCode(code: string, engine: EngineType, preset: string): string {
  const isLua = engine === "LuaU";
  const isTest = preset === "Test"; 

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

  if (!isLua) return `/* This file is protected with Vexile 1.0.0 */ ${processedCode}`;

  const vReg = genVar(); 
  const IDX_STRING = 1;
  const IDX_CHAR = 2;
  const IDX_BYTE = 3;
  const IDX_TABLE = 4;
  const IDX_INSERT = 5;
  const IDX_CONCAT = 6;
  const IDX_DEBUG = 7;
  const IDX_GETINFO = 8;
  const IDX_TASK = 9;
  const IDX_CONSTANTS = 10; 
  const IDX_DECRYPT = 11;
  const IDX_CRASH = 12;

  let encryptKey = Math.floor(Math.random() * 50) + 1; 
  if (preset === "Medium") encryptKey = Math.floor(Math.random() * 150) + 50; 
  if (preset === "High")   encryptKey = Math.floor(Math.random() * 200) + 55; 

  const kKey = obfNum(encryptKey);
  const k256 = obfNum(256);
  
  let constantsList: string[] = [];
  
  const decryptLogic = `
    function(s)
      local r={}
      for i=1,#s do
        local b=${vReg}[${IDX_BYTE}](s,i)
        ${vReg}[${IDX_INSERT}](r,${vReg}[${IDX_CHAR}]((b-i-${kKey})%${k256}))
      end
      return ${vReg}[${IDX_CONCAT}](r)
    end
  `.replace(/\n/g, ' ').trim();

  if (!isTest) {
    processedCode = processedCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1, p2) => {
        const raw = p1 || p2 || "";
        if (raw.length === 0) return match;
        
        const encrypted = encryptString(raw, encryptKey);
        constantsList.push(encrypted);
        const idx = constantsList.length; 
        
        return `${vReg}[${IDX_DECRYPT}](${vReg}[${IDX_CONSTANTS}][${idx}])`;
    });
  }

  const constantsTableStr = "{" + constantsList.map(s => `"${s}"`).join(',') + "}";

  const vVM = genVar();
  const vOp = genVar();
  
  const strWhat = hideString("what", `${vReg}[${IDX_CHAR}]`);
  const strC = hideString("C", `${vReg}[${IDX_CHAR}]`); 
  const strWait = hideString("wait", `${vReg}[${IDX_CHAR}]`);
  const strCheckIndex = hideString("CHECKINDEX", `${vReg}[${IDX_CHAR}]`);

  let crashLogic = `function() local function c() return c() end; return c() end`;
  if (isTest) crashLogic = `function() end`;

  let vmMetatable = `
    setmetatable(${vVM}, {
      __index = function(t, k)
        if k == ${obfNum(1)} then
           if (getfenv and getfenv()[${strCheckIndex}]) then ${vReg}[${IDX_CRASH}]() end;
           return ${obfNum(2)};
        elseif k == ${obfNum(2)} then
           if (${vReg}[${IDX_GETINFO}](${vReg}[${IDX_TASK}][${strWait}])[${strWhat}] ~= ${strC}) then ${vReg}[${IDX_CRASH}]() end;
           return ${obfNum(0)};
        end
        return ${obfNum(0)};
      end
    })
  `;
  if (isTest) vmMetatable = `setmetatable(${vVM}, { __index = function() return 0 end })`;

  const deadBlock1 = getDeadCode(preset);
  const deadBlock2 = getDeadCode(preset);
  const deadBlock3 = getDeadCode(preset);
  
  let parserBomb = "";
  if (preset === "High") {
     const bombDepth = 200; 
     const val = `0x${Math.floor(Math.random()*10000).toString(16)}`; 
     parserBomb = `local ${genVar()} = ${"{".repeat(bombDepth)}${val}${"}".repeat(bombDepth)};`;
  }

  const headerStart = isLua ? "--[[" : "/*";
  const headerEnd = isLua ? "]]" : "*/";
  const watermark = `${headerStart} This file is protected with Vexile v1.0.0 (discord.gg/vexile) ${headerEnd}`;

  let rawScript = `
    (function()
      ${parserBomb}
      
      local ${vReg} = {}
      ${vReg}[${IDX_STRING}] = string;
      ${vReg}[${IDX_CHAR}] = ${vReg}[${IDX_STRING}].char;
      ${vReg}[${IDX_BYTE}] = ${vReg}[${IDX_STRING}].byte;
      ${vReg}[${IDX_TABLE}] = table;
      ${vReg}[${IDX_INSERT}] = ${vReg}[${IDX_TABLE}].insert;
      ${vReg}[${IDX_CONCAT}] = ${vReg}[${IDX_TABLE}].concat;
      ${vReg}[${IDX_DEBUG}] = debug;
      ${vReg}[${IDX_GETINFO}] = ${vReg}[${IDX_DEBUG}].getinfo;
      ${vReg}[${IDX_TASK}] = task;
      ${vReg}[${IDX_CRASH}] = ${crashLogic};
      ${vReg}[${IDX_DECRYPT}] = ${decryptLogic};
      
      ${vReg}[${IDX_CONSTANTS}] = ${constantsTableStr};

      ${deadBlock1}

      local ${vVM} = {}
      ${vmMetatable}
      
      local ${vOp} = ${obfNum(1)};
      ${vOp} = ${vVM}[${vOp}]; 
      ${vOp} = ${vVM}[${vOp}]; 

      ${deadBlock2}

      ${processedCode};
      
      ${deadBlock3}
    end)()
  `;

  let minifiedScript = rawScript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return `${watermark}\n${minifiedScript}`;
}
