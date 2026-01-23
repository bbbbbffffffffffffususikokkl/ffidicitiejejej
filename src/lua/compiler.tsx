// Compiler
// By Vexile
import { Statement, Expression, Chunk } from './ast';
import { Parser } from './parser';

export class Compiler {
    private instructions: any[] = [];
    private constants: any[] = [];
    private locals: string[] = []; 
    private opMap = {
        MOVE: 0, LOADK: 1, GETGLOBAL: 2, SETGLOBAL: 3, 
        GETTABLE: 4, SETTABLE: 5, CALL: 6, RETURN: 7,
        ADD: 8, SUB: 9, MUL: 10, DIV: 11, MOD: 12, POW: 13, UNM: 14,
        NOT: 15, LEN: 16, CONCAT: 17, JMP: 18, EQ: 19, LT: 20, LE: 21,
        NEWTABLE: 22, SETLIST: 23, FORLOOP: 24, FORPREP: 25
    };

    constructor() {
        const vals = Array.from({length: 26}, (_, i) => i).sort(() => Math.random() - 0.5);
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
        this.compileBlock(ast.body);
        this.emit('RETURN', 0, 1);
        return { code: this.instructions, constants: this.constants, opMap: this.opMap };
    }

    private compileBlock(stats: Statement[]) {
        stats.forEach(stat => {
            const reg = this.locals.length;
            switch (stat.type) {
                case 'CallStatement':
                    this.compileExpr(stat.expression, reg);
                    break;
                case 'Local':
                    stat.init.forEach((expr, i) => {
                        this.compileExpr(expr, reg + i);
                        this.locals.push(stat.vars[i]);
                    });
                    break;
                case 'Assignment':
                    stat.init.forEach((expr, i) => {
                        const tempReg = reg + i + 1;
                        this.compileExpr(expr, tempReg);
                        const target = stat.vars[i];
                        if (target.type === 'Identifier') {
                            const lIdx = this.locals.indexOf(target.name);
                            if (lIdx !== -1) this.emit('MOVE', lIdx, tempReg);
                            else this.emit('SETGLOBAL', tempReg, this.addK(target.name));
                        } else if (target.type === 'Member') {
                            this.compileExpr(target.base, reg + i + 2);
                            const kReg = reg + i + 3;
                            this.compileExpr(target.identifier, kReg);
                            this.emit('SETTABLE', reg + i + 2, kReg, tempReg);
                        }
                    });
                    break;
                case 'If':
                    stat.clauses.forEach((clause) => {
                        this.compileExpr(clause.condition, reg);
                        // Simplified JMP logic for If
                        this.compileBlock(clause.body);
                    });
                    break;
                case 'Return':
                    stat.args.forEach((arg, i) => this.compileExpr(arg, reg + i));
                    this.emit('RETURN', reg, stat.args.length + 1);
                    break;
            }
        });
    }

    private compileExpr(e: Expression, reg: number) {
        switch (e.type) {
            case 'String':
            case 'Number':
            case 'Boolean':
                this.emit('LOADK', reg, this.addK(e.value));
                break;
            case 'Nil':
                this.emit('LOADK', reg, this.addK(null));
                break;
            case 'Identifier':
                const lIdx = this.locals.indexOf(e.name);
                if (lIdx !== -1) this.emit('MOVE', reg, lIdx);
                else this.emit('GETGLOBAL', reg, this.addK(e.name));
                break;
            case 'Binary':
                this.compileExpr(e.left, reg);
                this.compileExpr(e.right, reg + 1);
                const ops: Record<string, keyof typeof this.opMap> = {
                    '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', 
                    '%': 'MOD', '^': 'POW', '..': 'CONCAT',
                    '==': 'EQ', '<': 'LT', '<=': 'LE'
                };
                if (ops[e.operator]) this.emit(ops[e.operator], reg, reg, reg + 1);
                break;
            case 'Member':
                this.compileExpr(e.base, reg);
                const kReg = reg + 1;
                if (e.identifier.type === 'Identifier') {
                    this.emit('LOADK', kReg, this.addK(e.identifier.name));
                } else {
                    this.compileExpr(e.identifier, kReg);
                }
                this.emit('GETTABLE', reg, reg, kReg);
                break;
            case 'Call':
                this.compileExpr(e.base, reg);
                e.args.forEach((arg, i) => this.compileExpr(arg, reg + i + 1));
                this.emit('CALL', reg, e.args.length + 1, 1);
                break;
            case 'Table':
                this.emit('NEWTABLE', reg, e.fields.length, 0);
                e.fields.forEach((field, i) => {
                    const valReg = reg + 1;
                    this.compileExpr(field.value, valReg);
                    if (field.key) {
                        const keyReg = reg + 2;
                        this.compileExpr(field.key, keyReg);
                        this.emit('SETTABLE', reg, keyReg, valReg);
                    } else {
                        this.emit('LOADK', reg + 2, this.addK(i + 1));
                        this.emit('SETTABLE', reg, reg + 2, valReg);
                    }
                });
                break;
        }
    }
}
