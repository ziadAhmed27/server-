CREATE DATABASE IF NOT EXISTS customerdb;
USE customerdb;

CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    currently_in_egypt BOOLEAN NOT NULL,
    date_of_arrival DATE,
    date_of_leaving DATE,
    currently_in_risk BOOLEAN NOT NULL,
    CHECK (
        (currently_in_egypt = 1 AND date_of_arrival IS NOT NULL AND date_of_leaving IS NOT NULL)
        OR (currently_in_egypt = 0 AND date_of_arrival IS NULL AND date_of_leaving IS NULL)
    )
); 