var express = require('express');
var router = express.Router();

/* GET bookings listing. */
router.get('/', function(req, res, next) {
  const db = req.app.get('db');
  db.query('SELECT * FROM bookings', (err, results) => {
    if (err) {
      return next(err);
    }
    res.json(results);
  });
});

/* POST new booking */
router.post('/', function(req, res, next) {
  const db = req.app.get('db');
  const { date, status, spots_left } = req.body;
  db.query('INSERT INTO bookings (date, status, spots_left) VALUES (?, ?, ?)', [date, status, spots_left], (err, results) => {
    if (err) {
      return next(err);
    }
    res.json({ id: results.insertId });
  });
});

/* PUT update or create new booking */
router.put('/newBooking', function(req, res, next) {
  const db = req.app.get('db');
  let {
      status,
      spots_left,
      booking_type,
      charter_type,  // Ensure consistent naming
      charter_description,
      heard_about_us,  // Ensure consistent naming
      booking_total,
      deposit_paid,
      notes,
      date  // Extract date from request body
  } = req.body;

  heard_about_us = heard_about_us || null;
  deposit_paid = deposit_paid || null;

  db.query(
      `INSERT INTO bookings (date, status, spots_left, booking_type, charter_type, charter_description, heard_about_us, booking_total, deposit_paid, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       status = VALUES(status), 
       spots_left = VALUES(spots_left), 
       booking_type = VALUES(booking_type), 
       charter_type = VALUES(charter_type), 
       charter_description = VALUES(charter_description), 
       heard_about_us = VALUES(heard_about_us), 
       booking_total = VALUES(booking_total), 
       deposit_paid = VALUES(deposit_paid), 
       notes = VALUES(notes)`,
      [date, status, spots_left, booking_type, charter_type, charter_description, heard_about_us, booking_total, deposit_paid, notes],
      (err, results) => {
          if (err) {
              return next(err);
          }
          res.json(results);
      }
  );
});

/* GET bookings for a specific month */
router.get('/month/:year/:month', function(req, res, next) {
  const db = req.app.get('db');
  const { year, month } = req.params;

  // Ensure month is a two-digit string
  const monthInt = parseInt(month, 10);
  const startDate = `${year}-${month.padStart(2, '0')}-01`;

  // Create a Date object and set it to the first day of the next month
  const nextMonthDate = new Date(year, monthInt - 1, 1);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

  const nextYear = nextMonthDate.getFullYear();
  const nextMonthStr = (nextMonthDate.getMonth() + 1).toString().padStart(2, '0');
  const endDate = `${nextYear}-${nextMonthStr}-01`;

  console.log(`Fetching bookings from ${startDate} to ${endDate}`);

  db.query('SELECT * FROM bookings WHERE date >= ? AND date < ?', [startDate, endDate], (err, results) => {
      if (err) {
          return next(err);
      }
      console.log('Raw bookings:', results);

      // Format the date as YYYY-MM-DD manually
      const formattedResults = results.map(booking => {
          const date = new Date(booking.date);
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return {
              ...booking,
              date: `${year}-${month}-${day}`
          };
      });
      res.json(formattedResults);
  });
});

router.get('/day/:date', (req, res, next) => {
  const db = req.app.get('db');
  const { date } = req.params;

  db.query(
      'SELECT first_name AS FirstName, last_name AS LastName, email AS Email, charter_type, spots_left_customer AS spots_left FROM customer_bookings WHERE booking_date = ?',
      [date],
      (err, results) => {
          if (err) {
              console.error('Database query error:', err);
              return next(err); // Pass error to error handler
          }
          res.json(results);
      }
  );
});



// Route for handling customer bookings
router.post('/customer-booking', function(req, res, next) {
  const db = req.app.get('db');
  const {
      FirstName,
      LastName,
      PhoneNumber,
      Email,
      Suburb,
      State,
      charter_type,
      spots_left_customer,  // Number of spots the customer wants
      heard_about_us_customer,
      booking_date  // Date for the booking
  } = req.body;

  // Step 1: Insert data into customer_bookings table
  db.query(
      `INSERT INTO customer_bookings 
      (first_name, last_name, phone_number, email, suburb, state, charter_type, spots_left_customer, heard_about_us, booking_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [FirstName, LastName, PhoneNumber, Email, Suburb || null, State || null, charter_type, spots_left_customer, heard_about_us_customer || null, booking_date],
      (err, results) => {
          if (err) {
              return next(err);
          }

          // Step 2: Check if the booking already exists in the bookings table
          const spotsToReduce = parseInt(spots_left_customer) || 0;

          db.query(
              `SELECT spots_left FROM bookings WHERE date = ? AND charter_type = ?`,
              [booking_date, charter_type],
              (err, rows) => {
                  if (err) {
                      return next(err);
                  }

                  if (rows.length > 0) {
                      // Booking exists, so update spots_left
                      db.query(
                          `UPDATE bookings 
                          SET spots_left = GREATEST(spots_left - ?, 0)  -- Ensure spots_left doesn't go below 0
                          WHERE date = ? AND charter_type = ?`,
                          [spotsToReduce, booking_date, charter_type],
                          (err, updateResults) => {
                              if (err) {
                                  return next(err);
                              }

                              // Respond with success status after updating
                              res.status(200).json({ message: 'Booking updated successfully.' });
                          }
                      );
                  } else {
                      // Booking does not exist, so create a new booking entry
                      const total_booking = spots_left_customer * 320; // Calculate total booking

                      db.query(
                          `INSERT INTO bookings (date, status, spots_left, booking_type, charter_type, booking_total)
                           VALUES (?, 'limited', ?, 'special', ?, ?)`,  // Use ? as a placeholder for total_booking
                          [booking_date, spots_left_customer, charter_type, total_booking],  // Pass total_booking as a parameter
                          (err, insertResults) => {
                              if (err) {
                                  return next(err);
                              }
  
                              // Respond with success status after creating new booking
                              res.status(201).json({ message: 'New booking created successfully.', id: insertResults.insertId });
                          }
                      );
  
                  }
              }
          );
      }
  );
});



/* DELETE booking */
router.delete('/:date', function(req, res, next) {
  const db = req.app.get('db');
  db.query('DELETE FROM bookings WHERE date = ?', [req.params.date], (err, results) => {
    if (err) {
      return next(err);
    }
    res.json(results);
  });
});

module.exports = router;
