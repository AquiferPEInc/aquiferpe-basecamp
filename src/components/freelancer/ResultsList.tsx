import { useState, useEffect } from 'react'
import { EsHit } from '../../lib/freelancer-search'

interface ResultsListProps {
  hits: EsHit[]
  took?: number
}

interface AbstractModalData {
  name: string
  abstract: string
}

const FieldValue = ({ value, fieldKey, highlight }: { value: unknown; fieldKey?: string; highlight?: Record<string, string[]> }) => {
  if (typeof value === 'string') {
    value = value.replace(/_linebreak_/g, '\n');
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const stringValue = String(value)

    if (fieldKey === 'linkedin_profile' && typeof value === 'string' && value.startsWith('http')) {
      return (
        <a 
          href={stringValue} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          {stringValue}
        </a>
      )
    }

    if (highlight && fieldKey && highlight[fieldKey]) {
      const highlightValue = highlight[fieldKey][0].replace(/_linebreak_/g, '\n');
      return (
        <span className="whitespace-pre-line"
          dangerouslySetInnerHTML={{ 
            __html: highlightValue || stringValue 
          }} 
        />
      )
    }
    
    return <span className="whitespace-pre-line">{stringValue}</span>
  }

  return (
    <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-slate-100 p-3 text-sm">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export default function ResultsList({ hits, took }: ResultsListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [activeModal, setActiveModal] = useState<AbstractModalData | null>(null)
  const resultsPerPage = 10
  
  useEffect(() => {
    setCurrentPage(1)
  }, [hits])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  if (!hits?.length) {
    return (
      <div className="mt-8 text-center text-slate-500">
        No results. Try different keywords.
      </div>
    )
  }

  const totalPages = Math.ceil(hits.length / resultsPerPage)
  const startIndex = (currentPage - 1) * resultsPerPage
  const endIndex = startIndex + resultsPerPage
  const currentHits = hits.slice(startIndex, endIndex)

  return (
    <div className="mt-8 space-y-4 w-full">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{hits.length} result{hits.length !== 1 ? 's' : ''} (showing {startIndex + 1}-{Math.min(endIndex, hits.length)})</span>
        {typeof took === 'number' && <span>Took {took} ms</span>}
      </div>
      <hr className="border-t border-slate-200" />
      {currentHits.map((hit) => (
        <ResultItem 
          key={hit._id} 
          hit={hit} 
          onOpenAbstract={(name, abstract) => setActiveModal({ name, abstract })}
        />
      ))}
      
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm font-medium rounded-lg ${
                  currentPage === page ? 'bg-primary-600 text-white' : 'border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
          </nav>
        </div>
      )}

      {/* Abstract Modal */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 space-y-4 relative transition-all transform scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                    Profile Abstract
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {activeModal.name}
                </h3>
              </div>
              
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
                aria-label="Close abstract modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-slate-800 text-sm leading-relaxed whitespace-pre-line font-normal shadow-inner">
                {activeModal.abstract}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const hasValue = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as Record<string, unknown>).length > 0;
  return true;
};

const PREVIEW_LENGTH = 250;

const ExpandableField = ({ value, fieldKey, highlight }: { value: unknown; fieldKey?: string; highlight?: Record<string, string[]> }) => {
  const [expanded, setExpanded] = useState(false);
  const plainText = typeof value === 'string' ? value.replace(/_linebreak_/g, '\n') : null;
  const isTruncatable = !!plainText && plainText.length > PREVIEW_LENGTH;

  return (
    <>
      {isTruncatable && !expanded ? (
        <span className="whitespace-pre-line">
          {plainText!.slice(0, PREVIEW_LENGTH)}...
        </span>
      ) : (
        <FieldValue value={value} fieldKey={fieldKey} highlight={highlight} />
      )}
      {isTruncatable && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-2.5 h-2.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 10 10"
            fill="currentColor"
          >
            <path d="M1 3l4 4 4-4z" />
          </svg>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
};

const ResultItem = ({ hit, onOpenAbstract }: { hit: EsHit; onOpenAbstract: (name: string, abstract: string) => void }) => {
  const src = (hit._source || {}) as any;
  const fullName = src.name?.trim() || `Freelancer #${hit._id.slice(0, 8)}`;
  const profileUrl = src.url || src.linkedin_url || src.linkedin_profile;
  const abstractText = src.abstract;

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-xl font-bold text-primary-700">
              {profileUrl ? (
                <a 
                  href={profileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-2"
                >
                  {fullName}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                fullName
              )}
            </h3>

            {hasValue(abstractText) && (
              <button
                onClick={() => onOpenAbstract(fullName, String(abstractText))}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Abstract
              </button>
            )}
          </div>
          
          {(src.location || src.state) && (
            <div className="text-slate-600 mt-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{[src.location, src.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>
        
        {hit._score && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Match Score: {hit._score.toFixed(2)}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {hasValue(src.current_position) && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Position</span>
            <div className="text-sm text-slate-800 mt-1">
              <FieldValue value={src.current_position} fieldKey="current_position" highlight={hit.highlight} />
            </div>
          </div>
        )}

        {hasValue(src.about || src.summary) && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">About</span>
            <div className="text-sm text-slate-700 mt-1">
              <FieldValue value={src.about || src.summary} fieldKey={src.about ? "about" : "summary"} highlight={hit.highlight} />
            </div>
          </div>
        )}

        <div className="pt-2 space-y-4">
          {hasValue(src.experience) && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience</span>
              <div className="text-sm text-slate-800 mt-1">
                <ExpandableField value={src.experience} fieldKey="experience" highlight={hit.highlight} />
              </div>
            </div>
          )}

          {hasValue(src.license) && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License</span>
              <div className="text-sm text-slate-800 mt-1">
                <ExpandableField value={src.license} fieldKey="license" highlight={hit.highlight} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
