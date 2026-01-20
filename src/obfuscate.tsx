type EngineType = "LuaU" | "JavaScript (MCBE)";
export function obfuscateCode(code: string, engine: EngineType, preset: string): string {
  const isLua = engine === "LuaU";

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

  let patches = "";

  if (isLua) {
    const globalCheck = "if (getfenv and (getfenv().CHECKINDEX or getfenv().NAMECALL or getfenv().CONSTRUCT)) then while true do end end;";
    const depth = 200;
    const parserBomb = `local _antiLogger = ${"{".repeat(depth)} "Vexile" ${"}".repeat(depth)};`;
    const tableExploit = "local _v = {}; local _s = 1; _v = {_s};";

    if (preset === "High" || preset === "Medium") {
        patches = `${globalCheck} ${tableExploit} ${parserBomb} `;
    } else {
        patches = `${globalCheck} `;
    }
  }

  const headerStart = isLua ? "--[[" : "/*";
  const headerEnd = isLua ? "]]" : "*/";
  const watermark = `${headerStart} This file is protected with Vexile v1.0.0 (discord.gg/vexile) ${headerEnd}`;
  return `${watermark}\n${patches}${processedCode}`;
}