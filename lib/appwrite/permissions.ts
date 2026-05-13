import { Permission, Role } from "appwrite";

export function ownerPermissions(ownerId: string) {
  const owner = Role.user(ownerId);
  return [Permission.read(owner), Permission.update(owner), Permission.delete(owner)];
}
