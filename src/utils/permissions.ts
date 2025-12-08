export const PERMISSIONS = {
  ATTACHMENT: {
    CREATE: 'attachment:create',
    READ: 'attachment:read',
    UPDATE: 'attachment:update',
    DELETE: 'attachment:delete',
  },
  CONFIGURATION: {
    CREATE: 'configuration:create',
    READ: 'configuration:read',
    UPDATE: 'configuration:update',
    DELETE: 'configuration:delete',
  },
  FOLDER: {
    CREATE: 'folder:create',
    READ: 'folder:read',
    UPDATE: 'folder:update',
    DELETE: 'folder:delete',
  },
  PROJECT: {
    CREATE: 'project:create',
    READ: 'project:read',
    UPDATE: 'project:update',
    DELETE: 'project:delete',
  },
  SCHEDULED_REPORT: {
    CREATE: 'scheduled-report:create',
    READ: 'scheduled-report:read',
    UPDATE: 'scheduled-report:update',
    DELETE: 'scheduled-report:delete',
  },
  SHARED_STEP: {
    CREATE: 'shared-step:create',
    READ: 'shared-step:read',
    UPDATE: 'shared-step:update',
    DELETE: 'shared-step:delete',
  },
  STEP_RESULT: {
    CREATE: 'step-result:create',
    READ: 'step-result:read',
    UPDATE: 'step-result:update',
    DELETE: 'step-result:delete',
  },
  TAG: {
    CREATE: 'tag:create',
    READ: 'tag:read',
    UPDATE: 'tag:update',
    DELETE: 'tag:delete',
  },
  TEST_CASE_EXECUTION: {
    CREATE: 'test-case-execution:create',
    READ: 'test-case-execution:read',
    UPDATE: 'test-case-execution:update',
    DELETE: 'test-case-execution:delete',
  },
  TEST_CASE: {
    CREATE: 'test-case:create',
    READ: 'test-case:read',
    UPDATE: 'test-case:update',
    DELETE: 'test-case:delete',
  },
  TEST_PLAN: {
    CREATE: 'test-plan:create',
    READ: 'test-plan:read',
    UPDATE: 'test-plan:update',
    DELETE: 'test-plan:delete',
  },
  TEST_RUN: {
    CREATE: 'test-run:create',
    READ: 'test-run:read',
    UPDATE: 'test-run:update',
    DELETE: 'test-run:delete',
  },
  ADMIN_PANEL: {
    READ: 'admin-panel:read',
  },
} as const;

export type Permission = string;

export const hasPermission = (userPermissions: string[] | undefined, permission: string): boolean => {
  if (!userPermissions) return false;
  return userPermissions.includes(permission);
};

export const hasAnyPermission = (userPermissions: string[] | undefined, permissions: string[]): boolean => {
  if (!userPermissions) return false;
  return permissions.some(permission => userPermissions.includes(permission));
};

export const hasAllPermissions = (userPermissions: string[] | undefined, permissions: string[]): boolean => {
  if (!userPermissions) return false;
  return permissions.every(permission => userPermissions.includes(permission));
};
