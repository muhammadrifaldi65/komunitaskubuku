import { AppRole } from "@/types/next-auth";

/**
 * Role capability matrix
 * ADMIN    : full access ke semua fitur admin
 * PEMBINA  : setengah dari admin -> bisa takedown konten, balas chat CS,
 *            beri peringatan, TIDAK BISA ban akun / ubah role / hapus user permanen
 * USER     : hanya kelola konten & profil miliknya sendiri
 */
export const permissions = {
  canAccessAdminDashboard: (role: AppRole) => role === "ADMIN" || role === "PEMBINA",
  canBanUser: (role: AppRole) => role === "ADMIN",
  canChangeUserRole: (role: AppRole) => role === "ADMIN",
  canDeleteUserAccount: (role: AppRole) => role === "ADMIN",
  canTakedownPost: (role: AppRole) => role === "ADMIN" || role === "PEMBINA",
  canRestorePost: (role: AppRole) => role === "ADMIN" || role === "PEMBINA",
  canAnswerChat: (role: AppRole) => role === "ADMIN" || role === "PEMBINA",
  canViewReports: (role: AppRole) => role === "ADMIN" || role === "PEMBINA",
  canResolveReports: (role: AppRole) => role === "ADMIN" || role === "PEMBINA",
  canManageSiteSettings: (role: AppRole) => role === "ADMIN",
};

export function isOwnerOrAdmin(role: AppRole, isOwner: boolean) {
  return isOwner || role === "ADMIN";
}
