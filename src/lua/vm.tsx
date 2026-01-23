export function generateVM(bytecode: any): string {
    const { code, constants } = bytecode;
    const instStr = code.map((i: any) => `{${i.op},${i.a},${i.b},${i.c}}`).join(',');
    const constStr = constants.map((c: any) => {
        if (typeof c === 'string') return `[=[${c}]=]`;
        if (c === null) return "nil";
        return `${c}`;
    }).join(',');

    return `
        local Inst, Const, Stk, Env = {${instStr}}, {${constStr}}, {}, getfenv()
        local pc = 1
        local ops = {
            [0] = function(i) Stk[i[2]] = Stk[i[3]] end,
            [1] = function(i) Stk[i[2]] = Const[i[3]+1] end,
            [2] = function(i) Stk[i[2]] = Env[Const[i[3]+1]] end,
            [3] = function(i) Env[Const[i[3]+1]] = Stk[i[2]] end,
            [4] = function(i) Stk[i[2]] = Stk[i[3]][Stk[i[4]]] end,
            [5] = function(i) Stk[i[2]][Stk[i[3]]] = Stk[i[4]] end,
            [6] = function(i) 
                local A, B, C = i[2], i[3], i[4]
                local args = {}
                if B > 1 then for idx=1, B-1 do args[idx] = Stk[A+idx] end
                elseif B == 0 then for idx=A+1, #Stk do args[#args+1] = Stk[idx] end end
                local results = {pcall(Stk[A], unpack(args))}
                if results[1] then
                    if C > 1 then for idx=0, C-2 do Stk[A+idx] = results[idx+2] end
                    elseif C == 0 then for idx=2, #results do Stk[A+idx-2] = results[idx] end end
                else error(results[2]) end
            end,
            [7] = function(i) pc = #Inst + 1 end,
            [8] = function(i) Stk[i[2]] = Stk[i[3]] + Stk[i[4]] end,
            [9] = function(i) Stk[i[2]] = Stk[i[3]] - Stk[i[4]] end,
            [10] = function(i) Stk[i[2]] = Stk[i[3]] * Stk[i[4]] end,
            [11] = function(i) Stk[i[2]] = Stk[i[3]] / Stk[i[4]] end,
            [14] = function(i) Stk[i[2]] = -Stk[i[3]] end,
            [15] = function(i) Stk[i[2]] = not Stk[i[3]] end,
            [16] = function(i) Stk[i[2]] = #Stk[i[3]] end,
            [17] = function(i) Stk[i[2]] = Stk[i[3]] .. Stk[i[4]] end,
            [18] = function(i) pc = pc + i[2] end,
            [19] = function(i) if Stk[i[3]] ~= Stk[i[4]] then pc = pc + 1 end end,
            [20] = function(i) if Stk[i[3]] == Stk[i[4]] then pc = pc + 1 end end,
            [21] = function(i) if Stk[i[3]] <= Stk[i[4]] then pc = pc + 1 end end,
            [22] = function(i) Stk[i[2]] = {} end,
        }
        while pc <= #Inst do
            local i = Inst[pc]; pc = pc + 1
            local f = ops[i[1]]
            if f then f(i) end
        end
    `.trim();
}
