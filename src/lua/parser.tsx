import { Token, TokenType, Chunk, Statement, Expression } from './ast';
import { Lexer } from './lexer';

export class Parser {
    private tokens: Token[];
    private pos = 0;

    constructor(code: string) {
        this.tokens = new Lexer(code).tokenize();
    }

    parse(): Chunk {
        return { type: 'Chunk', body: this.parseBlock() };
    }

    private peek(offset = 0) {
        if (this.pos + offset >= this.tokens.length) return this.tokens[this.tokens.length - 1];
        return this.tokens[this.pos + offset];
    }

    private consume() { return this.tokens[this.pos++]; }

    private expect(val: string) {
        if (this.peek().value === val) return this.consume();
        throw new Error(`Expected '${val}', got '${this.peek().value}' at line ${this.peek().line}`);
    }

    private expectIdentifier(): string {
        const t = this.consume();
        if (t.type !== TokenType.Identifier) {
            throw new Error(`Expected Identifier, got '${t.value}' at line ${t.line}`);
        }
        return t.value;
    }

    private parseBlock(endKeywords: string[] = []): Statement[] {
        const stats: Statement[] = [];
        while (this.pos < this.tokens.length) {
            const t = this.peek();
            if (t.type === TokenType.EOF || endKeywords.includes(t.value)) break;
            
            if (t.value === 'local') stats.push(this.parseLocal());
            else if (t.value === 'function') stats.push(this.parseFunction());
            else if (t.value === 'return') { stats.push(this.parseReturn()); break; }
            else if (t.value === 'if') stats.push(this.parseIf());
            else if (t.value === 'do') stats.push(this.parseDo()); 
            else {
                const expr = this.parseExpr();
                if (this.peek().value === '=') {
                    this.consume();
                    const val = this.parseExpr();
                    stats.push({ type: 'Assignment', vars: [expr], init: [val] } as any);
                } else {
                    stats.push({ type: 'CallStatement', expression: expr } as any);
                }
            }
        }
        return stats;
    }

    private parseDo(): Statement {
        this.consume(); // consume 'do'
        const body = this.parseBlock(['end']);
        this.expect('end');
        return { type: 'Do', body } as any; 
    }

    private parseLocal(): Statement {
        this.consume(); 
        const name = this.expectIdentifier();
        let init: Expression[] = [];
        if (this.peek().value === '=') {
            this.consume();
            init.push(this.parseExpr());
        }
        return { type: 'Local', vars: [name], init } as any;
    }

    private parseExpr(minPrec = 0): Expression {
        let left = this.parsePrimary();
        while (this.isBinOp(this.peek().value)) {
            const op = this.peek().value;
            const prec = this.getPrecedence(op);
            if (prec < minPrec) break;
            this.consume();
            const right = this.parseExpr(prec + 1);
            left = { type: 'Binary', left, operator: op, right } as any;
        }
        return left;
    }

    private parsePrimary(): Expression {
        let t = this.peek();
        let expr: Expression | null = null;

        if (t.type === TokenType.Number) {
            this.consume();
            expr = { type: 'Number', value: Number(t.value) } as any;
        } else if (t.type === TokenType.String) {
            this.consume();
            expr = { type: 'String', value: t.value } as any;
        } else if (t.value === 'true' || t.value === 'false') {
            this.consume();
            expr = { type: 'Boolean', value: t.value === 'true' } as any;
        } else if (t.value === 'nil') {
            this.consume();
            expr = { type: 'Nil' } as any;
        } else if (t.type === TokenType.Identifier) {
            this.consume();
            expr = { type: 'Identifier', name: t.value } as any;
        } else if (t.value === '{') {
            expr = this.parseTable();
        } else {
            throw new Error(`Unexpected token '${t.value}' at line ${t.line}`);
        }

        while (true) {
            const next = this.peek().value;
            if (next === '.') {
                this.consume();
                const id = this.expectIdentifier();
                expr = { type: 'Member', base: expr, indexer: '.', identifier: { type: 'Identifier', name: id } } as any;
            } else if (next === ':') {
                this.consume();
                const id = this.expectIdentifier();
                expr = { type: 'Member', base: expr, indexer: ':', identifier: { type: 'Identifier', name: id } } as any;
            } else if (next === '(') {
                this.consume();
                const args: Expression[] = [];
                if (this.peek().value !== ')') {
                    do {
                        args.push(this.parseExpr());
                    } while (this.peek().value === ',' && this.consume());
                }
                this.expect(')');
                expr = { type: 'Call', base: expr, args } as any;
            } else {
                break;
            }
        }
        return expr!;
    }

    private parseTable(): Expression {
        this.expect('{');
        const fields: any[] = [];
        while (this.peek().value !== '}') {
            if (this.peek().value === '[') {
                this.consume();
                const key = this.parseExpr();
                this.expect(']');
                this.expect('=');
                const value = this.parseExpr();
                fields.push({ key, value });
            } else if (this.peek(1).value === '=') {
                const key = { type: 'String', value: this.expectIdentifier() };
                this.expect('=');
                const value = this.parseExpr();
                fields.push({ key, value });
            } else {
                const value = this.parseExpr();
                fields.push({ key: null, value });
            }

            if (this.peek().value === ',' || this.peek().value === ';') {
                this.consume();
            } else {
                break;
            }
        }
        this.expect('}');
        return { type: 'Table', fields } as any;
    }

    private parseIf(): Statement {
        this.consume();
        const clauses = [];
        let cond = this.parseExpr();
        this.expect('then');
        let body = this.parseBlock(['elseif', 'else', 'end']);
        clauses.push({ condition: cond, body });
        
        while (this.peek().value === 'elseif') {
            this.consume();
            cond = this.parseExpr();
            this.expect('then');
            body = this.parseBlock(['elseif', 'else', 'end']);
            clauses.push({ condition: cond, body });
        }
        if (this.peek().value === 'else') {
            this.consume();
            clauses.push({ condition: { type: 'Boolean', value: true } as any, body: this.parseBlock(['end']) });
        }
        this.expect('end');
        return { type: 'If', clauses } as any;
    }

    private parseFunction(): Statement { 
        this.consume();
        const name = this.expectIdentifier(); 
        this.expect('(');
        this.expect(')');
        const body = this.parseBlock(['end']);
        this.expect('end');
        return { type: 'Function', name: { type: 'Identifier', name }, params: [], body, isLocal: false } as any;
    }

    private parseReturn(): Statement { 
        this.consume();
        const args: Expression[] = [];
        if (!['end', 'elseif', 'else'].includes(this.peek().value)) {
            do {
                args.push(this.parseExpr());
            } while (this.peek().value === ',' && this.consume());
        }
        return { type: 'Return', args } as any; 
    }

    private isBinOp(op: string) { return ['+', '-', '*', '/', '..', '==', '>', '<', '<=', '>='].includes(op); }
    private getPrecedence(op: string) {
        if (op === '..') return 4;
        if (['+', '-'].includes(op)) return 5;
        if (['*', '/'].includes(op)) return 6;
        if (['==', '>', '<', '<=', '>='].includes(op)) return 3;
        return 0; 
    }
}
