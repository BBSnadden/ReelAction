const express = require('express');
const router = express.Router();

// Fetch all charters in the database
router.get('/', function (req, res, next) {
    const db = req.app.get('db');
    db.query('SELECT * FROM ReelActionCharterSchedule', (err, results) => {
        if (err) {
            return next(err);
        }
        res.json(results);
    });
});

router.get('/month/:year/:month', function (req, res, next) {
    const db = req.app.get('db');
    const { year, month } = req.params;

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const nextMonthDate = new Date(year, parseInt(month, 10) - 1, 1);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

    const nextYear = nextMonthDate.getFullYear();
    const nextMonthStr = (nextMonthDate.getMonth() + 1).toString().padStart(2, '0');
    const endDate = `${nextYear}-${nextMonthStr}-01`;

    db.query(
        `SELECT 
            DATE(c.date) AS date,
            c.charter_type,
            c.boat_capacity,
            c.booking_status, -- Add this field to detect availability
            COALESCE(SUM(b.number_of_people), 0) AS total_booked,
            GREATEST(c.boat_capacity - COALESCE(SUM(b.number_of_people), 0), 0) AS spots_left
        FROM reelactioncharterschedule c
        LEFT JOIN reelactioncustomerbooking b ON c.date = b.date
        WHERE c.date >= ? AND c.date < ?
        GROUP BY DATE(c.date), c.charter_type, c.boat_capacity, c.booking_status`,
        [startDate, endDate],
        (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return next(err);
            }
            console.log('Fetched charters for the month:', results);
            res.json(results);
        }
    );
});





// Fetch details for a specific charter date, including customer bookings
router.get('/day/:date', (req, res, next) => {
    const db = req.app.get('db');
    const { date } = req.params;

    // Fetch charter details
    db.query(
        `SELECT 
            date, booking_type, booking_status, charter_type, boat_capacity, charter_description, notes
         FROM ReelActionCharterSchedule 
         WHERE date = ?`,
        [date],
        (err, charters) => {
            if (err) {
                return next(err);
            }

            // Fetch associated customer bookings
            db.query(
                `SELECT 
                    id, full_name, phone_number, email, state, status, number_of_people, charter_type, heard_about_us, booking_total, deposit_paid 
                 FROM ReelActionCustomerBooking 
                 WHERE date = ?`,
                [date],
                (err, bookings) => {
                    if (err) {
                        return next(err);
                    }

                    res.json({ charter: charters[0], bookings });
                }
            );
        }
    );
});

// Add a new charter
router.post('/charter', (req, res, next) => {
    const db = req.app.get('db');
    const {
        date,
        booking_type,
        booking_status = 'available',
        charter_type,
        boat_capacity = 8,
        charter_description,
        notes,
    } = req.body;

    db.query(
        `INSERT INTO ReelActionCharterSchedule 
        (date, booking_type, booking_status, charter_type, boat_capacity, charter_description, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            date,
            booking_type,
            booking_status,
            charter_type,
            boat_capacity,
            charter_description,
            notes,
        ],
        (err, results) => {
            if (err) {
                return next(err);
            }
            res.status(201).json({ message: 'Charter created successfully.', id: results.insertId });
        }
    );
});

router.post('/customer-booking', (req, res, next) => {
    const db = req.app.get('db');
    const {
        full_name,
        phone_number,
        email,
        state,
        date,
        number_of_people,
        charter_type,
        heard_about_us,
    } = req.body;

    const status = 'tentative'; // Default booking status
    const booking_total = number_of_people * 320; // Example price calculation
    const deposit_paid = 0;

    // Insert the customer booking
    db.query(
        `INSERT INTO ReelActionCustomerBooking 
        (full_name, phone_number, email, state, date, status, number_of_people, charter_type, heard_about_us, booking_total, deposit_paid) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            full_name,
            phone_number,
            email,
            state,
            date,
            status,
            number_of_people,
            charter_type,
            heard_about_us,
            booking_total,
            deposit_paid,
        ],
        (err, results) => {
            if (err) {
                return next(err);
            }

            // Check or update ReelActionCharterSchedule for the date
            db.query(
                `INSERT INTO ReelActionCharterSchedule 
                (date, booking_type, booking_status, charter_type, boat_capacity, charter_description, notes) 
                VALUES (DATE(?), 'Regular Group Charter', 'tentative', ?, 8, 'Auto-created from first booking', NULL)
                ON DUPLICATE KEY UPDATE 
                charter_type = VALUES(charter_type)`,
                [date, charter_type],
                (err) => {
                    if (err) {
                        return next(err);
                    }
                    res.status(201).json({ message: 'Booking submitted and schedule updated successfully.' });
                }
            );

        }
    );
});


// Delete a charter and associated bookings by date
router.delete('/charter/:date', function (req, res, next) {
    const db = req.app.get('db');
    const { date } = req.params;

    db.query('DELETE FROM ReelActionCharterSchedule WHERE date = ?', [date], (err, results) => {
        if (err) {
            return next(err);
        }
        db.query('DELETE FROM ReelActionCustomerBooking WHERE date = ?', [date], (err, results) => {
            if (err) {
                return next(err);
            }
            res.json({ message: 'Charter and associated bookings deleted successfully.' });
        });
    });
});

router.put('/customer-booking/:id', (req, res, next) => {
    const db = req.app.get('db');
    const { id } = req.params;
    const {
        full_name,
        phone_number,
        email,
        state,
        date: newDate, // New date
        number_of_people,
        charter_type,
        heard_about_us,
        status,
        booking_total,
        deposit_paid,
    } = req.body;

    let originalDate;

    db.query(
        `SELECT date FROM reelactioncustomerbooking WHERE id = ?`,
        [id],
        (err, results) => {
            if (err) {
                return next(err);
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'Booking not found.' });
            }

            originalDate = results[0].date;

            // Update the booking
            db.query(
                `UPDATE reelactioncustomerbooking
                 SET 
                     full_name = ?, 
                     phone_number = ?, 
                     email = ?, 
                     state = ?, 
                     date = ?, 
                     number_of_people = ?, 
                     charter_type = ?, 
                     heard_about_us = ?, 
                     status = ?, 
                     booking_total = ?, 
                     deposit_paid = ?
                 WHERE id = ?`,
                [
                    full_name,
                    phone_number,
                    email,
                    state || null,
                    newDate,
                    number_of_people,
                    charter_type,
                    heard_about_us || null,
                    status,
                    booking_total || 0,
                    deposit_paid || 0,
                    id,
                ],
                (err, updateResults) => {
                    if (err) {
                        return next(err);
                    }

                    if (updateResults.affectedRows === 0) {
                        return res.status(404).json({ message: 'Booking not found.' });
                    }

                    // Check if the original date has any bookings left
                    db.query(
                        `SELECT COUNT(*) AS count FROM reelactioncustomerbooking WHERE date = ?`,
                        [originalDate],
                        (err, countResults) => {
                            if (err) {
                                return next(err);
                            }

                            const bookingCount = countResults[0].count;

                            if (bookingCount === 0) {
                                // Delete the charter for the original date
                                db.query(
                                    `DELETE FROM reelactioncharterschedule WHERE date = ?`,
                                    [originalDate],
                                    (err) => {
                                        if (err) {
                                            return next(err);
                                        }
                                    }
                                );
                            }

                            // Check if a charter exists for the new date
                            db.query(
                                `SELECT COUNT(*) AS count FROM reelactioncharterschedule WHERE date = ?`,
                                [newDate],
                                (err, charterResults) => {
                                    if (err) {
                                        return next(err);
                                    }

                                    const charterCount = charterResults[0].count;

                                    if (charterCount === 0) {
                                        // Create a new charter for the new date
                                        db.query(
                                            `INSERT INTO reelactioncharterschedule 
                                             (date, booking_type, booking_status, charter_type, boat_capacity, charter_description, notes) 
                                             VALUES (?, 'Regular Group Charter', 'tentative', ?, 8, 'Auto-created from booking update', NULL)`,
                                            [newDate, charter_type],
                                            (err) => {
                                                if (err) {
                                                    return next(err);
                                                }

                                                res.json({
                                                    message: 'Booking updated successfully, and new charter created if necessary.',
                                                });
                                            }
                                        );
                                    } else {
                                        res.json({ message: 'Booking updated successfully.' });
                                    }
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});


router.put('/update-charter', (req, res) => {
    const db = req.app.get('db'); // Use the database connection from the app
    const {
        date,                 // The primary key to identify the charter
        charter_type,
        boat_capacity,
        charter_status,
        charter_description,
        notes,
    } = req.body;

    // Input validation
    if (!date) {
        return res.status(400).json({ message: 'Date is required to update the charter.' });
    }

    // Validate boat capacity (if provided)
    if (boat_capacity && (isNaN(boat_capacity) || boat_capacity <= 0)) {
        return res.status(400).json({ message: 'Boat capacity must be a positive number.' });
    }

    // Update the charter in the database
    db.query(
        `UPDATE ReelActionCharterSchedule
         SET
            charter_type = ?,
            boat_capacity = ?,
            booking_status = ?,
            charter_description = ?,
            notes = ?
         WHERE date = ?`,
        [
            charter_type || null,  // Use null for optional fields if not provided
            boat_capacity || null,
            charter_status || null,
            charter_description || null,
            notes || null,
            date,                 // Date is the primary key
        ],
        (err, results) => {
            if (err) {
                console.error('Error updating charter:', err);
                return res.status(500).json({ message: 'Failed to update charter.' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Charter not found for the specified date.' });
            }

            res.json({ message: 'Charter updated successfully.' });
        }
    );
});

// Delete a charter for a specific date
router.delete('/delete-charter', (req, res) => {
    const db = req.app.get('db');
    const { date } = req.body;

    if (!date) {
        return res.status(400).json({ message: 'Date is required to delete the charter.' });
    }

    db.query('DELETE FROM ReelActionCharterSchedule WHERE date = ?', [date], (err, results) => {
        if (err) {
            console.error('Error deleting charter:', err);
            return res.status(500).json({ message: 'Failed to delete charter.' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'No charter found for the specified date.' });
        }

        res.json({ message: 'Charter deleted successfully.' });
    });
});

// Fetch existing charter types for a given date
router.get('/existing-types/:date', (req, res, next) => {
    const db = req.app.get('db');
    const { date } = req.params;

    db.query(
        `SELECT DISTINCT charter_type FROM ReelActionCharterSchedule WHERE date = ?`,
        [date],
        (err, results) => {
            if (err) {
                return next(err);
            }

            const existingTypes = results.map(row => row.charter_type);

            res.json({ existing_types: existingTypes });
        }
    );
});


router.get('/bookings/upcoming', function (req, res, next) {
    const db = req.app.get('db');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    db.query(
        `SELECT 
            c.date,
            c.charter_type,
            c.boat_capacity,
            c.booking_status,
            COALESCE(SUM(b.number_of_people), 0) AS total_booked,
            GREATEST(c.boat_capacity - COALESCE(SUM(b.number_of_people), 0), 0) AS spots_left
        FROM ReelActionCharterSchedule c
        LEFT JOIN ReelActionCustomerBooking b ON c.date = b.date
        WHERE c.date >= ? 
            AND c.booking_status = 'tentative' 
        GROUP BY c.date, c.charter_type, c.boat_capacity, c.booking_status
        HAVING spots_left > 0  -- Moved filtering to HAVING clause
        ORDER BY c.date ASC
        LIMIT 6`,
        [todayStr],
        (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ error: 'Database query failed', details: err.message });
            }

            if (!results || results.length === 0) {
                return res.json([]); // Return an empty array if no results found
            }

            res.json(results);
        }
    );
});





module.exports = router;
