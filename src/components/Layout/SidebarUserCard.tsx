import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_BADGE_COLORS: Record<string, string> = {
  administrator: '#47246E',
  admin: '#47246E',
  'project manager': '#24446E',
  manager: '#24446E',
  guest: '#655B7C',
};

function getRoleBadgeColor(roleSlug?: string, roleName?: string): string {
  const key = (roleSlug ?? roleName ?? '').toLowerCase();
  for (const [pattern, color] of Object.entries(ROLE_BADGE_COLORS)) {
    if (key.includes(pattern)) return color;
  }
  return '#24446E';
}

const ROLE_DISPLAY_LABELS: Array<[string, string]> = [
  ['superadmin', 'Super Admin'],
  ['administrator', 'Administrator'],
  ['admin', 'Administrator'],
  ['project manager', 'Project Manager'],
  ['projectmanager', 'Project Manager'],
  ['project_manager', 'Project Manager'],
  ['project-manager', 'Project Manager'],
  ['manager', 'Project Manager'],
  ['guest', 'Guest'],
];

export function getRoleDisplayLabel(roleSlug?: string, roleName?: string): string {
  const key = (roleSlug ?? roleName ?? '').toLowerCase().trim();
  for (const [pattern, label] of ROLE_DISPLAY_LABELS) {
    if (key === pattern || key.includes(pattern)) return label;
  }
  if (roleName) {
    const match = roleName.match(/\(([^)]+)\)/);
    return match ? match[1] : roleName;
  }
  return '';
}

const SidebarUserCard: React.FC = () => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const user = state.user;
  if (!user) return null;

  const roleName = user.role?.name ?? '';
  const roleSlug = user.role?.slug ?? '';
  const badgeColor = getRoleBadgeColor(roleSlug, roleName);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
      data-mipqa="sidebar-user-card"
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)' }}
        data-mipqa="sidebar-user-avatar-img"
      >
        <User className="w-5 h-5 text-white" />
      </div>

      {/* Name + Role */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          data-mipqa="sidebar-user-name"
        >
          {user.name || user.login}
        </p>
        {roleName && (
          <span
            className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-xs font-medium"
            style={{
              backgroundColor: badgeColor,
              color: 'rgba(255,255,255,0.7)',
            }}
            data-mipqa="sidebar-user-role-badge"
          >
          {getRoleDisplayLabel(roleSlug, roleName)}
          </span>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="shrink-0 p-1.5 rounded-md transition-colors hover:bg-white/10"
        style={{ color: 'rgba(255,255,255,0.7)' }}
        title="Logout"
        data-mipqa="sidebar-logout-button"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SidebarUserCard;
