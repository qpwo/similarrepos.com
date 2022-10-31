CREATE TABLE status_t (
    id int PRIMARY KEY,
    last_pulled timestamptz,
    had_error boolean NOT NULL,
    -- it's a repo if is_user is false
    is_user boolean NOT NULL
);

CREATE TABLE gazers_t (
    repo_id int NOT NULL,
    user_id int NOT NULL
);

CREATE TABLE stars_t
