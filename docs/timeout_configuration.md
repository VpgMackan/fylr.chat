# Timeout Configuration and Performance Notes

## Overview
The agentic system uses several timeout configurations to prevent hanging operations. This document explains the timeout hierarchy and performance considerations.

## Timeout Hierarchy

### 1. Tool Execution Timeout
**File**: `packages/backend/src/chat/tools/tool.service.ts`  
**Timeout**: 60 seconds (60000ms)  
**Reason**: Increased from 30s to accommodate slow reranking operations

```typescript
private readonly TOOL_TIMEOUT_MS = 60000;
```

**Applies to**:
- `search_documents` (with multi-query + reranking)
- `web_search`
- `fetch_webpage`
- `read_document_chunk`
- `list_sources_in_library`

### 2. Reranking Request Timeout
**File**: `packages/backend/src/ai/reranking.service.ts`  
**Timeout**: 45 seconds (45000ms)  
**Reason**: Jina's reranking API can take 15-25 seconds for small batches

```typescript
timeout: 45000, // 45 second timeout for reranking (Jina API can be slow)
```

**Performance Observations**:
- 5 documents: ~15-21 seconds
- 25 documents: Could take 30+ seconds
- Network latency adds 1-3 seconds

### 3. Agentic Loop Iterations
**File**: `packages/backend/src/chat/message.service.ts`  
**Max Iterations**: 5  
**Total Potential Time**: 5 × 60s = 5 minutes maximum

```typescript
const MAX_ITERATIONS = 5;
```

## Performance Bottlenecks

### Reranking Performance
The Jina reranking API is the primary bottleneck:

```
[SearchDocumentsTool] Multi-query retrieved 5 unique results
[RerankingService] Reranking 5 documents with model: jina-reranker-v2-base-multilingual
[RerankingService] Reranking completed in 21179ms  <-- 21 seconds!
```

**Why so slow?**
1. **External API**: Calls Jina's hosted reranking service
2. **Cold Start**: First request may trigger model loading
3. **Network Latency**: Round-trip to Jina's servers
4. **Model Complexity**: Cross-encoder models are computationally expensive

### Multi-Query Performance
Multi-query adds minimal overhead:

```
[SearchDocumentsTool] Generated 5 query variations  <-- Fast (1-2 seconds)
[SearchDocumentsTool] Multi-query retrieved 25 unique results  <-- 5 parallel searches
```

The vector searches run in parallel, so total time ≈ single search time.

## Optimization Strategies

### 1. Make Reranking Optional
Reranking is already optional via the `use_reranking` parameter:

```typescript
{
  query: "search query",
  use_reranking: false,  // Skip reranking for faster results
  use_multi_query: true
}
```

**Trade-off**: 
- ✅ Faster: 2-5 seconds vs 20+ seconds
- ❌ Lower quality: Vector similarity alone is less accurate than reranked results

### 2. Reduce Reranking Batch Size
Currently fetches 25 results and reranks to top 5:

```typescript
private readonly VECTOR_SEARCH_LIMIT = 25; // Documents to fetch
private readonly RERANK_TOP_N = 5;          // Final reranked results
```

**Potential optimization**: Fetch 10-15 instead of 25 when reranking is enabled.

### 3. Cache Reranking Results
Could implement caching for frequent queries (not currently implemented).

### 4. Timeout Gracefully
The tool already handles reranking failures gracefully:

```typescript
try {
  const rerankedResults = await this.rerankingService.rerankVectorResults(...);
  return { results: rerankedResults, reranked: true };
} catch (rerankError) {
  // Fallback to vector results
  return { 
    results: vectorResults.slice(0, this.RERANK_TOP_N),
    reranked: false,
    rerankError: 'Reranking failed, using vector search results'
  };
}
```

## Current Configuration Summary

| Operation | Timeout | Notes |
|-----------|---------|-------|
| Tool execution | 60s | Wraps entire tool operation |
| Reranking request | 45s | HTTP request to Jina API |
| Vector search | N/A | Usually completes in <1s |
| Multi-query generation | N/A | Usually completes in 1-2s |
| Agentic loop | 5 iterations | Max ~5 minutes total |

## Recommendations

### For Development
- Keep current timeouts (60s tool, 45s reranking)
- Monitor reranking performance logs
- Consider self-hosting reranking model if Jina is consistently slow

### For Production
1. **Add monitoring**: Track reranking latency P50, P95, P99
2. **Consider alternatives**:
   - Self-hosted reranking (Jina model via Docker)
   - Cohere rerank API (often faster)
   - Skip reranking for time-sensitive queries
3. **Implement caching**: Cache reranking results for frequent queries
4. **Add circuit breaker**: Auto-disable reranking if consistently timing out

### For Users
- Use `use_reranking: false` for faster results when speed > quality
- Use `use_multi_query: false` to reduce API calls (saves 1-2s)
- Combine both flags for maximum speed (2-3 second responses)

## Future Work

1. **Streaming reranking**: Return partial results as they're reranked
2. **Adaptive timeout**: Adjust timeout based on document count
3. **Parallel reranking**: Split large batches across multiple requests
4. **Local reranking**: Self-host Jina model for sub-second performance
5. **Smart toggling**: Automatically disable reranking when under time pressure

## Troubleshooting

### "Tool execution timed out after 60000ms"
- Reranking is likely taking >45 seconds
- Check AI Gateway logs for Jina API latency
- Consider increasing tool timeout to 90s
- Or disable reranking for faster results

### "Reranking completed in 20000ms+"
- Normal for Jina hosted API
- Consider self-hosting for better performance
- Or use `use_reranking: false` flag

### Multiple timeout errors
- May indicate AI Gateway connectivity issues
- Check AI Gateway health: `curl http://localhost:8000/health`
- Verify Jina API key is configured correctly
