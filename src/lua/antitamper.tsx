// antitamper.tsx
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
        local x={task.defer,task.wait,task.spawn,debug.getinfo,getfenv,setmetatable,pcall}
        local a=false;x[1](function()a=true end);x[2]()if not a then print("dtc")return error()end
        local b=false;x[7](function()b=true end)if not b then print("dtc")return error()end
        local c=x[4](x[2])if not c or c.what~="C"then print("dtc")return error()end
        local d=false;x[3](function()d=true end);x[2]()if not d then print("dtc")return error()end
        if x[5]then local e=x[5](0)if e.CHECKINDEX or e._G~=_G then print("dtc")return error()end end
        local f=x[6]({},{__index=function()return true end})if not f.test then print("dtc")return error()end
    end
    `;
}