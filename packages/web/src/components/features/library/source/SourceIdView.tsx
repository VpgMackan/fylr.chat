import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { SourceApiResponse } from '@fylr/types';
import {
  getSourceById,
  getVectorsBySourceId,
  VectorChunk,
} from '@/services/api/source.api';

export default function SourceIdPageView() {
  const params = useParams();
  const router = useRouter();
  const libraryId = params.libraryid as string;
  const sourceId = params.sourceid as string;

  const [source, setSource] = useState<SourceApiResponse | null>(null);
  const [vectors, setVectors] = useState<VectorChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVectors, setLoadingVectors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null);

  useEffect(() => {
    const fetchSource = async () => {
      try {
        setLoading(true);
        setError(null);
        const sourceData = await getSourceById(sourceId);
        setSource(sourceData);

        // Fetch vectors if the source is completed
        if (sourceData.status === 'COMPLETED') {
          setLoadingVectors(true);
          try {
            const vectorsData = await getVectorsBySourceId(sourceId);
            setVectors(vectorsData);
          } catch (vectorErr) {
            console.error('Error fetching vectors:', vectorErr);
            // Don't set error here, just log it - vectors are optional
          } finally {
            setLoadingVectors(false);
          }
        }
      } catch (err: unknown) {
        console.error('Error fetching source:', err);
        setError('Failed to load source information');
      } finally {
        setLoading(false);
      }
    };

    if (sourceId) {
      fetchSource();
    }
  }, [sourceId]);

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="p-6 w-full">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="mr-4 hover:opacity-70 transition-opacity"
          >
            <Icon icon="weui:back-outlined" className="text-2xl" />
          </button>
          <h1 className="text-3xl font-bold">Source Not Found</h1>
        </div>
        <div className="text-center py-12 text-red-500">
          <Icon
            icon="mdi:alert-circle-outline"
            className="text-6xl mx-auto mb-4"
          />
          <p>{error || 'Source could not be loaded'}</p>
        </div>
      </div>
    );
  }

  const formattedSize = (parseInt(source.size, 10) / 1024 / 1024).toFixed(2);
  const uploadDate = new Date(source.uploadTime).toLocaleString();

  return (
    <div className="p-6 w-full max-w-5xl overflow-y-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="mr-4 text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
        >
          <Icon icon="weui:back-outlined" className="text-2xl" />
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Source Details</h1>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-8 space-y-6 shadow-xl">
        {/* Document Name */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Document Name
          </h2>
          <div className="flex items-center">
            <div className="bg-blue-500/10 p-2 rounded-lg mr-3">
              <Icon
                icon="mdi:file-document"
                className="text-2xl text-blue-400"
              />
            </div>
            <p className="text-xl font-semibold text-white">{source.name}</p>
          </div>
        </div>

        {/* Status */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Status
          </h2>
          <div className="flex items-center">
            {source.status === 'COMPLETED' && (
              <>
                <div className="bg-emerald-500/10 p-2 rounded-lg mr-3">
                  <Icon
                    icon="mdi:check-circle"
                    className="text-2xl text-emerald-400"
                  />
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-semibold border border-emerald-500/30">
                  Completed
                </span>
              </>
            )}
            {source.status === 'FAILED' && (
              <>
                <div className="bg-red-500/10 p-2 rounded-lg mr-3">
                  <Icon
                    icon="mdi:alert-circle"
                    className="text-2xl text-red-400"
                  />
                </div>
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-semibold border border-red-500/30">
                  Failed
                </span>
              </>
            )}
            {!['COMPLETED', 'FAILED'].includes(source.status) && (
              <>
                <div className="bg-amber-500/10 p-2 rounded-lg mr-3">
                  <Icon
                    icon="mdi:clock-outline"
                    className="text-2xl text-amber-400"
                  />
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-semibold border border-amber-500/30">
                  {source.status}
                </span>
              </>
            )}
          </div>
        </div>

        {/* File Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              File Type
            </h2>
            <div className="flex items-center">
              <div className="bg-purple-500/10 p-2 rounded-lg mr-3">
                <Icon
                  icon="mdi:file-type"
                  className="text-xl text-purple-400"
                />
              </div>
              <p className="text-lg font-medium text-gray-200">{source.type}</p>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              File Size
            </h2>
            <div className="flex items-center">
              <div className="bg-cyan-500/10 p-2 rounded-lg mr-3">
                <Icon icon="mdi:file-chart" className="text-xl text-cyan-400" />
              </div>
              <p className="text-lg font-medium text-gray-200">
                {formattedSize} MB
              </p>
            </div>
          </div>
        </div>

        {/* Upload Time */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Upload Time
          </h2>
          <div className="flex items-center">
            <div className="bg-indigo-500/10 p-2 rounded-lg mr-3">
              <Icon
                icon="mdi:clock-outline"
                className="text-xl text-indigo-400"
              />
            </div>
            <p className="text-lg font-medium text-gray-200">{uploadDate}</p>
          </div>
        </div>

        {/* Actions */}
        {source.status === 'COMPLETED' && (
          <div className="pt-6 border-t border-gray-700/50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Actions
            </h2>
            <div className="flex gap-3">
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/source/file/${source.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all text-white font-medium shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 hover:scale-105"
              >
                <Icon icon="mdi:eye-outline" className="mr-2 text-lg" />
                View Document
              </a>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/source/file/${source.id}`}
                download
                className="flex items-center px-5 py-2.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-all text-white font-medium hover:scale-105"
              >
                <Icon icon="mdi:download" className="mr-2 text-lg" />
                Download
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Document Content with Vector Chunks */}
      {source.status === 'COMPLETED' && (
        <div className="mt-6 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Icon
                icon="mdi:file-document-outline"
                className="mr-2 text-blue-400"
              />
              Document Content
            </h2>
            <div className="flex items-center px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
              <Icon icon="mdi:cube-outline" className="mr-1.5 text-blue-400" />
              <span className="text-sm font-semibold text-gray-300">
                {vectors.length} chunks
              </span>
            </div>
          </div>

          {loadingVectors ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-24 bg-gray-700 rounded"></div>
              ))}
            </div>
          ) : vectors.length > 0 ? (
            <div className="space-y-3">
              {/* Legend */}
              <div className="flex items-center gap-4 text-sm mb-2 pb-4 border-b border-gray-700/30">
                <div className="flex items-center gap-2 text-gray-400">
                  <Icon
                    icon="mdi:cursor-default-click-outline"
                    className="text-base"
                  />
                  <span>Hover to highlight</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500/20 border border-blue-400 rounded"></div>
                  <span className="text-gray-400 text-xs">Selected</span>
                </div>
              </div>

              {/* Chunks */}
              {vectors.map((vector, index) => (
                <div
                  key={vector.id}
                  className={`group p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    selectedChunk === index
                      ? 'bg-blue-500/10 border-blue-400/50 shadow-lg shadow-blue-500/10 scale-[1.01]'
                      : 'bg-gray-900/40 border-gray-700/50 hover:border-gray-600 hover:bg-gray-900/60'
                  }`}
                  onMouseEnter={() => setSelectedChunk(index)}
                  onMouseLeave={() => setSelectedChunk(null)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                          selectedChunk === index
                            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                            : 'bg-gray-700/70 text-gray-300 group-hover:bg-gray-700'
                        }`}
                      >
                        Chunk {vector.chunkIndex + 1}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Icon icon="mdi:text" className="text-sm" />
                        <span>{vector.content.length} chars</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(vector.content);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                      title="Copy chunk text"
                    >
                      <Icon icon="mdi:content-copy" className="text-lg" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {vector.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Icon
                icon="mdi:cube-off-outline"
                className="text-6xl mx-auto mb-4 opacity-50"
              />
              <p>No vector chunks available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
