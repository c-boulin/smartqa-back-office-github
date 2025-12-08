# RBAC Permissions Implementation Guide

This project now includes Role-Based Access Control (RBAC) that controls which features users can access based on their assigned permissions.

## Available Permissions

Permissions follow the pattern: `resource:action` where action can be `create`, `read`, `update`, or `delete`.

Available resources:
- `attachment` - File attachments
- `configuration` - Test configurations
- `folder` - Test case folders
- `project` - Projects
- `scheduled-report` - Scheduled reports
- `shared-step` - Shared test steps
- `step-result` - Test step results
- `tag` - Tags
- `test-case-execution` - Test case executions
- `test-case` - Test cases
- `test-plan` - Test plans
- `test-run` - Test runs

## Usage Examples

### 1. Using PermissionGuard Component

The simplest way to conditionally render UI elements:

```tsx
import PermissionGuard from '../components/PermissionGuard';
import { PERMISSIONS } from '../utils/permissions';

// Hide button if user doesn't have permission
<PermissionGuard permission={PERMISSIONS.TEST_CASE.CREATE}>
  <Button onClick={handleCreate}>Create Test Case</Button>
</PermissionGuard>

// Show alternative content for users without permission
<PermissionGuard
  permission={PERMISSIONS.TEST_CASE.DELETE}
  fallback={<span className="text-gray-400">No delete access</span>}
>
  <Button onClick={handleDelete}>Delete</Button>
</PermissionGuard>

// Require ANY of multiple permissions
<PermissionGuard
  permissions={[PERMISSIONS.TEST_CASE.CREATE, PERMISSIONS.TEST_CASE.UPDATE]}
  requireAll={false}
>
  <Button>Edit or Create</Button>
</PermissionGuard>

// Require ALL of multiple permissions
<PermissionGuard
  permissions={[PERMISSIONS.PROJECT.UPDATE, PERMISSIONS.CONFIGURATION.UPDATE]}
  requireAll={true}
>
  <Button>Configure Project</Button>
</PermissionGuard>
```

### 2. Using usePermissions Hook

For more complex logic in components:

```tsx
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/permissions';

const MyComponent = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  // Check single permission
  const canCreate = hasPermission(PERMISSIONS.TEST_CASE.CREATE);

  // Check if user has any of multiple permissions
  const canEdit = hasAnyPermission([
    PERMISSIONS.TEST_CASE.UPDATE,
    PERMISSIONS.TEST_CASE.CREATE
  ]);

  // Check if user has all permissions
  const canManageProject = hasAllPermissions([
    PERMISSIONS.PROJECT.UPDATE,
    PERMISSIONS.PROJECT.DELETE
  ]);

  return (
    <div>
      {canCreate && <button>Create</button>}
      {canEdit && <button>Edit</button>}
      {canManageProject && <button>Manage</button>}
    </div>
  );
};
```

### 3. Using Auth Context Directly

For lower-level access:

```tsx
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';

const MyComponent = () => {
  const { state, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  // Access user permissions array
  const userPermissions = state.user?.permissions || [];

  // Check permissions
  const canDelete = hasPermission(PERMISSIONS.TEST_CASE.DELETE);

  return (
    <div>
      <p>You have {userPermissions.length} permissions</p>
      {canDelete && <button>Delete</button>}
    </div>
  );
};
```

### 4. Conditional Navigation Items

Filter navigation based on permissions:

```tsx
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/permissions';

const Sidebar = () => {
  const { hasAnyPermission } = usePermissions();

  const allNavItems = [
    {
      path: '/test-cases',
      label: 'Test Cases',
      permissions: [PERMISSIONS.TEST_CASE.READ]
    },
    {
      path: '/test-runs',
      label: 'Test Runs',
      permissions: [PERMISSIONS.TEST_RUN.READ]
    },
    {
      path: '/reports',
      label: 'Reports',
      permissions: [PERMISSIONS.TEST_RUN.READ]
    }
  ];

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter(item =>
    item.permissions.length === 0 || hasAnyPermission(item.permissions)
  );

  return (
    <nav>
      {navItems.map(item => (
        <NavLink key={item.path} to={item.path}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};
```

## Components Updated

RBAC has been fully implemented across the application:

### Completed Components
- [x] `Sidebar.tsx` - Navigation filtering based on read permissions
- [x] `TestCasesHeader.tsx` - New Test Case button
- [x] `DraggableTestCaseRow.tsx` - Edit/Delete/Duplicate/Run Test actions
- [x] `TestRuns.tsx` - Create/Edit/Clone/Close/Delete test run actions
- [x] `TestPlans.tsx` - Create/Edit/Delete test plan actions
- [x] `SharedSteps.tsx` - Create/Edit/Delete shared step actions
- [x] `Projects.tsx` - Create/Edit/Clone/Delete project actions
- [x] `TestRunDetails.tsx` - Update test execution results in test run page
- [x] `TestCaseDetailsSidebar.tsx` - Update test execution results, run tests, and edit attachment names
- [x] `UpdateTestCaseAttachments.tsx` - Edit attachment names in update modal
- [x] `RunTestButton` - Create test executions

### Test Execution Permissions

Test execution permissions control who can interact with test results:

- **test-case-execution:create** - Run tests and create new test executions (shows "Run Test" button)
- **test-case-execution:update** - Update test results (Passed/Failed/etc.) and add comments
- **test-case-execution:read** - View test execution results and history
- **test-case-execution:delete** - Delete test execution records

**Behavior when lacking permissions:**
- Without `test-case-execution:create`: "Run Test" button is hidden in both test case table and sidebar
- Without `test-case-execution:update`: Test result dropdowns become disabled (read-only) in both test run details page and test case details sidebar
- A message appears indicating the user lacks permission to update execution results
- Users can still view results if they have read permission

### Attachment Permissions

Attachment permissions control who can manage test case attachments:

- **attachment:create** - Upload new attachments to test cases
- **attachment:read** - View and download attachments
- **attachment:update** - Edit attachment names
- **attachment:delete** - Remove attachments from test cases

**Behavior when lacking permissions:**
- Without `attachment:update`: "Edit name" button is completely hidden for attachments
- Applies to both the test case details sidebar and the update test case modal
- Users can still view and download attachments if they have read permission

### Actions Column Auto-Hide

The Actions column in tables is automatically hidden when users have no permissions to perform any actions on that resource type:

**Test Cases Table:**
- Hides "Run" column if user lacks `test-case-execution:create`
- Hides "Actions" column if user lacks ALL of: `test-case:update`, `test-case:delete`, `test-case:create`, `test-case-execution:create`

**Projects Table:**
- Hides "Actions" column if user lacks ALL of: `project:update`, `project:delete`, `project:create`

**Shared Steps Table:**
- Always shows "Actions" column with at least a "View" button
- Shows "View" button (eye icon) for ALL users with `shared-step:read` permission
- Shows "Edit" button for users with `shared-step:update` permission
- Shows "Delete" button for users with `shared-step:delete` permission
- This ensures all users can view shared step details in a read-only modal

**Test Plans Table:**
- Hides "Actions" column if user lacks ALL of: `test-plan:update`, `test-plan:delete`

**Test Runs Table:**
- Hides "Actions" column if user lacks ALL of: `test-run:update`, `test-run:delete`, `test-run:create`

This creates a cleaner, more professional UI for read-only users by removing empty columns entirely.

## Testing Permissions

To test different permission levels:

1. Log in with different user accounts that have varying roles
2. Check that:
   - Navigation items only show if user has read permission
   - Create buttons only show if user has create permission
   - Edit buttons only show if user has update permission
   - Delete buttons only show if user has delete permission
   - Actions are hidden gracefully (no broken layouts)

## Best Practices

1. **Always use PERMISSIONS constants** - Don't hardcode permission strings
2. **Hide, don't disable** - Remove UI elements rather than just disabling them
3. **Check on backend too** - Frontend checks are for UX; backend enforces security
4. **Fail securely** - If permissions are missing, default to hiding/restricting
5. **Test with minimal permissions** - Ensure the app works for restricted users
