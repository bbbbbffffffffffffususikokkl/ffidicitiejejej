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

    const bombDepth = preset === "High" ? 300 : 200; 
    const bombVar = genVar(8);
    let bombStr = `0x${Math.floor(Math.random() * 10000).toString(16)}`;

    for (let i = 0; i < bombDepth; i++) {
        const randVal = Math.floor(Math.random() * 100);
        
        if (Math.random() > 0.5) {
            bombStr = `(${bombStr} + ${obfNum(randVal)})`;
        } else {
            bombStr = `(${obfNum(randVal)} + ${bombStr})`;
        }
    }
    return `local ${bombVar} = ${bombStr};`;
}

export function getAntiTamper(vmName: string, regName: string, preset: string): string {
    const logic = `
    do
        local ok, no = false, false
        pcall(error)
        ok = true
        task.defer(function() no = true end)
        task.wait()
        if not (ok and no) then error("Tamper Detected!") end

        local ginfo = debug.getinfo
        local getf = getfenv
        local smeta = setmetatable

        local info = ginfo(t_wait)
        if not info or info.what ~= "C" then
            return error("Tamper Detected!")
        end

        local env = getf(0)
        if env.CHECKINDEX or env._G ~= _G then 
            return error("Tamper Detected!") 
        end

        local test_tbl = smeta({}, {
            __index = function() return true end
        })
        if not test_tbl.v_check_integrity then 
            return error("Tamper Detected!") 
        end

        if _G == nil or type(_G) ~= "table" then
            return error("Tamper Detected!")
        end
    end
    `;

    return logic;
}