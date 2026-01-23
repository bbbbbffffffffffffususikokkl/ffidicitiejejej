// Compiler
// By Vexile
import { Statement, Expression } from './ast';
import { Parser } from './parser';

export class Compiler {
    private instructions: any[] = [];
    private constants: any[] = [];
    private locals: string[] = []; 
    private opMap = {
        MOVE: 0, LOADK: 1, GETGLOBAL: 2, SETGLOBAL: 3, 
        GETTABLE: 4, SETTABLE: 5, CALL: 6, RETURN: 7
    };

    constructor() {
        const vals = [0,1,2,3,4,5,6,7].sort(() => Math.random() - 0.5);
        let i = 0;
        for (const k in this.opMap) { (this.opMap as any)[k] = vals[i++]; }
    }

    private addK(val: any) {
        const idx = this.constants.indexOf(val);
        if (idx !== -1) return idx;
        this.constants.push(val);
        return this.constants.length - 1;
    }

    private emit(op: keyof typeof this.opMap, a: number, b: number = 0, c: number = 0) {
        this.instructions.push({ op: this.opMap[op], a, b, c });
    }

    public compile(source: string) {
        const parser = new Parser(source);
        const ast = parser.parse();
        
        ast.body.forEach(stat => {
            if (stat.type === 'CallStatement') {
                this.compileExpr(stat.expression, this.locals.length);
            }
        });

        this.emit('RETURN', 0, 0);
        return { code: this.instructions, constants: this.constants, opMap: this.opMap };
    }

    private compileExpr(e: Expression, reg: number) {
        if (e.type === 'String' || e.type === 'Number') {
            const k = this.addK(e.value);
            this.emit('LOADK', reg, k);
        } else if (e.type === 'Identifier') {
            const k = this.addK(e.name);
            this.emit('GETGLOBAL', reg, k);
        } else if (e.type === 'Call') {
            this.compileExpr(e.base, reg);
            e.args.forEach((arg, i) => this.compileExpr(arg, reg + 1 + i));
            this.emit('CALL', reg, e.args.length + 1);
        }
    }
}