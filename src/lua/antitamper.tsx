export function genVar(len: number = 8): string {
    const hex = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let res = "";
    for (let i = 0; i < len; i++) res += hex[Math.floor(Math.random() * hex.length)];
    return res;
}

export function obfNum(n: number): string {
    const type = Math.floor(Math.random() * 2);
    if (type === 0) return `0x${n.toString(16)}`; 
    const p1 = Math.floor(Math.random() * n);
    return `(${p1}+${n - p1})`; 
}

export function getParserBomb(preset: string): string {
    if (preset !== "High" && preset !== "Medium") return "";
    let bomb = `0x${Math.floor(Math.random()*1000).toString(16)}`;
    for(let i=0; i<200; i++) bomb = `(${bomb}+${obfNum(1)})`;
    return `local ${genVar()} = ${bomb};`;
}

export function getAntiTamper(vmName: string, regName: string): string {
    return `
    do
        local t = task or {
            defer = function(f) f() end,
            wait = function() end,
            spawn = function(f) f() end
        }
        
        local x={t.defer, t.wait, t.spawn, debug.getinfo, getfenv, setmetatable, pcall}
        
        if task then
            local a=false;x[1](function()a=true end);x[2]()
            if not a then print("dtc: timing") return error() end
        end
        
        if x[4] then
            local c=x[4](x[7])
            if not c or c.what~="C" then print("dtc: native hook") return error() end
        end
        
        print("Passed")
    end
    `;
}