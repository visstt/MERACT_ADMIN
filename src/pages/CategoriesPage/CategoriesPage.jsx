import { useState, useEffect, useCallback } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import styles from "./CategoriesPage.module.css";

const EMPTY_FORM = { name: "", description: "", order: 0, isActive: true };

export const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);

  const [selectedCat, setSelectedCat] = useState(null); // { id, name, Act: [] }
  const [catLoading, setCatLoading] = useState(false);

  const [allActs, setAllActs] = useState([]);
  const [actSearch, setActSearch] = useState("");

  // Create / edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch categories ─────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setCatsLoading(true);
    try {
      const { data } = await api.get("/admin/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setCatsLoading(false);
    }
  }, []);

  // ── Fetch all acts (for picker) ───────────────────────────────
  const fetchAllActs = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/streams/active");
      setAllActs(Array.isArray(data) ? data : []);
    } catch {
      // Not critical — picker just stays empty
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchAllActs();
  }, [fetchCategories, fetchAllActs]);

  // ── Open category detail ──────────────────────────────────────
  const openCategory = async (cat) => {
    if (selectedCat?.id === cat.id) return;
    setCatLoading(true);
    setSelectedCat(null);
    try {
      const { data } = await api.get(`/admin/categories/${cat.id}/acts`);
      setSelectedCat(data);
      setActSearch("");
    } catch {
      toast.error("Failed to load acts");
    } finally {
      setCatLoading(false);
    }
  };

  const refreshSelected = async () => {
    if (!selectedCat) return;
    try {
      const { data } = await api.get(
        `/admin/categories/${selectedCat.id}/acts`,
      );
      setSelectedCat(data);
    } catch {}
  };

  // ── CRUD ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingCat(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditingCat(cat);
    setForm({
      name: cat.name,
      description: cat.description || "",
      order: cat.order ?? 0,
      isActive: cat.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCat(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCat) {
        await api.patch(`/admin/categories/${editingCat.id}`, form);
        toast.success("Category updated!");
      } else {
        await api.post("/admin/categories", form);
        toast.success("Category created!");
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        "Delete this category? Acts will remain but become uncategorised.",
      )
    )
      return;
    try {
      await api.delete(`/admin/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCat?.id === id) setSelectedCat(null);
      toast.success("Category deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete category");
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await api.patch(`/admin/categories/${cat.id}`, {
        isActive: !cat.isActive,
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id ? { ...c, isActive: !c.isActive } : c,
        ),
      );
      if (selectedCat?.id === cat.id) {
        setSelectedCat((prev) => ({ ...prev, isActive: !prev.isActive }));
      }
    } catch {
      toast.error("Failed to update category");
    }
  };

  // ── Act assignment ────────────────────────────────────────────
  const handleAddAct = async (actId) => {
    if (!selectedCat) return;
    try {
      await api.patch(`/admin/categories/${selectedCat.id}/acts/${actId}`, {});
      refreshSelected();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add act");
    }
  };

  const handleRemoveAct = async (actId) => {
    if (!selectedCat) return;
    try {
      await api.delete(`/admin/categories/${selectedCat.id}/acts`, {
        data: { actIds: [actId] },
      });
      setSelectedCat((prev) => ({
        ...prev,
        Act: prev.Act.filter((a) => a.id !== actId),
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove act");
    }
  };

  // Sorted categories
  const sorted = [...categories].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  // Acts not yet in this category
  const assignedIds = new Set((selectedCat?.Act ?? []).map((a) => a.id));
  const filteredAllActs = allActs
    .filter((a) => !assignedIds.has(a.id))
    .filter((a) => {
      const q = actSearch.toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) ||
        a.user?.login?.toLowerCase().includes(q)
      );
    });

  return (
    <div className={styles.container}>
      {/* ── Left: category list ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>
            Categories
            <span className={styles.count}>{categories.length}</span>
          </h2>
          <Button size="sm" onClick={openCreate}>
            + New
          </Button>
        </div>

        <div className={styles.catList}>
          {catsLoading ? (
            <div className={styles.listEmpty}>Loading…</div>
          ) : sorted.length === 0 ? (
            <div className={styles.listEmpty}>No categories yet</div>
          ) : (
            sorted.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.catItem} ${
                  selectedCat?.id === cat.id ? styles.catItemActive : ""
                }`}
                onClick={() => openCategory(cat)}
              >
                <div className={styles.catItemTop}>
                  <span className={styles.catItemName}>{cat.name}</span>
                  <span
                    className={`${styles.activeDot} ${
                      cat.isActive ? styles.dotActive : styles.dotInactive
                    }`}
                  />
                </div>
                <div className={styles.catItemMeta}>
                  <span>#{cat.order ?? 0}</span>
                  <span>{cat._count?.Act ?? 0} acts</span>
                </div>
                <div
                  className={styles.catItemActions}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleToggleActive(cat)}
                    title={cat.isActive ? "Hide" : "Show"}
                  >
                    {cat.isActive ? "🔵" : "⚪"}
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={() => openEdit(cat)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleDelete(cat.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Right: acts panel ── */}
      <main className={styles.main}>
        {catLoading ? (
          <div className={styles.mainEmpty}>Loading acts…</div>
        ) : !selectedCat ? (
          <div className={styles.mainEmpty}>
            <span>📂</span>
            <p>Select a category to manage its acts</p>
          </div>
        ) : (
          <>
            <div className={styles.mainHeader}>
              <div>
                <h2 className={styles.mainTitle}>{selectedCat.name}</h2>
                {selectedCat.description && (
                  <p className={styles.mainDesc}>{selectedCat.description}</p>
                )}
              </div>
              <span
                className={`${styles.statusBadge} ${
                  selectedCat.isActive
                    ? styles.badgeActive
                    : styles.badgeInactive
                }`}
              >
                {selectedCat.isActive ? "Active" : "Hidden"}
              </span>
            </div>

            <div className={styles.actsLayout}>
              {/* Assigned acts */}
              <section className={styles.actsSection}>
                <h3 className={styles.sectionTitle}>
                  Assigned acts ({selectedCat.Act?.length ?? 0})
                </h3>
                {!selectedCat.Act?.length ? (
                  <p className={styles.noActs}>
                    No acts assigned. Add from the picker below.
                  </p>
                ) : (
                  <div className={styles.actList}>
                    {selectedCat.Act.map((act) => (
                      <div key={act.id} className={styles.actRow}>
                        <div className={styles.actInfo}>
                          <span className={styles.actTitle}>{act.title}</span>
                          <span
                            className={`${styles.actStatus} ${styles[`status${act.status}`]}`}
                          >
                            {act.status}
                          </span>
                          {act.user && (
                            <span className={styles.actUser}>
                              {act.user.login || act.user.email}
                            </span>
                          )}
                        </div>
                        <button
                          className={styles.removeBtn}
                          onClick={() => handleRemoveAct(act.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Act picker */}
              <section className={styles.actsSection}>
                <h3 className={styles.sectionTitle}>Add acts</h3>
                <input
                  className={styles.searchInput}
                  placeholder="Search by title or streamer…"
                  value={actSearch}
                  onChange={(e) => setActSearch(e.target.value)}
                />
                {filteredAllActs.length === 0 ? (
                  <p className={styles.noActs}>
                    {actSearch ? "No matches" : "All acts are assigned"}
                  </p>
                ) : (
                  <div className={styles.actList}>
                    {filteredAllActs.map((act) => (
                      <div key={act.id} className={styles.actRow}>
                        <div className={styles.actInfo}>
                          <span className={styles.actTitle}>{act.title}</span>
                          <span
                            className={`${styles.actStatus} ${styles[`status${act.status}`]}`}
                          >
                            {act.status}
                          </span>
                          {act.user && (
                            <span className={styles.actUser}>
                              {act.user.login || act.user.email}
                            </span>
                          )}
                        </div>
                        <button
                          className={styles.addBtn}
                          onClick={() => handleAddAct(act.id)}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      {/* ── Modal ── */}
      {showModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingCat ? "Edit category" : "New category"}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                ×
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Name</label>
                  <input
                    type="text"
                    placeholder="Popular"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup} style={{ maxWidth: 100 }}>
                  <label>Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) =>
                      setForm({ ...form, order: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>
                  Description <span className={styles.opt}>optional</span>
                </label>
                <input
                  type="text"
                  placeholder="Short description shown to users"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className={styles.checkboxRow}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                  />
                  <span>Visible on site</span>
                </label>
              </div>
              <div className={styles.modalActions}>
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : editingCat ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
