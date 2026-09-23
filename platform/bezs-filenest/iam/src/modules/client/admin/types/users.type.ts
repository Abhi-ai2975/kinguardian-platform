import { TGetUsersControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/users/getUsers.controller";
import { TUserSessionSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { ZSAError } from "zsa";

export interface IUsersTableProps {
  users: TGetUsersControllerOutput | null;
  error: ZSAError | null;
}

export type TUser = TGetUsersControllerOutput[number];
export type TUserSession = TUserSessionSchema;
