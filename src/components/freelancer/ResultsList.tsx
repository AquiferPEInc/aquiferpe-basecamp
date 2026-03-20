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
  return (
    <div className="card border border-slate-200 p-4 rounded-lg shadow-sm">
      <h3 className="text-base font-semibold text-slate-900 mb-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
          Score: {hit._score ? hit._score.toFixed(2) : 'N/A'}
        </span>
      </h3>
      <div className="space-y-2 text-sm leading-relaxed break-words">
        {(() => {
          const src = { ...(hit._source || {}) } as Record<string, unknown>; // Simplified withComputedFields
          // Manually add linkedin_profile if vanity exists
          const vanity = src['vanity'];
          if (typeof vanity === 'string' && vanity.trim()) {
            src['linkedin_profile'] = `https://www.linkedin.com/in/${vanity.trim()}`;
          }

          return (           
            <div className="space-y-2 text-sm leading-relaxed break-words">
              {ORDER.map((key) => {
                const value = (src as any)[key as string];

                if (!hasValue(value)) return null;
                const isPrimitive =
                  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
                return (
                  <div key={key as string}>
                    <strong className="mr-1">{humanLabel(key as string)}:</strong>
                    {
                      isPrimitive ? (
                      <FieldValue 
                        value={value} 
                        fieldKey={key as string} 
                        highlight={hit.highlight} 
                      />
                      
                    ) : (
                      <FieldValue value={value} />
                    )
                    }
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  )
}
