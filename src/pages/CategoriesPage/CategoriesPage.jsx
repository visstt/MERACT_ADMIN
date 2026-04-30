import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import styles from "./CategoriesPage.module.css";

const STATIC_CATEGORIES = [
  { key: "popular", title: "popular" },
  { key: "live broadcasts", title: "live broadcasts" },
  { key: "new", title: "new" },
];

const normalizeCategoryKey = (value) => String(value || "").trim().toLowerCase();

const getCategoryId = (cat) => cat?.id ?? cat?._id ?? null;

const dynamicDisabledMessage = "Dynamic categories are disabled";

export const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState(null);
  const [catLoading, setCatLoading] = useState(false);

  const showDynamicDisabled = useCallback(() => {
    toast.info(dynamicDisabledMessage);
  }, []);

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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const staticCategories = useMemo(() => {
    const byName = new Map(
      categories.map((cat) => [normalizeCategoryKey(cat.name), cat]),
    );

    return STATIC_CATEGORIES.map((item, order) => {
      const backendCat = byName.get(item.key);
      return {
        id: getCategoryId(backendCat),
        name: item.title,
        description: backendCat?.description || "",
        order,
        isActive: backendCat?.isActive ?? true,
        actsCount: backendCat?._count?.Act ?? 0,
        missingInApi: !backendCat,
      };
    });
  }, [categories]);

  const openCategory = async (cat) => {
    if (!cat.id) {
      toast.error(`Category "${cat.name}" is not available in API`);
      return;
    }
    if (selectedCat?.id === cat.id) return;
    setCatLoading(true);
    setSelectedCat(null);
    try {
      const { data } = await api.get(`/admin/categories/${cat.id}/acts`);
      setSelectedCat(data);
    } catch {
      toast.error("Failed to load acts");
    } finally {
      setCatLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>
            Categories
            <span className={styles.count}>{STATIC_CATEGORIES.length}</span>
          </h2>
          <span className={styles.readonlyBadge}>Dynamic categories disabled</span>
        </div>

        <div className={styles.readonlyNotice}>
          Categories now are static: popular, live broadcasts, new.
        </div>

        <div className={styles.catList}>
          {catsLoading ? (
            <div className={styles.listEmpty}>Loading...</div>
          ) : (
            staticCategories.map((cat) => (
              <button
                key={cat.name}
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
                  <span>#{cat.order}</span>
                  <span>{cat.actsCount} acts</span>
                </div>
                {cat.missingInApi && (
                  <div className={styles.missingHint}>Not returned by API</div>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      <main className={styles.main}>
        {catLoading ? (
          <div className={styles.mainEmpty}>Loading acts...</div>
        ) : !selectedCat ? (
          <div className={styles.mainEmpty}>
            <p>Select a category to view acts (readonly mode)</p>
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
                  selectedCat.isActive ? styles.badgeActive : styles.badgeInactive
                }`}
              >
                {selectedCat.isActive ? "Active" : "Hidden"}
              </span>
            </div>

            <div className={styles.actsLayoutReadonly}>
              <section className={styles.actsSection}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    Assigned acts ({selectedCat.Act?.length ?? 0})
                  </h3>
                  <button
                    type="button"
                    className={styles.readonlyAction}
                    onClick={showDynamicDisabled}
                  >
                    Dynamic categories are disabled
                  </button>
                </div>
                {!selectedCat.Act?.length ? (
                  <p className={styles.noActs}>No acts in this category.</p>
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
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
