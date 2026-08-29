import type { CollectionConfig } from "payload";

import {
  adminOnly,
  adminOnlyField,
  adminOrSelf,
  isAdmin,
} from "../access/roles";

/**
 * CMS accounts. Native Payload authentication (no Better Auth in v1). Editors
 * manage their own profile but never their role or anyone else's account;
 * only administrators create, disable or delete accounts.
 */
export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "usuari", plural: "usuaris" },
  auth: {
    // Finite retry limit + lockout, per the access-control plan.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 8 * 60 * 60,
    cookies: {
      sameSite: "Lax",
      secure: true,
    },
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role"],
    group: "administració",
  },
  access: {
    read: adminOrSelf,
    create: adminOnly,
    update: adminOrSelf,
    delete: adminOnly,
    // Native initial-user route; unavailable once the first account exists.
    admin: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "nom",
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      label: "rol",
      options: [
        { label: "administrador", value: "administrator" },
        { label: "editor", value: "editor" },
      ],
      access: {
        // An editor cannot escalate: role is read-only unless you are an admin.
        create: adminOnlyField,
        update: adminOnlyField,
      },
      admin: {
        description:
          "els administradors gestionen comptes; els editors només escriuen articles",
      },
    },
    {
      name: "disabled",
      type: "checkbox",
      defaultValue: false,
      label: "compte desactivat",
      access: {
        create: adminOnlyField,
        update: adminOnlyField,
        read: ({ req }) => isAdmin(req.user),
      },
    },
  ],
};
