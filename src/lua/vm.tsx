export function generateVM(bytecode: any): string {
    const { code, constants } = bytecode;
    const instStr = code.map((i: any) => `{${i.op},${i.a},${i.b},${i.c}}`).join(',');
    const constStr = constants.map((c: any) => {
        if (typeof c === 'string' && c.startsWith('(function')) return c;
        if (typeof c === 'string') return `[=[${c}]=]`;
        if (c === null) return "nil";
        return `${c}`;
    }).join(',');

    return `
        local Inst, Const = {${instStr}}, {${constStr}}
        local Stk = {}
        local pc = 1
        local Env = getfenv(1)
        if #Inst == 0 then return end
        
        local ops = {
            [0] = function(i) Stk[i[2]] = Stk[i[3]] end,
            [1] = function(i) Stk[i[2]] = Const[i[3]+1] end,
            [2] = function(i) 
                local k = Const[i[3]+1]
                Stk[i[2]] = (type(Env) == "table" and Env[k]) or _G[k] 
            end,
            [3] = function(i) if type(Env) == "table" then Env[Const[i[3]+1]] = Stk[i[2]] end end,
            [4] = function(i) Stk[i[2]] = Stk[i[3]][Stk[i[4]]] end,
            [5] = function(i) Stk[i[2]][Stk[i[3]]] = Stk[i[4]] end,
            [6] = function(i)
    local func = Stk[i[2]]
    local args = {}
    local nrArgs = i[3] - 1
    for idx = 1, nrArgs do 
        args[idx] = Stk[i[2] + idx] 
    end
    
    local res = {pcall(func, unpack(args))}
    if res[1] then
        local nrResults = i[4] - 1
        for idx = 1, nrResults do
            Stk[i[2] + idx - 1] = res[idx + 1]
        end
    end
end,
            [7] = function(i) pc = #Inst + 1 end,
            [8] = function(i) Stk[i[2]] = Stk[i[3]] + Stk[i[4]] end,
            [9] = function(i) Stk[i[2]] = Stk[i[3]] - Stk[i[4]] end,
            [10] = function(i) Stk[i[2]] = Stk[i[3]] * Stk[i[4]] end,
            [11] = function(i) Stk[i[2]] = Stk[i[3]] / Stk[i[4]] end,
            [12] = function(i) Stk[i[2]] = Stk[i[3]] % Stk[i[4]] end,
            [13] = function(i) Stk[i[2]] = Stk[i[3]] ^ Stk[i[4]] end,
            [14] = function(i) Stk[i[2]] = -Stk[i[3]] end,
            [15] = function(i) Stk[i[2]] = not Stk[i[3]] end,
            [16] = function(i) Stk[i[2]] = #Stk[i[3]] end,
            [17] = function(i) Stk[i[2]] = Stk[i[3]] .. Stk[i[4]] end,
            [18] = function(i) pc = pc + i[2] end,
            [19] = function(i) if Stk[i[3]] ~= Stk[i[4]] then pc = pc + 1 end end,
            [22] = function(i) Stk[i[2]] = {} end,
        }
        while pc <= #Inst do
            local i = Inst[pc]; pc = pc + 1
            if not i then break end
            local f = ops[i[1]]
            if f then f(i) end
        end
    `.trim();
}