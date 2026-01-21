import luaparse from 'luaparse';

enum Opcode {
  OP_MOVE = 0,
  OP_LOADCONST = 1,
  OP_GETGLOBAL = 2,
  OP_GETTABLE = 3,
  OP_CALL = 4,
  OP_EXIT = 5,
  OP_SELF = 6  // [NEW] Handles colon calls (game:GetService)
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

        let bytecodeStr = "";
        this.instructions.forEach(byte => {
            bytecodeStr += "\\" + (byte % 256).toString();
        });

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
        }
    }

    private compileExpression(node: any) {
        if (node.type === 'CallExpression') {
            // Check if this is a method call (game:GetService)
            // luaparse puts the method name in 'identifier' for colon calls
            if (node.identifier) {
                // 1. Compile the object (game) -> Pushes [game]
                this.compileExpression(node.base); 
                
                // 2. Emit OP_SELF to prepare stack -> [GetService, game]
                const idx = this.addConstant(node.identifier.name);
                this.emit(Opcode.OP_SELF, 0, idx + 1);

                // 3. Compile args -> [GetService, game, "Players"]
                node.arguments.forEach((arg: any) => this.compileExpression(arg));
                
                // 4. Call (Args count + 1 for 'self')
                this.emit(Opcode.OP_CALL, 0, node.arguments.length + 1);
            } else {
                // Regular call (game.Workspace or print)
                this.compileExpression(node.base);
                node.arguments.forEach((arg: any) => this.compileExpression(arg));
                this.emit(Opcode.OP_CALL, 0, node.arguments.length);
            }
        }
        else if (node.type === 'MemberExpression') {
            this.compileExpression(node.base);
            const idx = this.addConstant(node.identifier.name);
            this.emit(Opcode.OP_GETTABLE, 0, idx + 1);
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
                    local val = getfenv()[ K[kIdx] ]
                    table.insert(Stack, val)

                elseif OP == ${Opcode.OP_GETTABLE} then
                    local dest = nextByte()
                    local kIdx = nextByte()
                    local key = K[kIdx]
                    local obj = table.remove(Stack)
                    if obj then table.insert(Stack, obj[key]) else table.insert(Stack, nil) end

                elseif OP == ${Opcode.OP_SELF} then
                    local dest = nextByte()
                    local kIdx = nextByte()
                    local key = K[kIdx]
                    
                    local obj = Stack[#Stack]
                    local func = obj[key]
                    
                    Stack[#Stack] = func
                    table.insert(Stack, obj)

                elseif OP == ${Opcode.OP_CALL} then
                    local dest = nextByte() 
                    local argCount = nextByte()
                    
                    local args = {}
                    for i = 1, argCount do
                        table.insert(args, 1, table.remove(Stack))
                    end
                    
                    local func = table.remove(Stack)
                    
                    if typeof(func) == "function" then
                        func(unpack(args))
                    end
                
                elseif OP == ${Opcode.OP_EXIT} then
                    break
                end
            end
        `;
    }
}
