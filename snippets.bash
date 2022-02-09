function runWithNode() {
    rm -f scripts.js && tsc scripts.ts --esModuleInterop && node scripts.js
}

function sqlToCsv() {
    sqlite3 -header -csv  sqlite.db "select * from stars" > stars.csv
}

function getStart() {
    head  -n 10 /Users/l/Downloads/github-data/stargazers.tsv | cut -c 1-80
}

function extraRam() {
    node --max-old-space-size=12000 script.js
}
