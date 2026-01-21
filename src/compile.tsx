import luaparse from 'luaparse';
// 1. VM INSTRUCTION SET
enum Opcode {
  OP_MOVE = 0,      // Copy value
  OP_LOADCONST = 1, // Load literal (string/num)
  OP_GETGLOBAL = 2, // Get 'print', 'game'
  OP_GETTABLE = 3,  // Get table field (game.Workspace)
  OP_CALL = 4,      // Call function
  OP_EXIT = 5       // End script
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

        // Parse AST
        const ast = luaparse.parse(sourceCode);

        // Compile Body
        if (ast.type === 'Chunk') {
            ast.body.forEach(statement => this.compileStatement(statement));
        }

        this.emit(Opcode.OP_EXIT);

        // Serialize
        let bytecodeStr = "";
        this.instructions.forEach(byte => bytecodeStr += String.fromCharCode(byte % 256));
        const finalBytecode = btoa(bytecodeStr);

        // Generate Constants
        let constTableLua = "local K = {}\n";
        this.constants.forEach((c, i) => {
            const val = typeof c === 'string' ? `"${c}"` : c;
            constTableLua += `K[${i + 1}] = ${val};\n`; 
        });

        return this.generateVM(finalBytecode, constTableLua);
    }

    private compileStatement(node: any) {
        if (node.type === 'CallStatement') {
            this.compileExpression(node.expression); 
        } 
        else if (node.type === 'LocalStatement' || node.type === 'AssignmentStatement') {
            // Simplified: Compile the Right-Hand Side (RHS) just to keep the stack moving
            // Note: A full compiler needs to map Locals to Stack Indices. 
            // For this Virtualization demo, we execute the logic but don't store locals persistently 
            // across complex scopes to keep the VM size small.
            node.init.forEach((expr: any) => this.compileExpression(expr));
        }
    }

    private compileExpression(node: any) {
        if (node.type === 'CallExpression') {
            // Handle Method Calls: game:GetService("Players")
            // The AST separates this into 'base' (game) and 'identifier' (GetService)
            
            this.compileExpression(node.base); // Push function or object

            node.arguments.forEach((arg: any) => this.compileExpression(arg));

            this.emit(Opcode.OP_CALL, 0, node.arguments.length);
        }
        else if (node.type === 'MemberExpression') {
            // Handle: game.Workspace or game:GetService
            this.compileExpression(node.base); // Push 'game'
            
            const idx = this.addConstant(node.identifier.name);
            this.emit(Opcode.OP_GETTABLE, 0, idx + 1); // Get 'Workspace' from 'game'
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

            while true do
                local OP = nextByte()

                if OP == ${Opcode.OP_LOADCONST} then
                    local dest = nextByte() 
                    local kIdx = nextByte()
                    table.insert(Stack, K[kIdx]) 

                elseif OP == ${Opcode.OP_GETGLOBAL} then
                    local dest = nextByte()
                    local kIdx = nextByte()
                    -- Safe lookup
                    local val = getfenv()[ K[kIdx] ]
                    table.insert(Stack, val)

                elseif OP == ${Opcode.OP_GETTABLE} then
                    local dest = nextByte()
                    local kIdx = nextByte()
                    local key = K[kIdx]
                    
                    -- Pop table from stack
                    local obj = table.remove(Stack)
                    if obj then
                        table.insert(Stack, obj[key])
                    else
                        table.insert(Stack, nil)
                    end

                elseif OP == ${Opcode.OP_CALL} then
                    local dest = nextByte() 
                    local argCount = nextByte()
                    
                    local args = {}
                    for i = 1, argCount do
                        table.insert(args, 1, table.remove(Stack))
                    end
                    
                    local func = table.remove(Stack)
                    
                    -- Handle ":" method calls vs "." calls
                    if typeof(func) == "function" then
                        func(unpack(args))
                    else
                         -- Fallback (simplified)
                    end
                
                elseif OP == ${Opcode.OP_EXIT} then
                    break
                end
            end
        `;
    }
}
