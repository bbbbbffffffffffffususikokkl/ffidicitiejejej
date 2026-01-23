export function generateVM(bytecode: any): string {
    const { code, constants, opMap } = bytecode;
    const instStr = code.map((i: any) => `{${i.op},${i.a},${i.b},${i.c}}`).join(',');
    const constStr = constants.map((c: any) => {
        if (typeof c === 'string' && c.startsWith('(function')) return c;
        if (typeof c === 'string') return `[=[${c}]=]`;
        if (c === null) return "nil";
        return `${c}`;
    }).join(',');

    return `
    local function VexileVM()
        local Inst, Const, Stk, Env = {${instStr}}, {${constStr}}, {}, getfenv()
        local pc = 1
        local ops = {
            [${opMap.MOVE}] = function(i) Stk[i[2]] = Stk[i[3]] end,
            [${opMap.LOADK}] = function(i) Stk[i[2]] = Const[i[3]+1] end,
            [${opMap.GETGLOBAL}] = function(i) Stk[i[2]] = Env[Const[i[3]+1]] end,
            [${opMap.SETGLOBAL}] = function(i) Env[Const[i[3]+1]] = Stk[i[2]] end,
            [${opMap.GETTABLE}] = function(i) Stk[i[2]] = Stk[i[3]][Stk[i[4]]] end,
            [${opMap.SETTABLE}] = function(i) Stk[i[2]][Stk[i[3]]] = Stk[i[4]] end,
            [${opMap.NEWTABLE}] = function(i) Stk[i[2]] = {} end,
            [${opMap.CALL}] = function(i) 
                local func = Stk[i[2]]
                local args = {}
                for j = 1, i[3] - 1 do
                    args[j] = Stk[i[2] + j]
                end
                local res = {func(table.unpack(args))}
                Stk[i[2]] = res[1]
            end,
            [${opMap.RETURN}] = function(i) pc = #Inst + 1 return true end,
            [${opMap.ADD}] = function(i) Stk[i[2]] = Stk[i[3]] + Stk[i[4]] end,
            [${opMap.SUB}] = function(i) Stk[i[2]] = Stk[i[3]] - Stk[i[4]] end,
            [${opMap.MUL}] = function(i) Stk[i[2]] = Stk[i[3]] * Stk[i[4]] end,
            [${opMap.DIV}] = function(i) Stk[i[2]] = Stk[i[3]] / Stk[i[4]] end,
            [${opMap.EQ}] = function(i) if Stk[i[3]] ~= Stk[i[4]] then pc = pc + 1 end end,
            [${opMap.JMP}] = function(i) pc = pc + i[2] end
        }
        while pc <= #Inst do
            local i = Inst[pc]
            pc = pc + 1
            local f = ops[i[1]]
            if f then f(i) end
        end
    end
    VexileVM()
    `.trim();
}
