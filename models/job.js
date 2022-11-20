"use strict";

const db = require("../db");
const { NotFoundError} = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");



class Job {
    /** Creates job (from data), update db, return new job data.
     *
     * Data should be { title, salary, equity, companyHandle }
     *
     * Returns { id, title, salary, equity, companyHandle }
    **/

    static async create(data) {
        const result = await db.query(
            `INSERT INTO jobs 
                (title,
                salary,
                equity,
                company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [data.title, data.salary, data.equity,data.companyHandle]);
        let job = result.rows[0];
        return job;
    }

    /** Find all jobs).
     *
     * Returns [{ id, title, salary, equity, companyHandle, companyName }, ...]
    * */

    static async findAll({ title, minSalary, hasEquity} = {}) {
        let query = `SELECT 
                        j.id,
                        j.title,
                        j.salary,
                        j.equity,
                        j.company_handle AS "companyHandle",
                        c.name AS "companyName"
                    FROM jobs j 
                    LEFT JOIN companies AS c ON c.handle = j.company_handle`;
        let whereExpressions = [];
        let queryValues = [];

        if (minSalary !== undefined) {
        queryValues.push(minSalary);
        whereExpressions.push(`salary >= $${queryValues.length}`);
        }

        if (hasEquity === true) {
        whereExpressions.push(`equity > 0`);
        }

        if (title !== undefined) {
        queryValues.push(`%${title}%`);
        whereExpressions.push(`title ILIKE $${queryValues.length}`);
        }

        if (whereExpressions.length > 0) {
        query += " WHERE " + whereExpressions.join(" AND ");
        }

        query += " ORDER BY title";
        const result = await db.query(query, queryValues);
        return result.rows;
    }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle, company }
   *   where company is { handle, name, description, numEmployees, logoUrl }
   *
   * Throws NotFoundError if not found.
   **/

    static async get(id) {
        const result = await db.query(
            `SELECT 
                id,
                title,
                salary,
                equity,
                company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`, [id]);

        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job found with an of ${id}`);

        const companiesResult = await db.query(
            `SELECT 
                handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
            FROM companies
            WHERE handle = $1`, [job.companyHandle]);

        delete job.companyHandle;
        job.company = companiesResult.rows[0];

        return job;
    }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(data,{});
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs 
                        SET ${setCols} 
                        WHERE id = ${idVarIdx} 
                        RETURNING id, 
                            title, 
                            salary, 
                            equity,
                            company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];
        if (!job) throw new NotFoundError(`No job found with an id of ${id}`);
        return job;
    }

  /** Delete job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

    static async remove(id) {
        const result = await db.query(`DELETE
            FROM jobs
            WHERE id = $1
            RETURNING id`, [id]);
        const job = result.rows[0];
        if (!job) throw new NotFoundError(`No job found with an id of ${id}`);
    }
}

module.exports = Job;
