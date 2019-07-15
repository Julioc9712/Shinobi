const validator = require('express-validator');
const {validateRequestAuth} = require('./auth');
const checkValidatorErrors = require('./checkValidatorErrors');
const { getS } = require('../process');
const config = require('../config');

module.exports = {
    validators: [
        validateRequestAuth,
        validator.query('start').optional().isISO8601().withMessage('Invalid start date').toDate(),
        validator.query('end').optional().isISO8601().withMessage('Invalid end date').toDate(),
        validator.query('startOperator').optional().isIn(['>', '>=','<','<=']).withMessage('Invalid date start operator'),
        validator.query('endOperator').optional().isIn(['>', '>=','<','<=']).withMessage('Invalid date end operator'),
        //validator.query('archived').optional().toBoolean(),
        validator.query('limit').optional().matches(/^\d+(,\d+)?$/).withMessage('Invalid limit parameter')
            .customSanitizer((value) => {
                const values = value.split(',').map((number) => parseInt(number, 10));
                let offset = 0;
                let limit = Math.min(Math.max(values[0] || 0, 0), 1000) || 100;
                if (values.length > 1) {
                    offset = Math.max(values[0] || 0, 0);
                    limit = Math.min(Math.max(values[1] || 0, 0), 1000) || 100;
                }
                return [offset, limit];
            }),
        checkValidatorErrors,
    ],
    handler: async (req, res) => {
        const user = req.session;

        const hasRestrictions = user.details.sub && user.details.allmonitors !== '1';
        if (
            user.permissions.watch_videos === "0" ||
            hasRestrictions && (!user.details.video_view ||
            user.details.video_view.indexOf(req.params.id) === -1)
        ) {
            return res.json([]);
        }
        const origURL = req.originalUrl.split('/');
        const videoFrom = origURL[origURL.indexOf(req.params.auth) + 1];

        let table = 'Videos';
        if (videoFrom === 'cloudVideos') {
            table = 'Cloud Videos';
        }

        const s = getS();
        let query = s.databaseEngine.from(table);

        query.where('ke', req.params.ke);

        // if (req.query.archived) {
        //     query.where('details', 'like', '%"archived":"1"%');
        // }

        if (!req.params.id) {
            if (user.details.sub && user.details.monitors && user.details.allmonitors !== '1') {
                try {
                    user.details.monitors = JSON.parse(user.details.monitors);
                } catch (er) {
                }
                if (user.details.monitors.length) {
                    query.whereIn('mid', user.details.monitors);
                }
            }
        } else {
            if (!user.details.sub || user.details.allmonitors !== '0' || user.details.monitors.indexOf(req.params.id) > -1) {
                query.where('mid', req.params.id);
            } else {
                return res.json([]);
            }
        }
        let endIsStartTo = undefined;
        if (req.query.start || req.query.end) {
            let theEndParameter = 'end';
            if (req.query.endIsStartTo) {
                endIsStartTo = true;
                theEndParameter = 'time';
            }
            if (req.query.start) {
                query.where('time', req.query.startOperator || '>=', req.query.start);
            }
            if (req.query.end) {
                query.where(theEndParameter, req.query.endOperator || '<=', req.query.end);
            }
        }

        const countQuery = query.clone().count({count: 'mid'});

        query.orderBy('time', 'desc');

        const limit = req.query.limit[1] || 100;
        const offset = req.query.limit[0] || 0;
        query
            .limit(limit)
            .offset(offset);

        let response = {
            isUTC: config.useUTC,
            total: 0,
            limit: limit,
            skip: offset,
            videos: [],
            endIsStartTo: endIsStartTo,
        };

        const [countResult] = await countQuery;
        response.total = countResult.count;

        if (response.total) {
            response.videos = await query;

            s.buildVideoLinks(response.videos, {
                auth: req.params.auth,
                videoParam: videoFrom,
                hideRemote: config.hideCloudSaveUrls
            });
        }

        res.json(response);
    },
};
