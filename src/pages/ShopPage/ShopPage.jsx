import { useState } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { useShop } from "../../shared/hooks/useShop";
import { toast } from "react-toastify";
import styles from "./ShopPage.module.css";

const EMPTY_FORM = { price: "", currency: "", oldPrice: "" };

export const ShopPage = () => {
  const { products, loading, error, fetchProducts } = useShop();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const buildFormData = () => {
    const fd = new FormData();
    if (formData.price) fd.append("price", formData.price);
    if (formData.currency) fd.append("currency", formData.currency);
    if (formData.oldPrice) fd.append("oldPrice", formData.oldPrice);
    if (photoFile) fd.append("photo", photoFile);
    return fd;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/meract-shop/add-product", buildFormData());
      toast.success("Product added!");
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
      setPhotoFile(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/meract-shop/${editingProduct.id}`, buildFormData());
      toast.success("Product updated!");
      setEditingProduct(null);
      setFormData(EMPTY_FORM);
      setPhotoFile(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/meract-shop/${id}`);
      toast.success("Product deleted!");
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete product");
    }
  };

  const openCreateModal = () => {
    setFormData(EMPTY_FORM);
    setPhotoFile(null);
    setShowCreateModal(true);
  };

  const openEditModal = (product) => {
    setFormData({
      price: product.price ?? "",
      currency: product.currency ?? "",
      oldPrice: product.oldPrice ?? "",
    });
    setPhotoFile(null);
    setEditingProduct(product);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingProduct(null);
    setFormData(EMPTY_FORM);
    setPhotoFile(null);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Shop</h1>
          <p className={styles.subtitle}>Manage Echo currency packages</p>
        </div>
        <Button onClick={openCreateModal}>+ Add product</Button>
      </div>

      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🛒</div>
          <div className={styles.emptyTitle}>No products yet</div>
          <div className={styles.emptyText}>Add the first currency package</div>
        </div>
      ) : (
        <Card padding="none" className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Price</th>
                  <th>Echo</th>
                  <th>Old price</th>
                  <th>Discount</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt="product"
                          className={styles.productThumb}
                        />
                      ) : (
                        <div className={styles.productThumbPlaceholder}>🛒</div>
                      )}
                    </td>
                    <td className={styles.priceCell}>
                      <span className={styles.price}>${p.price}</span>
                    </td>
                    <td>
                      <span className={styles.echoBadge}>
                        {p.currency} echo
                      </span>
                    </td>
                    <td>
                      {p.oldPrice ? (
                        <s className={styles.oldPrice}>${p.oldPrice}</s>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {p.discount ? (
                        <span className={styles.discountBadge}>
                          -{p.discount}%
                        </span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={styles.muted}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(p)}
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                        >
                          🗑️
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(showCreateModal || editingProduct) && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {editingProduct
                  ? `Edit product #${editingProduct.id}`
                  : "New product"}
              </h2>
              <button className={styles.closeButton} onClick={closeModal}>
                ×
              </button>
            </div>
            <form
              className={styles.modalBody}
              onSubmit={editingProduct ? handleUpdate : handleCreate}
            >
              <div className={styles.formGroup}>
                <label>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="8.99"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required={!editingProduct}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Echo amount</label>
                <input
                  type="number"
                  min="0"
                  placeholder="500"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  required={!editingProduct}
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  Old price ($){" "}
                  <span className={styles.optional}>optional</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="12.99"
                  value={formData.oldPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, oldPrice: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  Image{" "}
                  {editingProduct && (
                    <span className={styles.optional}>
                      leave empty to keep current
                    </span>
                  )}
                </label>
                {editingProduct?.imageUrl && !photoFile && (
                  <div className={styles.currentImage}>
                    <img src={editingProduct.imageUrl} alt="current" />
                    <span>Current image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                  required={!editingProduct}
                />
              </div>
              <div className={styles.modalActions}>
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingProduct ? "Save" : "Add"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
