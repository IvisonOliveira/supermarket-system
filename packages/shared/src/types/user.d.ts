export type UserRole = 'ADMIN' | 'GERENTE' | 'OPERADOR';
export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    active: boolean;
    createdAt: string;
}
//# sourceMappingURL=user.d.ts.map