const { getS } = require('../process');

/**
 * Get Knex instance
 *
 * TODO: Should be separate module instead of getting it from `s`
 *
 * @returns {Knex}
 */
const getDb = () => {
    const s = getS();

    return s.databaseEngine;
};

const cache = new Map();
const cacheTTL = 1000 * 60 * 5;

/**
 * Verify api key and group key.
 *
 * Returns session object on success, undefined on error
 *
 * @param {string} auth
 * @param {string} ke
 * @returns {Promise<Object | undefined>}
 */
const getUserPermissions = async (auth, ke) => {
    const cacheKey = `${auth}::${ke}`;
    if (cache.has(cacheKey)) {
        return await cache.get(cacheKey);
    }

    const resultPromise = new Promise(async (resolve) => {
        const [api] = await getDb()
            .from('API')
            .where({
                code: auth,
                ke: ke,
            });

        let user;
        if (api) {
            [user] = await getDb()
                .from('Users')
                .where({
                    uid: api.uid,
                    ke: api.ke,
                });
        } else {
            [user] = await getDb()
                .from('Users')
                .where({
                    auth: auth,
                    ke: ke,
                });
        }
        if (!user) {
            return resolve(undefined);
        }

        const s = getS();
        const sessionId = s.gid(20);

        const data = api || user;
        const sessionData = {
            ...data,
            ip: data.ip || '0.0.0.0',
            auth: data.auth || sessionId,
            details: JSON.parse(data.details),
            permissions: {},
        };
        if (api) {
            sessionData.auth = auth;
            sessionData.permissions = JSON.parse(api.details);
            sessionData.details = {};

            sessionData.mail = user.mail;
            sessionData.details = JSON.parse(user.details);
        } else {
            sessionData.permissions = {};
            sessionData.details = JSON.parse(user.details);
            delete sessionData.pass;
            /* these parameters are now missing, now sure if needed right now:
            cnid: 'P8JDYkEMtkPcCVrMAAAA',
            logged_in_at: '2019-07-10T10:43:55+03:00',
            login_type: 'Dashboard',
            */
        }
        sessionData.lang = s.getLanguageFile(sessionData.details.lang);

        return resolve(sessionData);
    });

    cache.set(cacheKey, resultPromise);
    setTimeout(() => {
        cache.delete(cacheKey);
    }, cacheTTL);

    return await resultPromise;
};

/**
 * Express middleware for checking `auth` and `ke` parameters in url and attaches user session data to `request`
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise<*>}
 */
const validateRequestAuth = async (req, res, next) => {
    const session = await getUserPermissions(req.params.auth, req.params.ke);

    if (!session) {
        const lang = s.getLanguageFile();
        return res.json({
            ok: false,
            msg: lang['Not Authorized'],
        });
    }

    req.session = session;

    next();
};

module.exports = {
    getUserPermissions: getUserPermissions,
    validateRequestAuth: validateRequestAuth,
};
