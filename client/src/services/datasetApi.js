import { api } from "./api.js";

/**
 * Fetch list of uploaded datasets.
 */
export async function fetchDatasets() {
  const data = await api.get("/api/datasets");
  return data?.datasets || [];
}

/**
 * Upload dataset CSV file.
 * @param {FormData} formData
 * @param {function} [onProgress]
 */
export async function uploadDataset(formData, onProgress) {
  const data = await api.post("/api/datasets/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    }
  });
  return data?.dataset || data;
}

/**
 * Delete dataset and its associated incidents (Admin only).
 * @param {string} id
 */
export async function deleteDataset(id) {
  const data = await api.delete(`/api/datasets/${id}`);
  return data;
}
