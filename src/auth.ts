import NextAuth from "next-auth";
import { bootstrapServer } from "@/core/bootstrap-server";
import { authConfig } from "@/auth.config";

bootstrapServer();

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
