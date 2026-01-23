// Virtual Machine
// By Vexile
export function generateVM(bytecode: any): string {
    const { code, constants, opMap } = bytecode;
    const instStr = code.map((i: any) => `{${i.op},${i.a},${i.b},${i.c}}`).join(',');
    
    const constStr = constants.map((c: any) => {
        if (typeof c === 'string') return `"${c.replace(/"/g, '\\"')}"`;
        if (c === null) return "nil";
        return `${c}`;
    }).join(',');

    const dispatch = `
    local ops = {
        [${opMap.MOVE}] = function(i) Stk[i[2]] = Stk[i[3]] end,
        [${opMap.LOADK}] = function(i) Stk[i[2]] = Const[i[3]+1] end,
        [${opMap.GETGLOBAL}] = function(i) Stk[i[2]] = Env[Const[i[3]+1]] end,
        [${opMap.SETGLOBAL}] = function(i) Env[Const[i[3]+1]] = Stk[i[2]] end,
        [${opMap.GETTABLE}] = function(i) Stk[i[2]] = Stk[i[3]][Stk[i[4]]] end,
        [${opMap.SETTABLE}] = function(i) Stk[i[2]][Stk[i[3]]] = Stk[i[4]] end,
        [${opMap.NEWTABLE}] = function(i) Stk[i[2]] = {} end,
        [${opMap.SETLIST}] = function(i) 
            for j=1, i[3] do Stk[i[2]][i[4] + j - 1] = Stk[i[2] + j] end 
        end,
        [${opMap.CALL}] = function(i) 
            local args = {}
            for j=1, i[3]-1 do table.insert(args, Stk[i[2]+j]) end
            local res = {pcall(Stk[i[2]], unpack(args))}
            if res[1] then
                Stk[i[2]] = res[2]
            end
        end,
        [${opMap.RETURN}] = function(i) return true, Stk[i[2]] end,
        
        [${opMap.ADD}] = function(i) Stk[i[2]] = Stk[i[3]] + Stk[i[4]] end,
        [${opMap.SUB}] = function(i) Stk[i[2]] = Stk[i[3]] - Stk[i[4]] end,
        [${opMap.MUL}] = function(i) Stk[i[2]] = Stk[i[3]] * Stk[i[4]] end,
        [${opMap.DIV}] = function(i) Stk[i[2]] = Stk[i[3]] / Stk[i[4]] end,
        [${opMap.MOD}] = function(i) Stk[i[2]] = Stk[i[3]] % Stk[i[4]] end,
        [${opMap.POW}] = function(i) Stk[i[2]] = Stk[i[3]] ^ Stk[i[4]] end,
        [${opMap.UNM}] = function(i) Stk[i[2]] = -Stk[i[3]] end,
        [${opMap.NOT}] = function(i) Stk[i[2]] = not Stk[i[3]] end,
        [${opMap.LEN}] = function(i) Stk[i[2]] = #Stk[i[3]] end,
        [${opMap.CONCAT}] = function(i) Stk[i[2]] = Stk[i[3]] .. Stk[i[4]] end,
        
        [${opMap.EQ}] = function(i) if Stk[i[3]] ~= Stk[i[4]] then pc = pc + 1 end end,
        [${opMap.LT}] = function(i) if not (Stk[i[3]] < Stk[i[4]]) then pc = pc + 1 end end,
        [${opMap.LE}] = function(i) if not (Stk[i[3]] <= Stk[i[4]]) then pc = pc + 1 end end,
        
        [${opMap.JMP}] = function(i) pc = pc + i[2] end,
        [${opMap.FORPREP}] = function(i) pc = pc + i[2] end,
        [${opMap.FORLOOP}] = function(i)
            Stk[i[2]] = Stk[i[2]] + Stk[i[2]+2]
            if (Stk[i[2]+2] > 0 and Stk[i[2]] <= Stk[i[2]+1]) or (Stk[i[2]+2] <= 0 and Stk[i[2]] >= Stk[i[2]+1]) then
                pc = pc + i[3]
                Stk[i[2]+3] = Stk[i[2]]
            end
        end
    }
    `;

    return `
    local function VexileVM()
        local Inst = {${instStr}}
        local Const = {${constStr}}
        local Stk = {}
        local Env = getfenv()
        pc = 1
        ${dispatch}
        while pc <= #Inst do
            local i = Inst[pc]
            local op = ops[i[1]]
            pc = pc + 1
            if op then
                local exit, val = op(i)
                if exit then return val end
            end
        end
    end
    return VexileVM()
    `;
}