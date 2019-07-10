const validator = require('express-validator');

module.exports = async (req, res, next) => {
    const errors = validator.validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    next();
};
