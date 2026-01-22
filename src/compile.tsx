import luaparse from 'luaparse';

enum Opcode {
  OP_MOVE = 0, OP_LOADCONST = 1, OP_GETGLOBAL = 2, OP_SETGLOBAL = 3,
  OP_GETTABLE = 4, OP_SETTABLE = 5, OP_CALL = 6, OP_EXIT = 7,
  OP_SELF = 8, OP_ADD = 9, OP_SUB = 10, OP_MUL = 11, OP_DIV = 12,
  OP_CONCAT = 13, OP_OR = 14, OP_AND = 15
}

interface CompileOptions {
    varNames: {
        bytecode: string; stack: string; ip: string; env: string; null: string; k: string;
    };
}

export class VexileCompiler {
    private instructions: number[] = [];
    private constants: any[] = [];

    private addConstant(val: string | number): number {
        const existing = this.constants.indexOf(val);
        if (existing !== -1) return existing;
        this.constants.push(val);
        return this.constants.length - 1;
    }

    // Helper to push 16-bit integers (2 bytes)
    private emit16(num: number) {
        this.instructions.push((num >> 8) & 0xFF); // High byte
        this.instructions.push(num & 0xFF);        // Low byte
    }

    private emit(op: Opcode, ...args: number[]) {
        this.instructions.push(op);
        // We don't push args directly here anymore for constants/counts, 
        // we handle them manually in compile methods to ensure 16-bit safety.
    }

    public compile(sourceCode: string, options: CompileOptions): string {
        this.instructions = [];
        this.constants = [];

        const ast = luaparse.parse(sourceCode);
        if (ast.type === 'Chunk') {
            ast.body.forEach(statement => this.compileStatement(statement));
        }
        this.emit(Opcode.OP_EXIT);

        // 1. Generate Table-Based Bytecode (Safe from escape corruption)
        const bytecodeTable = `{${this.instructions.join(',')}}`;

        // 2. Encrypt Constants
        let constTableLua = `local ${options.varNames.k} = {}\n`;
        this.constants.forEach((c, i) => {
            if (typeof c === 'string') {
                const chars = c.split('').map(x => x.charCodeAt(0)).join(',');
                constTableLua += `${options.varNames.k}[${i + 1}] = string.char(${chars});\n`;
            } else {
                constTableLua += `${options.varNames.k}[${i + 1}] = ${c};\n`;
            }
        });

        return this.generateVM(bytecodeTable, constTableLua, options.varNames);
    }

    private compileStatement(node: any) {
        if (node.type === 'CallStatement') {
            this.compileExpression(node.expression); 
        } 
        else if (node.type === 'LocalStatement' || node.type === 'AssignmentStatement') {
            node.init.forEach((expr: any) => this.compileExpression(expr));
            for (let i = node.variables.length - 1; i >= 0; i--) {
                const variable = node.variables[i];
                if (variable.type === 'Identifier') {
                    const idx = this.addConstant(variable.name);
                    this.emit(Opcode.OP_SETGLOBAL);
                    this.emit16(idx + 1);
                } 
                else if (variable.type === 'MemberExpression') {
                    this.compileExpression(variable.base);
                    if (variable.indexer === '.') {
                        const idx = this.addConstant(variable.identifier.name);
                        this.emit(Opcode.OP_LOADCONST);
                        this.emit16(idx + 1);
                    } else {
                        this.compileExpression(variable.identifier);
                    }
                    this.emit(Opcode.OP_SETTABLE);
                }
            }
        }
    }

    private compileExpression(node: any) {
        if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
            this.compileExpression(node.left);
            this.compileExpression(node.right);
            const map: any = {'+': Opcode.OP_ADD, '-': Opcode.OP_SUB, '*': Opcode.OP_MUL, '/': Opcode.OP_DIV, '..': Opcode.OP_CONCAT, 'or': Opcode.OP_OR, 'and': Opcode.OP_AND};
            this.emit(map[node.operator]);
        }
        else if (node.type === 'CallExpression') {
            if (node.identifier) { 
                this.compileExpression(node.base); 
                const idx = this.addConstant(node.identifier.name);
                this.emit(Opcode.OP_SELF);
                this.emit16(idx + 1);
                node.arguments.forEach((arg: any) => this.compileExpression(arg));
                this.emit(Opcode.OP_CALL);
                this.emit16(node.arguments.length + 1);
            } else { 
                this.compileExpression(node.base);
                node.arguments.forEach((arg: any) => this.compileExpression(arg));
                this.emit(Opcode.OP_CALL);
                this.emit16(node.arguments.length);
            }
        }
        else if (node.type === 'MemberExpression') {
            this.compileExpression(node.base);
            if (node.indexer === '.') {
                const idx = this.addConstant(node.identifier.name);
                this.emit(Opcode.OP_LOADCONST);
                this.emit16(idx + 1); 
            } else {
                this.compileExpression(node.identifier);
            }
            this.emit(Opcode.OP_GETTABLE);
        }
        else if (node.type === 'Identifier') {
            const idx = this.addConstant(node.name);
            this.emit(Opcode.OP_GETGLOBAL);
            this.emit16(idx + 1);
        }
        else if (node.type === 'StringLiteral') {
            const clean = node.raw.replace(/^["']|["']$/g, ""); 
            const idx = this.addConstant(clean);
            this.emit(Opcode.OP_LOADCONST);
            this.emit16(idx + 1);
        }
        else if (node.type === 'NumericLiteral') {
            const idx = this.addConstant(node.value);
            this.emit(Opcode.OP_LOADCONST);
            this.emit16(idx + 1);
        }
    }

    private generateVM(bytecodeTable: string, constTable: string, v: any): string {
        return `
            ${constTable}
            local ${v.bytecode} = ${bytecodeTable}
            local ${v.ip} = 1
            local ${v.stack} = {}
            local ${v.env} = getfenv()
            local ${v.null} = {} 
            
            local function readInt16()
                local high = ${v.bytecode}[${v.ip}]; ${v.ip} = ${v.ip} + 1
                local low = ${v.bytecode}[${v.ip}]; ${v.ip} = ${v.ip} + 1
                return (high * 256) + low
            end

            while ${v.ip} <= #${v.bytecode} do
                local OP = ${v.bytecode}[${v.ip}]
                ${v.ip} = ${v.ip} + 1

                if OP == ${Opcode.OP_LOADCONST} then
                    local kIdx = readInt16()
                    local val = ${v.k}[kIdx]
                    if val == nil then val = ${v.null} end
                    table.insert(${v.stack}, val) 

                elseif OP == ${Opcode.OP_GETGLOBAL} then
                    local kIdx = readInt16()
                    local val = ${v.env}[${v.k}[kIdx]]
                    if val == nil then val = ${v.null} end
                    table.insert(${v.stack}, val)

                elseif OP == ${Opcode.OP_SETGLOBAL} then
                    local kIdx = readInt16()
                    local val = table.remove(${v.stack})
                    if val == ${v.null} then val = nil end
                    ${v.env}[${v.k}[kIdx]] = val

                elseif OP == ${Opcode.OP_GETTABLE} then
                    local key = table.remove(${v.stack})
                    local obj = table.remove(${v.stack})
                    if key == ${v.null} then key = nil end
                    if obj == ${v.null} then obj = nil end
                    
                    local val = nil
                    if obj and key ~= nil then 
                        val = obj[key] 
                    end
                    if val == nil then val = ${v.null} end
                    table.insert(${v.stack}, val)

                elseif OP == ${Opcode.OP_SETTABLE} then
                    local val = table.remove(${v.stack})
                    local key = table.remove(${v.stack})
                    local obj = table.remove(${v.stack})
                    if val == ${v.null} then val = nil end
                    if key == ${v.null} then key = nil end
                    if obj and obj ~= ${v.null} and key ~= nil then obj[key] = val end

                elseif OP == ${Opcode.OP_SELF} then
                    local kIdx = readInt16()
                    local obj = table.remove(${v.stack})
                    if obj == ${v.null} then obj = nil end
                    
                    local func = nil
                    if obj then func = obj[${v.k}[kIdx]] end
                    
                    if func == nil then func = ${v.null} end
                    if obj == nil then obj = ${v.null} end

                    table.insert(${v.stack}, func)
                    table.insert(${v.stack}, obj)

                elseif OP == ${Opcode.OP_CALL} then
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
                        local res = func(unpack(args, 1, argCount))
                        if res == nil then res = ${v.null} end
                        table.insert(${v.stack}, res)
                    else
                        table.insert(${v.stack}, ${v.null})
                    end
                
                elseif OP == ${Opcode.OP_ADD} then
                    local b = table.remove(${v.stack}); local a = table.remove(${v.stack})
                    table.insert(${v.stack}, a + b)
                elseif OP == ${Opcode.OP_SUB} then
                    local b = table.remove(${v.stack}); local a = table.remove(${v.stack})
                    table.insert(${v.stack}, a - b)
                elseif OP == ${Opcode.OP_MUL} then
                    local b = table.remove(${v.stack}); local a = table.remove(${v.stack})
                    table.insert(${v.stack}, a * b)
                elseif OP == ${Opcode.OP_DIV} then
                    local b = table.remove(${v.stack}); local a = table.remove(${v.stack})
                    table.insert(${v.stack}, a / b)
                elseif OP == ${Opcode.OP_CONCAT} then
                    local b = table.remove(${v.stack}); local a = table.remove(${v.stack})
                    table.insert(${v.stack}, a .. b)
                elseif OP == ${Opcode.OP_EXIT} then
                    break
                end
            end
        `;
    }
}
