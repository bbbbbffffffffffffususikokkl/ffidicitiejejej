import luaparse from 'luaparse';

enum Opcode {
  OP_MOVE = 0,
  OP_LOADCONST = 1,
  OP_GETGLOBAL = 2,
  OP_SETGLOBAL = 3,
  OP_GETTABLE = 4,
  OP_SETTABLE = 5,
  OP_CALL = 6,
  OP_EXIT = 7,
  OP_SELF = 8,
  OP_ADD = 9,
  OP_SUB = 10,
  OP_MUL = 11,
  OP_DIV = 12,
  OP_CONCAT = 13,
  OP_OR = 14,
  OP_AND = 15
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

    private emit(op: Opcode, ...args: number[]) {
        this.instructions.push(op);
        args.forEach(a => this.instructions.push(a));
    }

    public compile(sourceCode: string): string {
        this.instructions = [];
        this.constants = [];

        const ast = luaparse.parse(sourceCode);

        if (ast.type === 'Chunk') {
            ast.body.forEach(statement => this.compileStatement(statement));
        }

        this.emit(Opcode.OP_EXIT);

        // Serialize Bytecode
        let bytecodeStr = "";
        this.instructions.forEach(byte => {
            bytecodeStr += "\\" + (byte % 256).toString();
        });

        // Generate Constant Table
        let constTableLua = "local K = {}\n";
        this.constants.forEach((c, i) => {
            const val = typeof c === 'string' ? `"${c}"` : c;
            constTableLua += `K[${i + 1}] = ${val};\n`; 
        });

        return this.generateVM(bytecodeStr, constTableLua);
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
                    this.emit(Opcode.OP_SETGLOBAL, 0, idx + 1);
                }
            }
        }
    }

    private compileExpression(node: any) {
        if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
            this.compileExpression(node.left);
            this.compileExpression(node.right);
            
            if (node.operator === '+') this.emit(Opcode.OP_ADD);
            else if (node.operator === '-') this.emit(Opcode.OP_SUB);
            else if (node.operator === '*') this.emit(Opcode.OP_MUL);
            else if (node.operator === '/') this.emit(Opcode.OP_DIV);
            else if (node.operator === '..') this.emit(Opcode.OP_CONCAT);
            else if (node.operator === 'or') this.emit(Opcode.OP_OR);
            else if (node.operator === 'and') this.emit(Opcode.OP_AND);
        }
        else if (node.type === 'CallExpression') {
            if (node.identifier) { 
                this.compileExpression(node.base); 
                const idx = this.addConstant(node.identifier.name);
                this.emit(Opcode.OP_SELF, 0, idx + 1);
                node.arguments.forEach((arg: any) => this.compileExpression(arg));
                this.emit(Opcode.OP_CALL, 0, node.arguments.length + 1);
            } else { 
                this.compileExpression(node.base);
                node.arguments.forEach((arg: any) => this.compileExpression(arg));
                this.emit(Opcode.OP_CALL, 0, node.arguments.length);
            }
        }
        else if (node.type === 'MemberExpression') {
            this.compileExpression(node.base);
            if (node.indexer === '.') {
                const idx = this.addConstant(node.identifier.name);
                this.emit(Opcode.OP_LOADCONST, 1, idx + 1); 
            } else {
                this.compileExpression(node.identifier);
            }
            this.emit(Opcode.OP_GETTABLE);
        }
        else if (node.type === 'Identifier') {
            const idx = this.addConstant(node.name);
            this.emit(Opcode.OP_GETGLOBAL, 0, idx + 1);
        }
        else if (node.type === 'StringLiteral') {
            const clean = node.raw.replace(/^["']|["']$/g, ""); 
            const idx = this.addConstant(clean);
            this.emit(Opcode.OP_LOADCONST, 1, idx + 1);
        }
        else if (node.type === 'NumericLiteral') {
            const idx = this.addConstant(node.value);
            this.emit(Opcode.OP_LOADCONST, 1, idx + 1);
        }
    }

    private generateVM(bytecode: string, constTable: string): string {
        return `
            ${constTable}
            local BytecodeString = "${bytecode}"
            
            local IP = 1
            local Stack = {}
            local Env = getfenv()
            local NULL = {} 

            local function nextByte()
                local char = string.sub(BytecodeString, IP, IP)
                IP = IP + 1
                return string.byte(char) or 0
            end

            while IP <= #BytecodeString do
                local OP = nextByte()

                if OP == ${Opcode.OP_LOADCONST} then
                    local dest = nextByte() 
                    local kIdx = nextByte()
                    table.insert(Stack, K[kIdx]) 

                elseif OP == ${Opcode.OP_GETGLOBAL} then
                    local dest = nextByte()
                    local kIdx = nextByte()
                    local key = K[kIdx]
                    local val = Env[key]
                    if val == nil then val = NULL end
                    table.insert(Stack, val)

                elseif OP == ${Opcode.OP_SETGLOBAL} then
                    local dest = nextByte()
                    local kIdx = nextByte()
                    local key = K[kIdx]
                    local val = table.remove(Stack)
                    if val == NULL then val = nil end
                    Env[key] = val

                elseif OP == ${Opcode.OP_GETTABLE} then
                    local key = table.remove(Stack)
                    local obj = table.remove(Stack)
                    if key == NULL then key = nil end
                    if obj == NULL then obj = nil end
                    
                    local val = nil
                    if obj then val = obj[key] end
                    if val == nil then val = NULL end
                    table.insert(Stack, val)

                elseif OP == ${Opcode.OP_SETTABLE} then
                    local val = table.remove(Stack)
                    local key = table.remove(Stack)
                    local obj = table.remove(Stack)
                    if val == NULL then val = nil end
                    if key == NULL then key = nil end
                    if obj and obj ~= NULL then obj[key] = val end

                elseif OP == ${Opcode.OP_SELF} then
                    local dest = nextByte()
                    local kIdx = nextByte()
                    local key = K[kIdx]
                    local obj = table.remove(Stack)
                    if obj == NULL then obj = nil end
                    
                    local func = nil
                    if obj then func = obj[key] end
                    if func == nil then func = NULL end
                    if obj == nil then obj = NULL end

                    table.insert(Stack, func)
                    table.insert(Stack, obj)

                elseif OP == ${Opcode.OP_CALL} then
                    local dest = nextByte() 
                    local argCount = nextByte()
                    local args = {}
                    for i = 1, argCount do 
                        local val = table.remove(Stack)
                        if val == NULL then val = nil end
                        table.insert(args, 1, val) 
                    end
                    
                    local func = table.remove(Stack)
                    if func == NULL then func = nil end

                    if func then
                        local res = func(unpack(args))
                        if res == nil then res = NULL end
                        table.insert(Stack, res)
                    else
                        table.insert(Stack, NULL)
                    end
                
                elseif OP == ${Opcode.OP_ADD} then
                    local b = table.remove(Stack)
                    local a = table.remove(Stack)
                    table.insert(Stack, a + b)
                elseif OP == ${Opcode.OP_SUB} then
                    local b = table.remove(Stack)
                    local a = table.remove(Stack)
                    table.insert(Stack, a - b)
                elseif OP == ${Opcode.OP_MUL} then
                    local b = table.remove(Stack)
                    local a = table.remove(Stack)
                    table.insert(Stack, a * b)
                elseif OP == ${Opcode.OP_DIV} then
                    local b = table.remove(Stack)
                    local a = table.remove(Stack)
                    table.insert(Stack, a / b)
                elseif OP == ${Opcode.OP_CONCAT} then
                    local b = table.remove(Stack)
                    local a = table.remove(Stack)
                    table.insert(Stack, a .. b)
                elseif OP == ${Opcode.OP_OR} then
                    local b = table.remove(Stack)
                    local a = table.remove(Stack)
                    table.insert(Stack, a or b)
                elseif OP == ${Opcode.OP_AND} then
                    local b = table.remove(Stack)
                    local a = table.remove(Stack)
                    table.insert(Stack, a and b)

                elseif OP == ${Opcode.OP_EXIT} then
                    break
                end
            end
        `;
    }
}
