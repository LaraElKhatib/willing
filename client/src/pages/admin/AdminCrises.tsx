import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Pencil, Pin, PinOff, Plus, RotateCcw, Save, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import zod from 'zod';

import { newCrisisSchema } from '../../../../server/src/db/tables';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import ColumnLayout from '../../components/layout/ColumnLayout';
import PageHeader from '../../components/layout/PageHeader';
import useNotifications from '../../notifications/useNotifications';
import { executeAndShowError, FormField, FormRootError } from '../../utils/formUtils';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type {
  AdminCrisisCreateResponse,
  AdminCrisisDeleteResponse,
  AdminCrisisPinResponse,
  AdminCrisisUpdateResponse,
  AdminCrisesResponse,
} from '../../../../server/src/api/types';

const createCrisisFormSchema = zod.object({
  name: newCrisisSchema.shape.name,
  description: zod.string().optional(),
});
const editCrisisFormSchema = createCrisisFormSchema;

type CreateCrisisFormData = zod.infer<typeof createCrisisFormSchema>;

type CrisisSortBy = 'pinned' | 'created_at' | 'name';
type CrisisSortDir = 'asc' | 'desc';
type CrisisSortOptionValue = `${CrisisSortBy}_${CrisisSortDir}`;

type CrisisFilters = {
  search: string;
  sortBy: CrisisSortBy;
  sortDir: CrisisSortDir;
  pinned: 'all' | 'pinned' | 'unpinned';
};

const crisisSortOptions: Array<{ value: CrisisSortOptionValue; label: string; sortBy: CrisisSortBy; sortDir: CrisisSortDir }> = [
  { value: 'pinned_desc', label: 'Pinned first', sortBy: 'pinned', sortDir: 'desc' },
  { value: 'pinned_asc', label: 'Unpinned first', sortBy: 'pinned', sortDir: 'asc' },
  { value: 'created_at_desc', label: 'Newest crises', sortBy: 'created_at', sortDir: 'desc' },
  { value: 'created_at_asc', label: 'Oldest crises', sortBy: 'created_at', sortDir: 'asc' },
  { value: 'name_asc', label: 'Name: A to Z', sortBy: 'name', sortDir: 'asc' },
  { value: 'name_desc', label: 'Name: Z to A', sortBy: 'name', sortDir: 'desc' },
];

const defaultFilters: CrisisFilters = {
  search: '',
  sortBy: 'pinned',
  sortDir: 'desc',
  pinned: 'all',
};

function AdminCrises() {
  const [filters, setFilters] = useState<CrisisFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<CrisisFilters>(defaultFilters);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [isCreatingCrisis, setIsCreatingCrisis] = useState(false);
  const [editingCrisisId, setEditingCrisisId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const notifications = useNotifications();

  const crisisForm = useForm<CreateCrisisFormData>({
    resolver: zodResolver(createCrisisFormSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const getCrises = useCallback(async (nextFilters: CrisisFilters) => {
    const query: Record<string, string> = {
      sortBy: nextFilters.sortBy,
      sortDir: nextFilters.sortDir,
    };

    if (nextFilters.search.trim()) {
      query.search = nextFilters.search.trim();
    }

    if (nextFilters.pinned !== 'all') {
      query.pinned = nextFilters.pinned === 'pinned' ? 'true' : 'false';
    }

    const res = await requestServer<AdminCrisesResponse>('/admin/crises', {
      includeJwt: true,
      query,
    });
    return res.crises;
  }, []);

  const {
    data: crises,
    trigger: refreshCrises,
  } = useAsync(getCrises, { immediate: false });

  useEffect(() => {
    void refreshCrises(activeFilters);
  }, [activeFilters, refreshCrises]);

  const refreshCurrentCrises = useCallback(
    async () => refreshCrises(activeFilters),
    [activeFilters, refreshCrises],
  );

  const { trigger: updateCrisis } = useAsync(
    async (
      crisisId: number,
      data: { name: string; description?: string },
    ) => requestServer<AdminCrisisUpdateResponse>(`/admin/crises/${crisisId}`, {
      method: 'PUT',
      includeJwt: true,
      body: {
        name: data.name,
        description: data.description?.trim() ? data.description.trim() : undefined,
      },
    }),
    { notifyOnError: true },
  );

  const { trigger: deleteCrisis } = useAsync(
    async (crisisId: number) => requestServer<AdminCrisisDeleteResponse>(`/admin/crises/${crisisId}`, {
      method: 'DELETE',
      includeJwt: true,
    }),
    { notifyOnError: true },
  );

  const { trigger: toggleCrisisPin } = useAsync(
    async (crisisId: number, pinned: boolean) => requestServer<AdminCrisisPinResponse>(`/admin/crises/${crisisId}/pin`, {
      method: 'PATCH',
      includeJwt: true,
      body: {
        pinned: !pinned,
      },
    }),
    { notifyOnError: true },
  );

  const onCreateCrisis = crisisForm.handleSubmit(async (data) => {
    await executeAndShowError(crisisForm, async () => {
      setIsCreatingCrisis(true);

      await requestServer<AdminCrisisCreateResponse>('/admin/crises', {
        method: 'POST',
        includeJwt: true,
        body: {
          name: data.name,
          description: data.description?.trim() ? data.description.trim() : undefined,
        },
      });

      crisisForm.reset({
        name: '',
        description: '',
      });
      await refreshCurrentCrises();
      notifications.push({
        type: 'success',
        message: 'Crisis created successfully.',
      });
    });

    setIsCreatingCrisis(false);
  });

  const onStartEdit = (crisisId: number, name: string, description?: string) => {
    setEditingCrisisId(crisisId);
    setEditingName(name);
    setEditingDescription(description ?? '');
  };

  const onCancelEdit = () => {
    setEditingCrisisId(null);
    setEditingName('');
    setEditingDescription('');
  };

  const onSaveEdit = async (crisisId: number) => {
    const parsed = editCrisisFormSchema.safeParse({
      name: editingName,
      description: editingDescription,
    });

    if (!parsed.success) {
      notifications.push({
        type: 'warning',
        message: parsed.error.issues[0]?.message ?? 'Invalid crisis details',
      });
      return;
    }

    setActionBusyId(crisisId);

    try {
      await updateCrisis(crisisId, parsed.data);

      await refreshCurrentCrises();
      notifications.push({
        type: 'success',
        message: 'Crisis updated successfully.',
      });
      onCancelEdit();
    } finally {
      setActionBusyId(null);
    }
  };

  const onDelete = async (crisisId: number, name: string) => {
    const confirmed = window.confirm(`Delete crisis "${name}"?`);
    if (!confirmed) return;

    setActionBusyId(crisisId);

    try {
      await deleteCrisis(crisisId);

      if (editingCrisisId === crisisId) {
        onCancelEdit();
      }

      await refreshCurrentCrises();
      notifications.push({
        type: 'success',
        message: 'Crisis deleted successfully.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const onTogglePin = async (crisisId: number, pinned: boolean) => {
    setActionBusyId(crisisId);

    try {
      await toggleCrisisPin(crisisId, pinned);

      await refreshCurrentCrises();
      notifications.push({
        type: 'success',
        message: pinned ? 'Crisis unpinned.' : 'Crisis pinned.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const crisisCountBadge = useMemo(() => {
    if (!crises) {
      return <div className="w-18 h-6 skeleton" />;
    }

    return (
      <div className="badge badge-primary">
        {crises.length}
        {' '}
        Total
      </div>
    );
  }, [crises]);

  const hasPendingChanges = useMemo(() => JSON.stringify(filters) !== JSON.stringify(activeFilters), [filters, activeFilters]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveFilters(filters);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setActiveFilters(defaultFilters);
    setShowAdvancedSearch(false);
  };

  const selectedSortOption = crisisSortOptions.find(option => (
    option.sortBy === filters.sortBy && option.sortDir === filters.sortDir
  )) ?? crisisSortOptions[0];

  const hasAdvancedFiltersApplied = filters.pinned !== 'all';

  const onSortChange = (value: CrisisSortOptionValue) => {
    const nextOption = crisisSortOptions.find(option => option.value === value);
    if (!nextOption) return;

    setFilters(prev => ({
      ...prev,
      sortBy: nextOption.sortBy,
      sortDir: nextOption.sortDir,
    }));
  };

  return (
    <div className="grow bg-base-200">
      <div className="p-6 md:container mx-auto">
        <PageHeader
          title="Crisis Management"
          subtitle="Create, edit, delete, and pin crises according to the current situation."
          icon={AlertCircle}
        />

        <ColumnLayout
          stickySidebar
          sidebar={(
            <div className="card border border-primary/20 bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title text-base">Create Crisis</h3>
                <p className="text-sm opacity-70">Add a new crisis entry.</p>

                <form className="mt-2 space-y-4" onSubmit={onCreateCrisis}>
                  <FormField
                    form={crisisForm}
                    name="name"
                    label="Crisis Name"
                    placeholder="Crisis name"
                    Icon={AlertCircle}
                  />
                  <FormField
                    form={crisisForm}
                    name="description"
                    label="Description (Optional)"
                    type="textarea"
                  />

                  <Button
                    color="primary"
                    type="submit"
                    loading={isCreatingCrisis}
                    Icon={Plus}
                    layout="block"
                  >
                    Add Crisis
                  </Button>
                </form>

                <FormRootError form={crisisForm} />
              </div>
            </div>
          )}
        >
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Existing Crises</h3>
              {crisisCountBadge}
            </div>

            <div className="mb-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
              <form className="space-y-3" onSubmit={applyFilters}>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <label className="input input-bordered flex items-center gap-2 lg:col-span-2">
                    <Search className="h-4 w-4 opacity-70" />
                    <input
                      type="text"
                      className="grow"
                      placeholder="Search crisis name or description"
                      value={filters.search}
                      onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
                    />
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={selectedSortOption.value}
                    onChange={event => onSortChange(event.target.value as CrisisSortOptionValue)}
                  >
                    {crisisSortOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <Button color="primary" type="submit" disabled={!hasPendingChanges}>Search</Button>

                  <Button
                    type="button"
                    color={hasAdvancedFiltersApplied || showAdvancedSearch ? 'secondary' : 'ghost'}
                    onClick={() => setShowAdvancedSearch(prev => !prev)}
                    Icon={SlidersHorizontal}
                  >
                    Advanced Search
                  </Button>
                </div>

                {showAdvancedSearch && (
                  <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">Advanced Search</h4>
                        <p className="text-sm opacity-70">Use these extra filters when you want tighter control over the results.</p>
                      </div>
                      <Button type="button" color="ghost" onClick={resetFilters} disabled={!hasPendingChanges} Icon={RotateCcw}>Reset</Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <select
                        className="select select-bordered w-full"
                        value={filters.pinned}
                        onChange={event => setFilters(prev => ({
                          ...prev,
                          pinned: event.target.value as CrisisFilters['pinned'],
                        }))}
                      >
                        <option value="all">Pinned State: All</option>
                        <option value="pinned">Pinned State: Pinned</option>
                        <option value="unpinned">Pinned State: Unpinned</option>
                      </select>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {!crises
              ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="skeleton h-24 rounded-box" />
                    <div className="skeleton h-24 rounded-box" />
                  </div>
                )
              : crises.length === 0
                ? (
                    <Alert style="soft">
                      No crises added yet.
                    </Alert>
                  )
                : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {crises.map(crisis => (
                        <div
                          key={crisis.id}
                          className="card border border-base-300 bg-base-100 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="card-body">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                                  <AlertCircle size={16} />
                                </div>
                                <h4 className="font-bold text-lg leading-tight">{crisis.name}</h4>
                              </div>
                              {crisis.pinned && <span className="badge badge-secondary">Pinned</span>}
                            </div>

                            {editingCrisisId === crisis.id
                              ? (
                                  <div className="space-y-3 mt-2">
                                    <input
                                      value={editingName}
                                      onChange={event => setEditingName(event.target.value)}
                                      className="input input-bordered w-full"
                                      placeholder="Crisis name"
                                    />
                                    <textarea
                                      value={editingDescription}
                                      onChange={event => setEditingDescription(event.target.value)}
                                      className="textarea textarea-bordered w-full"
                                      placeholder="Description (optional)"
                                      rows={3}
                                    />
                                    <div className="flex flex-row-reverse flex-wrap gap-2">
                                      <Button
                                        color="primary"
                                        type="button"
                                        onClick={() => onSaveEdit(crisis.id)}
                                        disabled={actionBusyId === crisis.id}
                                        Icon={Save}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        type="button"
                                        color="ghost"
                                        onClick={onCancelEdit}
                                        disabled={actionBusyId === crisis.id}
                                        Icon={X}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )
                              : (
                                  <>
                                    <p className="text-sm opacity-70 mt-2 whitespace-pre-wrap wrap-break-word">
                                      {crisis.description || 'No description set'}
                                    </p>
                                    <div className="card-actions justify-end mt-2">
                                      <Button
                                        type="button"
                                        style="outline"
                                        size="sm"
                                        onClick={() => onTogglePin(crisis.id, crisis.pinned)}
                                        disabled={actionBusyId === crisis.id}
                                        Icon={crisis.pinned ? PinOff : Pin}
                                      >
                                        {crisis.pinned ? 'Unpin' : 'Pin'}
                                      </Button>
                                      <Button
                                        type="button"
                                        style="outline"
                                        size="sm"
                                        onClick={() => onStartEdit(crisis.id, crisis.name, crisis.description)}
                                        disabled={actionBusyId === crisis.id}
                                        Icon={Pencil}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        type="button"
                                        style="outline"
                                        color="error"
                                        size="sm"
                                        onClick={() => onDelete(crisis.id, crisis.name)}
                                        disabled={actionBusyId === crisis.id}
                                        Icon={Trash2}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </>
                                )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
          </section>
        </ColumnLayout>
      </div>
    </div>
  );
}

export default AdminCrises;
