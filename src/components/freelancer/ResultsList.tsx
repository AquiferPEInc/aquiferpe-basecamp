import { useState, useEffect } from 'react'
import { EsHit } from '../../lib/freelancer-search'

interface ResultsListProps {
  hits: EsHit[]
  took?: number
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
  const resultsPerPage = 5
  
  useEffect(() => {
    setCurrentPage(1)
  }, [hits])
  
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
    <div className="mt-8 space-y-4 w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{hits.length} result{hits.length !== 1 ? 's' : ''} (showing {startIndex + 1}-{Math.min(endIndex, hits.length)})</span>
        {typeof took === 'number' && <span>Took {took} ms</span>}
      </div>
      <hr className="border-t border-slate-200" />
      {currentHits.map((hit) => (
        <ResultItem key={hit._id} hit={hit} />
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
    </div>
  )
}

const ORDER = [
  'name',
  'linkedin_profile',
  'location',
  'state',
  'current_position',
  'about',
  'experience',
  'license',
  'education'
] as const;

const humanLabel = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const hasValue = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as Record<string, unknown>).length > 0;
  return true;
};

const ResultItem = ({ hit }: { hit: EsHit }) => {
  const src = (hit._source || {}) as any;
  const fullName = `${src.first_name || ''} ${src.last_name || ''}`.trim() || 'Unnamed Freelancer';
  const profileUrl = src.url || src.linkedin_url || src.linkedin_profile;

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
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
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Position</span>
            <p className="text-sm text-slate-800 mt-0.5">
              <FieldValue value={src.current_position} fieldKey="current_position" highlight={hit.highlight} />
            </p>
          </div>
        )}

        {hasValue(src.about || src.summary) && (
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">About</span>
            <div className="text-sm text-slate-700 mt-1 line-clamp-3">
              <FieldValue value={src.about || src.summary} fieldKey={src.about ? "about" : "summary"} highlight={hit.highlight} />
            </div>
          </div>
        )}

        <div className="pt-2 space-y-4">
          {hasValue(src.experience) && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience</span>
              <div className="text-sm text-slate-800 mt-1">
                <FieldValue value={src.experience} fieldKey="experience" highlight={hit.highlight} />
              </div>
            </div>
          )}

          {hasValue(src.license) && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License</span>
              <div className="text-sm text-slate-800 mt-1">
                <FieldValue value={src.license} fieldKey="license" highlight={hit.highlight} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
