import numpy as np
import structlog

from abc import ABC

from sklearn.cluster import KMeans, MiniBatchKMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import normalize

log = structlog.getLogger(__name__)


class VectorHelper(ABC):
    def _cluster_vectors_auto(
        vectors,
        k_min=2,
        k_max=20,
        reduce_dim=True,
        dim=50,
        random_state=42,
        normalize_vectors=False,
        n_init=10,
    ):
        vectors = np.asarray(vectors)
        if vectors.ndim != 2:
            raise ValueError("vectors must be a 2D array: (n_samples, n_features)")
        n_samples, n_features = vectors.shape
        if n_samples < 2:
            raise ValueError("need at least 2 samples to cluster")

        if normalize_vectors:
            # L2-normalize rows so Euclidean ~ cosine
            vectors = normalize(vectors, axis=1)

        if reduce_dim and n_features > dim:
            pca = PCA(n_components=dim, random_state=random_state)
            vectors = pca.fit_transform(vectors)

        best_score = -np.inf
        best_k = None
        best_kmeans = None
        best_labels = None
        scores = {}

        # include k_max, and don't allow more clusters than samples
        upper_k = min(k_max, n_samples)
        for k in range(k_min, upper_k + 1):
            # For big data, consider MiniBatchKMeans here
            kmeans = KMeans(n_clusters=k, random_state=random_state, n_init=n_init)
            labels = kmeans.fit_predict(vectors)

            unique, counts = np.unique(labels, return_counts=True)
            # silhouette needs at least 2 clusters; also skip if any cluster has only 1 sample
            if len(unique) <= 1 or counts.min() < 2:
                continue

            try:
                score = silhouette_score(vectors, labels)
            except Exception:
                # catch unexpected errors and skip this k
                continue

            scores[k] = score
            if score > best_score:
                best_score = score
                best_k = k
                best_kmeans = kmeans
                best_labels = labels

        # fallback: if silhouette never computed, fit k_min and return that
        if best_k is None:
            fallback_k = min(k_min, n_samples)
            fallback_kmeans = KMeans(n_clusters=fallback_k, random_state=random_state, n_init=n_init)
            fallback_labels = fallback_kmeans.fit_predict(vectors)
            return fallback_labels, fallback_kmeans, fallback_k

        return best_labels, best_kmeans, best_k
