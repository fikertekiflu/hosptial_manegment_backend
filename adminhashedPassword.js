const bcrypt = require('bcryptjs');
const saltRounds = 10;
const plainPassword = 'bill'; // Choose a password

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
    if (err) console.error(err);
    else console.log('Hashed Password for Admin:', hash);
    // SQL to insert (replace with your actual SQL client):
    // INSERT INTO SystemUsers (username, password_hash, role, full_name, is_active)
    // VALUES ('lin', '$2b$10$J9sibvhlXNzDrkPkrBxsYebl5sNTh8/Xu2U2Ctd2SfDkvHdYFOWCa', 'Admin', 'System Administrator', TRUE);
});