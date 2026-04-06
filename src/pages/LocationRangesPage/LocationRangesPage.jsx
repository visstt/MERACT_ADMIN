import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Button, Card } from "../../shared/ui";
import api from "../../shared/lib/axios";
import styles from "./LocationRangesPage.module.css";

const EMPTY_FORM = {
  label: "",
  minKm: 0,
  maxKm: 0,
  order: 0,
  isActive: true,
};

const getRangeId = (range) => range?.id ?? range?._id;

const sortRanges = (ranges) =>
  [...ranges].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return (a.minKm ?? 0) - (b.minKm ?? 0);
  });

const hasOverlap = (candidate, ranges, editingId) =>
  ranges.some((range) => {
    const rangeId = getRangeId(range);
    if (rangeId === editingId || !range.isActive) return false;
    return !(candidate.maxKm < range.minKm || candidate.minKm > range.maxKm);
  });

const validateForm = (form, ranges, editingId) => {
  const label = form.label.trim();
  const minKm = Number(form.minKm);
  const maxKm = Number(form.maxKm);
  const order = Number(form.order);

  if (!label) return "Label is required";
  if (!Number.isFinite(minKm) || minKm < 0) {
    return "Minimum distance must be 0 or greater";
  }
  if (!Number.isFinite(maxKm) || maxKm < 0) {
    return "Maximum distance must be 0 or greater";
  }
  if (minKm > maxKm) return "Minimum distance cannot be greater than maximum";
  if (!Number.isFinite(order) || order < 0) {
    return "Order must be 0 or greater";
  }

  const duplicateOrder = ranges.some((range) => {
    const rangeId = getRangeId(range);
    return rangeId !== editingId && Number(range.order) === order;
  });
  if (duplicateOrder) return "Order must be unique";

  if (form.isActive && hasOverlap({ minKm, maxKm }, ranges, editingId)) {
    return "Active ranges cannot overlap";
  }

  return null;
};

export const LocationRangesPage = () => {
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRange, setEditingRange] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchRanges = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/location-ranges");
      setRanges(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load location ranges",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanges();
  }, [fetchRanges]);

  const sortedRanges = useMemo(() => sortRanges(ranges), [ranges]);
  const activeRanges = useMemo(
    () => sortedRanges.filter((range) => range.isActive),
    [sortedRanges],
  );

  const openCreateModal = () => {
    setEditingRange(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (range) => {
    setEditingRange(range);
    setForm({
      label: range.label || "",
      minKm: Number(range.minKm ?? 0),
      maxKm: Number(range.maxKm ?? 0),
      order: Number(range.order ?? 0),
      isActive: Boolean(range.isActive),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRange(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const editingId = getRangeId(editingRange);
    const error = validateForm(form, ranges, editingId);
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      label: form.label.trim(),
      minKm: Number(form.minKm),
      maxKm: Number(form.maxKm),
      order: Number(form.order),
      isActive: Boolean(form.isActive),
    };

    setSubmitting(true);
    try {
      if (editingRange) {
        await api.patch(`/admin/location-ranges/${editingId}`, payload);
        toast.success("Location range updated");
      } else {
        await api.post("/admin/location-ranges", payload);
        toast.success("Location range created");
      }

      closeModal();
      fetchRanges();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save location range",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (range) => {
    const rangeId = getRangeId(range);
    if (!rangeId) return;
    if (!confirm(`Delete range "${range.label}"?`)) return;

    try {
      await api.delete(`/admin/location-ranges/${rangeId}`);
      toast.success("Location range deleted");
      fetchRanges();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to delete location range",
      );
    }
  };

  const handleToggleActive = async (range) => {
    const nextIsActive = !range.isActive;
    const rangeId = getRangeId(range);

    if (
      nextIsActive &&
      hasOverlap(
        { minKm: Number(range.minKm), maxKm: Number(range.maxKm) },
        ranges,
        rangeId,
      )
    ) {
      toast.error("Cannot activate a range that overlaps another active range");
      return;
    }

    try {
      await api.patch(`/admin/location-ranges/${rangeId}`, {
        isActive: nextIsActive,
      });
      toast.success(nextIsActive ? "Range activated" : "Range disabled");
      fetchRanges();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update range status",
      );
    }
  };

  const editingId = getRangeId(editingRange);
  const formError = validateForm(form, ranges, editingId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Location Ranges</h1>
          <p className={styles.subtitle}>
            Configure slider steps for the public location selector.
          </p>
        </div>
        <Button onClick={openCreateModal}>+ Add range</Button>
      </div>

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <span className={styles.statLabel}>All ranges</span>
          <strong className={styles.statValue}>{sortedRanges.length}</strong>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statLabel}>Active</span>
          <strong className={styles.statValue}>{activeRanges.length}</strong>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statLabel}>Public source</span>
          <strong className={styles.statEndpoint}>/api/geo/location-ranges</strong>
        </Card>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h2 className={styles.tableTitle}>Slider steps</h2>
            <p className={styles.tableSubtitle}>
              Active ranges should stay ordered and non-overlapping.
            </p>
          </div>
          <Button variant="ghost" onClick={fetchRanges}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading ranges...</div>
        ) : sortedRanges.length === 0 ? (
          <div className={styles.emptyState}>
            No ranges yet. Add the first slider step to get started.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Min km</th>
                  <th>Max km</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th className={styles.actionsHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRanges.map((range) => {
                  const rangeId = getRangeId(range);
                  return (
                    <tr key={rangeId}>
                      <td>
                        <div className={styles.labelCell}>
                          <strong>{range.label}</strong>
                        </div>
                      </td>
                      <td>{range.minKm}</td>
                      <td>{range.maxKm}</td>
                      <td>{range.order}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            range.isActive
                              ? styles.badgeActive
                              : styles.badgeInactive
                          }`}
                        >
                          {range.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(range)}
                          >
                            {range.isActive ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(range)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(range)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editingRange ? "Edit location range" : "New location range"}</h2>
                <p className={styles.modalSubtitle}>
                  These values drive the public location slider steps.
                </p>
              </div>
              <button className={styles.closeBtn} onClick={closeModal}>
                x
              </button>
            </div>

            <form className={styles.modalBody} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Label</label>
                <input
                  type="text"
                  placeholder="City"
                  value={form.label}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, label: e.target.value }))
                  }
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Min km</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minKm}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        minKm: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Max km</label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxKm}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maxKm: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        order: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                />
                <span>Active in public slider</span>
              </label>

              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.preview}>
                <span className={styles.previewLabel}>Preview</span>
                <strong>
                  {form.label.trim() || "Untitled"}: {form.minKm || 0}-{form.maxKm || 0} km
                </strong>
              </div>

              <div className={styles.modalActions}>
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || Boolean(formError)}>
                  {submitting
                    ? "Saving..."
                    : editingRange
                      ? "Save changes"
                      : "Create range"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
