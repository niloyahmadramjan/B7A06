import { UserRole } from '../../../generated/prisma/enums'

export interface ILoginUserPayload {
    identifier: string
    password: string
}

export interface IRegisterUserPayload {
    name: string
    phone: string
    email?: string
    password: string
}

export interface IRequestUser {
    userId: string
    email: string | null
    name: string
    role: UserRole
}
