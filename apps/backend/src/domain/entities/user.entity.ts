import { BaseEntity } from './base.entity';

export interface UserProps {
  id: string;
  walletAddress: string;
  role: string;
  permissions: string[];
  nonce?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends BaseEntity {
  private readonly _walletAddress: string;
  private _role: string;
  private _permissions: string[];
  private _nonce?: string;

  constructor(props: UserProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._walletAddress = props.walletAddress;
    this._role = props.role;
    this._permissions = props.permissions;
    this._nonce = props.nonce;
  }

  get walletAddress(): string { return this._walletAddress; }
  get role(): string { return this._role; }
  get permissions(): string[] { return this._permissions; }
  get nonce(): string | undefined { return this._nonce; }

  hasPermission(permission: string): boolean {
    return this._permissions.includes(permission) || this._role === 'SUPER_ADMIN';
  }

  updateNonce(nonce: string): void {
    this._nonce = nonce;
    this.touch();
  }

  static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>): User {
    return new User({
      ...props,
      id: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
