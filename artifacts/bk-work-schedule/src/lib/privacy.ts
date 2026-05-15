export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return "-";
  if (digits.length <= 2) return "X".repeat(digits.length);
  const last2 = digits.slice(-2);
  const prefixLen = digits.length - 2;
  const masked = "X".repeat(prefixLen) + last2;
  if (masked.length >= 10) {
    return `${masked.slice(0, 3)}-${masked.slice(3, 6)}-${masked.slice(6, 10)}`;
  }
  return masked;
}

export function displayName(user: {
  nickName?: string | null;
  fullName?: string | null;
  username?: string | null;
}): string {
  if (user.nickName) return user.nickName;
  if (user.fullName) return user.fullName.charAt(0) + ".";
  return user.username || "?";
}
