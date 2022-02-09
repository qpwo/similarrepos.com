import { sql } from './util'

function randRepos() {
    const n = (Math.random() * 10) | 0
    const arr = new Array(n)
        .fill(null)
        .map(_ => ((Math.random() * 9 + 1) | 0) * 10)
    arr.sort()
    return arr
}
function _makeAdjacencyList() {
    const adjacencyList: Record<number, number[]> = {}
    for (let i = 0; i < 10; i++) {
        adjacencyList[i] = randRepos()
    }
    return adjacencyList
}
// console.log(adjacencyList)

const result = {
    '0': [10, 30, 40, 60, 80, 90],
    '1': [10, 40, 50, 60, 70],
    '2': [10, 20, 30, 40, 50, 60, 70, 90],
    '3': [],
    '4': [],
    '5': [10, 60, 90],
    '6': [10, 30, 60, 70, 80],
    '7': [10, 80, 90],
    '8': [],
    '9': [10, 30, 80, 90],
}

function _printPairs() {
    for (const [key, values] of Object.entries(result)) {
        for (const v of values) {
            console.log(`(${key}, ${v}),`)
        }
    }
}

const _fullSchema = sql`
    CREATE TABLE stars (
        userId INT NOT NULL,
        repoId INT NOT NULL
    );
    INSERT INTO stars (userId, repoId)
    VALUES
    (0, 10),
    (0, 30),
    (0, 40),
    (0, 60),
    (0, 80),
    (0, 90),
    (1, 10),
    (1, 40),
    (1, 50),
    (1, 60),
    (1, 70),
    (2, 10),
    (2, 20),
    (2, 30),
    (2, 40),
    (2, 50),
    (2, 60),
    (2, 70),
    (2, 90),
    (5, 10),
    (5, 60),
    (5, 90),
    (6, 10),
    (6, 30),
    (6, 60),
    (6, 70),
    (6, 80),
    (7, 10),
    (7, 80),
    (7, 90),
    (9, 10),
    (9, 30),
    (9, 80);

    CREATE TABLE repoIds (
    repoName VARCHAR(50) NOT NULL,
    repoId INT NOT NULL
    );
    INSERT INTO repoIds (repoName, repoId)
    VALUES
    ("ten", 10),
    ("twenty", 20),
    ("thirty", 30),
    ("forty", 40),
    ("fifty", 50),
    ("sixty", 60),
    ("seventy", 70),
    ("eighty", 80),
    ("ninety", 90);

    CREATE TABLE userIds (
    userName VARCHAR(50) NOT NULL,
    userId INT NOT NULL
    );

    INSERT INTO userIds (userName, userId)
    VALUES
    ("zero", 0),
    ("one", 1),
    ("two", 2),
    ("five", 5),
    ("six", 6),
    ("seven", 7),
    ("nine", 9);
`

const _firstQuery = sql`SELECT userId from stars WHERE repoId = 80`

const _niceQuery = sql`
    SELECT s1.repoID
    FROM stars s1
    INNER JOIN stars s2 ON s1.userId = s2.userId
    WHERE s2.repoId = 80
`

const _nicerQuery = sql`
    SELECT r.repoName FROM repoIds r
    INNER JOIN stars s1 ON r.repoId = s1.repoID
    INNER JOIN stars s2 ON s1.userId = s2.userId
    WHERE s2.repoId = 80
`

const _threeJoinQuery = sql`
    SELECT r1.repoName FROM repoIds r1
    INNER JOIN stars s1 ON r1.repoId = s1.repoId
    INNER JOIN stars s2 ON s1.userId = s2.userId
    INNER JOIN repoIds r2 ON r2.repoId = s2.repoId
    WHERE r2.repoName = "eighty";
`

const _makeIndexes = sql`

    CREATE INDEX userStarIdx
    ON stars (userId);

    CREATE INDEX repoStarIdx
    ON stars (repoId);

    CREATE UNIQUE INDEX reponameIdx
    ON repoIds (repoName);

    CREATE UNIQUE INDEX repoidIdx
    ON repoIds (repoId);

    CREATE UNIQUE INDEX usernameIdx
    ON userIds (userName);

    CREATE UNIQUE INDEX useridIdx
    ON userIds (userId);

`
