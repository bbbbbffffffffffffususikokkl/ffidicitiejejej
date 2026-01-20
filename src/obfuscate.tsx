// src/obfuscate.ts

type EngineType = "LuaU" | "JavaScript (MCBE)";

// Helper to generate random variable names
function genVar(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "_";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Encryption Helper: Rotates byte values to hide text
function encryptString(str: string, key: number): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    // Algorithm: (Char + Key + Index) % 256
    const encryptedByte = (charCode + key + i) % 256;
    // Format as decimal escape sequence for Lua (e.g. \123)
    result += "\\" + encryptedByte;
  }
  return result;
}

export function obfuscateCode(code: string, engine: EngineType, preset: string): string {
  const isLua = engine === "LuaU";

  // 1. Minification (Remove comments & whitespace)
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
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ');

  // 2. Patches, Anti-Tamper & Encryption
  let patches = "";

  if (isLua) {
    // A. Anti-HookOp (Global Check)
    const globalCheck = "if (getfenv and (getfenv().CHECKINDEX or getfenv().NAMECALL or getfenv().CONSTRUCT)) then while true do end end;";
    
    // B. Parser Bomb (Stack Overflow)
    const depth = 200;
    const parserBomb = `local _antiLogger = ${"{".repeat(depth)} "Vexile" ${"}".repeat(depth)};`;
    
    // C. Table Exploit
    const tableExploit = "local _v = {}; local _s = 1; _v = {_s};";

    // D. Anti-Tamper (Using "Normal" Variable Names)
    const antiTamper = `
      local debug = debug;
      local getinfo = debug.getinfo;
      local string = string;
      local byte = string.byte;
      local task = task;
      local spawn = task.spawn;
      local char = string.char(67);
      local clock = os.clock();
      if getinfo(getinfo).what ~= char or getinfo(spawn).what ~= char then while true do end end
      if (os.clock() - clock) > 10 then while true do end end
    `.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    // E. String Encryption (High/Medium Only)
    // We disable this on "Fast" because decrypting massive scripts at runtime can slow down startup.
    let stringEncryptionBlock = "";
    if (preset === "High" || preset === "Medium") {
        const decryptFunc = genVar();
        const encryptKey = Math.floor(Math.random() * 100) + 1; // Random key 1-100
        
        // 1. Inject the Decryptor Function
        // Reverses the logic: (Byte - Index - Key) % 256
        stringEncryptionBlock = `
          local function ${decryptFunc}(s)
            local r = {}
            for i = 1, #s do
              local b = string.byte(s, i)
              table.insert(r, string.char((b - i - ${encryptKey}) % 256))
            end
            return table.concat(r)
          end
        `.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

        // 2. Replace Strings in User Code
        // Regex matches double ("...") and single ('...') quotes, respecting escapes (\")
        processedCode = processedCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1, p2) => {
            const rawContent = p1 || p2 || ""; // Get the content inside quotes
            if (rawContent.length === 0) return match; // Skip empty strings
            
            const encrypted = encryptString(rawContent, encryptKey);
            return `${decryptFunc}("${encrypted}")`;
        });
    }

    // Combine Patches
    if (preset === "High" || preset === "Medium") {
        // Full Security: Global Check + Table Exploit + Parser Bomb + Anti-Tamper + Encryption
        patches = `${globalCheck} ${tableExploit} ${parserBomb} ${antiTamper} ${stringEncryptionBlock} `;
    } else {
        // Fast: Global Check + Anti-Tamper (No Parser Bomb, No Encryption for speed)
        patches = `${globalCheck} ${antiTamper} `;
    }
  }

  // 3. Watermark
  const headerStart = isLua ? "--[[" : "/*";
  const headerEnd = isLua ? "]]" : "*/";
  const watermark = `${headerStart} This file is protected with Vexile v1.0.0 (discord.gg/vexile) ${headerEnd}`;

  return `${watermark}\n${patches}${processedCode}`;
}
