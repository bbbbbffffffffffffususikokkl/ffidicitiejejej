// Virtual Machine
// By Vexile
export function generateVM(bytecode: any): string {
    const { code, constants, opMap } = bytecode;
    const instStr = code.map((i: any) => `{${i.op},${i.a},${i.b},${i.c}}`).join(',');
    
    const constStr = constants.map((c: any) => {
        if (typeof c === 'string') return `"${c}"`;
        return `${c}`;
    }).join(',');

    const dispatch = `
    local ops = {
        [${opMap.MOVE}] = function(i) Stk[i[2]] = Stk[i[3]] end,
        [${opMap.LOADK}] = function(i) Stk[i[2]] = Const[i[3]+1] end,
        [${opMap.GETGLOBAL}] = function(i) Stk[i[2]] = Env[Const[i[3]+1]] end,
        [${opMap.CALL}] = function(i) 
            local args = {}
            for j=1, i[3]-1 do table.insert(args, Stk[i[2]+j]) end
            local s, r = pcall(Stk[i[2]], unpack(args))
            if s then Stk[i[2]] = r end
        end,
        [${opMap.RETURN}] = function(i) return true end
    }
    `;

    return `
    local function VexileVM()
        local Inst = {${instStr}}
        local Const = {${constStr}}
        local Stk = {}
        local Env = getfenv()
        ${dispatch}
        for pc=1, #Inst do
            local i = Inst[pc]
            if ops[i[1]] then 
                local exit = ops[i[1]](i) 
                if exit then break end
            end
        end
    end
    VexileVM()
    `;
}