import bcrypt from 'bcryptjs'
import { JwtPayload, SignOptions } from 'jsonwebtoken'
import { UserRole, UserStatus } from '../../../generated/prisma/enums'
import config from '../../config'
import { prisma } from '../../lib/prisma'
import { jwtUtils } from '../../utils/jwt'
import { ILoginUserPayload, IRegisterUserPayload, IRequestUser } from './auth.interface'

const safeUser = { passwordHash: false }
const normalizeEmail = (email?: string) => email?.trim().toLowerCase() || undefined
const normalizePhone = (phone: string) => phone.trim()

const createTokens = (user: { id: string; name: string; email: string | null; role: UserRole }) => {
    const payload = { userId: user.id, name: user.name, email: user.email, role: user.role }
    return {
        accessToken: jwtUtils.createToken(payload, config.jwt_access_secret, config.jwt_access_expires_in as SignOptions),
        refreshToken: jwtUtils.createToken(payload, config.jwt_refresh_secret, config.jwt_refresh_expires_in as SignOptions),
    }
}

const registerUser = async (payload: IRegisterUserPayload) => {
    if (!payload.name?.trim() || !payload.phone?.trim() || !payload.password) throw new Error('Name, phone, and password are required')
    if (payload.password.length < 8) throw new Error('Password must be at least 8 characters long')
    const email = normalizeEmail(payload.email)
    const phone = normalizePhone(payload.phone)
    const existing = await prisma.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } })
    if (existing) throw new Error('A user with this phone or email already exists')

    const user = await prisma.user.create({
        data: {
            name: payload.name.trim(), phone, email,
            passwordHash: await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds) || 10),
            role: UserRole.CUSTOMER,
        },
        omit: safeUser,
    })
    return { user, ...createTokens(user) }
}

const loginUser = async (payload: ILoginUserPayload) => {
    if (!payload.identifier?.trim() || !payload.password) throw new Error('Identifier and password are required')
    const identifier = payload.identifier.trim()
    const email = normalizeEmail(identifier)
    const user = await prisma.user.findFirst({ where: { OR: [{ phone: identifier }, ...(email ? [{ email }] : [])] } })
    if (!user?.passwordHash || !(await bcrypt.compare(payload.password, user.passwordHash))) throw new Error('Invalid credentials')
    if (user.status !== UserStatus.ACTIVE) throw new Error('User account is not active')

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const { passwordHash: _passwordHash, ...safe } = user
    return { user: safe, ...createTokens(safe) }
}

const getMe = async (user: IRequestUser) => {
    const found = await prisma.user.findUnique({ where: { id: user.userId }, omit: safeUser })
    if (!found) throw new Error('User not found')
    return found
}

const refreshToken = async (token: string) => {
    const verified = jwtUtils.verifyToken(token, config.jwt_refresh_secret)
    if (!verified.success || !verified.data) throw new Error('Invalid refresh token')
    const user = await prisma.user.findUnique({ where: { id: (verified.data as JwtPayload).userId } })
    if (!user || user.status !== UserStatus.ACTIVE) throw new Error('User account is not active')
    return createTokens(user)
}

export const AuthService = { registerUser, loginUser, getMe, refreshToken }
