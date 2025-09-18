import numpy as np
import structlog

from abc import ABC

from sklearn.cluster import KMeans, MiniBatchKMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import normalize

from ..entity import Source

log = structlog.getLogger(__name__)


class VectorHelper(ABC):
    def _cluster_vectors_auto(
        self,
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
            # Ensure n_components doesn't exceed min(n_samples, n_features)
            max_components = min(n_samples, n_features)
            actual_dim = min(dim, max_components)
            pca = PCA(n_components=actual_dim, random_state=random_state)
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
            fallback_kmeans = KMeans(
                n_clusters=fallback_k, random_state=random_state, n_init=n_init
            )
            fallback_labels = fallback_kmeans.fit_predict(vectors)
            return fallback_labels, fallback_kmeans, fallback_k

        return best_labels, best_kmeans, best_k

    def _cluster_source_vector(self, sources: list[Source]):
        """
        Cluster sources based on their vectors and return grouped vectors.

        Args:
            sources: List of Source objects with vectors

        Returns:
            List of lists, where each inner list contains vectors belonging to the same cluster
        """
        if not sources:
            return []

        all_vectors = []
        vector_to_source_map = []

        for source in sources:
            if source.vectors:
                for vector in source.vectors:
                    if vector.embedding is not None:
                        all_vectors.append(vector.embedding)
                        vector_to_source_map.append(vector)

        if len(all_vectors) < 2:
            return [vector_to_source_map] if vector_to_source_map else []

        vectors_array = np.array(all_vectors)

        labels, kmeans, best_k = self._cluster_vectors_auto(
            vectors_array,
            k_min=2,
            k_max=min(20, len(all_vectors)),
            reduce_dim=True,
            dim=50,
            normalize_vectors=True,
        )

        clusters = {}
        for i, label in enumerate(labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(vector_to_source_map[i])

        return list(clusters.values())