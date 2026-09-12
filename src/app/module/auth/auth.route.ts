import { Router } from 'express'
import { UserRole } from '../../../generated/prisma/enums'
import { auth } from '../../middleware/checkAuth'
import { AuthController } from './auth.controller'

const router = Router()

router.post('/register', AuthController.registerUser)
router.post('/login', AuthController.loginUser)
router.get(
    '/me',
    auth(UserRole.CUSTOMER, UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN),
    AuthController.getMe,
)
router.post('/refresh-token', AuthController.refreshToken)
export const AuthRoutes = router
