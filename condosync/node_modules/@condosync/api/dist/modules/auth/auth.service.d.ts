export interface RegisterDTO {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
}
export interface LoginDTO {
    email: string;
    password: string;
}
export declare class AuthService {
    private generateTokens;
    register(data: RegisterDTO): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            phone: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            createdAt: Date;
        };
    }>;
    login(data: LoginDTO, ipAddress?: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            avatarUrl: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            condominiumUsers: ({
                condominium: {
                    id: string;
                    name: string;
                    logoUrl: string | null;
                };
            } & {
                id: string;
                role: import(".prisma/client").$Enums.UserRole;
                isActive: boolean;
                condominiumId: string;
                userId: string;
                joinedAt: Date;
                unitId: string | null;
            })[];
        };
        accessToken: any;
        refreshToken: any;
    }>;
    refreshTokens(token: string): Promise<{
        accessToken: any;
        refreshToken: any;
    }>;
    logout(refreshToken: string): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map