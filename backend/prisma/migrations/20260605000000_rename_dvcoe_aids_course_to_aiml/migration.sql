-- Rename the DVCOE AI/Data Science course option to AIML for tenant-backed dropdowns.
WITH normalized AS (
  SELECT
    t.id,
    jsonb_agg(to_jsonb(deduped.course) ORDER BY deduped.first_ordinal) AS course_options
  FROM "tenants" t
  CROSS JOIN LATERAL (
    SELECT
      mapped.course,
      MIN(mapped.ordinality) AS first_ordinal
    FROM (
      SELECT
        CASE
          WHEN BTRIM(item.value) IN (
            'DSE -AIDS',
            'DSE - AIDS',
            'DSE-AIDS',
            'DSE- AIDS',
            'DSE -AI&DS',
            'DSE - AI&DS',
            'DSE-AI&DS',
            'DSE - Artificial Intelligence and Data Science',
            'DSE - Artificial Intelligence & Data Science'
          )
          THEN 'DSE - AIML'
          WHEN BTRIM(item.value) IN (
            'AIDS',
            'AI&DS',
            'AI & DS',
            'AI-DS',
            'Artificial Intelligence and Data Science',
            'Artificial Intelligence & Data Science'
          )
          THEN 'AIML'
          ELSE item.value
        END AS course,
        item.ordinality
      FROM jsonb_array_elements_text(t."course_options") WITH ORDINALITY AS item(value, ordinality)
    ) mapped
    GROUP BY mapped.course
  ) deduped
  WHERE LOWER(t."slug") = 'dvcoe'
  GROUP BY t.id
)
UPDATE "tenants" t
SET "course_options" = normalized.course_options
FROM normalized
WHERE t.id = normalized.id
  AND t."course_options" IS DISTINCT FROM normalized.course_options;
