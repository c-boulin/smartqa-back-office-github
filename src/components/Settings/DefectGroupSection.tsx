import React, { useCallback, useState } from 'react';
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../UI/ConfirmDialog';
import {
  DefectGroupData,
  DefectTypeData,
  autoAbbreviation,
  createDefectType,
  deleteDefectType,
  deleteDefectGroup,
  slugify,
  updateDefectType,
  updateDefectGroup,
} from '../../services/defectGroupsApi';

// ─── Small donut chart (conic-gradient) ──────────────────────────────────────

function GroupDonut({ types }: { types: DefectTypeData[] }): React.ReactElement | null {
  if (types.length === 0) return null;
  const segments = types.map((t, i) => {
    const start = (i / types.length) * 100;
    const end = ((i + 1) / types.length) * 100;
    return `${t.color} ${start}% ${end}%`;
  });
  return (
    <div
      className="relative h-8 w-8 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${segments.join(', ')})` }}
    >
      <div className="absolute inset-[7px] rounded-full bg-white dark:bg-slate-900" />
    </div>
  );
}

// ─── Inline row for adding a new type ────────────────────────────────────────

interface AddRowProps {
  groupId: number;
  nextPosition: number;
  onSaved: (type: DefectTypeData) => void;
  onCancel: () => void;
}

function AddRow({ groupId, nextPosition, onSaved, onCancel }: AddRowProps): React.ReactElement {
  const [name, setName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [color, setColor] = useState('#64748b');
  const [saving, setSaving] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!abbr || abbr === autoAbbreviation(name)) {
      setAbbr(autoAbbreviation(v));
    }
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const created = await createDefectType({
        group_id: groupId,
        name: name.trim(),
        slug: slugify(name.trim()),
        abbreviation: abbr.trim() || autoAbbreviation(name.trim()),
        color,
        is_default: false,
      });
      onSaved(created);
      toast.success('Defect type created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create defect type');
    } finally {
      setSaving(false);
    }
  }, [groupId, name, abbr, color, nextPosition, onSaved]);

  return (
    <tr className="bg-slate-50 dark:bg-slate-800/40">
      <td className="px-4 py-2 pl-10">
        <div className="flex items-center gap-2">
          <div className="relative h-5 w-5 shrink-0 rounded-full overflow-hidden border border-slate-300 dark:border-slate-500 cursor-pointer" style={{ backgroundColor: color }} data-mipqa="add-type-color-input">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute inset-0 h-full w-full opacity-0 cursor-pointer" />
          </div>
          <input
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="Defect name…"
            autoFocus
            className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            data-mipqa="add-type-name-input"
          />
        </div>
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          value={abbr}
          onChange={e => setAbbr(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="AB"
          className="w-20 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          data-mipqa="add-type-abbr-input"
        />
      </td>
      <td className="px-4 py-2">
        <span className="inline-block h-5 w-5 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: color }} />
      </td>
      <td className="px-4 py-2" />
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50"
            data-mipqa="add-type-save-btn"
          >
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent inline-block" /> : <Check className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onCancel} className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" data-mipqa="add-type-cancel-btn">
            <X className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Type row (view + inline edit) ───────────────────────────────────────────

interface TypeRowProps {
  type: DefectTypeData;
  onUpdated: (updated: DefectTypeData) => void;
  onDeleted: (id: number) => void;
}

function TypeRow({ type, onUpdated, onDeleted }: TypeRowProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [abbr, setAbbr] = useState(type.abbreviation);
  const [color, setColor] = useState(type.color);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const updated = await updateDefectType(type.id, {
        name: name.trim(),
        abbreviation: abbr.trim(),
        color,
      });
      onUpdated(updated);
      setEditing(false);
      toast.success('Defect type updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }, [type.id, name, abbr, color, onUpdated]);

  const handleCancelEdit = () => {
    setName(type.name);
    setAbbr(type.abbreviation);
    setColor(type.color);
    setEditing(false);
  };

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteDefectType(type.id);
      onDeleted(type.id);
      toast.success('Defect type deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }, [type.id, onDeleted]);

  if (editing) {
    return (
      <tr className="bg-cyan-50/30 dark:bg-cyan-900/10">
        <td className="px-4 py-2 pl-10">
          <div className="flex items-center gap-2">
            <div className="relative h-5 w-5 shrink-0 rounded-full overflow-hidden border border-slate-300 dark:border-slate-500 cursor-pointer" style={{ backgroundColor: color }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute inset-0 h-full w-full opacity-0 cursor-pointer" />
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              data-mipqa={`edit-type-name-${type.id}`}
            />
          </div>
        </td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={abbr}
            onChange={e => setAbbr(e.target.value.toUpperCase().slice(0, 6))}
            className="w-20 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            data-mipqa={`edit-type-abbr-${type.id}`}
          />
        </td>
        <td className="px-4 py-2">
          <span className="inline-block h-5 w-5 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: color }} />
        </td>
        <td className="px-4 py-2" />
        <td className="px-4 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50"
              data-mipqa={`edit-type-save-${type.id}`}
            >
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent inline-block" /> : <Check className="h-4 w-4" />}
            </button>
            <button type="button" onClick={handleCancelEdit} className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr
        className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
        data-mipqa={`defect-type-row-${type.id}`}
      >
        <td className="px-4 py-2.5 pl-10">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: type.color }} />
            <span className="text-sm text-slate-800 dark:text-slate-200">{type.name}</span>
            {type.isDefault && (
              <span className="rounded bg-cyan-100 dark:bg-cyan-900/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-700 dark:text-cyan-400">
                default
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5">
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{type.abbreviation}</span>
        </td>
        <td className="px-4 py-2.5">
          <span className="inline-block h-5 w-5 rounded-full" style={{ backgroundColor: type.color }} />
        </td>
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Edit"
              data-mipqa={`defect-type-edit-btn-${type.id}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="rounded p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              title="Delete"
              data-mipqa={`defect-type-delete-btn-${type.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete defect type"
        message={`Are you sure you want to delete "${type.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}

// ─── Main group section ───────────────────────────────────────────────────────

interface DefectGroupSectionProps {
  group: DefectGroupData;
  onGroupUpdated: (group: DefectGroupData) => void;
  onGroupDeleted: (id: number) => void;
}

function DefectGroupSection({ group, onGroupUpdated, onGroupDeleted }: DefectGroupSectionProps): React.ReactElement {
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(group.name);
  const [savingName, setSavingName] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const handleTypeAdded = (type: DefectTypeData) => {
    onGroupUpdated({ ...group, defectTypes: [...group.defectTypes, type] });
    setShowAddRow(false);
  };

  const handleTypeUpdated = (updated: DefectTypeData) => {
    onGroupUpdated({
      ...group,
      defectTypes: group.defectTypes.map(t => (t.id === updated.id ? updated : t)),
    });
  };

  const handleTypeDeleted = (id: number) => {
    onGroupUpdated({ ...group, defectTypes: group.defectTypes.filter(t => t.id !== id) });
  };

  const handleStartEditName = () => {
    setNameInput(group.name);
    setEditingName(true);
  };

  const handleCancelEditName = () => {
    setNameInput(group.name);
    setEditingName(false);
  };

  const handleSaveName = useCallback(async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { toast.error('Group name is required'); return; }
    if (trimmed === group.name) { setEditingName(false); return; }
    setSavingName(true);
    try {
      const updated = await updateDefectGroup(group.id, { name: trimmed });
      onGroupUpdated({ ...group, name: updated.name });
      setEditingName(false);
      toast.success('Group updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setSavingName(false);
    }
  }, [group, nameInput, onGroupUpdated]);

  const handleDeleteGroup = useCallback(async () => {
    setDeletingGroup(true);
    try {
      await deleteDefectGroup(group.id);
      onGroupDeleted(group.id);
      toast.success('Group deleted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete group';
      toast.error(msg);
    } finally {
      setDeletingGroup(false);
      setConfirmDeleteGroup(false);
    }
  }, [group.id, onGroupDeleted]);

  return (
    <>
      <tbody>
        {/* Group header */}
        <tr className="bg-slate-100 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 group/header">
          <td colSpan={3} className="px-4 py-2">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                  autoFocus
                  className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-56"
                  data-mipqa={`edit-group-name-input-${group.id}`}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="rounded p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                  data-mipqa={`edit-group-save-btn-${group.id}`}
                >
                  {savingName
                    ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent inline-block" />
                    : <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditName}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  data-mipqa={`edit-group-cancel-btn-${group.id}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {group.name}
              </span>
            )}
          </td>
          <td className="px-4 py-2 text-center">
            <GroupDonut types={group.defectTypes} />
          </td>
          <td className="px-4 py-2">
            <div className="flex items-center gap-1">
              {!editingName && (
                <>
                  <button
                    type="button"
                    onClick={handleStartEditName}
                    className="rounded p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover/header:opacity-100"
                    title="Rename group"
                    data-mipqa={`group-edit-btn-${group.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteGroup(true)}
                    disabled={deletingGroup}
                    className="rounded p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover/header:opacity-100 disabled:opacity-50"
                    title="Delete group"
                    data-mipqa={`group-delete-btn-${group.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRow(v => !v)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                    data-mipqa={`add-type-btn-${group.id}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add type
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>

        {/* Type rows */}
        {group.defectTypes.map(type => (
          <TypeRow
            key={type.id}
            type={type}
            onUpdated={handleTypeUpdated}
            onDeleted={handleTypeDeleted}
          />
        ))}

        {/* Inline add row */}
        {showAddRow && (
          <AddRow
            groupId={group.id}
            nextPosition={group.defectTypes.length + 1}
            onSaved={handleTypeAdded}
            onCancel={() => setShowAddRow(false)}
          />
        )}
      </tbody>

      <ConfirmDialog
        isOpen={confirmDeleteGroup}
        onClose={() => setConfirmDeleteGroup(false)}
        onConfirm={handleDeleteGroup}
        title="Delete group"
        message={`Are you sure you want to delete the group "${group.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}

export { DefectGroupSection };
