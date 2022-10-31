CREATE TABLE status_t (
    id int PRIMARY KEY,
    last_pulled timestamptz,
    had_error boolean NOT NULL,
    -- it's a repo if is_user is false
    is_user boolean NOT NULL
);

CREATE TABLE stars_t (
    user_id int NOT NULL,
    repo_id int NOT NULL
);

CREATE TABLE names_t (
    id int PRIMARY KEY,
    name text NOT NULL
);

CREATE INDEX names_t_name_idx ON names_t (name);

-- index on user id and on repo id
CREATE INDEX stars_t_user_id_idx ON stars_t (user_id);
CREATE INDEX stars_t_repo_id_idx ON stars_t (repo_id);
-- one user cannot star the same repo twice:
ALTER TABLE stars_t ADD CONSTRAINT stars_t_unique UNIQUE (user_id, repo_id);

-- load in data:

\copy stars_t (user_id, repo_id) FROM 'stars.csv' DELIMITER ',' CSV HEADER

\copy status_t (id, last_pulled, had_error, is_user) FROM 'status.csv' DELIMITER ',' CSV HEADER

\copy names_t (id, name) FROM 'names.csv' DELIMITER ',' CSV HEADER


-- Find similar repositories to a given repository:
SELECT repo_id, COUNT(*) AS num_stars
FROM stars_t
WHERE user_id IN (
    SELECT user_id
    FROM stars_t
    WHERE repo_id = 123
)
GROUP BY repo_id
ORDER BY num_stars DESC
LIMIT 10;