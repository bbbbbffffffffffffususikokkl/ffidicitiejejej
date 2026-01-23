// Abstract Syntax Tree
// By Vexile
export enum TokenType {
    Keyword,
    Identifier,
    String,
    Number,
    Operator,
    Punctuation,
    EOF
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
}

export interface ASTNode {
    type: string;
}

export interface Chunk extends ASTNode {
    type: 'Chunk';
    body: Statement[];
}

export type Statement = 
    | { type: 'Assignment', vars: Expression[], init: Expression[] }
    | { type: 'Local', vars: string[], init: Expression[] }
    | { type: 'CallStatement', expression: Expression }
    | { type: 'Function', name: Expression | null, params: string[], body: Statement[] }
    | { type: 'If', clauses: { condition: Expression, body: Statement[] }[] }
    | { type: 'While', condition: Expression, body: Statement[] }
    | { type: 'Return', args: Expression[] };

export type Expression = 
    | { type: 'Identifier', name: string }
    | { type: 'String', value: string }
    | { type: 'Number', value: number }
    | { type: 'Boolean', value: boolean }
    | { type: 'Nil' }
    | { type: 'Binary', left: Expression, operator: string, right: Expression }
    | { type: 'Call', base: Expression, args: Expression[] }
    | { type: 'Member', base: Expression, indexer: string, identifier: Expression }
    | { type: 'Table', fields: { key?: Expression, value: Expression }[] }
    | { type: 'Vararg' };