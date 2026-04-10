export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'GERENTE' | 'OPERADOR';
}
