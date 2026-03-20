import { useState, useEffect, useCallback } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import styles from "./PoliciesPage.module.css";

// ─── Policies ────────────────────────────────────────────────

const EMPTY_POLICY = { slug: "", title: "", content: "", isPublished: true };
const EMPTY_CONSENT = {
  slug: "",
  title: "",
  description: "",
  isRequired: false,
  version: "1.0",
  isActive: true,
};

export const PoliciesPage = () => {
  const [tab, setTab] = useState("policies"); // "policies" | "consents"

  // Policies state
  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [policyForm, setPolicyForm] = useState(EMPTY_POLICY);
  const [policySubmitting, setPolicySubmitting] = useState(false);

  // Consents state
  const [consents, setConsents] = useState([]);
  const [consentsLoading, setConsentsLoading] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [editingConsent, setEditingConsent] = useState(null);
  const [consentForm, setConsentForm] = useState(EMPTY_CONSENT);
  const [consentSubmitting, setConsentSubmitting] = useState(false);

  const fetchPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    try {
      const { data } = await api.get("/admin/policies");
      setPolicies(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load policies");
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  const fetchConsents = useCallback(async () => {
    setConsentsLoading(true);
    try {
      const { data } = await api.get("/admin/consents");
      setConsents(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load consents");
    } finally {
      setConsentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
    fetchConsents();
  }, [fetchPolicies, fetchConsents]);

  // ── Policy handlers ──────────────────────────────────────

  const openCreatePolicy = () => {
    setEditingPolicy(null);
    setPolicyForm(EMPTY_POLICY);
    setShowPolicyModal(true);
  };

  const openEditPolicy = (policy) => {
    setEditingPolicy(policy);
    setPolicyForm({
      slug: policy.slug,
      title: policy.title,
      content: policy.content || "",
      isPublished: policy.isPublished,
    });
    setShowPolicyModal(true);
  };

  const closePolicyModal = () => {
    setShowPolicyModal(false);
    setEditingPolicy(null);
    setPolicyForm(EMPTY_POLICY);
  };

  const handlePolicySubmit = async (e) => {
    e.preventDefault();
    setPolicySubmitting(true);
    try {
      if (editingPolicy) {
        await api.patch(`/admin/policies/${editingPolicy.id}`, policyForm);
        toast.success("Policy updated!");
      } else {
        await api.post("/admin/policies", policyForm);
        toast.success("Policy created!");
      }
      closePolicyModal();
      fetchPolicies();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save policy");
    } finally {
      setPolicySubmitting(false);
    }
  };

  const handleDeletePolicy = async (id) => {
    if (!confirm("Delete this policy?")) return;
    try {
      await api.delete(`/admin/policies/${id}`);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      toast.success("Policy deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete policy");
    }
  };

  const handleTogglePublished = async (policy) => {
    try {
      await api.patch(`/admin/policies/${policy.id}`, {
        isPublished: !policy.isPublished,
      });
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policy.id ? { ...p, isPublished: !p.isPublished } : p,
        ),
      );
    } catch {
      toast.error("Failed to update policy");
    }
  };

  // ── Consent handlers ─────────────────────────────────────

  const openCreateConsent = () => {
    setEditingConsent(null);
    setConsentForm(EMPTY_CONSENT);
    setShowConsentModal(true);
  };

  const openEditConsent = (consent) => {
    setEditingConsent(consent);
    setConsentForm({
      slug: consent.slug,
      title: consent.title,
      description: consent.description || "",
      isRequired: consent.isRequired,
      version: consent.version || "1.0",
      isActive: consent.isActive,
    });
    setShowConsentModal(true);
  };

  const closeConsentModal = () => {
    setShowConsentModal(false);
    setEditingConsent(null);
    setConsentForm(EMPTY_CONSENT);
  };

  const handleConsentSubmit = async (e) => {
    e.preventDefault();
    setConsentSubmitting(true);
    try {
      if (editingConsent) {
        await api.patch(`/admin/consents/${editingConsent.id}`, consentForm);
        toast.success("Consent updated!");
      } else {
        await api.post("/admin/consents", consentForm);
        toast.success("Consent created!");
      }
      closeConsentModal();
      fetchConsents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save consent");
    } finally {
      setConsentSubmitting(false);
    }
  };

  const handleDeleteConsent = async (id) => {
    if (!confirm("Delete this consent?")) return;
    try {
      await api.delete(`/admin/consents/${id}`);
      setConsents((prev) => prev.filter((c) => c.id !== id));
      toast.success("Consent deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete consent");
    }
  };

  const handleToggleActive = async (consent) => {
    try {
      await api.patch(`/admin/consents/${consent.id}`, {
        isActive: !consent.isActive,
      });
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consent.id ? { ...c, isActive: !c.isActive } : c,
        ),
      );
    } catch {
      toast.error("Failed to update consent");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Policies & Consents</h1>
          <p className={styles.subtitle}>
            Manage legal documents and user consent configurations
          </p>
        </div>
        <Button
          onClick={tab === "policies" ? openCreatePolicy : openCreateConsent}
        >
          + New {tab === "policies" ? "policy" : "consent"}
        </Button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "policies" ? styles.tabActive : ""}`}
          onClick={() => setTab("policies")}
        >
          📄 Policies ({policies.length})
        </button>
        <button
          className={`${styles.tab} ${tab === "consents" ? styles.tabActive : ""}`}
          onClick={() => setTab("consents")}
        >
          ✅ Consents ({consents.length})
        </button>
      </div>

      {/* Policies tab */}
      {tab === "policies" && (
        <>
          {policiesLoading ? (
            <div className={styles.loading}>Loading...</div>
          ) : policies.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📄</span>
              <p>No policies yet. Create your first legal document.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {policies.map((policy) => (
                <Card key={policy.id} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemMeta}>
                      <span className={styles.slug}>{policy.slug}</span>
                      <span
                        className={`${styles.badge} ${
                          policy.isPublished
                            ? styles.badgeSuccess
                            : styles.badgeMuted
                        }`}
                      >
                        {policy.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        className={`${styles.toggleBtn} ${
                          policy.isPublished ? styles.toggleActive : ""
                        }`}
                        onClick={() => handleTogglePublished(policy)}
                        title={policy.isPublished ? "Unpublish" : "Publish"}
                      >
                        {policy.isPublished ? "🔵" : "⚪"}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditPolicy(policy)}
                      >
                        ✏️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePolicy(policy.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                  <h3 className={styles.itemTitle}>{policy.title}</h3>
                  {policy.content && (
                    <p className={styles.itemPreview}>
                      {policy.content.replace(/<[^>]+>/g, "").slice(0, 150)}
                      {policy.content.length > 150 ? "…" : ""}
                    </p>
                  )}
                  <div className={styles.itemFooter}>
                    {policy.updatedBy && (
                      <span className={styles.updatedBy}>
                        Last edited by{" "}
                        {policy.updatedBy.login || policy.updatedBy.email}
                      </span>
                    )}
                    {policy.updatedAt && (
                      <span className={styles.updatedAt}>
                        {new Date(policy.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Consents tab */}
      {tab === "consents" && (
        <>
          {consentsLoading ? (
            <div className={styles.loading}>Loading...</div>
          ) : consents.length === 0 ? (
            <div className={styles.emptyState}>
              <span>✅</span>
              <p>No consents configured yet.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {consents.map((consent) => (
                <Card key={consent.id} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemMeta}>
                      <span className={styles.slug}>{consent.slug}</span>
                      <span className={styles.version}>v{consent.version}</span>
                      {consent.isRequired && (
                        <span
                          className={`${styles.badge} ${styles.badgeWarning}`}
                        >
                          Required
                        </span>
                      )}
                      <span
                        className={`${styles.badge} ${
                          consent.isActive
                            ? styles.badgeSuccess
                            : styles.badgeMuted
                        }`}
                      >
                        {consent.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        className={`${styles.toggleBtn} ${
                          consent.isActive ? styles.toggleActive : ""
                        }`}
                        onClick={() => handleToggleActive(consent)}
                        title={consent.isActive ? "Deactivate" : "Activate"}
                      >
                        {consent.isActive ? "🔵" : "⚪"}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditConsent(consent)}
                      >
                        ✏️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConsent(consent.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                  <h3 className={styles.itemTitle}>{consent.title}</h3>
                  {consent.description && (
                    <p className={styles.itemPreview}>{consent.description}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Policy modal */}
      {showPolicyModal && (
        <div className={styles.modalOverlay} onClick={closePolicyModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingPolicy ? "Edit policy" : "New policy"}</h2>
              <button className={styles.closeBtn} onClick={closePolicyModal}>
                ×
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handlePolicySubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Slug</label>
                  <input
                    type="text"
                    placeholder="privacy-policy"
                    value={policyForm.slug}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, slug: e.target.value })
                    }
                    required
                    disabled={!!editingPolicy}
                  />
                </div>
                <div className={styles.formGroupCheckbox}>
                  <label>
                    <input
                      type="checkbox"
                      checked={policyForm.isPublished}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          isPublished: e.target.checked,
                        })
                      }
                    />
                    <span>Published</span>
                  </label>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Privacy Policy"
                  value={policyForm.title}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  Content <span className={styles.opt}>HTML or plain text</span>
                </label>
                <textarea
                  placeholder="<p>Policy content...</p>"
                  value={policyForm.content}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, content: e.target.value })
                  }
                  rows={10}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closePolicyModal}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={policySubmitting}>
                  {policySubmitting
                    ? "Saving..."
                    : editingPolicy
                      ? "Save"
                      : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consent modal */}
      {showConsentModal && (
        <div className={styles.modalOverlay} onClick={closeConsentModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingConsent ? "Edit consent" : "New consent"}</h2>
              <button className={styles.closeBtn} onClick={closeConsentModal}>
                ×
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleConsentSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Slug</label>
                  <input
                    type="text"
                    placeholder="marketing-emails"
                    value={consentForm.slug}
                    onChange={(e) =>
                      setConsentForm({ ...consentForm, slug: e.target.value })
                    }
                    required
                    disabled={!!editingConsent}
                  />
                </div>
                <div className={styles.formGroup} style={{ maxWidth: 100 }}>
                  <label>Version</label>
                  <input
                    type="text"
                    placeholder="1.0"
                    value={consentForm.version}
                    onChange={(e) =>
                      setConsentForm({
                        ...consentForm,
                        version: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Marketing emails consent"
                  value={consentForm.title}
                  onChange={(e) =>
                    setConsentForm({ ...consentForm, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  Description <span className={styles.opt}>optional</span>
                </label>
                <textarea
                  placeholder="We will send you news and promotions..."
                  value={consentForm.description}
                  onChange={(e) =>
                    setConsentForm({
                      ...consentForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <div className={styles.checkboxRow}>
                <label>
                  <input
                    type="checkbox"
                    checked={consentForm.isRequired}
                    onChange={(e) =>
                      setConsentForm({
                        ...consentForm,
                        isRequired: e.target.checked,
                      })
                    }
                  />
                  <span>Required consent</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={consentForm.isActive}
                    onChange={(e) =>
                      setConsentForm({
                        ...consentForm,
                        isActive: e.target.checked,
                      })
                    }
                  />
                  <span>Active</span>
                </label>
              </div>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeConsentModal}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={consentSubmitting}>
                  {consentSubmitting
                    ? "Saving..."
                    : editingConsent
                      ? "Save"
                      : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
