-- Add abstract to search_freelancers RPC output so search results can show the Abstract button
DROP FUNCTION IF EXISTS public.search_freelancers(text, text[], integer);

CREATE OR REPLACE FUNCTION public.search_freelancers(search_query text, selected_states text[] DEFAULT '{}'::text[], result_size integer DEFAULT 100)
 RETURNS TABLE(id uuid, name character varying, linkedin_url character varying, title text, current_position text, location_name character varying, state character varying, about text, abstract text, experience text, license text, headline_about text, headline_experience text, headline_license text, result_score real)
 LANGUAGE plpgsql
AS $function$
DECLARE
  q tsquery;
BEGIN
  -- Use websearch_to_tsquery for natural language search
  q := websearch_to_tsquery('english', search_query);

  RETURN QUERY
  SELECT
    f.id, f.name, f.linkedin_url, NULL::text as title, f.current_position, f.location_name, f.state,
    f.about, f.abstract, f.experience, f.license,
    ts_headline('english', f.about, q, 'StartSel="<b class=highlighted>", StopSel=</b>, MaxFragments=3, FragmentDelimiter=..., MaxWords=35, MinWords=15') as headline_about,
    ts_headline('english', f.experience, q, 'StartSel="<b class=highlighted>", StopSel=</b>, MaxFragments=3, FragmentDelimiter=..., MaxWords=35, MinWords=15') as headline_experience,
    ts_headline('english', f.license, q, 'StartSel="<b class=highlighted>", StopSel=</b>, MaxFragments=3, FragmentDelimiter=..., MaxWords=35, MinWords=15') as headline_license,
    ts_rank_cd(f.fts, q) as result_score
  FROM freelancer f
  WHERE f.fts @@ q
  AND (selected_states = '{}' OR f.state = ANY(selected_states))
  ORDER BY result_score DESC
  LIMIT result_size;
END;
$function$
