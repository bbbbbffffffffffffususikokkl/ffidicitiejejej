import luaparse from 'luaparse';

// Base Opcode List (Logic only, values are randomized at runtime)
type OpcodeType = 
  'MOVE' | 'LOADCONST' | 'GETGLOBAL' | 'SETGLOBAL' | 'GETTABLE' | 'SETTABLE' | 
  'CALL' | 'RETURN' | 'JMP' | 'JMP_FALSE' | 'NEWTABLE' | 'CLOSURE' |
  'ADD' | 'SUB' | 'MUL' | 'DIV' | 'MOD' | 'POW' | 'CONCAT' | 
  'EQ' | 'LT' | 'LE' | 'NOT' | 'LEN' | 'EXIT';

const BASE_OPS: OpcodeType[] = [
  'MOVE', 'LOADCONST', 'GETGLOBAL', 'SETGLOBAL', 'GETTABLE', 'SETTABLE',
  'CALL', 'RETURN', 'JMP', 'JMP_FALSE', 'NEWTABLE', 'CLOSURE',
  'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'POW', 'CONCAT',
  'EQ', 'LT', 'LE', 'NOT', 'LEN', 'EXIT'
];

interface CompileOptions {
    varNames: {
        bytecode: string; stack: string; ip: string; env: string; 
        null: string; k: string; ops: string;
    };
}

export class VexileCompiler {
    private instructions: number[] = [];
    private constants: any[] = [];
    private opMapping: Record<OpcodeType, number>; // Dynamic Opcode Map

    constructor() {
        // [POLYMORPHIC] Randomize Opcode Values (0-255)
        this.opMapping = {} as any;
        const available = Array.from({length: 256}, (_, i) => i);
        
        // Shuffle available numbers
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }

        // Assign random ID to each Opcode
        BASE_OPS.forEach((op, i) => {
            this.opMapping[op] = available[i];
        });
    }

    private addConstant(val: string | number): number {
        const existing = this.constants.indexOf(val);
        if (existing !== -1) return existing;
        this.constants.push(val);
        return this.constants.length - 1;
    }

    // Emits 16-bit Integer (High Byte, Low Byte)
    private emit16(num: number) {
        this.instructions.push((num >> 8) & 0xFF); 
        this.instructions.push(num & 0xFF);        
    }

    private emit(op: OpcodeType) {
        this.instructions.push(this.opMapping[op]);
    }

    public compile(sourceCode: string, options: CompileOptions): string {
        this.instructions = [];
        this.constants = [];

        // Parse AST
        const ast = luaparse.parse(sourceCode);

        if (ast.type === 'Chunk') {
            ast.body.forEach(s => this.compileStatement(s));
        }
        this.emit('EXIT');

        // 1. Generate Bytecode Table
        const bytecodeTable = `{${this.instructions.join(',')}}`;

        // 2. Encrypt Constants (Metamorphic String Encryption)
        let constTableLua = `local ${options.varNames.k} = {}\n`;
        this.constants.forEach((c, i) => {
            if (typeof c === 'string') {
                // Safe Char Code generation to ensure compatibility
                const safeChars = c.split('').map(x => x.charCodeAt(0)).join(',');
                constTableLua += `${options.varNames.k}[${i + 1}] = string.char(${safeChars});\n`;
            } else {
                constTableLua += `${options.varNames.k}[${i + 1}] = ${c};\n`;
            }
        });

        return this.generateVM(bytecodeTable, constTableLua, options.varNames);
    }

    private compileStatement(node: any) {
        if (!node) return;

        switch (node.type) {
            case 'CallStatement':
                this.compileExpression(node.expression);
                break;
            
            case 'LocalStatement':
            case 'AssignmentStatement':
                // RHS (Values)
                node.init.forEach((expr: any) => this.compileExpression(expr));
                // LHS (Variables) - Reverse order assignment
                for (let i = node.variables.length - 1; i >= 0; i--) {
                    const variable = node.variables[i];
                    if (variable.type === 'Identifier') {
                        const idx = this.addConstant(variable.name);
                        this.emit('SETGLOBAL');
                        this.emit16(idx + 1);
                    } 
                    else if (variable.type === 'MemberExpression') {
                        this.compileExpression(variable.base); // Obj
                        if (variable.indexer === '.') {
                            const idx = this.addConstant(variable.identifier.name);
                            this.emit('LOADCONST'); this.emit16(idx + 1);
                        } else {
                            this.compileExpression(variable.identifier); // Key
                        }
                        this.emit('SETTABLE');
                    }
                }
                break;

            case 'IfStatement':
                node.clauses.forEach((clause: any) => {
                    this.compileExpression(clause.condition);
                    this.emit('JMP_FALSE');
                    const jmpIdx = this.instructions.length; 
                    this.emit16(0); 

                    clause.body.forEach((s: any) => this.compileStatement(s));
                    
                    // Patch Jump False
                    const endBlock = this.instructions.length;
                    const offset = endBlock - (jmpIdx + 2);
                    this.instructions[jmpIdx] = (offset >> 8) & 0xFF;
                    this.instructions[jmpIdx+1] = offset & 0xFF;
                });
                break;

            case 'WhileStatement':
                const loopStart = this.instructions.length;
                this.compileExpression(node.condition);
                this.emit('JMP_FALSE');
                const breakJump = this.instructions.length;
                this.emit16(0); 

                node.body.forEach((s: any) => this.compileStatement(s));
                
                this.emit('JMP');
                // Calculate back jump (negative offset)
                // Note: Simplified relative jump logic for this example
                const backOffset = 65536 - ((this.instructions.length + 2) - loopStart);
                this.emit16(backOffset);

                // Patch break
                const loopEnd = this.instructions.length;
                const breakOffset = loopEnd - (breakJump + 2);
                this.instructions[breakJump] = (breakOffset >> 8) & 0xFF;
                this.instructions[breakJump+1] = breakOffset & 0xFF;
                break;

            case 'ReturnStatement':
                node.arguments.forEach((arg: any) => this.compileExpression(arg));
                this.emit('RETURN');
                this.emit16(node.arguments.length);
                break;
        }
    }

    private compileExpression(node: any) {
        if (!node) return;

        switch (node.type) {
            case 'StringLiteral':
                const sIdx = this.addConstant(node.raw.replace(/^["']|["']$/g, ""));
                this.emit('LOADCONST'); this.emit16(sIdx + 1);
                break;
            case 'NumericLiteral':
                const nIdx = this.addConstant(node.value);
                this.emit('LOADCONST'); this.emit16(nIdx + 1);
                break;
            case 'Identifier':
                const iIdx = this.addConstant(node.name);
                this.emit('GETGLOBAL'); this.emit16(iIdx + 1);
                break;
            case 'BinaryExpression':
            case 'LogicalExpression':
                this.compileExpression(node.left);
                this.compileExpression(node.right);
                const map: Record<string, OpcodeType> = {
                    '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', '%': 'MOD', '^': 'POW', '..': 'CONCAT',
                    '==': 'EQ', '<': 'LT', '<=': 'LE', '>': 'LT', '>=': 'LE', 
                    'and': 'AND', 'or': 'OR'
                };
                if (map[node.operator]) this.emit(map[node.operator]);
                break;
            case 'CallExpression':
                // Safe Method Call Logic
                if (node.identifier) { 
                    this.compileExpression(node.base);
                    const mIdx = this.addConstant(node.identifier.name);
                    this.emit('LOADCONST'); this.emit16(mIdx + 1); // Push key
                    this.emit('GETTABLE'); // Get Func
                    
                    this.compileExpression(node.base); // Push Self
                    node.arguments.forEach((arg: any) => this.compileExpression(arg));
                    this.emit('CALL'); this.emit16(node.arguments.length + 1);
                } else { 
                    this.compileExpression(node.base);
                    node.arguments.forEach((arg: any) => this.compileExpression(arg));
                    this.emit('CALL'); this.emit16(node.arguments.length);
                }
                break;
            case 'MemberExpression':
                this.compileExpression(node.base);
                if (node.indexer === '.') {
                    const idx = this.addConstant(node.identifier.name);
                    this.emit('LOADCONST'); this.emit16(idx + 1);
                } else {
                    this.compileExpression(node.identifier);
                }
                this.emit('GETTABLE');
                break;
            case 'TableConstructorExpression':
                this.emit('NEWTABLE');
                break;
        }
    }

    private generateVM(bytecodeTable: string, constTable: string, v: any): string {
        const ops = this.opMapping;
        
        // [POLYMORPHIC] Dispatch Table Generator
        // This generates a unique table of functions based on the randomized opcodes
        const dispatchLogic = `
            ${v.ops} = {
                [${ops.MOVE}] = function() end, -- Placeholder
                [${ops.LOADCONST}] = function() 
                    local kIdx = readInt16()
                    local val = ${v.k}[kIdx]
                    if val == nil then val = ${v.null} end
                    table.insert(${v.stack}, val)
                end,
                [${ops.GETGLOBAL}] = function() 
                    local kIdx = readInt16()
                    local val = ${v.env}[${v.k}[kIdx]]
                    if val == nil then val = ${v.null} end
                    table.insert(${v.stack}, val)
                end,
                [${ops.SETGLOBAL}] = function()
                    local kIdx = readInt16()
                    local val = table.remove(${v.stack})
                    if val == ${v.null} then val = nil end
                    ${v.env}[${v.k}[kIdx]] = val
                end,
                [${ops.GETTABLE}] = function()
                    local key = table.remove(${v.stack})
                    local obj = table.remove(${v.stack})
                    if key == ${v.null} then key = nil end
                    if obj == ${v.null} then obj = nil end
                    local val = nil
                    if obj and key ~= nil then val = obj[key] end
                    if val == nil then val = ${v.null} end
                    table.insert(${v.stack}, val)
                end,
                [${ops.SETTABLE}] = function()
                    local val = table.remove(${v.stack})
                    local key = table.remove(${v.stack})
                    local obj = table.remove(${v.stack})
                    if val == ${v.null} then val = nil end
                    if key == ${v.null} then key = nil end
                    if obj and obj ~= ${v.null} and key ~= nil then obj[key] = val end
                end,
                [${ops.CALL}] = function()
                    local argCount = readInt16()
                    local args = {}
                    for i = argCount, 1, -1 do 
                        local val = table.remove(${v.stack})
                        if val == ${v.null} then val = nil end
                        args[i] = val
                    end
                    local func = table.remove(${v.stack})
                    if func == ${v.null} then func = nil end
                    
                    if func then
                        local s, res = pcall(func, unpack(args, 1, argCount))
                        if s then
                            if res == nil then res = ${v.null} end
                            table.insert(${v.stack}, res)
                        else
                            table.insert(${v.stack}, ${v.null})
                        end
                    else
                        table.insert(${v.stack}, ${v.null})
                    end
                end,
                [${ops.JMP}] = function()
                    local offset = readInt16()
                    if offset > 32767 then offset = offset - 65536 end
                    ${v.ip} = ${v.ip} + offset
                end,
                [${ops.JMP_FALSE}] = function()
                    local offset = readInt16()
                    if offset > 32767 then offset = offset - 65536 end
                    local cond = table.remove(${v.stack})
                    if cond == ${v.null} or cond == false or cond == nil then
                        ${v.ip} = ${v.ip} + offset
                    end
                end,
                [${ops.ADD}] = function() local b=table.remove(${v.stack}); local a=table.remove(${v.stack}); table.insert(${v.stack}, (tonumber(a)or 0)+(tonumber(b)or 0)) end,
                [${ops.SUB}] = function() local b=table.remove(${v.stack}); local a=table.remove(${v.stack}); table.insert(${v.stack}, (tonumber(a)or 0)-(tonumber(b)or 0)) end,
                [${ops.MUL}] = function() local b=table.remove(${v.stack}); local a=table.remove(${v.stack}); table.insert(${v.stack}, (tonumber(a)or 0)*(tonumber(b)or 0)) end,
                [${ops.DIV}] = function() local b=table.remove(${v.stack}); local a=table.remove(${v.stack}); table.insert(${v.stack}, (tonumber(a)or 0)/(tonumber(b)or 1)) end,
                [${ops.CONCAT}] = function() local b=table.remove(${v.stack}); local a=table.remove(${v.stack}); 
                    if a==${v.null} then a="nil" end; if b==${v.null} then b="nil" end;
                    table.insert(${v.stack}, tostring(a)..tostring(b)) 
                end,
                [${ops.EXIT}] = function() ${v.ip} = #${v.bytecode} + 1 end,
                [${ops.NEWTABLE}] = function() table.insert(${v.stack}, {}) end
            }
        `;

        return `
            ${constTable}
            local ${v.bytecode} = ${bytecodeTable}
            local ${v.ip} = 1
            local ${v.stack} = {}
            local ${v.env} = getfenv()
            local ${v.null} = {} 
            local ${v.ops} = nil

            local function readInt16()
                local h = ${v.bytecode}[${v.ip}]; ${v.ip} = ${v.ip} + 1
                local l = ${v.bytecode}[${v.ip}]; ${v.ip} = ${v.ip} + 1
                return (h * 256) + l
            end

            ${dispatchLogic}

            while ${v.ip} <= #${v.bytecode} do
                local opVal = ${v.bytecode}[${v.ip}]
                ${v.ip} = ${v.ip} + 1
                
                if ${v.ops}[opVal] then
                    ${v.ops}[opVal]()
                end
            end
        `;
    }
}
