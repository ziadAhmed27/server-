CREATE DATABASE IF NOT EXISTS customers;
USE customers;

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    nationality TEXT NOT NULL,
    currently_in_egypt BOOLEAN NOT NULL,
    date_of_arrival TEXT,
    date_of_leaving TEXT,
    currently_in_risk BOOLEAN NOT NULL,
    CHECK (
        (currently_in_egypt = 1 AND date_of_arrival IS NOT NULL AND date_of_leaving IS NOT NULL)
        OR (currently_in_egypt = 0 AND date_of_arrival IS NULL AND date_of_leaving IS NULL)
    )
); 